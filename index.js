import noble from "noble";
import BluetoothCharacteristicFactory from "./source/characteristic.js";
import BluetoothServiceFactory from "./source/service.js";
import BluetoothAccessoryFactory from "./source/accessory.js";
import BluetoothPlatformFactory from "./source/platform.js";
import homebridgeLib from "homebridge-lib"
import packageJson from "./package.json" assert { type: "json" }

var Noble, Accessory, Service, Characteristic, UUIDGen, FakeGatoHistoryService, Eve;

export default function (homebridge) {
  console.log("Homebridge API version: " + homebridge.version);

  Noble = noble;
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  Eve = new homebridgeLib.EveHomeKitTypes(homebridge);
  let BluetoothCharacteristic = BluetoothCharacteristicFactory(Characteristic, FakeGatoHistoryService);
  let BluetoothService = BluetoothServiceFactory(Service, BluetoothCharacteristic);
  let BluetoothAccessory = BluetoothAccessoryFactory(Accessory, BluetoothService);
  let BluetoothPlatform = BluetoothPlatformFactory(Noble, UUIDGen, Accessory, BluetoothAccessory, Eve);
  BluetoothPlatform.loadPlatform(homebridge, packageJson, "Bluetooth", BluetoothPlatform);
}
