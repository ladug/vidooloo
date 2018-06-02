/**
 * Created by volodya on 6/10/2017.
 */
const fs = require('fs'),
      async = require('async'),
      BufferUtil = require('./bufferUtils'),
      ChunkReader = require('./chunkReader');


class TaskFactory{

    constructor(message){

        this._message = message;
        this._byMessageDefinedTasks = new Array();
        this.setTasksAccordingToState();
        this.setPrivateAliases();
    }

    setPrivateAliases(){
        this._readChunksAndAddsCallback = this.readChunksAndAddsCallback;
    }

    setTasksAccordingToState(){

        this._message.state.fd == null && this._byMessageDefinedTasks.push(this.openSvfAsync.bind(this));
        this._message.state.fSize == 0 && this._byMessageDefinedTasks.push(this.setFileSizeAsync.bind(this));
        this._message.state.hdLen == 0 && this._byMessageDefinedTasks.push(this.setClientHeadersLenAsync.bind(this));
        !this._message.state.isHeaderSent && this._byMessageDefinedTasks.push(this.socketClientHeadersDataAsync.bind(this));
        this._message.state.mapLen == 0 && this._byMessageDefinedTasks.push(this.setO2OMapSizeAsync.bind(this));
        this._message.reqPvfOffset != null && this._byMessageDefinedTasks.push(this.setSvfOffset.bind(this));
        this._message.state.chunksTotalLen == 0 && this._byMessageDefinedTasks.push(this.setExtractionsLen.bind(this));
        this._byMessageDefinedTasks.push(this.getChunksAsync.bind(this));
    }

    //--- tasks---------------------------------------------------------------------------------------------------------

    setFileSizeAsync (callback){
        fs.fstat(this._message.state.fd, (err, curStat) => {
            if (err) {
                // console.info("err :: getFileStatsAsync");
                return callback(err);
            }
            this._message.state.fSize = curStat.size;
            //  console.log('reading stats')
            callback();
        });
    }

    openSvfAsync(callback) {
        fs.open(this._message.state.path,'r', (err, descriptor) =>{
            if(err){
            // console.info("err :: openAsync");
            return callback(err);
        }

        this._message.state.fd = descriptor;

        // console.log('openAsync')
        callback();
       });
    }//end of open svf async

    setClientHeadersLenAsync (callback){

    //const dataLen = 3, curOffset = 1;
        BufferUtil.readFileNumAsync( this._message.state.fd,
                                     this._message.state.pos,
                                     this._message.config.clientHeaders.dataLen,
                                     this._message.config.clientHeaders.offset,
                                     BufferUtil.NumReadModes.UInt32BE,
                                     (err, num) =>{

                        if(err){
                            // console.info("err :: readClientHeadersLenAsync");
                            return callback(err);
                        }

                       this._message.state.incrementPos( this._message.config.clientHeaders.dataLen );

                       this._message.state.hdLen =  num;
                       //  console.log('readClientHeadersLenAsync') ;

                        if(this._message.reqPvfOffset != null){
                             this._message.state.incrementPos(this._message.state.hdLen);
                        }

                        callback();
        });
   }//end of setClientHeadersLenAsync


    socketClientHeadersDataAsync (callback) {

            //offset = 0
            BufferUtil.readFileBufAsync(this._message.state.fd,
                                        this._message.state.pos,
                                        this._message.state.hdLen,
                                        this._message.config.clientHeadersDataOffset,
                                        (err, buffer) => {
                        if(err){
                            // console.info("err :: rsClientHeadersDataAsync");
                             return callback(err);
                        }

                        this._message.send(buffer);
                        this._message.appendSendTime();
                        this._message.writeToFile(buffer);

                        //todo debug
                        // fileWriteStream.write(buffer);

                        this._message.state.incrementPos(this._message.state.hdLen);
                        this._message.stat.incrementBytesSent(buffer.length);
                        this._message.state.isHeaderSent = true;
                        //  console.log('readClientHeadersLenAsync => no pvfOffset') ;
                         callback();
            });
    }//end of socketClientHeadersDataAsync


    setO2OMapSizeAsync  (callback)  {

    //const dataLen = 3, curOffset = 1;
        BufferUtil.readFileNumAsync( this._message.state.fd,
                                     this._message.state.pos,
                                     this._message.config.o2oMap.dataLen,
                                     this._message.config.o2oMap.offset,
                                     BufferUtil.NumReadModes.UInt32BE,
                                     (err, num) =>{
                        if(err){
                            //  console.info("err :: readO2OMapSizeAsync");
                            return callback(err);
                        }
                        this._message.state.mapLen =  num;
                        this._message.state.incrementPos( this._message.config.o2oMap.dataLen );
                        this._message.state.incrementPos(this._message.state.mapLen);
                        //  console.log('setSvfOffset, but pvfOffset = 0');
                        // console.log('readO2OMapSizeAsync') ;
                         callback();
         });
    }//end of setO2OMapSizeAsync


    setSvfOffset (callback) {

       // const mapBoxSize = 13;
        let curPvfOffset = 0,
            tempPos = this._message.state.hdLen +  this._message.config.svfOffSet.postHdLenOffset;


        const sayWhenStop = () => {
                return curPvfOffset == this._message.reqPvfOffset || this._message.state.isOutOfMap(tempPos);
              },
              findRequestedPvfOffset = (done) => {
                  BufferUtil.readFileNumAsync(
                          this._message.state.fd,
                          tempPos,
                          this._message.config.svfOffSet.dataLen,//4
                          this._message.config.svfOffSet.offset,//0
                          BufferUtil.NumReadModes.UInt32BE,
                          (err, pvfoffset) => {
                              if(err) {/* console.info("err :: setSvfOffset => reading pvfoffset");*/
                                  return callback(err);
                              }
                              curPvfOffset = pvfoffset;
                              if(curPvfOffset != this._message.reqPvfOffset){
                                  tempPos += this._message.config.svfOffSet.boxSize;//13
                                  // console.info("curPvfOffset :: " + curPvfOffset);
                                  // console.info("tempPos :: " + tempPos);
                              }
                              else{
                                  tempPos+= this._message.config.svfOffSet.dataLen;
                              }
                              done();
                  });
              },
              setSvfOffset = (err) => {
                  if(err){
                      //console.info("err :: setSvfOffset => end of until async");
                      return callback(err);
                  }

                  if(this._message.state.isOutOfMap(tempPos)){
                      // console.info("err :: setSvfOffset => isOutOfMap");
                      return  callback(this._message.ERR_CODES.ERR_PVFOFFSET);
                  }

                //  tempPos -= this._message.config.svfOffSet.boxReminder;//- 13 + 4 = 9
                  BufferUtil.readFileNumAsync(
                      this._message.state.fd,
                      tempPos,
                      this._message.config.svfOffSet.dataLen,//4
                      this._message.config.svfOffSet.offset,//0
                      BufferUtil.NumReadModes.UInt32BE,
                      (err, svfoffset) => {
                          if(err) {
                              //  console.info("err :: setSvfOffset => reading svfoffset");
                              return callback(err);
                          }

                          this._message.state.pos = svfoffset;
                          console.info("setting position to " + svfoffset);
                          callback();

                      })
              };

        async.until( sayWhenStop.bind(this),findRequestedPvfOffset.bind(this), setSvfOffset.bind(this));
    }//end of setSvfOffset

    setExtractionsLen(callback) {
        //const dataLen = 4, curOffset = 0;
        BufferUtil.readFileNumAsync(this._message.state.fd,
                                    this._message.state.pos,
                                    this._message.config.extractions.dataLen,
                                    this._message.config.extractions.offset,
                                    BufferUtil.NumReadModes.UInt32BE,
                                    (err, num) => {
            if (err) { return callback(err);}
            this._message.state.chunksTotalLen = num;
            this._message.state.incrementPos(this._message.config.extractions.dataLen);
            // console.log('readExtractionsLen');
             callback();
        });
    }//end of setExtractionsLen

    getChunksAsync(callback){

       // console.info("curPos :: " + this._message.state.pos);


        let chunkReader = new ChunkReader(this._message);
        const mustStopRead = () => { let res = this._message.state.mustStopRead(); /*console.info("mustread :: " + res);*/ return res},
              read =  (done) => {
                  chunkReader.readChunksAndAddsAsync((err) => {
                      if(err){return callback(err);}
                      done();
                  });
              },
              finishReadChunks =(err) => {
                  if( err )  return callback(err);
                  this._message.state.chunksReminder = chunkReader.chunksReminder;
                  //send reminder
                  if( this._message.state.isEOF ){
                      this._message.stat.isEOF = true;
                      chunkReader.handleWsBuffer();
                  }

                  chunkReader.destroy();
                  chunkReader = null;

                  // fileWriteStream.end();
                  callback();
              }


        async.until(mustStopRead, read, finishReadChunks);

    }//end of getChunksAsync

    finishRead (err,result) {
    //collect  stat data

        this._message.stat.appendStats(this._message.state.stats);

        if (err){
            this._message.stat.appendErr(err);
            //todo check iff err_code
            this._message.sendErrCode(this._message.ERR_CODES.ERR_JUST_FUCKED_UP);
        }

        this._message.stat.end();
        console.info(this._message.stat.log);

        this._message.destroy();
    }

//-------getters----------------------------------------

    get messageReadTasks(){
        return this._byMessageDefinedTasks;
    }

    get finishReadTasks(){
        return this.finishRead.bind(this);
    }

    //destroy-------------------------------

    destroy(){
        this._byMessageDefinedTasks = null;
        this._readChunksAndAddsCallback = null;
    }

}//end of TaskFactory

module.exports = TaskFactory;
