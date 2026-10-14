import { DAY, slopePerDay, type Point } from './series';
import { lastTrend } from './trend';

export interface Goal {
  targetKg: number;
  deadline: number; // epoch ms
  startDate: number;
  startKg: number;
}

export type GoalStatus = 'achieved' | 'ahead' | 'on_track' | 'behind' | 'overdue';

export interface GoalProgress {
  status: GoalStatus;
  currentKg: number; // smoothed estimate, so one heavy or light day does not flip the status
  lastKg: number; // latest raw reading
  progressPct: number; // 0..100 of the way from startKg to targetKg
  remainingKg: number; // signed: negative means still need to lose
  daysLeft: number;
  requiredKgPerWeek: number | null; // null once achieved or overdue
  currentKgPerWeek: number | null; // from the recent trend
  projectedDate: number | null; // when the trend reaches the target
  expectedKgToday: number; // on the straight line start → target
}

const TREND_WINDOW_DAYS = 28;
const MIN_TREND_SPAN_DAYS = 7;
const ON_TRACK_TOLERANCE_KG = 0.5;

/** Readings of the last 28 days, if there are enough of them to fit a line. */
function recentWindow(weights: Point[], now: number): Point[] | null {
  const recent = weights.filter((p) => p.t >= now - TREND_WINDOW_DAYS * DAY && p.t <= now);
  if (recent.length < 3 || recent[recent.length - 1].t - recent[0].t < MIN_TREND_SPAN_DAYS * DAY) return null;
  return recent;
}

/** Weekly rate from the last 28 days of readings, if they span at least a week. */
export function recentTrendPerWeek(weights: Point[], now: number): number | null {
  const recent = recentWindow(weights, now);
  const s = recent && slopePerDay(recent);
  return s == null ? null : s * 7;
}

/** Today's trend weight: the same number the home screen shows. */
export function smoothedWeight(weights: Point[], now: number): number | null {
  return lastTrend(weights.filter((p) => p.t <= now));
}

/** `weights` must be sorted by time; progress is measured on the trend weight up to `now`. */
export function evaluateGoal(goal: Goal, weights: Point[], now: number): GoalProgress {
  const past = weights.filter((p) => p.t <= now);
  const lastKg = past.length ? past[past.length - 1].v : goal.startKg;
  const currentKg = smoothedWeight(past, now) ?? goal.startKg;
  const losing = goal.targetKg < goal.startKg;
  const sign = losing ? -1 : 1;

  const remainingKg = goal.targetKg - currentKg;
  const total = goal.targetKg - goal.startKg;
  const progressPct = total === 0 ? 100 : Math.max(0, Math.min(100, ((currentKg - goal.startKg) / total) * 100));
  const daysLeft = Math.ceil((goal.deadline - now) / DAY);

  const span = goal.deadline - goal.startDate;
  const frac = span <= 0 ? 1 : Math.max(0, Math.min(1, (now - goal.startDate) / span));
  const expectedKgToday = goal.startKg + total * frac;

  const currentKgPerWeek = recentTrendPerWeek(past, now);
  const movingRightWay = currentKgPerWeek !== null && currentKgPerWeek * sign > 0;
  const projectedDate = movingRightWay ? now + (remainingKg / (currentKgPerWeek! / 7)) * DAY : null;

  const achieved = sign * remainingKg <= 0;
  let status: GoalStatus;
  if (achieved) status = 'achieved';
  else if (now > goal.deadline) status = 'overdue';
  else {
    const lead = sign * (currentKg - expectedKgToday); // >0: ahead of the line
    status = lead > ON_TRACK_TOLERANCE_KG ? 'ahead' : lead < -ON_TRACK_TOLERANCE_KG ? 'behind' : 'on_track';
  }

  const requiredKgPerWeek =
    status === 'achieved' || status === 'overdue' ? null : (remainingKg / Math.max(daysLeft, 1)) * 7;

  return {
    status,
    currentKg,
    lastKg,
    progressPct,
    remainingKg,
    daysLeft,
    requiredKgPerWeek,
    currentKgPerWeek,
    projectedDate: achieved ? null : projectedDate,
    expectedKgToday,
  };
}
