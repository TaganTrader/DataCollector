"use strict";


const https = require('https');
const fs = require('fs');
const ws = require('ws');
const _ = require('lodash');

const Processing = require('./Processing');


const default_config = {
    port: 8443
}

class DataProvider extends ws.Server {

    constructor (config) {        
        config = _.extend({}, default_config, config);
        

        if (!config.key_pm || !config.key_pm) {
            throw new Error("Can't find key or cert file for https");            
        }

        const options = {            
            key:  fs.readFileSync(config.key_pm),
            cert: fs.readFileSync(config.cert_pm)
        };        

        let server = https.createServer(options, (req, res) => {            
            this.processing.do("webserver", req, res);
        });        

        //server.addListener('upgrade', (req, res, head) => console.log('UPGRADE:', req.url));
        server.on('error', (err) => console.error(err));
        server.listen(config.port, () => {
            this.hosted = true;
        });
                        
        super ({
            server: server,
            path: '/'            
        });

        this.on ('connection', (ws) => {
            this.acceptClient(ws);
        });

        this.server = server;
        this.hosted = false;

        this.processing = new Processing();
        
        this.client_id = new Date().getTime();        
    }

    acceptClient (ws) {        
       
        //ws.send('{Hello}');        
        
        ws.on ('message', (data) => {
            
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error(e);                
            }
                        
            if (data.method)
            {            
                if (typeof app.dataProvider.processing[data.method] === "function")
                    app.dataProvider.processing[data.method].apply(ws, [data.qid, data.params]);
                else
                    app.dataProvider.processing.unrecognized.apply(ws, data);
            }
            else
                app.dataProvider.processing.unrecognized.apply(ws, data);
        });
    }

    broadcast (msg) {
        this.clients.forEach(client => {
            if (client.readyState === ws.OPEN) {
                client.send(JSON.stringify(msg));
            }
        });      
    }
}

module.exports = DataProvider;