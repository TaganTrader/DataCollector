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
                    this.executeQueries(queries, callback);
                });
            }
        } else {
            return true;
        }
    }

    executeQueries (queries) {
        return new Promise((resolve, reject) => {
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