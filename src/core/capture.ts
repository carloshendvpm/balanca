import type { ScaleReading } from './protocol/parse';

export type CaptureEvent =
  | { kind: 'new'; reading: ScaleReading }
  // Impedance often arrives a few seconds after the weight has settled.
  | { kind: 'impedance'; reading: ScaleReading };

const SAME_WEIGHT_KG = 0.2;
const IDLE_REARM_MS = 60_000;

/**
 * Turns the stream of repeated advertisements into one event per weighing.
 * A weighing is recorded on the first stable advertisement; the detector then
 * stays disarmed until the scale reports an unstable value, a different
 * weight, or goes quiet for a minute.
 */
export class StableDetector {
  private last: ScaleReading | null = null;
  private lastSeenAt = 0;
  private armed = true;

  push(r: ScaleReading, now: number): CaptureEvent | null {
    if (now - this.lastSeenAt > IDLE_REARM_MS) this.armed = true;
    this.lastSeenAt = now;

    if (!r.stable) {
      this.armed = true;
      return null;
    }
    const same = this.last !== null && Math.abs(this.last.weightKg - r.weightKg) < SAME_WEIGHT_KG;
    if (this.armed || !same) {
      this.armed = false;
      this.last = r;
      return { kind: 'new', reading: r };
    }
    if (this.last!.impedance === null && r.impedance !== null) {
      this.last = r;
      return { kind: 'impedance', reading: r };
    }
    return null;
  }
}
