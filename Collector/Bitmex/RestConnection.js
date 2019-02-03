'use strict';

const request = require('request');
const crypto = require('crypto');

class RestConnection {

    constructor (config) {
        this.key = config.key;
        this.sec = config.sec;
        this.server = config.server;
        
        this.remaining = null;
        this.limit = null;

        this.banned = 0;    
        this.errors = 0; 
    }

    _send_request (options, callback) {
        let self = this;
        options.forever = true;
    
        if (self.errors > 100) {
            //log("Bitmex core error: Many error! #858273", "market.core", "error", { options });
            callback(new Error('Many error #858273'));
            return;
        }
    
        if (self.banned > 100) {
            //log("Bitmex core error: Many error! #858274", "market.core", "error", { options });
            callback(new Error('Many error #858274'));
            return;
        }
    
        request(options, function(error, response, body) {
            var result;
    
            // Forbidden
            if ((response && response.statusCode == 403) || (error && error.message == 403)) {
                self.banned++;
            }
    
            if (error || response.statusCode !== 200) {   
                let icon = "error";
                // При оверлоадах
                if (response && response.statusCode >= 500) {
                    icon = "error.exclusion";
                }
                if (response && response.statusCode >= 400 && response.statusCode <= 499) {
                    self.errors += 2;
                }
                //log("Bitmex core error", "market.core", icon, { error, body, options, status_code: response?response.statusCode:"" });
                try {
                    result = JSON.parse(body);
                    if (response && response.statusCode && result.error)
                        result.error.code = response.statusCode;
                    if (result.error)
                        return callback(result.error);
                    else
                        return callback(result);
                } catch (error) {
                    return callback(new Error(error || response.statusCode));
                }
            }
    
            if (--self.errors < 0) self.errors = 0;
            self.banned = 0;
    
            self.remaining = response.headers['x-ratelimit-remaining'];
            self.limit = response.headers['x-ratelimit-limit'];
            
            try {
                result = JSON.parse(body);
            } catch (error) {
                //log("Bitmex core error #1", "market.core", icon, { error, body, options, status_code: response?response.statusCode:"" });
                return callback(error, body);
            }
    
            if (result.error) {
                //log("Bitmex core error #2", "market.core", icon, { error: result.error, body, options, status_code: response?response.statusCode:"" });
                self.errors += 5;            
                return callback(result.error);
            }
    
            callback(null, result);
        });
    };

    make_public_request (method, params, verb, callback) {            
        let formData = {};
        for (let key in params) {
            formData[key] = params[key];
        }
    
        let postBody = JSON.stringify(formData);
        let expires = new Date().getTime() + (60 * 1000);
        let path = '/api/v1/' + method;
    
        let headers = {
            'content-type' : 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
    
        let requestOptions = {
            headers: headers,
            url: 'https://' + this.server + path,
            method: verb,
            body: postBody
        };
    
        this._send_request(requestOptions, callback);
    }

    get_candles (symbol, timeframe, count, callback, reverse=true, partial=true) {
        let params = {
            binSize: timeframe,
            partial,
            symbol,
            count,
            reverse
        }
        this.make_public_request('trade/bucketed', params, 'GET', callback);
    }

}

module.exports = RestConnection;