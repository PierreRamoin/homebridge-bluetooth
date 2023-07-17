import homebridgeLib from "homebridge-lib";

let Noble;
let UUIDGen;
let Accessory;
let BluetoothAccessory;
let Eve;

import fakegato from "fakegato-history";

export default function (noble, uuidGen, accessory, bluetoothAccessory, eve) {
    Noble = noble;
    UUIDGen = uuidGen
    Accessory = accessory;
    BluetoothAccessory = bluetoothAccessory;
    Eve = eve;
    return BluetoothPlatform;
}

class BluetoothPlatform extends homebridgeLib.Platform {
    constructor(log, config, homebridgeAPI) {
        super(log, config, homebridgeAPI);
        this.log = log;
        if (!config) {
            this.log.warn("Missing mandatory platform config named 'Bluetooth'");
            return;
        }

        if (!config.accessories || !(config.accessories instanceof Array)) {
            this.log.warn("Missing mandatory config 'accessories'");
            return;
        }
        this.bluetoothAccessories = {};
        for (const accessoryConfig of config.accessories) {
            const accessoryAddress = trimAddress(accessoryConfig.address);
            let bluetoothAccessory = new BluetoothAccessory(this, this.log, accessoryConfig);
            this.bluetoothAccessories[accessoryAddress] = bluetoothAccessory;
        }
        this.cachedHomebridgeAccessories = {};

        this.homebridgeAPI = homebridgeAPI;
        this.homebridgeAPI.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }

    configureAccessory(homebridgeAccessory) {
        const accessoryAddress = homebridgeAccessory.context['address'];
        const bluetoothAccessory = this.bluetoothAccessories[accessoryAddress];
        bluetoothAccessory.fakeGatoService = new this.FakeGatoHistoryService(
            "room",
            bluetoothAccessory,
            {storage: 'fs', path: "/homebridge"}
        )
        if (!bluetoothAccessory) {
            this.log.debug(`Removed | ${homebridgeAccessory.displayName} (${accessoryAddress})`);
            this.homebridgeAPI.unregisterPlatformAccessories("homebridge-bluetooth", "Bluetooth",
                [homebridgeAccessory]);
            return;
        }

        this.log.debug(`Persist | ${homebridgeAccessory.displayName} (${accessoryAddress})`);
        this.cachedHomebridgeAccessories[accessoryAddress] = homebridgeAccessory;
    }

    didFinishLaunching() {
        Noble.on('stateChange', this.stateChange.bind(this));
    }

    stateChange(state) {
        if (state != 'poweredOn') {
            this.log.info(`Stopped | ${state}`);
            Noble.stopScanning();
        }

        this.log.info(`Started | ${state}`);
        Noble.startScanning([], false);
        Noble.on('discover', this.discover.bind(this));
    }

    discover(nobleAccessory) {
        const accessoryAddress = trimAddress(nobleAccessory.address);
        const bluetoothAccessory = this.bluetoothAccessories[accessoryAddress];
        if (!bluetoothAccessory) {
            this.log.debug(`Ignored | ${nobleAccessory.advertisement.localName} (${nobleAccessory.address}) | RSSI ${nobleAccessory.rssi}dB`);
            return;
        }

        this.log.debug(`Discovered | ${nobleAccessory.advertisement.localName} (${nobleAccessory.address}) | RSSI ${nobleAccessory.rssi}dB`);
        nobleAccessory.connect(error => {
            this.connect(error, nobleAccessory)
        });
    }

    connect(error, nobleAccessory) {
        if (error) {
            this.log.error(`Connecting failed | ${nobleAccessory.advertisement.localName} (${nobleAccessory.address}) | ${error}`);
            return;
        }

        const accessoryAddress = trimAddress(nobleAccessory.address);
        const bluetoothAccessory = this.bluetoothAccessories[accessoryAddress];
        let homebridgeAccessory = this.cachedHomebridgeAccessories[accessoryAddress];
        if (!homebridgeAccessory) {
            homebridgeAccessory = new Accessory(bluetoothAccessory.name,
                UUIDGen.generate(bluetoothAccessory.name));
            homebridgeAccessory.context['address'] = accessoryAddress;
            this.homebridgeAPI.registerPlatformAccessories("homebridge-bluetooth", "Bluetooth",
                [homebridgeAccessory]);
        } else {
            delete this.cachedHomebridgeAccessories[accessoryAddress];
        }

        bluetoothAccessory.connect(nobleAccessory, homebridgeAccessory);
        nobleAccessory.once('disconnect', error => {
            this.disconnect(nobleAccessory, homebridgeAccessory, error);
        });

        if (Object.keys(this.cachedHomebridgeAccessories).length > 0) {
            Noble.startScanning([], false);
        }
    }

    disconnect({address}, homebridgeAccessory, error) {
        const accessoryAddress = trimAddress(address);
        this.cachedHomebridgeAccessories[accessoryAddress] = homebridgeAccessory;

        Noble.startScanning([], false);
    }
}


function trimAddress(address) {
    return address.toLowerCase().replace(/:/g, "");
}
