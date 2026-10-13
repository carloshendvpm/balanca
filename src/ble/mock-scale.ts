import { toHex } from '@/core/protocol/parse';

import type { Advertisement } from '../../modules/okok-scanner';

// Simulator used on web / Expo Go: builds real C0 advertisements so the
// whole parse → capture pipeline is exercised.
let nextWeightKg = 82.4;

/** Lets the UI (and tests) choose what the next simulated weighing reads. */
export function setSimulatedWeight(kg: number) {
  nextWeightKg = kg;
}

function c0Payload(weightKg: number, impedance: number, stable: boolean) {
  const w = Math.round(weightKg * 100);
  const z = Math.round(impedance * 10);
  // attrib: bit0 stable, bits1-2 resolution (10 = 2 decimals), bits3-4 unit kg
  const attrib = (stable ? 1 : 0) | (0b10 << 1);
  return Uint8Array.from([w >> 8, w & 0xff, z >> 8, z & 0xff, 0x0a, 0x01, attrib, 0x24, 0x16, 0x51, 0x4b, 0x12, 0x3c]);
}

export function startMockScale(onAdvertisement: (ad: Advertisement) => void): () => void {
  const target = nextWeightKg;
  const impedance = 480 + Math.random() * 40;
  let tick = 0;
  const timer = setInterval(() => {
    tick++;
    const settling = tick < 12;
    const w = settling ? target * (tick / 12) + (Math.random() - 0.5) * 0.6 : target;
    // Impedance only appears a few ticks after the weight settles, like the real scale.
    const z = tick > 18 ? impedance : 0;
    const data = c0Payload(Math.max(0, w), z, !settling);
    onAdvertisement({ id: 'SIMULATED', name: '', rssi: -50, manufacturerData: 'c007' + toHex(data) });
    if (tick > 30) clearInterval(timer);
  }, 250);
  return () => clearInterval(timer);
}
