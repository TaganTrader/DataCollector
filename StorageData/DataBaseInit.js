'use strict'

const DB = require('../MySQL/MySQLWrapper');
const fs = require('fs');

class DataBaseInit {
    constructor (config) {
        this.db = new DB(config);

        this.db.query("SHOW SCHEMAS")
            .then(schemas => {
                let exist = this.checkShema(schemas, config.schema);
                
                if (!exist) {
                    return this.createSchema(config.schema);
                }
                return;
            })
            .then(() => {                
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
}

module.exports = DataBaseInit;