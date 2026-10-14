import { DAY, type Point } from './series';

/** Per-day smoothing of the level (how fast the trend follows readings). */
export const LEVEL_ALPHA = 0.15;
/** Per-day smoothing of the slope (how fast the trend picks up a new pace). */
export const SLOPE_BETA = 0.1;

/**
 * Smoothed "trend weight" using time-aware double exponential smoothing
 * (Holt). Like the classic 10%-per-day moving average it ignores daily water
 * swings, but it also tracks the rate of change, so during a steady loss it
 * does not lag a kilo behind the scale.
 */
export function trendSeries(points: Point[], alpha = LEVEL_ALPHA, beta = SLOPE_BETA): Point[] {
  const out: Point[] = [];
  let level = 0;
  let slope = 0; // kg per day
  let t = 0;
  points.forEach((p, i) => {
    if (i === 0) {
      level = p.v;
      t = p.t;
    } else {
      // Same-day re-weighs still count a little.
      const days = Math.max((p.t - t) / DAY, 0.25);
      const a = 1 - (1 - alpha) ** days;
      const b = 1 - (1 - beta) ** days;
      const predicted = level + slope * days;
      const next = predicted + a * (p.v - predicted);
      slope = slope + b * ((next - level) / days - slope);
      level = next;
      t = p.t;
    }
    out.push({ t: p.t, v: level });
  });
  return out;
}

export const lastTrend = (points: Point[]) => {
  const s = trendSeries(points);
  return s.length ? s[s.length - 1].v : null;
};
