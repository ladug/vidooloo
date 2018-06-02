/**
 * Created by vladi on 15-May-17.
 */
const fs = require('fs'),
    File = require('./common');


const readFileHeader = (url) => {
    const buffer = new Buffer();
    fs.readSync(fd, buffer, offset, length, position)


};

const readBytes = (fd, position, length, bufferPadding = 0) => {
    const offset = 0, buffer = new Buffer(length + bufferPadding);
    bufferPadding && buffer.fill(0, 0, bufferPadding);
    fs.readSync(fd, buffer, bufferPadding, length, position);
    return buffer;
};

module.exports = {
    digest: (url) => {

        const start = (new Date()).getTime(),
            fd = fs.openSync(url, 'r'),
            svfDigestFile = fs.createWriteStream([url, ".digest"].join(''));
        let offset = 0;

        const clientHeaderSize = readBytes(fd, 0, 3, 1).readUInt32BE();
        offset += 3;

        svfDigestFile.write(readBytes(fd, offset, clientHeaderSize));
        offset += clientHeaderSize;

        const offsetToOffsetMapSize = readBytes(fd, offset, 3, 1).readUInt32BE();
        offset += 3;

        offset += offsetToOffsetMapSize;//skip the map, file is static so no reason to add it

        const extractionsSize = readBytes(fd, offset, 4).readUInt32BE();
        offset += 4;

        let extraBytes = 0;
        for (let byte = offset; byte < offset + extractionsSize;) {
            const chunkSize = readBytes(fd, byte, 2).readUInt16BE();
            byte += 2;
            const skipFactor = readBytes(fd, byte, 1).readUInt8();
            byte += 1;

            File.writeUint24(svfDigestFile, 0);
            File.writeUint8(svfDigestFile, skipFactor);
            svfDigestFile.write(readBytes(fd, byte, chunkSize));
            byte += chunkSize;
            extraBytes++; //read 3 -> write 4, added 1 byte per chunk
        }
        svfDigestFile.end();

        console.log("=======================================");
        console.log("total read:", offset + extractionsSize);
        console.log("estimated digest size:", clientHeaderSize + extractionsSize + extraBytes);
        console.info("Execution complete in " + ((new Date()).getTime() - start) + " ms");
        console.log("=======================================");
    }
};
