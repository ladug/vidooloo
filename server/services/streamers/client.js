/**
 * Created by volodya on 6/2/2017.
 */
//use this class for proccesing data on client
//of web socket connection in the context of
//api

class Client{
    constructor(req, id){
        if(req == null) return;

        this._id = id;
        this._ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        this._userAgent = req.headers['user-agent'];
        this._cookie = req.headers['cookie'];
        this._origin = req.headers['origin'];
        this._language = req.headers['accept-language'];

    }

    get userAgent(){
        return this._userAgent;
    }

    get id(){
        return this._id;
    }

    get ip(){
        return this._ip;
    }

    get cookie(){
        return this._cookie;
    }

    get language(){
        return this._language;
    }

    get origin(){
        return this._origin;
    }
}

module.exports = Client;
