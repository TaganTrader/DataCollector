'use strict';

const DataProvider = require('./DataProvider/DataProvider');
const StorageData = require('./StorageData/StorageData');
const BitmexCollector = require('./Collector/Bitmex/BitmexCollector');

global.env_config = require('./env');


class App {

    constructor() {
        this.storageData = new StorageData(env_config.database);        

        this.storageData.on('ready', () => {

            this.bitmexCollector = new BitmexCollector({
                symbol: "XBTUSD",
                max_amount: 500,
            });    

            this.dataProvider = new DataProvider({
                key_pm: './SSL/privkey.dat',
                cert_pm: './SSL/fullchain.dat',
                port: 8443
            });

        })
    }

}



global.app = new App();
