'use strict'

const _ = require('lodash');
const fs = require('fs');
const DB = require('../../MySQL/MySQLWrapper');
const dedent = require('dedent');
const Collector = require('../Collector');
const RestConnection = require('./RestConnection');
const WebSocketConnection = require('./WebSocketConnection');

const default_config = {
    symbol: "XBTUSD",
    tablename: "xbtusd_1",
    max_amount: 500,
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
            key: "CY42FTvuG1ymMBovPzURuunK",
            sec: "kQMJhSHeKBp2_wOBYzo8FebX_lDDSsQs28S72n3cxF2XKo5s",
        });

        this.sock = new WebSocketConnection();
        this.sock.ondata = this.onTradesData;

        this.collect();
    }

    onTradesData (data) {
        app.dataProvider.broadcast({
            method: "lastPrice",
            params: {
                price: data[data.length - 1].price,
                timestamp: data[data.length - 1].timestamp,
            }
        });
        //console.log(data[0].price);
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


    updateCandlesOnDB (candles) {
        if (!candles || candles.length == 0) return;

        let summarySql = "start transaction;";

        for (let i = candles.length - 1; i >= 0; i--) {            
            let candle = candles[i];
            let timestamp = new Date(candle.timestamp).getTime() / 1000 - 60; // т.к. битмекс пишет время закрытия свечи, а нам нужно время открытия            
            let sql = dedent`
                update ${this.config.tablename} set 
                    open = ${candle.open},
                    close = ${candle.close},
                    low = ${candle.low},
                    high = ${candle.high},
                    volume = ${candle.volume},
                    trades = ${candle.trades}
                where timestamp = ${timestamp};
                `;            
            summarySql += sql            
        }        
        summarySql += 'commit;'        
        return this.db.query(summarySql);
    }
        

    initTable(tablename, maxTimeframe) {
        if (maxTimeframe === null) return;
        let startTimestamp = maxTimeframe + 60;
        let nowTimestamp = Math.floor(new Date().getTime() / 1000 / 60) * 60 + 5 * 60; // + 5 минут

        let queries = []; //`use ${this.config.schema};`
        
        let summarySql = dedent`
            INSERT INTO ${tablename}
            (timestamp, open, close, low, high, volume, trades, month, year)
            VALUES
            `
        let template = summarySql;    
            
        for (let i = startTimestamp; i <= nowTimestamp; i += 60) {
            let timestamp = i;
            let month = new Date(timestamp * 1000).getMonth() + 1;
            let year = new Date(timestamp * 1000).getFullYear();

            let sql = '(?, ?, ?, ?, ?, ?, ?, ?, ?),';
            let values = 
                [timestamp, 0, 0, 0, 0, 0, 0, month, year];
            template += this.db.mysql.format(sql, values);

            if (i % (1000 * 60) == 0 && i !== startTimestamp) {
                template = template.substr(0, template.length - 1);
                queries.push(template);
                template = summarySql;
            }
        }

        if (template !== summarySql) {
            template = template.substr(0, template.length - 1);
            queries.push(template);
        }

        if (queries.length == 1)
            return this.db.query(template);
        return this.db.executeQueries(queries);
    }

    collect () {        
        let startUpdate = new Date().getTime();
        this.db.query("use ??;", [env_config.database.schema])
            .then(rows => this.db.query("select max(`timestamp`) as mx, min(`timestamp`) as mn from ??", [this.config.tablename]))
            .then(rows => {
                return this.initTable(this.config.tablename, rows[0].mx)
            })
            .then(rows => this.db.query("select max(`timestamp`) as mx, min(`timestamp`) as mn from ?? where `close` <> 0", [this.config.tablename]))        
            .then(rows => {
                startUpdate = new Date().getTime();

                // Если нет ни одной заполненной записи
                if (rows[0].mn === null)
                {
                    return this.candlesQuery()
                } else
                // Если бэк данные заполнены до конца
                if (rows[0].mn === new Date(env_config.database.data_from).getTime() / 1000 - 60) {
                    if (rows[0].mx > new Date().getTime() / 1000 - 10 * 60)
                    {
                        return this.candlesQuery({
                            count: 20,
                            partial: true,
                        });                    
                    } else {
                        return this.candlesQuery({
                            reverse: false,
                            startTime: (rows[0].mx) * 1000,
                        });
                    }
                } else
                {                    
                    // Загрузка свечей с конца
                    return this.candlesQuery({
                        endTime: rows[0].mn * 1000
                    })
                }                
            })
            .then(candles => {
                if (candles.length == 20)
                    app.storageData.update(candles);
                else    
                    console.log(candles.length)
                // console.log('-----');
                // console.log(new Date(candles[0].timestamp) / 1000 - 60);                    
                // console.log(new Date(candles[candles.length - 1].timestamp) / 1000 - 60);
                // console.log('-----');
                return this.updateCandlesOnDB(candles);                
            })
            .then(rows => {                
                setTimeout(() => this.collect(), 1500 - (new Date().getTime() - startUpdate));
            })
            .catch((reason) => {
                console.error(reason);
                setTimeout(() => this.collect(), 10000);
            })
    }

}

module.exports = BitmexCollector;