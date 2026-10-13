export interface Point {
  t: number; // epoch ms
  v: number;
}

const DAY = 86_400_000;

/** Trailing time-window average (default 7 days) evaluated at each point. */
export function movingAverage(points: Point[], days = 7): Point[] {
  const out: Point[] = [];
  let start = 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    sum += points[i].v;
    while (points[i].t - points[start].t > days * DAY) sum -= points[start++].v;
    out.push({ t: points[i].t, v: sum / (i - start + 1) });
  }
  return out;
}

/** Least-squares slope in units per day, or null if under-determined. */
export function slopePerDay(points: Point[]): number | null {
  if (points.length < 2) return null;
  const n = points.length;
  const mt = points.reduce((s, p) => s + p.t, 0) / n;
  const mv = points.reduce((s, p) => s + p.v, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.t - mt) * (p.v - mv);
    den += (p.t - mt) ** 2;
  }
  return den === 0 ? null : (num / den) * DAY;
}

/** Latest value minus the value closest to `days` before it (null if none that old). */
export function deltaOver(points: Point[], days: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const cutoff = last.t - days * DAY;
  let ref: Point | null = null;
  for (const p of points) {
    if (p.t > cutoff) break;
    ref = p;
  }
  return ref ? last.v - ref.v : null;
}

export { DAY };
