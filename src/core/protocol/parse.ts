// Port of okok_ble_reader.py (github.com/100nandoo/okok-bia-formulas).
// The scale only broadcasts BLE advertisements; each parser receives the
// manufacturer-specific payload *without* the 2-byte company ID.

export type Variant = 'V20' | 'V11' | 'VF0' | 'C0';

export type ManufacturerData = Map<number, Uint8Array>;

export interface ScaleReading {
  variant: Variant;
  weightKg: number;
  impedance: number | null;
  stable: boolean;
  rawHex: string;
}

export const MANUF_V20 = 0x20ca;
export const MANUF_V11 = 0x11ca;
export const MANUF_VF0 = 0xf0ff;

const UNIT_KG = 0;
const UNIT_JIN = 1;
const UNIT_LB = 2;
const UNIT_STLB = 3;

export const u16be = (msb: number, lsb: number) => ((msb & 0xff) << 8) | (lsb & 0xff);

export const toHex = (data: Uint8Array) =>
  Array.from(data, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

const resolveDivider = (resBits: number) => ({ 0: 10, 1: 1, 2: 100 })[resBits] ?? 10;

function toKgFromUnit(raw: number, unit: number, divider: number): number | null {
  switch (unit) {
    case UNIT_KG:
      return raw / divider;
    case UNIT_JIN:
      return raw / divider / 2;
    case UNIT_LB:
      return raw / divider / 2.204623;
    case UNIT_STLB:
      return (raw >> 8) * 6.350293 + ((raw & 0xff) / divider) * 0.453592;
    default:
      return null;
  }
}

type Parsed = { weightKg: number; impedance: number | null; stable: boolean };

/** V20: 19 bytes, stable flag data[6] bit0, XOR checksum at data[12]. */
export function parseV20(data: Uint8Array): Parsed | null {
  if (data.length !== 19) return null;
  let checksum = 0x20;
  for (let i = 0; i < 12; i++) checksum ^= data[i];
  if ((checksum & 0xff) !== data[12]) return null;

  const divider = data[6] & 0x04 ? 100 : 10;
  const impRaw = u16be(data[10], data[11]);
  return {
    weightKg: u16be(data[8], data[9]) / divider,
    impedance: impRaw > 0 ? impRaw / 10 : null,
    stable: (data[6] & 0x01) === 1,
  };
}

/** V11: 23 bytes, XOR checksum at data[16], unit/resolution in data[9]. */
export function parseV11(data: Uint8Array): Parsed | null {
  if (data.length !== 23) return null;
  let checksum = 0xca ^ 0x11;
  for (let i = 0; i < 16; i++) checksum ^= data[i];
  if ((checksum & 0xff) !== data[16]) return null;

  const props = data[9];
  const kg = toKgFromUnit(u16be(data[3], data[4]), (props >> 3) & 0x3, resolveDivider((props >> 1) & 0x3));
  if (kg === null) return null;
  // V11 carries no stability flag; the caller settles on repeated values.
  return { weightKg: kg, impedance: null, stable: true };
}

/** VF0: weight little-endian at data[2..3], tenths of kg. */
export function parseVF0(data: Uint8Array): Parsed | null {
  if (data.length < 4) return null;
  return { weightKg: u16be(data[3], data[2]) / 10, impedance: null, stable: true };
}

// C0 scales broadcast 0x1770 (600.0 Ω) in the impedance slot whenever there is
// no measurement, even with nobody on the scale; it is not a real reading.
export const C0_NO_IMPEDANCE = 0x1770;

/** C0: any company ID whose low byte is 0xC0 (high byte = sequence number). */
export function parseC0(data: Uint8Array): Parsed | null {
  if (data.length < 7) return null;
  const attrib = data[6];
  const kg = toKgFromUnit(u16be(data[0], data[1]), (attrib >> 3) & 0x3, resolveDivider((attrib >> 1) & 0x3));
  if (kg === null) return null;
  const impRaw = u16be(data[2], data[3]);
  const impedance = impRaw > 0 && impRaw !== C0_NO_IMPEDANCE ? impRaw / 10 : null;
  return { weightKg: kg, impedance, stable: (attrib & 0x01) === 1 };
}

export const findC0Key = (md: ManufacturerData) => [...md.keys()].find((k) => (k & 0xff) === 0xc0);

/**
 * Try all parsers in the same priority order as the Python script.
 * Unlike the script, unstable readings are returned (stable=false) so the UI
 * can show the weight settling live.
 */
export function parseOkok(md: ManufacturerData): ScaleReading | null {
  const attempts: [Variant, number | undefined, (d: Uint8Array) => Parsed | null][] = [
    ['V20', MANUF_V20, parseV20],
    ['V11', MANUF_V11, parseV11],
    ['VF0', MANUF_VF0, parseVF0],
    ['C0', findC0Key(md), parseC0],
  ];
  for (const [variant, key, parser] of attempts) {
    const data = key === undefined ? undefined : md.get(key);
    if (!data) continue;
    const r = parser(data);
    if (r) return { variant, ...r, rawHex: toHex(data) };
  }
  return null;
}
