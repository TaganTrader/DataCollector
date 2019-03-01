'use strict'

const DB = require('../MySQL/MySQLWrapper');
const fs = require('fs');
const dedent = require('dedent');
const EventEmitter = require("events").EventEmitter;

class DataBaseInit extends EventEmitter {
    constructor (config) {
        super();
        this.config = config;
        this.db = new DB(config);
        
        let tablename = 'xbtusd_1';

        this.db.query("SHOW SCHEMAS")
            .then(schemas => {
                let exist = this.checkShema(schemas, config.schema);
                
                if (!exist) {
                    return this.createSchema(config.schema);
                }                
                return;
            })
            .then(() => this.db.query(`use ${config.schema}`))
            .then(() => this.db.query("select max(`timestamp`) as mx, min (`timestamp`) as mn from ??", [tablename]))
            .then((rows) => {                
                return this.initTable(tablename, rows[0].mx)                
            })
            .then(() => {                
                this.emit('inited');            
                return this.db.close();
            })
            .catch(error => {
                console.error(error);
            });
    }

    checkShema(schemas, schema) {
        for (let key in schemas) {
            if (schemas[key].Database === schema) {
                return true;
            }
        }
        return false;
    }

    createSchema(schema) {
        let sql = fs.readFileSync('./dbinit.sql', "utf-8");
        sql = sql.replace(/<SHEMA_NAME>/g, schema);
        return this.db.query(sql);
    }

    initTable(tablename, maxTimeframe) {
        let startTimestamp = maxTimeframe === null ? new Date(this.config.data_from).getTime() / 1000 : maxTimeframe + 60;
        let nowTimestamp = Math.floor(new Date().getTime() / 1000 / 60) * 60;

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

        return this.db.executeQueries(queries);
    }
}

module.exports = DataBaseInit;