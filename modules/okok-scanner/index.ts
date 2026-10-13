import { NativeModule, requireOptionalNativeModule } from 'expo';

export interface Advertisement {
  id: string;
  name: string;
  rssi: number;
  /** Hex, including the 2-byte little-endian company ID prefix. */
  manufacturerData: string;
}

export type BluetoothState =
  | 'poweredOn'
  | 'poweredOff'
  | 'unauthorized'
  | 'unsupported'
  | 'resetting'
  | 'unknown';

type Events = {
  onAdvertisement(ad: Advertisement): void;
  onStateChange(e: { state: BluetoothState }): void;
};

declare class OkokScannerModule extends NativeModule<Events> {
  start(): void;
  stop(): void;
}

/** null on platforms without the native module (web, Expo Go). */
export default requireOptionalNativeModule<OkokScannerModule>('OkokScanner');
