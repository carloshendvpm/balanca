import { describe, expect, it } from 'vitest';

import { StableDetector } from '../capture';
import type { ScaleReading } from '../protocol/parse';

const r = (weightKg: number, stable: boolean, impedance: number | null = null): ScaleReading => ({
  variant: 'C0',
  weightKg,
  impedance,
  stable,
  rawHex: '',
});

describe('StableDetector', () => {
  it('emits once per weighing and attaches late impedance', () => {
    const d = new StableDetector();
    const events = [
      d.push(r(40, false), 0),
      d.push(r(80.1, false), 100),
      d.push(r(80.2, true), 200),
      d.push(r(80.2, true), 300),
      d.push(r(80.2, true, 512.3), 2000),
      d.push(r(80.2, true, 512.3), 2100),
    ].filter(Boolean);
    expect(events.map((e) => e!.kind)).toEqual(['new', 'impedance']);
    expect(events[1]!.reading.impedance).toBe(512.3);
  });

  it('re-arms after an unstable reading, a new weight or a quiet minute', () => {
    const d = new StableDetector();
    expect(d.push(r(80, true), 0)?.kind).toBe('new');
    expect(d.push(r(80, true), 1000)).toBeNull();
    expect(d.push(r(60, true), 2000)?.kind).toBe('new');
    d.push(r(10, false), 3000);
    expect(d.push(r(60, true), 4000)?.kind).toBe('new');
    expect(d.push(r(60, true), 70_000)?.kind).toBe('new');
  });
});
