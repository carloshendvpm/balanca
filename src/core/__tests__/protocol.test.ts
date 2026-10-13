import { describe, expect, it } from 'vitest';

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
      expect(r!.impedance).toBe(expected!.impedance);
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

describe('iOS advertisement adapter', () => {
  it('splits the little-endian company ID from the README payload', () => {
    // README example: "c0 07 1a31 1770 0a01 25 2416514b123c"
    const raw = hexToBytes('c0071a3117700a01252416514b123c');
    const md = splitManufacturerData(raw);
    expect([...md.keys()]).toEqual([0x07c0]);
    expect(parseOkok(md)).toMatchObject({ variant: 'C0', weightKg: 67.05, impedance: 600 });
  });

  it('decodes base64 as delivered by react-native-ble-plx', () => {
    expect(Array.from(base64ToBytes('wAcaMRdw'))).toEqual([0xc0, 0x07, 0x1a, 0x31, 0x17, 0x70]);
  });
});
