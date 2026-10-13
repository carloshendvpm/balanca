// BIA formulas from CsAlgoBuilder (see Formula.md in okok-bia-formulas).
// Values are returned unrounded; round only for display.

export type Sex = 'male' | 'female';

export interface BodyProfile {
  heightCm: number;
  age: number;
  sex: Sex;
}

export interface BodyComposition {
  bmi: number;
  bodyFatPct: number;
  fatMassKg: number;
  visceralFat: number | null;
  waterPct: number | null;
  muscleKg: number;
  musclePct: number;
  boneKg: number;
  bmrKcal: number;
  bodyAge: number;
  idealWeightKg: number;
  proteinKg: number;
  proteinPct: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const roundHalf = (v: number) => Math.round(v * 2) / 2;

export const bmiOf = (weightKg: number, heightCm: number) => weightKg / (heightCm / 100) ** 2;

export function idealWeightKg({ heightCm, sex }: Pick<BodyProfile, 'heightCm' | 'sex'>) {
  return sex === 'male' ? (heightCm - 80) * 0.7 : (heightCm - 70) * 0.6;
}

export function calcBia(p: BodyProfile, weightKg: number, impedance: number): BodyComposition {
  const H = p.heightCm;
  const Wt = weightKg;
  const Age = p.age;
  const Z = impedance;
  const male = p.sex === 'male';

  const bodyFatPct = clamp(
    (male
      ? -0.3315 * H + 0.6216 * Wt + 0.0183 * Age + 0.0085 * Z + 22.554
      : -0.3332 * H + 0.7509 * Wt + 0.0196 * Age + 0.0072 * Z + 22.7193) /
      Wt *
      100,
    5,
    45,
  );

  const visceral = clamp(
    roundHalf(
      male
        ? -0.2675 * H + 0.42 * Wt + 0.1462 * Age + 0.0123 * Z + 13.9871
        : -0.1651 * H + 0.2628 * Wt + 0.0649 * Age + 0.0024 * Z + 12.3445,
    ),
    1,
    59,
  );

  const water = clamp(
    ((male
      ? 0.0939 * H + 0.3758 * Wt - 0.0032 * Age - 0.006925 * Z + 0.097
      : 0.0877 * H + 0.2973 * Wt + 0.0128 * Age - 0.00603 * Z + 0.5175) /
      Wt) *
      100,
    20,
    85,
  );

  const slm = male
    ? 0.2867 * H + 0.3894 * Wt - 0.0408 * Age - 0.01235 * Z - 15.7665
    : 0.3186 * H + 0.1934 * Wt - 0.0206 * Age - 0.0132 * Z - 16.4556;

  const fatMassKg = (bodyFatPct * Wt) / 100;

  const bmrKcal = male
    ? 7.5037 * H + 13.1523 * Wt - 4.3376 * Age - 0.3486 * Z - 311.7751
    : 7.5432 * H + 9.9474 * Wt - 3.4382 * Age - 0.309 * Z - 288.2821;

  const rawBodyAge = male
    ? -0.7471 * H + 0.9161 * Wt + 0.4184 * Age + 0.0517 * Z + 54.2267
    : -1.1165 * H + 1.5784 * Wt + 0.4615 * Age + 0.0415 * Z + 83.2548;

  const proteinKg = slm - (water * Wt) / 100;
  const adult = Age > 17;

  return {
    bmi: bmiOf(Wt, H),
    bodyFatPct,
    fatMassKg,
    visceralFat: adult ? visceral : null,
    waterPct: adult ? water : null,
    muscleKg: slm,
    musclePct: (slm / Wt) * 100,
    boneKg: clamp(Wt - fatMassKg - slm, 1, 4),
    bmrKcal,
    bodyAge: clamp(rawBodyAge, Math.max(18, Age - 10), Math.min(80, Age + 10)),
    idealWeightKg: idealWeightKg(p),
    proteinKg,
    proteinPct: (proteinKg / Wt) * 100,
  };
}

export function ageOn(birthDate: string, at: Date): number {
  const b = new Date(birthDate);
  let age = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) age--;
  return age;
}
