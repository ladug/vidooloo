/**
 * Created by volodya on 5/12/2017.
 */
const  {assert}= require('../mp4-analizer/utils.js'),
    bytesStream = require('../mp4-analizer/BytesStream');

class svfReader{

    constructor(stream) {
        assert(stream, "No stream provided!");
        this.stream = new bytesStream(stream);
        this.file = {        } ;//we define props in read() func
    }

    readAudioConfig(){

        const _duration = this.stream.readU32();
        const _timeScale = this.stream.readU24();
        const _channels = this.stream.readU8();
        const _compressionId = this.stream.readU8();
        const _packetSize = this.stream.readU8();
        const _sampleSize = this.stream.readU8();
        const _sampleRate = this.stream.readU24();
        const _adcdSize = this.stream.readU16();
        const _adcd = this.stream.readU8Array(_adcdSize);

        return{
          duration: _duration,
            timeScale: _timeScale,
            channels: _channels,
            compressionId : _compressionId,
            packetSize :_packetSize,
            sampleSize:  _sampleRate,
            sampleRate: _sampleRate,
            adcdSize: _adcdSize,
            adcd: _adcd
        }

    }

    readVideoConfig(){

       const _duration = this.stream.readU32();
       const _timeScale = this.stream.readU24();
       const _width = this.stream.readU16();
       const _height = this.stream.readU16();
       const _spsSize = this.stream.readU16();
       const _sps = this.stream.readU8Array(_spsSize);
       const _ppsSize = this.stream.readU16();
       const _pps = this.stream.readU8Array(_ppsSize);

            return {
                duration: _duration,
                timeScale :_timeScale,
               width : _width,
                height: _height ,
                spsSize: _spsSize,
                sps: _sps,
                ppsSize : _ppsSize,
                pps : _pps
            };
     }

    readSvfMap(  ){

        const mapSize = this.stream.readU16();
        const mapBoxSize = 11;
        const boxesAmount = mapSize / mapBoxSize;
        let res = new Array(boxesAmount);
        for( let i = 0; i < boxesAmount; i++){
            res[i] = {
                offset : this.stream.readU32(),
                sample: this.stream.readU24(),
                time: this.stream.readU32()
            }
        }
        return { size: mapSize, map: res};
    }

    readInfo(){

        const _svfHeaderSize = this.stream.readU24();
        this.stream.skip(4);//no need in ftyp :)
        const _ftyp = this.stream.readUTF8(3);
        const major = this.stream.readUTF8(1);
        const minor = this.stream.read8();

        return{
            svfHeaderSize : _svfHeaderSize,
            ftyp : _ftyp,
            majorVersion: major,
            minorVersion: minor,
            fullVersion: major + "." + minor
        };

    }

    readSvfToPvfMap(){

        const mapSize = this.stream.readU24();
        const mapBoxSize = 13;
        const boxAmount = mapSize/mapBoxSize ;

        let res = Array(boxAmount);
        for( let i = 0; i < boxAmount; i++){
            res[i] = {
                pvfOffset : this.stream.readU32(),
                svfOffset : this.stream.readU32(),
                isVideo: this.stream.readU8(),
                time: this.stream.readU32()
            }
        }

         return { size: mapSize, map: res};

    }

    readExtractionChunks(){


        const chunkSize = this.stream.readU32();
        const endPos = this.stream.position + chunkSize;
        let res = Array();
        while(this.stream.position < endPos){
            let _size = this.stream.readU16();
            res.push(
                {
                    size : _size,
                    skip : this.stream.readU8(),
                    chunk: this.stream.readU8Array(_size)
                }
            )
        }

        return { size: chunkSize, chunks: res}
    }

    read(){

        this.file.info = this.readInfo();

       this.file.mediaMaps = {
           mapSize : this.stream.readU24(),
           vMap: this.readSvfMap(),
           aMap : this.readSvfMap()
       }

       this.file.config = {
           video: this.readVideoConfig(),
           audio: this.readAudioConfig()
       }

       this.file.s2p = {
           s2pMap : this.readSvfToPvfMap(),
           s2pChunks: this.readExtractionChunks()
       };

    }
}

module.exports = svfReader;
