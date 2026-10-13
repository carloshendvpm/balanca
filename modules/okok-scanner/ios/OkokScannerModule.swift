import CoreBluetooth
import ExpoModulesCore

// OKOK scales never accept connections: they only broadcast the weight in the
// manufacturer data of their advertisements. This module scans passively and
// forwards every advertisement that carries manufacturer data.
public class OkokScannerModule: Module {
  private var scanner: Scanner?

  public func definition() -> ModuleDefinition {
    Name("OkokScanner")

    Events("onAdvertisement", "onStateChange")

    Function("start") {
      if self.scanner == nil {
        self.scanner = Scanner(
          onAdvertisement: { [weak self] payload in self?.sendEvent("onAdvertisement", payload) },
          onState: { [weak self] state in self?.sendEvent("onStateChange", ["state": state]) }
        )
      }
      self.scanner?.start()
    }

    Function("stop") {
      self.scanner?.stop()
    }

    OnDestroy {
      self.scanner?.stop()
    }
  }
}

private final class Scanner: NSObject, CBCentralManagerDelegate {
  private var central: CBCentralManager?
  private var wantsScan = false
  private let onAdvertisement: ([String: Any]) -> Void
  private let onState: (String) -> Void

  init(onAdvertisement: @escaping ([String: Any]) -> Void, onState: @escaping (String) -> Void) {
    self.onAdvertisement = onAdvertisement
    self.onState = onState
    super.init()
  }

  func start() {
    wantsScan = true
    if let central = central {
      if central.state == .poweredOn { scan() }
    } else {
      central = CBCentralManager(delegate: self, queue: nil)
    }
  }

  func stop() {
    wantsScan = false
    central?.stopScan()
  }

  private func scan() {
    central?.scanForPeripherals(
      withServices: nil,
      options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
    )
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    let names: [CBManagerState: String] = [
      .poweredOn: "poweredOn", .poweredOff: "poweredOff", .unauthorized: "unauthorized",
      .unsupported: "unsupported", .resetting: "resetting",
    ]
    onState(names[central.state] ?? "unknown")
    if central.state == .poweredOn && wantsScan { scan() }
  }

  func centralManager(
    _ central: CBCentralManager,
    didDiscover peripheral: CBPeripheral,
    advertisementData: [String: Any],
    rssi RSSI: NSNumber
  ) {
    guard let data = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data else { return }
    let name = (advertisementData[CBAdvertisementDataLocalNameKey] as? String) ?? peripheral.name ?? ""
    onAdvertisement([
      "id": peripheral.identifier.uuidString,
      "name": name,
      "rssi": RSSI.intValue,
      "manufacturerData": data.map { String(format: "%02x", $0) }.joined(),
    ])
  }
}
