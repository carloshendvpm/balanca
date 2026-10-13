import OkokScanner, { type Advertisement, type BluetoothState } from '../../modules/okok-scanner';
import { hexToBytes, splitManufacturerData } from '@/core/protocol/ios-adv';
import { findC0Key, parseOkok, type ScaleReading } from '@/core/protocol/parse';

import { startMockScale } from './mock-scale';

export type { Advertisement, BluetoothState };

export interface ScaleHandlers {
  onReading(reading: ScaleReading, deviceId: string): void;
  onAdvertisement?(ad: Advertisement): void;
  onState?(state: BluetoothState | 'simulated'): void;
}

const KNOWN_NAMES = new Set(['ADV', 'Chipsea-BLE', 'OKOK Nameless']);

// Mirrors is_okok_device() in okok_ble_reader.py.
export function isOkokName(name: string) {
  const l = name.toLowerCase();
  return KNOWN_NAMES.has(name) || l.startsWith('yoda0') || l.startsWith('yoda1');
}

export function readingFromAdvertisement(ad: Advertisement): ScaleReading | null {
  const md = splitManufacturerData(hexToBytes(ad.manufacturerData));
  if (!isOkokName(ad.name) && findC0Key(md) === undefined) return null;
  return parseOkok(md);
}

export const isSimulated = OkokScanner === null;

/** Starts scanning (or the simulator where Bluetooth is unavailable). Returns a stop function. */
export function startScale(h: ScaleHandlers): () => void {
  const onAd = (ad: Advertisement) => {
    h.onAdvertisement?.(ad);
    const r = readingFromAdvertisement(ad);
    if (r) h.onReading(r, ad.id);
  };
  if (!OkokScanner) {
    h.onState?.('simulated');
    return startMockScale(onAd);
  }
  const scanner = OkokScanner;
  const subs = [
    scanner.addListener('onStateChange', (e) => h.onState?.(e.state)),
    scanner.addListener('onAdvertisement', onAd),
  ];
  scanner.start();
  return () => {
    scanner.stop();
    subs.forEach((s) => s.remove());
  };
}
