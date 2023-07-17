let Service;
let BluetoothCharacteristic;
import chalk from 'chalk';

export default function (service, bluetoothCharacteristic) {
    Service = service;
    BluetoothCharacteristic = bluetoothCharacteristic;
    return BluetoothService;
}

class BluetoothService {
    constructor(log, {name, type, UUID, characteristics}, prefix) {
        this.log = log;
        this.fakeGatoService = undefined;
        if (!name) {
            throw new Error("Missing mandatory config 'name'");
        }
        this.name = name;
        this.prefix = `${prefix} ${chalk.magenta(`[${this.name}]`)}`;

        if (!type) {
            throw new Error(`${this.prefix} Missing mandatory config 'type'`);
        }
        this.type = type;
        if (!Service[this.type]) {
            throw new Error(`${this.prefix} Service type '${this.type}' is not defined. See 'HAP-NodeJS/lib/gen/HomeKitType.js' for options.`)
        }
        this.class = Service[this.type]; // For example - Service.Lightbulb

        if (!UUID) {
            throw new Error(`${this.prefix} Missing mandatory config 'UUID'`);
        }
        this.UUID = UUID;

        if (!characteristics || !(characteristics instanceof Array)) {
            throw new Error(`${this.prefix} Missing mandatory config 'characteristics'`);
        }

        this.log.debug(this.prefix, `Initialized | Service.${this.type} (${this.UUID})`);
        this.bluetoothCharacteristics = {};
        for (const characteristicConfig of characteristics) {
            const characteristicUUID = trimUUID(characteristicConfig.UUID);
            this.bluetoothCharacteristics[characteristicUUID] =
                new BluetoothCharacteristic(this.log, characteristicConfig, this.prefix);
        }

        this.homebridgeService = null;
        this.nobleService = null;
        this.historyService = null;
    }

    connect(nobleService, homebridgeService) {
        this.log.info(this.prefix, "Connected");
        this.log.debug(this.prefix, `Service.${this.type} (${this.UUID})`);
        this.homebridgeService = homebridgeService;

        this.nobleService = nobleService;
        this.nobleService.discoverCharacteristics([], this.discoverCharacteristics.bind(this));
    }

    discoverCharacteristics(error, nobleCharacteristics) {
        if (error) {
            this.log.error(this.prefix, `Discover characteristics failed | ${error}`);
            return;
        }
        if (nobleCharacteristics.length == 0) {
            this.log.warn(this.prefix, "No characteristics discovered");
            return;
        }

        for (const nobleCharacteristic of nobleCharacteristics) {
            const characteristicUUID = trimUUID(nobleCharacteristic.uuid);
            const bluetoothCharacteristic = this.bluetoothCharacteristics[characteristicUUID];
            if (!bluetoothCharacteristic) {
                this.log.debug(this.prefix, `Ignored | Characteristic (${nobleCharacteristic.uuid})`);
                continue;
            }
            if (this.fakeGatoService !== undefined) {
                this.log.info("works on service!");
                bluetoothCharacteristic.fakeGatoService = this.fakeGatoService;
            } else {
                this.log.warn("Booouuhh on service!");
            }
            const homebridgeCharacteristic =
                this.homebridgeService.getCharacteristic(bluetoothCharacteristic.class);
            bluetoothCharacteristic.connect(nobleCharacteristic, homebridgeCharacteristic);
        }
    }

    disconnect() {
        for (const characteristicUUID in this.bluetoothCharacteristics) {
            this.bluetoothCharacteristics[characteristicUUID].disconnect();
        }
        if (this.nobleCharacteristic && this.homebridgeCharacteristic) {
            this.homebridgeService = null;
            this.nobleService = null;
            this.log.info(this.prefix, "Disconnected");
        }
    }
}


function trimUUID(uuid) {
    return uuid.toLowerCase().replace(/:/g, "").replace(/-/g, "");
}
