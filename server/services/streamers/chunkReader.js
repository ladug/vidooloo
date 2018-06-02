/**
 * Created by volodya on 6/16/2017.
 */
const async = require('async'),
    BufferUtil = require('./bufferUtils');

class ChunkReader{
    constructor(message){

            this._message = message;

            this._len = message.portion;
            this._wsBuffer = BufferUtil.getBuffer(this._len);
            this._curPos = 0;
            this._chunkReminder = new Array();

            this._svfChunkSize = 0;
            this._add = null;
            this.setPrivateAliases();
    }

   setPrivateAliases(){
       this._tryToGetAddAsync = this.tryToGetAddAsync;
       this._readSvfChunkAsync = this.readSvfChunkAsync;
       this._readSvfChunkLengthAsync = this.readSvfChunkLengthAsync;
    }



    get reminder(){
        return this._wsBuffer.length - this._curPos;
    }

    get isWsBufferFull(){
        return this._wsBuffer.length === this._curPos;
    }

    get isToSaveReminder(){
        return this._message.state.buffer != null;
    }
    get chunksReminder(){
        if(this._chunkReminder == null || this._chunkReminder.length == null){return null}
       return BufferUtil.concat(this._chunkReminder);
    }

    get addLenAsBuff(){
      return  BufferUtil.getUint24AsBuffer((this._add && this._add.length) || 0);
    }





    readSvfChunkAsync(callback){
        const len = this._svfChunkSize + this._message.config.svfChunk.skipFactorLen;

        BufferUtil.readFileBufAsync(this._message.state.fd,
            this._message.state.pos,
            len,
            this._message.config.svfChunk.offset,
            (err, buffer) => {
                if(err){return callback(err);}
                if(buffer) {
                    this.writeWsBuf(buffer);
                    this._message.state.incrementPos(buffer.length);
                }
                callback()
            }
        );
    }//end of svfAddIntegratedData

    resetBuffer(){
        this._wsBuffer = BufferUtil.getBuffer(this._len);
        this._curPos = 0;
    }

    //recursion
    writeWsBuf(bufContent){


        if(!bufContent || !bufContent.length) return;
        if(this.isToSaveReminder){this._chunkReminder.push(bufContent); return}

        let copyLen = this.getCopyLen(bufContent.length);

        bufContent.copy(this._wsBuffer, this._curPos,  0, copyLen);
        this._curPos += copyLen;
        if( this.isWsBufferFull ){
            this._message.state.isToSendBuf ? this.sendBuffer(): this.saveBuffer();
            this.resetBuffer();
        }
        if(copyLen < bufContent.length) {
            this.writeWsBuf(bufContent.slice(copyLen));
        }

    }

    handleWsBuffer(){
        if(!this._wsBuffer || !this._curPos) return;
        if(!this.isWsBufferFull) {
           this._wsBuffer = this._wsBuffer.slice(0, this._curPos);
        }
        this._message.state.isToSendBuf ? this.sendBuffer(): this.saveBuffer();
    }



    sendBuffer()  {
    this._message.send(this._wsBuffer);
        this._message.appendSendTime();
        this._message.state.isToSendBuf = false;
        this._message.writeToFile(this._wsBuffer);
        this._message.stat.incrementBytesSent(this._wsBuffer.length);
    // console.info("sent chunk buffer")
    }


    saveBuffer (){
        this._message.state.buffer = this._wsBuffer;
        // console.info("state.buffer set");
        this._message.writeToFile(this._wsBuffer);
    };

    getCopyLen(bufLen){
        const dif = bufLen - this.reminder;
        return dif > 0 ? bufLen - dif : bufLen;
    }

    tryToGetAddAsync(callback){
        const addModuleCallback = (err, buffer) => {
                if(err){ return (callback(err))}
                this._add = buffer;
                this.writeWsBuf(this.addLenAsBuff);
                callback();
            },

            tempGetAdd = (id, callback) => {
                callback(null, null);
            };
        //todo: define id param
        tempGetAdd(null, addModuleCallback);
        //addModule.getAdd( id, addModuleCallback);
    }

    readChunksAndAddsAsync(callback){
        const readingTasks = [this._tryToGetAddAsync.bind(this),
                this._readSvfChunkLengthAsync.bind(this),
                this._readSvfChunkAsync.bind(this)],
            finishReadingTasks = (err) => {
                if(err){ return (callback(err)); }
                this.writeWsBuf(this._add);
                callback();
            };
        async.series(readingTasks, finishReadingTasks);
    }//end of readChunksAndAddsAsync


    readSvfChunkLengthAsync (callback){

        BufferUtil.readFileNumAsync(this._message.state.fd,
            this._message.state.pos,
            this._message.config.svfChunk.dataLen,//2
            this._message.config.svfChunk.offset,//0
            BufferUtil.NumReadModes.UInt16BE,
            (err, num) =>{
                if(err){return callback(err);}
                // console.info("svfChunkSize :: " + num);
                this._svfChunkSize = num;
                this._message.state.incrementPos(this._message.config.svfChunk.dataLen);
                // console.log('chunks => readSvfChunkLengthAsync');
                callback();
            });
    }//readSvfChunkLengthAsync

    //---- destroy---------------------------------------------
    destroy(){
       // console.info("deleting chunkreader")
        //does not delete _message
        this._len = null;
        this._wsBuffer = null;
        this._curPos = null;
        this._chunkReminder = null;

        this._svfChunkSize = null;
        this._add = null;
        this._tryToGetAddAsync = null;
        this._readSvfChunkAsync = null;
        this._readSvfChunkLengthAsync = null;
    }


}



module.exports = ChunkReader;
