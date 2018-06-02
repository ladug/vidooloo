/**
 * Created by volodya on 6/2/2017.
 */
const fs = require('fs');

class SKCommand {

    //todo: errcodes
    constructor(message){
        this._error = '';

        if(!message || !message.length ){
            this._error = 'Command is null or 0 length';
            return;
        }

        let obj = JSON.parse(message);

        if( typeof obj !== 'object' ){
            this._error = 'Command is not an object';
        }

        for(let prop in  obj) { this['_' + prop] = obj[prop]; }

        if(this._file){
            //todo get from config:
            this._file = './files/svf/' + this._file + '.svf';
        }
    }

    get isCommandValid(){
        return this._error == null || this._error.length == 0;
    }

    get error(){
        return this._error;
    }

    get pvfOffset(){
        return this._pvfOffset;
    }

    get svfOffset() {
       return this._svfOffset;
    }

    get path(){
        return this._file;
    }

    get portion(){
        return this._portion;
    }

    get isPathValid(){
        if( !this._file) {return false;}
        return fs.existsSync(this._file)
    }

    //destroy----------------------------
    destroy(){
        for(let p in this){ this[p]= null;}
    }


}

module.exports = SKCommand;