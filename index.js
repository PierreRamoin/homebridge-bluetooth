import noble from "noble";
import BluetoothCharacteristicFactory from "./source/characteristic.js";
import BluetoothServiceFactory from "./source/service.js";
import BluetoothAccessoryFactory from "./source/accessory.js";
import BluetoothPlatformFactory from "./source/platform.js";

import fakegato from "fakegato-history";

var Noble, Accessory, Service, Characteristic, UUIDGen, FakeGatoHistoryService;

export default function (homebridge) {
  console.log("Homebridge API version: " + homebridge.version);

  Noble = noble;
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  FakeGatoHistoryService = fakegato(homebridge);
  console.log(FakeGatoHistoryService)

  let BluetoothCharacteristic = BluetoothCharacteristicFactory(Characteristic);
  let BluetoothService = BluetoothServiceFactory(Service, BluetoothCharacteristic);
  let BluetoothAccessory = BluetoothAccessoryFactory(Accessory, BluetoothService);
  let BluetoothPlatform = BluetoothPlatformFactory(Noble, UUIDGen, Accessory, BluetoothAccessory);

  homebridge.registerPlatform("homebridge-bluetooth", "Bluetooth", BluetoothPlatform, true);
}
