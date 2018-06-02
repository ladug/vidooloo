/**
 * Created by volodya on 6/2/2017.
 */
const fs = require('fs');
class Stat {
    constructor(message, path){
        this._message = message;
        this._start = (new Date()).getTime();
        this._end = null;
        this._err = '';
        this._sent = 0;
        this._EOFreached = false;
        this._registeredSentToClientTime = new Array();
        this._fileStreamer =  fs.createWriteStream(path.replace(".svf", ".avf"));

    }

    end(){
        if(this._end != null) {return false;}
        this._end = (new Date()).getTime();
        this._fileStreamer && this._fileStreamer.end();
        return true;
    }

    get log( ) {
        return '============EXECUTION STATS========================' + '\n\r' +
            'WS message recieved: ' + this._message + '\n\r'  +
            ( this._end == null ?
                "Execution in progress:  " + ((new Date()).getTime() - this._start) :
                "Execution completed in " + (this._end - this._start)) + ' ms\n\r' +
            (this._fpath ? "SVF file: " + this._fpath + '\n\r': '' ) +
            (this._fsize ? "SVF file size: " + this._fsize + ' bytes\n\r' : '') +
            (this._hdLen ? "Client headers length: " + this._hdLen + ' bytes\n\r' : '')  +
            (this._mapSize ? "O2Omaps length: " + this._mapSize + ' bytes\n\r' : '')  +
            (this._chunksTotalLen ? "Chunks total length: " + this._chunksTotalLen + ' bytes\n\r' : '')  +
            (this._bytesStored ? "Bytes stored: " + this._bytesStored + ' bytes\n\r' : '')  +
            "Bytes sent to client : "  + this._sent + '\n\r' +
             this.getSentTime() +
             "EOF is "  + (!this._EOFreached ? "not " : "" ) + "reached\n\r" +
            '====================================================';
    }

    getSentTime(){
        let res = '';
        for(let i = 0; i < this._registeredSentToClientTime.length; i ++){
            res += ( 'Socket sent in :: ' + this._registeredSentToClientTime[i] + ' ms from message start\n\r');
        }
        return res;
    }

    appendStats(data){
        if(!data) {return}

        for( let prop in data ){
            this['_' + prop ] = data[prop];
        }
    }

    appendErr(data) {
        if(!data || !data.length) {return}

        this._err += ("Error: " + data + "; ");
    }

    appendSentToClientTime(){
        this._registeredSentToClientTime.push( ((new Date()).getTime() - this._start) );
    }

    incrementBytesSent(val){
        this._sent += val;
    }

    set isEOF(val){
        this._EOFreached = val;
    }

    writeToFile(buffer){
        if(this._fileStreamer != null){
            this._fileStreamer.write(buffer);
        }
    }

     destroy(){
        this._fileStreamer.end();
        for(let p in this){

           if( p !== '_message'){
               this[p]= null;
           }
        }
     }

}



module.exports = Stat;
