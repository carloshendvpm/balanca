# /// script
# requires-python = ">=3.11"
# dependencies = ["bleak"]
# ///
"""
Scans BLE advertisements for a while and prints every device that sends
manufacturer data, in the same hex format the iOS app receives
(2-byte little-endian company ID + payload). Step on the scale while it runs.

    uv run tools/scan_okok.py [seconds]
"""

import asyncio
import sys
import time

from bleak import BleakScanner

OKOK_IDS = {0x20CA, 0x11CA, 0xF0FF}
OKOK_NAMES = {"ADV", "Chipsea-BLE", "OKOK Nameless"}


def looks_okok(name: str, cid: int) -> bool:
    n = name.lower()
    return (
        cid in OKOK_IDS
        or (cid & 0xFF) == 0xC0
        or name in OKOK_NAMES
        or n.startswith("yoda0")
        or n.startswith("yoda1")
    )


async def main(seconds: float) -> None:
    seen: dict[str, tuple[str, int, str]] = {}  # address -> (name, rssi, last hex)
    start = time.time()

    def on_adv(device, adv):
        name = adv.local_name or device.name or ""
        for cid, payload in adv.manufacturer_data.items():
            hexdata = (cid.to_bytes(2, "little") + payload).hex()
            prev = seen.get(device.address)
            if looks_okok(name, cid) and (prev is None or prev[2] != hexdata):
                print(f"[{time.time() - start:5.1f}s] OKOK? {name or '(sem nome)'} {device.address} rssi={adv.rssi} hex={hexdata}", flush=True)
            seen[device.address] = (name, adv.rssi, hexdata)

    print(f"Escaneando por {seconds:.0f}s... suba na balança agora.", flush=True)
    async with BleakScanner(on_adv):
        await asyncio.sleep(seconds)

    print("\nResumo (sinal mais forte primeiro):")
    for addr, (name, rssi, hexdata) in sorted(seen.items(), key=lambda kv: -kv[1][1])[:15]:
        print(f"  {rssi:4d} dBm  {name or '(sem nome)':20s} {addr}  {hexdata}")


if __name__ == "__main__":
    asyncio.run(main(float(sys.argv[1]) if len(sys.argv) > 1 else 60))
