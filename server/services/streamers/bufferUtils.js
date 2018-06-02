/**
 * Created by volodya on 5/27/2017.
 */
const  fs = require('fs'),
    bytesStream = require('../mp4-analizer/BytesStream');

const NumReadModes = {
    UInt16BE : 0,
    UInt32BE: 1
}

const test24UintBufferSync = (buffer) => {
  let res =   new bytesStream(buffer).readU24();
  return res;
}


const getBuffer = (len, offset = 0) => {
    const buffer = new Buffer(len + offset);
    offset && buffer.fill(0, 0, offset);
    return buffer;
}

const getZBuffer = (len ) => {
    const buffer = new Buffer(len);
    buffer.fill(0)
    return buffer;
}

const getUint24AsBuffer = (data) => {

   const buffer =  Buffer.alloc(4);
   buffer.writeUInt32BE(data);
   return buffer.slice(1,4);
}

const readFileMergeBufAsync = (fd, position, length, bufToMerge, callback) => {
    let offset = buffer.length;
    const buffer = getBuffer(length, offset);
    bufToMerge.copy(buffer, 0, 0, offset);

    fs.read(fd, buffer, offset, length, position, (err) => {
        if(err){
            return (callback(err));
        }
        callback(null, buffer);
    });

}



const readFileBufAsync = (fd, position, length, offset, callback ) => {

    const buffer = getBuffer(length, offset);

    fs.read(fd, buffer, offset, length, position, (err) => {
        if(err){
            return (callback(err));
        }
        callback(null, buffer);
    })
}

const fromOrSlice = (buffer, pos = 0) => {
    return pos > 0 ? buffer.slice(pos) : Buffer.from(buffer);
}

const readFileNumAsync = (fd, position, length,  offset, mode, callback ) => {

    const buffer = getBuffer(length, offset);

    fs.read(fd, buffer, offset, length, position, (err) => {
        if(err){
            return (callback(err));
        }
        let num ;
        switch(mode){
            case NumReadModes.UInt16BE: num = buffer.readUInt16BE(); break;
            case NumReadModes.UInt32BE: num = buffer.readUInt32BE(); break;
        }
        callback(null, num);
    })
}

const concat = (arr) => {
    return Buffer.concat(arr);
}


module.exports = {
    concat,
    test24UintBufferSync,
    fromOrSlice,
    getBuffer,
    getZBuffer,
    readFileBufAsync,
    readFileNumAsync,
    getUint24AsBuffer,
    readFileMergeBufAsync,
    NumReadModes
}
