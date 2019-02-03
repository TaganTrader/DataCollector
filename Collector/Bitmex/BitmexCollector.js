'use strict'

const _ = require('lodash');
const fs = require('fs');
const Collector = require('../Collector');
const RestConnection = require('./RestConnection');
const dedent = require('dedent');
const DB = require('../../MySQL/MySQLWrapper');

const default_config = {
    symbol: "XBTUSD",
    tablename: "XBTUSD_1",
    max_amount: 500,
    data_from: '00:00:00 01.01.2017',
}

class BitmexCollector extends Collector {
 
    constructor (config)
    {
        super();
        this.config = _.extend({}, default_config, config);
        
        this.symbol = this.config.symbol;        

        this.db = new DB(env_config.database);

        this.rest = new RestConnection({
            server: "www.bitmex.com",
            key: "",
            sec: "",
        });

        //this.collect();
    }

    candlesQuery (params) {
        return new Promise((resolve, reject) => {
            let _params = _.extend({}, {
                binSize: '1m',
                partial: false,
                symbol: this.symbol,
                count: this.config.max_amount,
                reverse: true,
            }, params);

            this.rest.make_public_request('trade/bucketed', _params, 'GET', (error, data) => {
                if (error) {
                    reject(error)
                    return;
                }
                resolve(data);
            });
        });
    }


    addCandlesToDB (candles) {
        if (!candles || candles.length == 0) return;

        let summarySql = dedent`
            INSERT INTO ${this.config.tablename}
            (timestamp, open, close, low, high, volume, trades, updated_at, month, year)
            VALUES
            `        
        for (let i in candles) {
            if (!candles.hasOwnProperty(i)) continue;
            let candle = candles[i];

            let timestamp = new Date(candle.timestamp).getTime() / 1000 - 60; // т.к. битмекс пишет время закрытия свечи, а нам нужно время открытия
            let month = new Date(candle.timestamp).getMonth() + 1;
            let year = new Date(candle.timestamp).getFullYear();

            let sql = '(FROM_UNIXTIME(?), ?, ?, ?, ?, ?, ?, now(), ?, ?),';
            let values = 
                [timestamp, candle.open, candle.close, candle.low, candle.high, candle.volume, candle.trades, month, year];
            summarySql += this.db.mysql.format(sql, values);
        }
        summarySql = summarySql.substr(0, summarySql.length - 1);
        return this.db.query(summarySql);
    }

    addCandlesToFile (candles) {
        //fs.mkdirSync(`./~Data/${this.config.tablename}/`, { recursive: true });
    }


    

    /*
    selectAllData() {
        let startTime = new Date().getTime();
        this.db.query("select * from ?? where `timestamp` > ?", [this.config.tablename, new Date().getTime() / 1000 - 100000 * 60]).then(rows => {
           
            console.log(rows.length, rows[100].month, rows[100].year, 'extraction: ' + (new Date().getTime() - startTime) + 'ms');
        })
        return 0
    }
    */

    collect () {
        this.db.query("use ??;", [env_config.database.schema])
            .then(rows => this.db.query("select max(`timestamp`) as mx, min (`timestamp`) as mn from ??", [this.config.tablename]))        
            .then(rows => {
                return this.selectAllData();
                // Если нет ни одной записи
                if (rows[0].mn === null)
                {
                    return this.candlesQuery()
                } else
                {
                    // Загрузка свечей с конца
                    return this.candlesQuery({
                        endTime: rows[0].mn.getTime()
                    })
                }                
            })
            .then(candles => {
                //return this.addCandlesToDB(candles)
            })
            .then(rows => {
                console.log('added: '/*, rows.affectedRows*/)
                //setTimeout(() => this.collect(), 1);
            })

        /*
        this.candlesQuery()
            .then(candles => {
                console.log(candles[0])    
            });*/
    }

}

module.exports = BitmexCollector;