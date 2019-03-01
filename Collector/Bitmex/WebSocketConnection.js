'use strict';

const BITMEXWebSocket = require('bitmex-realtime-api');

class WebSocket {

    constructor () {
        this.websocket = new BITMEXWebSocket({
            testnet: false,
            apiKeyID: '',
            apiKeySecret: '',
            maxTableLen: 10000,
        });   

        this.websocket.addStream('XBTUSD', 'trade', (data, symbol, tableName, updateCount) => {
            this.ondata(data);
        });

        this.websocket.on('error', function (error) {
            console.log("Bitmex winsock catch: " + error.message, "market.error.catch", "error", error);
        });
    }

    ondata (data) {
        //console.log(data);
    }
}

module.exports = WebSocket;