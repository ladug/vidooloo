const Settings = require('./config'),
      uid = require('uid-safe'),
      Connection = require('./connection');




class Streamer{
    constructor(server){

         if(!server) return;

         //set props ---------------------------
         this._server = server;
         this._config = Settings.config;
         this._ERR_CODES = Settings.ERR_CODES;
         this._connections = new Object();


         //funcs--------------------------------

        this._onConnection = (ws, req ) => {
            let id = uid.sync(18);
            this._connections[id] = new Connection(this, ws, req, id);
        };

        this._server.on('connection', this._onConnection);
    }


    //getters-----------------------------------------------------------
    get config() {
       return this._config;
    }

    get ERR_CODES(){
        return this._ERR_CODES;
    }


    //destroyers---------------------------------------------------------
    finalizeConnection  (id)  {
        if(!id || !this._connections || !this._connections[id]) return;
       // console.info("destroying conn :: " + id);
        this._connections[id].destroy();
        this._connections[id] = null;
        delete this._connections[id];
    }

    finalizeAllConnections(){
        if(!this._connections){return;}
        for( let p in this._connections){
           this.finalizeConnection(p);
        }
        this._connections = null;
        delete this._connections;
    }

        destroy(){
        this.finalizeAllConnections();
        this._server = null;
        delete this._server;
        this._config = null;
        delete this._config;
        this._ERR_CODES = null;
        delete this._ERR_CODES;
    }


}//end of streamer



module.exports = Streamer;