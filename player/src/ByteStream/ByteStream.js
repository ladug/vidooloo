/**
 * Created by vladi on 28-May-17.
 */
import {slice} from '../common';

export default class ByteStream {
    bytes = new Uint8Array(0);
    offset = 0;

    constructor(uint8Array, offset) {
        this.bytes = uint8Array;
        this.offset = offset || 0;
    }

    get length() {
        return this.bytes.length;
    }

    get hasData() {
        return this.offset < this.length;
    }

    reset() {
        this.offset = 0;
    }

    skip(readSize) {
        this.offset += readSize;
        return true;
    }

    updateOffset(readSize) {
        this.offset += readSize;
        return true;
    }

    read4() {
        const {offset, bytes} = this,
            byte = bytes[offset] >> 4; //shift 4 right to get the first 4 bits
        return [
            byte >> 3, //shift 3 right to get the first bit
            byte & 4 >> 2, // (1111 & 0100 -> 0100), (1010 & 0100 -> 0000), then shift 2 to the right to get the bit
            byte & 2 >> 1, // same only compare to 0010, then shift right once to expose the bit
            byte & 1 //compare to 0001 if matches then 1 else 0
        ]
    }

    read8() {
        const {offset, bytes} = this;
        this.updateOffset(1);
        return bytes[offset];
    }

    read16() {
        const {offset, bytes} = this;
        this.updateOffset(2);
        return bytes[offset] << 8 | bytes[offset + 1];
    }

    read20() {
        const {offset, bytes} = this;
        this.updateOffset(3);
        return (bytes[offset] & 15) << 16 | bytes[offset + 1] << 8 | bytes[offset + 2]; //un mark the first 4 bits then read 24
    }

    read24() {
        const {offset, bytes} = this;
        this.updateOffset(3);
        return bytes[offset] << 16 | bytes[offset + 1] << 8 | bytes[offset + 2];
    }

    read32() {
        const {offset, bytes} = this;
        this.updateOffset(4);
        return bytes[offset] << 24 | bytes[offset + 1] << 16 | bytes[offset + 2] << 8 | bytes[offset + 3];
    }

    readChar4() {
        const {offset, bytes} = this;
        this.updateOffset(4);
        return slice(bytes, offset, offset + 4).map(byte => String.fromCharCode(byte)).join('');
    }

    read(size) {
        const {offset, bytes} = this;
        this.updateOffset(size);
        return bytes.slice(offset, offset + size);
    }

    getRemaining() {
        return this.bytes.slice(this.offset, this.length);
    }

    destroy() {
        this.bytes = new Uint8Array(0);
        this.offset = 0;
    }
}