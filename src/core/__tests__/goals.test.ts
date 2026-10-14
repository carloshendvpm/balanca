import { describe, expect, it } from 'vitest';

import { evaluateGoal, type Goal } from '../goals';
import { DAY, deltaOver, movingAverage, type Point } from '../series';
import { matchProfile } from '../user-match';

const t0 = Date.UTC(2026, 0, 1);
const day = (n: number) => t0 + n * DAY;
// 100 kg losing 0.1 kg/day (0.7 kg/week)
const linear = (days: number, from = 100, perDay = -0.1): Point[] =>
  Array.from({ length: days + 1 }, (_, i) => ({ t: day(i), v: from + perDay * i }));

const goal = (targetKg: number, deadlineDay: number): Goal => ({
  targetKg,
  deadline: day(deadlineDay),
  startDate: t0,
  startKg: 100,
});

describe('evaluateGoal', () => {
  it('tracks several simultaneous goals independently', () => {
    const w = linear(30); // now at 97 kg
    const easy = evaluateGoal(goal(95, 100), w, day(30)); // line expects 98.5
    const tight = evaluateGoal(goal(90, 40), w, day(30)); // line expects 92.5
    expect(easy.status).toBe('ahead');
    expect(tight.status).toBe('behind');
    expect(easy.progressPct).toBeCloseTo(60, 0);
    expect(easy.currentKgPerWeek).toBeCloseTo(-0.7);
    expect(tight.requiredKgPerWeek).toBeCloseTo((-7 / 10) * 7, 1);
    // 2 kg left at 0.1 kg/day → 20 days
    expect(Math.abs(easy.projectedDate! - day(50))).toBeLessThan(DAY);
  });

  it('is on track when following the line', () => {
    expect(evaluateGoal(goal(97, 30), linear(15), day(15)).status).toBe('on_track');
  });

  it('marks achieved and overdue goals', () => {
    expect(evaluateGoal(goal(98, 60), linear(30), day(30)).status).toBe('achieved');
    expect(evaluateGoal(goal(90, 20), linear(30), day(30)).status).toBe('overdue');
  });

  it('supports weight-gain goals', () => {
    const w = linear(14, 60, 0.05);
    const g = evaluateGoal({ targetKg: 65, deadline: day(100), startDate: t0, startKg: 60 }, w, day(14));
    expect(g.status).toBe('on_track');
    expect(g.projectedDate).not.toBeNull();
  });

  it('has no trend or projection with too little data', () => {
    const g = evaluateGoal(goal(95, 60), linear(3), day(3));
    expect(g.currentKgPerWeek).toBeNull();
    expect(g.projectedDate).toBeNull();
  });
});

describe('smoothed goal weight', () => {
  it('ignores a single light day when deciding achievement', () => {
    // Flat at 96 kg with one 94.5 kg outlier today; target 95 kg.
    const w = Array.from({ length: 21 }, (_, i) => ({ t: day(i), v: i === 20 ? 94.5 : 96 }));
    const g = evaluateGoal({ targetKg: 95, deadline: day(60), startDate: t0, startKg: 100 }, w, day(20));
    expect(g.status).not.toBe('achieved');
    expect(g.lastKg).toBe(94.5);
  });
});

describe('series', () => {
  it('moving average uses a trailing time window', () => {
    const ma = movingAverage([
      { t: day(0), v: 10 },
      { t: day(1), v: 20 },
      { t: day(9), v: 30 },
    ]);
    expect(ma.map((p) => p.v)).toEqual([10, 15, 30]);
  });

  it('deltaOver compares against the reading closest to N days ago', () => {
    expect(deltaOver(linear(30), 7)).toBeCloseTo(-0.7);
    expect(deltaOver(linear(3), 7)).toBeNull();
  });
});

describe('matchProfile', () => {
  const people = [
    { profileId: 1, lastWeightKg: 92 },
    { profileId: 2, lastWeightKg: 61 },
  ];
  it('matches the closest profile within tolerance', () => {
    expect(matchProfile(90.8, people)).toEqual({ kind: 'match', profileId: 1 });
    expect(matchProfile(75, people)).toEqual({ kind: 'none' });
  });
  it('asks when two profiles are close', () => {
    expect(matchProfile(63, [...people, { profileId: 3, lastWeightKg: 64 }])).toEqual({
      kind: 'ambiguous',
      profileIds: [3, 2],
    });
  });
  it('gives an unmatched weight to the only profile without history', () => {
    expect(matchProfile(75, [...people, { profileId: 9, lastWeightKg: null }])).toEqual({ kind: 'match', profileId: 9 });
    expect(matchProfile(61, [{ profileId: 8, lastWeightKg: null }, { profileId: 9, lastWeightKg: null }])).toEqual({ kind: 'none' });
  });
  it('assigns to the only profile when it has no history', () => {
    expect(matchProfile(80, [{ profileId: 7, lastWeightKg: null }])).toEqual({ kind: 'match', profileId: 7 });
  });
});
