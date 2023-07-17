import homebridgeLib from "homebridge-lib";

let Accessory;
let BluetoothService;
import chalk from 'chalk';
import eve from "homebridge-lib"
export default function (accessory, bluetoothService) {
  Accessory = accessory;
  BluetoothService = bluetoothService;

  return BluetoothAccessory;
}

class BluetoothAccessory extends homebridgeLib.AccessoryDelegate {
  constructor(log, {name, address, services}) {
    super();
    this.log = log;
    this.fakeGatoService = undefined;
    Accessory.log = this.log;

    if (!name) {
      throw new Error("Missing mandatory config 'name'");
    }
    this.name = name;
    this.displayName = name
    this.prefix = chalk.blue(`[${name}]`);

    if (!address) {
      throw new Error(`${this.prefix} Missing mandatory config 'address'`);
    }
    this.address = address;

    if (!services || !(services instanceof Array)) {
      throw new Error(`${this.prefix} Missing mandatory config 'services'`);
    }

    this.log.debug(this.prefix, `Initialized | ${this.name} (${this.address})`);
    this.bluetoothServices = {};
    for (const serviceConfig of services) {
      const serviceUUID = trimUUID(serviceConfig.UUID);
      this.bluetoothServices[serviceUUID] = new BluetoothService(this.log, serviceConfig,
          this.prefix);
    }

    const informationServiceUUID = trimUUID('180A');
    if (!(informationServiceUUID in this.bluetoothServices)) {
      let informationServiceConfig = {
        "name": "Information",
        "type": "AccessoryInformation",
        "UUID": "180A",
        "characteristics": [
          {"type": "Manufacturer", "UUID": "2A29"},
          {"type": "Model", "UUID": "2A24"},
          {"type": "SerialNumber", "UUID": "2A25"}
        ]
      };
      this.bluetoothServices[informationServiceUUID]
          = new BluetoothService(this.log, informationServiceConfig, this.prefix);

    }

    this.homebridgeAccessory = null;
    this.nobleAccessory = null;
  }

  connect(nobleAccessory, homebridgeAccessory) {
    this.log.info(this.prefix, `Connected | ${this.name} (${this.address})`);
    this.homebridgeAccessory = homebridgeAccessory;
    this.homebridgeAccessory.on('identify', this.identification.bind(this));
    this.homebridgeAccessory.updateReachability(true);

    this.nobleAccessory = nobleAccessory;
    this.nobleAccessory.once('disconnect', this.disconnect.bind(this));
    this.nobleAccessory.discoverServices([], this.discoverServices.bind(this));
  }

  discoverServices(error, nobleServices) {
    if (error) {
      this.log.error(this.prefix, `Discover services failed | ${error}`);
      return;
    }
    if (nobleServices.length == 0) {
      this.log.warn(this.prefix, "No services discovered");
      return;
    }

    for (const nobleService of nobleServices) {
      const serviceUUID = trimUUID(nobleService.uuid);
      const bluetoothService = this.bluetoothServices[serviceUUID];
      if (!bluetoothService) {
        if (nobleService.uuid != '1800' && nobleService.uuid != '1801') {
          this.log.debug(this.prefix, `Ignored | Service (${nobleService.uuid})`);
        }
        continue;
      }

      let homebridgeService = this.homebridgeAccessory.getService(bluetoothService.class);
      if (!homebridgeService) {
        homebridgeService = this.homebridgeAccessory.addService(bluetoothService.class,
            bluetoothService.name);
      }
      if (this.fakeGatoService !== undefined) {
        this.log.info("works on accessory!");
        bluetoothService.fakeGatoService = this.fakeGatoService;
      } else {
        this.log.warn("Booouuhh on accessory!");
      }
      bluetoothService.connect(nobleService, homebridgeService);
    }
  }

  identification(paired, callback) {
    this.log.info(this.prefix, "Identify");
    callback();
  }

  disconnect(error) {
    if (error) {
      this.log.error(`Disconnecting failed | ${this.name} (${this.address}) | ${error}`);
    }

    for (const serviceUUID in this.bluetoothServices) {
      this.bluetoothServices[serviceUUID].disconnect();
    }
    if (this.nobleAccessory && this.homebridgeAccessory) {
      this.homebridgeAccessory.removeAllListeners('identify');
      this.homebridgeAccessory.updateReachability(false);
      this.homebridgeAccessory = null;
      this.nobleAccessory.removeAllListeners();
      this.nobleAccessory = null;
      this.log.info(this.prefix, "Disconnected");
    }
  }
}


function trimUUID(uuid) {
  return uuid.toLowerCase().replace(/:/g, "").replace(/-/g, "");
}
