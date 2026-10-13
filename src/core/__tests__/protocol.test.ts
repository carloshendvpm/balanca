import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { StableDetector } from '../capture';

import { base64ToBytes, hexToBytes, splitManufacturerData } from '../protocol/ios-adv';
import { parseOkok, type ManufacturerData } from '../protocol/parse';
import golden from './fixtures/golden.json';

const toMd = (md: Record<string, string>): ManufacturerData =>
  new Map(Object.entries(md).map(([k, hex]) => [Number(k), hexToBytes(hex)]));

describe('parseOkok matches okok_ble_reader.py', () => {
  for (const [name, { md, expected }] of Object.entries(golden.parse)) {
    it(name, () => {
      const r = parseOkok(toMd(md));
      expect(r).not.toBeNull();
      expect(r!.variant).toBe(expected!.variant);
      expect(r!.weightKg).toBeCloseTo(expected!.weightKg, 6);
      // Deliberate divergence: Python reports C0's 0x1770 placeholder as 600 Ω.
      expect(r!.impedance).toBe(expected!.variant === 'C0' ? null : expected!.impedance);
      expect(r!.rawHex).toBe(expected!.rawHex);
      expect(r!.stable).toBe(true);
    });
  }

  it('reports unstable C0 readings instead of dropping them', () => {
    const r = parseOkok(toMd({ [0x07c0]: '1a3117700a01242416514b123c' }));
    expect(r?.stable).toBe(false);
    expect(r?.weightKg).toBeCloseTo(67.05);
  });

  it('rejects V20 with a bad checksum', () => {
    const data = hexToBytes(golden.parse.v20.md[String(0x20ca) as '8394']);
    data[12] ^= 0xff;
    expect(parseOkok(new Map([[0x20ca, data]]))).toBeNull();
  });
});

describe('real capture (C0 scale 08:B8:D0:16:7C:35, 4 weighings of ~94 kg)', () => {
  const lines = readFileSync(new URL('./fixtures/real-c0-capture.txt', import.meta.url), 'utf8').trim().split('\n');

  it('records exactly one weighing per step-on', () => {
    const d = new StableDetector();
    const events = lines.flatMap((line) => {
      const [t, hex] = line.split(' ');
      const r = parseOkok(splitManufacturerData(hexToBytes(hex)));
      const ev = r && d.push(r, Number(t) * 1000);
      return ev ? [ev] : [];
    });
    expect(events.map((e) => [e.kind, e.reading.weightKg])).toEqual([
      ['new', 94],
      ['new', 94],
      ['new', 94.4],
      ['new', 94],
    ]);
  });

  it('never reports the 0x1770 placeholder as impedance', () => {
    for (const line of lines) {
      const r = parseOkok(splitManufacturerData(hexToBytes(line.split(' ')[1])));
      expect(r?.impedance ?? null).toBeNull();
    }
  });
});

describe('iOS advertisement adapter', () => {
  it('splits the little-endian company ID from the README payload', () => {
    // README example: "c0 07 1a31 1770 0a01 25 2416514b123c"
    const raw = hexToBytes('c0071a3117700a01252416514b123c');
    const md = splitManufacturerData(raw);
    expect([...md.keys()]).toEqual([0x07c0]);
    expect(parseOkok(md)).toMatchObject({ variant: 'C0', weightKg: 67.05, impedance: null });
  });

  it('decodes base64 as delivered by react-native-ble-plx', () => {
    expect(Array.from(base64ToBytes('wAcaMRdw'))).toEqual([0xc0, 0x07, 0x1a, 0x31, 0x17, 0x70]);
  });
});
