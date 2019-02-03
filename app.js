'use strict';

const StorageData = require('./StorageData/StorageData');
const MySQLWrapper = require('./MySQL/MySQLWrapper');
const BitmexCollector = require('./Collector/Bitmex/BitmexCollector');

global.env_config = require('./env');

let dp = new StorageData(env_config.database);
let mysql = new MySQLWrapper(env_config.database);


let bitmexCollector = new BitmexCollector({
    symbol: "XBTUSD",
    max_amount: 500,
});