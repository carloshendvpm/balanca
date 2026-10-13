import type { ManufacturerData } from './parse';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of clean) {
    buf = (buf << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * CoreBluetooth (and react-native-ble-plx) deliver the manufacturer data
 * prefixed by the 16-bit company ID in little-endian. bleak instead exposes
 * {companyId: payload}; normalise to that shape so the parsers match Python.
 */
export function splitManufacturerData(raw: Uint8Array): ManufacturerData {
  const md: ManufacturerData = new Map();
  if (raw.length < 2) return md;
  md.set(raw[0] | (raw[1] << 8), raw.slice(2));
  return md;
}
