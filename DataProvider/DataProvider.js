"use strict";


const https = require('https');
const fs = require('fs');
const ws = require('ws');



const default_config = {
    port: 8000
}

class DataProvider extends ws.Server {

    constructor (config) {
        this.config = _.extend({}, default_config, config);
        this.hosted = false;

        if (!this.config.key_pm || !this.config.key_pm) {
            throw new Error("Can't find key or cert file for https");            
        }

        const options = {
            key:  fs.readFileSync(this.config.key_pm),
            cert: fs.readFileSync(this.config.cert_pm)
        };

        this.server = https.createServer(options, (req, res) => {
            //res.writeHead(200);
            //res.end(index);
        });        

        //server.addListener('upgrade', (req, res, head) => console.log('UPGRADE:', req.url));
        this.server.on('error', (err) => console.error(err));
        this.server.listen(this.config.port, () => {
            this.hosted = true;
        });
                        
        super ({
            server: this.server,
            path: '/'            
        });

        this.on ('connection', (ws) => {
            this.acceptClient(ws);
        });
    }

    acceptClient (ws) {
        ws.send('Hello');   
        ws.on ('message', (data) => ws.send('Receive: ' + data) );
    }
}

module.exports = DataProvider;