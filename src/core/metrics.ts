import { ageOn, bmiOf, calcBia, type BodyComposition, type Sex } from './bia';

export interface ProfileLike {
  sex: Sex;
  birthDate: string;
  heightCm: number;
}

export interface ReadingLike {
  measuredAt: number;
  weightKg: number;
  impedance: number | null;
}

export type MetricKey = 'weightKg' | 'bmi' | keyof Omit<BodyComposition, 'bmi' | 'idealWeightKg'>;

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  decimals: number;
  /** For coloring deltas: is going up good, bad, or neutral? */
  upIs: 'good' | 'bad' | 'neutral';
}

export const METRICS: MetricDef[] = [
  { key: 'weightKg', label: 'Peso', unit: 'kg', decimals: 2, upIs: 'neutral' },
  { key: 'bmi', label: 'IMC', unit: '', decimals: 1, upIs: 'bad' },
  { key: 'bodyFatPct', label: 'Gordura', unit: '%', decimals: 1, upIs: 'bad' },
  { key: 'fatMassKg', label: 'Massa gorda', unit: 'kg', decimals: 1, upIs: 'bad' },
  { key: 'muscleKg', label: 'Massa muscular', unit: 'kg', decimals: 1, upIs: 'good' },
  { key: 'musclePct', label: 'Músculo', unit: '%', decimals: 1, upIs: 'good' },
  { key: 'visceralFat', label: 'Gordura visceral', unit: '', decimals: 1, upIs: 'bad' },
  { key: 'waterPct', label: 'Água', unit: '%', decimals: 1, upIs: 'good' },
  { key: 'boneKg', label: 'Massa óssea', unit: 'kg', decimals: 2, upIs: 'neutral' },
  { key: 'proteinPct', label: 'Proteína', unit: '%', decimals: 1, upIs: 'good' },
  { key: 'proteinKg', label: 'Massa proteica', unit: 'kg', decimals: 1, upIs: 'good' },
  { key: 'bmrKcal', label: 'Metabolismo basal', unit: 'kcal', decimals: 0, upIs: 'neutral' },
  { key: 'bodyAge', label: 'Idade corporal', unit: 'anos', decimals: 0, upIs: 'bad' },
];

export const metricDef = (key: MetricKey) => METRICS.find((m) => m.key === key)!;

export type MetricValues = Partial<Record<MetricKey, number | null>>;

/** Everything derivable from one reading; BIA fields only when impedance exists. */
export function metricsFor(r: ReadingLike, p: ProfileLike): MetricValues {
  const base: MetricValues = { weightKg: r.weightKg, bmi: bmiOf(r.weightKg, p.heightCm) };
  if (r.impedance === null) return base;
  const bc = calcBia({ heightCm: p.heightCm, sex: p.sex, age: ageOn(p.birthDate, new Date(r.measuredAt)) }, r.weightKg, r.impedance);
  const { idealWeightKg: _ideal, ...rest } = bc;
  return { ...rest, ...base };
}

export type Band = { label: string; tone: 'low' | 'ok' | 'warn' | 'bad' };

/** Common reference ranges; used only as hints in the UI. */
export function bandFor(key: MetricKey, value: number, sex: Sex): Band | null {
  const pick = (cuts: number[], bands: Band[]) => bands[cuts.filter((c) => value >= c).length];
  const fourBands: Band[] = [
    { label: 'Baixo', tone: 'low' },
    { label: 'Normal', tone: 'ok' },
    { label: 'Alto', tone: 'warn' },
    { label: 'Muito alto', tone: 'bad' },
  ];
  switch (key) {
    case 'bmi':
      return pick([18.5, 25, 30], [
        { label: 'Abaixo do peso', tone: 'low' },
        { label: 'Normal', tone: 'ok' },
        { label: 'Sobrepeso', tone: 'warn' },
        { label: 'Obesidade', tone: 'bad' },
      ]);
    case 'bodyFatPct':
      return pick(sex === 'male' ? [8, 20, 25] : [21, 33, 39], fourBands);
    case 'visceralFat':
      return pick([10, 15], [fourBands[1], fourBands[2], fourBands[3]]);
    default:
      return null;
  }
}

export function formatMetric(key: MetricKey, v: number | null | undefined) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const d = metricDef(key);
  return v.toFixed(d.decimals).replace('.', ',') + (d.unit ? ` ${d.unit}` : '');
}
