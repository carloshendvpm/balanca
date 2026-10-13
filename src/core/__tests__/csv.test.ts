import { describe, expect, it } from 'vitest';

import { importReadingsCsv, parseCsv, toCsv } from '../csv';

describe('csv', () => {
  it('round-trips quotes, commas and newlines', () => {
    const rows = [['a', 'b,c', 'say "hi"', 'x\ny'], ['1', '', '2', '3']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('imports okok_ble_reader.py CSV', () => {
    const text =
      'timestamp,device,variant,weight_kg,impedance_ohm,raw_payload,bmi\n' +
      '2026-03-01T07:12:00,Chipsea-BLE,C0,82.4,512.3,1A31,26.9\n' +
      '2026-03-02T07:10:00,Chipsea-BLE,V11,82.1,,ABCD,26.8\n';
    expect(importReadingsCsv(text)).toEqual([
      { measuredAt: Date.parse('2026-03-01T07:12:00'), weightKg: 82.4, impedance: 512.3, variant: 'C0', rawHex: '1A31', profileName: null },
      { measuredAt: Date.parse('2026-03-02T07:10:00'), weightKg: 82.1, impedance: null, variant: 'V11', rawHex: 'ABCD', profileName: null },
    ]);
  });

  it('imports our own export with profile names and comma decimals', () => {
    const text = 'data,perfil,peso_kg,impedancia_ohm\n2026-03-01T07:12:00.000Z,Carlos,"82,4",\n';
    expect(importReadingsCsv(text)[0]).toMatchObject({ weightKg: 82.4, impedance: null, profileName: 'Carlos' });
  });
});
