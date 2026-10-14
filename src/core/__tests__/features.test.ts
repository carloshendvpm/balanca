import { describe, expect, it } from 'vitest';

import { navyBodyFat, waistToHeight } from '../navy';
import { reminderDates } from '../reminders';
import { DAY } from '../series';
import { trendSeries } from '../trend';

const t0 = Date.UTC(2026, 0, 1);

describe('trendSeries', () => {
  const days = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => ({ t: t0 + i * DAY, v: f(i) }));

  it('does not lag behind a steady loss', () => {
    const s = trendSeries(days(60, (i) => 100 - 0.1 * i));
    expect(Math.abs(s.at(-1)!.v - (100 - 0.1 * 59))).toBeLessThan(0.15);
  });

  it('filters alternating noise around a steady weight', () => {
    const last = trendSeries(days(30, (i) => 90 + (i % 2 ? 1 : -1))).at(-1)!.v;
    expect(Math.abs(last - 90)).toBeLessThan(0.3);
  });

  it('moves only part of the way after one surprising reading', () => {
    const s = trendSeries([...days(20, () => 90), { t: t0 + 20 * DAY, v: 92 }]);
    expect(s.at(-1)!.v).toBeGreaterThan(90);
    expect(s.at(-1)!.v).toBeLessThan(90.4);
  });

  it('weights a long gap more than a same-day re-weigh', () => {
    const base = days(10, () => 90);
    const week = trendSeries([...base, { t: t0 + 16 * DAY, v: 92 }]).at(-1)!.v;
    const sameDay = trendSeries([...base, { t: t0 + 9 * DAY + DAY / 24, v: 92 }]).at(-1)!.v;
    expect(week).toBeGreaterThan(sameDay);
  });
});

describe('navyBodyFat', () => {
  // Independent oracle: the original imperial-unit equations.
  const inch = (cm: number) => cm / 2.54;
  const imperialMale = (h: number, n: number, w: number) =>
    86.01 * Math.log10(inch(w) - inch(n)) - 70.041 * Math.log10(inch(h)) + 36.76;
  const imperialFemale = (h: number, n: number, w: number, hip: number) =>
    163.205 * Math.log10(inch(w) + inch(hip) - inch(n)) - 97.684 * Math.log10(inch(h)) - 78.387;

  it('agrees with the imperial-unit equations', () => {
    for (const [h, n, w] of [[178, 38, 90], [170, 40, 110], [190, 36, 80]]) {
      expect(Math.abs(navyBodyFat('male', h, { neckCm: n, waistCm: w, hipCm: null })! - imperialMale(h, n, w))).toBeLessThan(0.6);
    }
    for (const [h, n, w, hip] of [[165, 33, 75, 100], [158, 31, 85, 110]]) {
      expect(Math.abs(navyBodyFat('female', h, { neckCm: n, waistCm: w, hipCm: hip })! - imperialFemale(h, n, w, hip))).toBeLessThan(0.6);
    }
  });
  it('rejects impossible input', () => {
    expect(navyBodyFat('male', 178, { neckCm: 40, waistCm: 38, hipCm: null })).toBeNull();
    expect(navyBodyFat('female', 165, { neckCm: 33, waistCm: 75, hipCm: null })).toBeNull();
  });
  it('waist to height', () => {
    expect(waistToHeight(89, 178)).toBeCloseTo(0.5);
  });
});

describe('reminderDates', () => {
  const now = new Date(2026, 9, 14, 6, 0);
  it('includes today when not weighed yet and time is ahead', () => {
    const d = reminderDates(now, 7, 30, false);
    expect(d).toHaveLength(7);
    expect(d[0]).toEqual(new Date(2026, 9, 14, 7, 30));
  });
  it('skips today once weighed', () => {
    expect(reminderDates(now, 7, 30, true)[0]).toEqual(new Date(2026, 9, 15, 7, 30));
  });
  it('skips today when the time has passed', () => {
    expect(reminderDates(new Date(2026, 9, 14, 8, 0), 7, 30, false)[0]).toEqual(new Date(2026, 9, 15, 7, 30));
  });
});
