import type { Sex } from './bia';

export interface Tape {
  neckCm: number;
  waistCm: number; // men: at the navel; women: narrowest point
  hipCm: number | null; // women only, widest point
}

/** U.S. Navy circumference method (Hodgdon & Beckett, 1984), metric form. */
export function navyBodyFat(sex: Sex, heightCm: number, t: Tape): number | null {
  const pct =
    sex === 'male'
      ? t.waistCm > t.neckCm
        ? 495 / (1.0324 - 0.19077 * Math.log10(t.waistCm - t.neckCm) + 0.15456 * Math.log10(heightCm)) - 450
        : NaN
      : t.hipCm !== null && t.waistCm + t.hipCm > t.neckCm
        ? 495 / (1.29579 - 0.35004 * Math.log10(t.waistCm + t.hipCm - t.neckCm) + 0.221 * Math.log10(heightCm)) - 450
        : NaN;
  return Number.isFinite(pct) && pct > 2 && pct < 70 ? pct : null;
}

/** Waist ÷ height; under 0.5 is the usual healthy threshold. */
export const waistToHeight = (waistCm: number, heightCm: number) => waistCm / heightCm;
