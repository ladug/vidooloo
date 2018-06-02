/**
 * Created by vladi on 06-May-17.
 */
const {assert, noBreakingError, BUFFER_READ_LENGTH_ERROR} = require('./utils');

class BytesStream {
    constructor(arrayBuffer, start, length) {
        assert(arrayBuffer, "Broken BytesStream!");
        this.bytes = new Uint8Array(arrayBuffer);
        this.start = start || 0;
        this.pos = this.start;
        this.end = (start + length) || this.bytes.length;
    }

    // basic info getters
    get length() {
        return this.end - this.start;
    }

    get position() {
        return this.pos;
    }

    get remaining() {
        return this.end - this.pos;
    }

    get updatePosBy() {
        return (length) => {
            return (this.pos += length);
        }
    }

    subStream(start, length) {
        return (new BytesStream(this.bytes.buffer, start, length))
    };

    seek(index) {
        assert(0 < index && index <= this.end, "Illegal seek location!(" + index + ")") && (this.pos = index)
        return true;
    };

    skip(length) {
        return this.seek(this.pos + length)
    }

    reserved(length, value) {
        for (let i = 0; i < length; i++) {
            assert(this.readU8() === value, "Reserved does not equal value!"); //fatal exception  TODO: update to true/false instead
        }
        return true;
    };

    readU8Array(length) {
        const {pos, end, bytes, updatePosBy}=this;
        if (noBreakingError(pos > end - length, BUFFER_READ_LENGTH_ERROR, 56)) {
            return null;
        }
        updatePosBy(length);
        return bytes.subarray(pos, pos + length);
    }

    readU32Array(rows, names) { //TODO:BUG - fix not updating position here!!
        assert(rows, "Missing data on readU32Array");
        const cols = (names && names.length) || 1,
            {pos, end, updatePosBy}=this,
            readLength = (rows * cols) * 4;
        if (noBreakingError(pos > end - readLength, BUFFER_READ_LENGTH_ERROR, 68)) {
            return null;
        }
        return (new Array(rows)).fill().map(
            cols === 1
                ? () => (this.readU32())
                : () => (names.reduce((res, name) => {
                    res[name] = this.readU32();
                    return res;
                }, {}))
        );
    }

    readU8() {
        const {pos, end, bytes, updatePosBy}=this;
        if (noBreakingError(pos > end, BUFFER_READ_LENGTH_ERROR, 85)) {
            return null;
        }
        updatePosBy(1);
        return bytes[pos];
    }

    readU16() {
        const {pos, end, bytes, updatePosBy}=this;
        if (noBreakingError(pos > end - 1, BUFFER_READ_LENGTH_ERROR, 94)) {
            return null;
        }
        updatePosBy(2);
        return bytes[pos + 0] << 8 | bytes[pos + 1];
    }

    readU24() {
        const {pos, end, bytes, updatePosBy}=this;
        if (noBreakingError(pos > end - 3, BUFFER_READ_LENGTH_ERROR, 103)) {
            return null;
        }
        updatePosBy(3);
        return bytes[pos + 0] << 16 | bytes[pos + 1] << 8 | bytes[pos + 2];
    }

    readU32() {
        const {pos, end, bytes, updatePosBy}=this;
        if (noBreakingError(pos > end - 4, BUFFER_READ_LENGTH_ERROR, 112)) {
            return null;
        }
        updatePosBy(4);
        return bytes[pos + 0] << 24 | bytes[pos + 1] << 16 | bytes[pos + 2] << 8 | bytes[pos + 3];
    }

    peek32() { //same as read but don't advance the read position
        const {pos, end, bytes}=this;
        if (pos > end - 3) { //no need for breaking error here, sometimes we peek to see if anything is left
            return null;
        }
        return bytes[pos + 0] << 24 | bytes[pos + 1] << 16 | bytes[pos + 2] << 8 | bytes[pos + 3];
    }

    read8() {
        return (this.readU8() << 24 >> 24);
    }

    read16() {
        return (this.readU16() << 16 >> 16);
    }

    read24() {
        return (this.readU24() << 8 >> 8);
    }

    read32() {
        return (this.readU32());
    }

    readFP8() {
        return (this.read16() / 256);
    }

    readFP16() {
        return (this.read32() / 65536);
    }

    read4CC() {
        const {pos, end, bytes, updatePosBy}=this;
        if (noBreakingError(pos > end - 4, BUFFER_READ_LENGTH_ERROR, 153)) {
            return null;
        }
        let res = "";
        for (let i = 0; i < 4; i++) {
            //avoiding readU8 for performance reassons ( no need to check if length for 4 times at a time )
            res += String.fromCharCode(bytes[pos + i]);
        }
        updatePosBy(4);
        return res;
    }

    // readUTF8 = (length) => (loopAdd("",length,()=>(this.readU8()))) TODO: update to this format to save space and optimize
    readUTF8(length) {
        let string = "";
        for (let i = 0; i < length; i++) {
            string += String.fromCharCode(this.readU8()); // shouldnt utf8 be 16?
        }
        return string;
    }

    readISO639() {
        const bits = this.readU16();
        let res = "";
        for (let i = 0; i < 3; i++) {
            res += String.fromCharCode((bits >>> (2 - i) * 5) & 0x1f + 0x60);
        }
        return res;
    }

    readPString(max) {
        const len = this.readU8();
        assert(len <= max, "Failed to readPstring! Too long? im not sure what this is");
        const res = this.readUTF8(len);
        this.reserved(max - len - 1, 0); // check remaining bits as 0? why?
        return res;
    }
}

module.exports = BytesStream;