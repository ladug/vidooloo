/**
 * Created by volodya on 6/9/2017.
 */
const State = require('./state'),
    SKCommand = require('./socketCommand'),
    Stat = require('./execStat'),
    TaskFactory = require('./taskFactory'),
    fs = require('fs'),
    async = require('async');

class Message {
    constructor(connection, msg){

        this._connection = connection;
        this._command = new SKCommand(msg);
        this._stat = new Stat(msg, this._connection.config.saveToFile ? this._command.path : null);

        this._taskFactory = new TaskFactory(this);

    }


    get reqPvfOffset(){
       return this._command.pvfOffset;
    }

    get config(){
        return this._connection.config;
    }

    get ERR_CODES(){
        return this._connection.ERR_CODES;
    }

    get isPathValid(){
        return this._command.isPathValid;
    }

    get portion(){
        return this._command.portion;
    }

    get path(){
        return this._command.path;
    }

    get state(){
        return this._connection.state
    }

    get stat(){
        return this._stat;
    }

    send(buf){
        this._connection && this._connection.send(buf);
    }

    sendErrCode(err){
        this._connection && this._connection.sendErrCode(err);
    }

    appendSendTime(){
        this._stat.appendSentToClientTime();
    }

    writeToFile(buffer){
        this._stat.writeToFile(buffer);
    }

    destroy() {

    }

    //[a] if buffer is ready and offset set to null, send it;
    //[b] if pvfoffset is defined, drop buffer & set the flag enabling
    //to send buffer immediately after bytes having been read to true;
    //[c] otherwise perform no action
    handleStateBuffer(){

        if( this.reqPvfOffset == null && this.state.isBufferReady){
            this.send(this.state.buffer);
            this.stat.appendSentToClientTime();
            this.stat.writeToFile(this.state.buffer);
            this.stat.incrementBytesSent(this.state.buffer.length);
            this.state.buffer = null;
        }
        else if(this.reqPvfOffset > 0){
            //  console.info("pvfOffset :: " + command.pvfOffset + " , setting buffer to null");
            this.state.buffer = null;
            this.state.chunksReminder = null;
            this.state.isToSendBuf = true;
        }

    }


    handleReminder(){
            this.state.hasChunksRemider && this.state.fillBufferWithReminder(this.portion);
    }



    supplyClientWithData(){
       // const   fileWriteStream = fs.createWriteStream(this.state.path.replace(".svf", ".avf"));
        this.handleStateBuffer();
        this.handleReminder();
        ! this.state.isBufferReady  &&  async.series(this._taskFactory.messageReadTasks, this._taskFactory.finishReadTasks);
    }

    destroy(){
        if(this._command != null) {
            this._command.destroy()
            this._command = null;
        }
        if(this._stat != null) {
            this._stat.destroy();
            this._stat = null;
        }

        if(this._taskFactory != null) {
            this._taskFactory.destroy();
            this._taskFactory = null;
        }
    }
}

module.exports = Message;
