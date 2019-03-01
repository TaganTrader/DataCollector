'use strict'

const MYSQL = require('mysql');

class MySQLWrapper {

    constructor (config) {
        this.mysql = MYSQL.createConnection({
            host: config.host,
            user: config.user,
            password: config.pass,
            multipleStatements: true
        });

        this.connected = false;
        this.mysql.connect((error) => {
            if (error) throw error;
            this.connected = true;            
        });

        this.mysql.on("error", error => {
            this.connected = false;
            console.log('MYSQL WRAPPER ERROR:')
            console.log(error);
            setTimeout(() => {
                this.mysql.connect((error) => {
                    if (error) throw error;
                    this.connected = true;            
                });
            }, 1000);
        })
    }

    query (sql, args) {
        return new Promise((resolve, reject) => {
            this.mysql.query(sql, args, (error, rows) => {
                if (error)
                    return reject(error)
                resolve(rows);
            })
        });
    }

    _executeQueries (queries, callback) {
        if (queries.length > 0) {
            let query = queries.shift();
            if (queries.length == 0) {
                this.query(query).then(rows => {
                    callback(); 
                });
            } else {
                this.query(query).then(rows => {
                    this._executeQueries(queries, callback);
                });
            }
        } else {
            callback();            
        }
    }
 
    executeQueries (queries) {
        return new Promise((resolve, reject) => {
            if (queries.length == 0)
                resolve();
            this._executeQueries(queries, () => {
                resolve();
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.mysql.end(error => {
                if (error)
                    return reject(error);
                resolve();
            });
        });
    }
}

module.exports = MySQLWrapper;