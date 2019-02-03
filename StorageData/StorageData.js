'use strict'

const DateBaseInit = require('./DataBaseInit');

class StorageData {
    
    constructor (config) {
        this.test();

        let dbInit = new DateBaseInit(config);        
    }


    test() {
        
          
    }
}

module.exports = StorageData;