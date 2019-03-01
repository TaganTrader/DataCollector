'use strict'

const URL = require("url");

class Processing 
{
    constructor ()
    {

    }

    do (from, ...args) {
        if (from == "webserver")
        {
            let request = args[0];
            let response = args[1];
            
            let url = URL.parse(request.url, true);
            let params = url.query;

            let content = JSON.stringify(app.storageData.candles);
            response.writeHead(200, {
                'Content-Type': 'text/json',
                'Access-Control-Allow-Origin': '*',
                'X-Powered-By':'texer'
            });            
            response.write(content);
            response.end();
        }
    }

    unrecognized (data) {
        console.log("unrecognized data", data);
    }

    candles (qid, params) {
        // Если запрошена слишком большая дистанция свечей
        if (Math.abs(params.from - params.to) > 5000 * 60) {
            let response = {
                rqid: qid,
                data: [],
            };
            this.send(JSON.stringify(response));
            return;
        }

        app.storageData.selectCandlesFromTo(params.from, params.to)
            .then(candles => {
                let response = {
                    rqid: qid,
                    data: candles,
                };
                this.send(JSON.stringify(response));
            });        
    }
}

module.exports = Processing;