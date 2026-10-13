import { describe, expect, it } from 'vitest';

import { ageOn, calcBia, type Sex } from '../bia';
import golden from './fixtures/golden.json';

// Python rounds its outputs; compare within half of the last printed digit.
const fields: [keyof ReturnType<typeof calcBia>, string, number][] = [
  ['bmi', 'bmi', 0.051],
  ['bodyFatPct', 'bfr', 0.051],
  ['visceralFat', 'vfr', 1e-9],
  ['waterPct', 'tfr', 1e-9],
  ['musclePct', 'muscle_pct', 0.051],
  ['muscleKg', 'muscle_kg', 0.0051],
  ['boneKg', 'bone_mass', 0.0051],
  ['bmrKcal', 'bmr', 0.51],
  ['bodyAge', 'body_age', 0.51],
  ['idealWeightKg', 'ideal_weight', 0.051],
  ['proteinKg', 'protein_kg', 0.0051],
  ['proteinPct', 'protein_pct', 0.051],
  ['fatMassKg', 'fat_mass_kg', 0.0051],
];

describe('calcBia matches okok_ble_reader.calc_bia', () => {
  for (const c of golden.bia) {
    it(`${c.profile.sex} ${c.profile.heightCm}cm ${c.profile.age}y ${c.weightKg}kg ${c.impedance}Ω`, () => {
      const bc = calcBia({ ...c.profile, sex: c.profile.sex as Sex }, c.weightKg, c.impedance);
      for (const [ts, py, tol] of fields) {
        const expected = (c.expected as Record<string, number | null>)[py];
        if (expected === null) expect(bc[ts], ts).toBeNull();
        else expect(Math.abs((bc[ts] as number) - expected), ts).toBeLessThanOrEqual(tol);
      }
    });
  }
});

describe('ageOn', () => {
  it('counts birthdays correctly', () => {
    expect(ageOn('1995-10-14', new Date('2026-10-13'))).toBe(30);
    expect(ageOn('1995-10-13', new Date('2026-10-13'))).toBe(31);
  });
});
