'use strict'

const DB = require('../MySQL/MySQLWrapper');
const DateBaseInit = require('./DataBaseInit');
const EventEmitter = require("events").EventEmitter;
const _ = require('lodash');

class StorageData extends EventEmitter {
    
    constructor (config) {
        super();
        
        this.config = config;
        this.db = new DB(config);
        this.candles = [];
        let dbInit = new DateBaseInit(config);
        dbInit.on('inited', () => {            
            this.emit('ready');
        });        
        this.selectLastData();
    }


    selectCandlesFromTo(from, to) {
        return new Promise((resolve, reject) => {
            let startTime = new Date().getTime();
            this.db.query("select * from ?? where `timestamp` >= ? and `timestamp` <= ? and close <> 0", ['xbtusd_1', from, to])
                .then(rows => {
                    resolve(rows);
                    //console.log(rows.length, 'extraction: ' + (new Date().getTime() - startTime) + 'ms');
                })
            //setTimeout(() => { reject() }, 5000);
        })        
    }

    selectLastData() {
        let startTime = new Date().getTime();
        this.db.query("use ??", [this.config.schema])
            .then(() => this.db.query("select * from ?? where `timestamp` > ? and close <> 0", ['xbtusd_1', new Date().getTime() / 1000 - 1000 * 60])
            .then(rows => {
                rows.reverse();                
                this.candles = rows;
                console.log(rows.length, 'extraction: ' + (new Date().getTime() - startTime) + 'ms');
            }))
               
    }
    

    update (candles) {
        if (candles.length == 0)
        {
            console.error('candles length below 0');
            return;
        }       
        for (let i = candles.length - 1; i >= 0; i--) {
            if ((new Date(candles[i].timestamp).getTime() / 1000) - 60 == this.candles[0].timestamp) {
                this.candles[0] = {
                    timestamp: (new Date(candles[i].timestamp).getTime() / 1000) - 60,
                    open: candles[i].open,
                    close: candles[i].close,
                    low: candles[i].low,
                    high: candles[i].high,
                    volume: candles[i].volume,
                    trades: candles[i].trades,
                };
            } else
            if ((new Date(candles[i].timestamp).getTime() / 1000) - 60 == this.candles[1].timestamp) {                
                this.candles[1] = {
                    timestamp:  (new Date(candles[i].timestamp).getTime() / 1000) - 60,
                    open: candles[i].open,
                    close: candles[i].close,
                    low: candles[i].low,
                    high: candles[i].high,
                    volume: candles[i].volume,
                    trades: candles[i].trades,
                };
            }
            if ((new Date(candles[i].timestamp).getTime() / 1000) - 60 > this.candles[0].timestamp) {
                let candle = {
                    timestamp: (new Date(candles[i].timestamp).getTime() / 1000) - 60,
                    open: candles[i].open,
                    close: candles[i].close,
                    low: candles[i].low,
                    high: candles[i].high,
                    volume: candles[i].volume,
                    trades: candles[i].trades,
                };                
                this.candles.unshift(candle);
            }
        }
        while (this.candles.length > 1000)
            this.candles.pop();
        //this.candles[0].timestamp
    }
}

module.exports = StorageData;