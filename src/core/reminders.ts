/**
 * Upcoming reminder times: one per day at hour:minute for `days` days,
 * skipping today if the person already weighed in or the time has passed.
 * Scheduling individual dates (not a repeating trigger) is what lets a
 * weigh-in silence that day's reminder.
 */
export function reminderDates(now: Date, hour: number, minute: number, weighedToday: boolean, days = 7): Date[] {
  const out: Date[] = [];
  for (let i = 0; out.length < days && i < days + 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute);
    if (i === 0 && (weighedToday || d <= now)) continue;
    out.push(d);
  }
  return out;
}

export const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
