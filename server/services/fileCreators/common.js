/**
 * Created by vladi on 12-May-17.
 */

//Mark First byte => +8388608
//Mark Second byte => +4194304
//Mark Third byte => +2097152
//Mark Fourth byte => +1048576
//Max allowed size Per sample/frame => 1 048 575 > 1MB -- we can go lower if there will be a reason
const writeString = (file, string) => {
    file.write(Buffer.from(string));
};

const writeData = (file, data) => {
    file.write(
        new Buffer(data)
    );
};

const writeUint8 = (file, data) => {
    const buffer = Buffer.alloc(1);
    buffer.writeUInt8(data);
    file.write(buffer);
};

const writeUint16 = (file, data) => {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16BE(data);
    file.write(buffer);
};

const writeUint24 = (file, data) => {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32BE(data);
    file.write(buffer.slice(1, 4));
};


const writeUint32 = (file, data) => {
    const buffer = Buffer.alloc(4);
    buffer.writeInt32BE(data);
    file.write(buffer);
};

const writeSizeAndFlags = (file, size, isVideo, isKey) => { //total size 3 bytes
    let byte = size;
    byte = byte | (isVideo ? 8388608 : 0);
    byte = byte | (isKey ? 4194304 : 0);
    writeUint24(file, byte);
};

const generateSkipFactor = sampleSize => {
    if (!sampleSize || sampleSize < 4) {
        throw new Error("Sample is too small!!")
    }
    const min = sampleSize <= 16 ? parseInt(sampleSize / 2) : 16, //if size is under 16, us the size as minimum
        max = sampleSize > 256 ? 256 : sampleSize;
    return parseInt(Math.random() * (max - min)) + min; //Default 16-255
};

const getSplitChunkSizes = (size, skipFactor) => {
    /*
     example:
     "000100010001000100010001000100010".length -> 33  aka our data
     "000100010001000100010001000100010".replace(/1/g,"").length -> remove every 4th byte -> 25
     "000100010001000100010001000100010".replace(/0/g,"").length -> count every 4th byte -> 8
     */
    const svfChunkSize = (size - (size % skipFactor)) / skipFactor;
    return {
        svfChunkSize: svfChunkSize,
        pvfChunkSize: size - svfChunkSize
    }
};
//TODO:IMPORTANT optimization needed
const getSplitSample = (data, size, skipFactor) => {
    assert(size !== 0, "Sample size is 0!");
    const {svfChunkSize, pvfChunkSize} = getSplitChunkSizes(size, skipFactor),
        pvfChunk = new Uint8Array(pvfChunkSize),
        svfChunk = new Uint8Array(svfChunkSize);

    for (let readIndex = 0, pvfIndex = 0, svfIndex = 0, svfReadIndex = skipFactor; readIndex < size; readIndex++) {
        if (svfReadIndex - 1 === readIndex) {
            svfChunk[svfIndex++] = data[readIndex];
            svfReadIndex += skipFactor;
        } else {
            pvfChunk[pvfIndex++] = data[readIndex];
        }
    }

    return {
        pvfChunk: pvfChunk,
        pvfChunkSize: pvfChunkSize,
        svfChunk: svfChunk,
        svfChunkSize: svfChunkSize
    }
};

const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
    return true;
};

module.exports = {
    assert,
    writeData,
    writeString,
    writeUint8,
    writeUint16,
    writeUint24,
    writeUint32,
    writeSizeAndFlags,
    generateSkipFactor,
    getSplitChunkSizes,
    getSplitSample
};