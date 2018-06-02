/**
 * Created by vladi on 09-Aug-17.
 */
const BYTE = 8;
export default class BitStream {
    bytes = new Uint8Array(0);
    bytePosition = 0;
    bitPosition = 0;

    constructor(uint8Array, bytePosition, bitPosition) {
        this.bytes = uint8Array;
        this.bytePosition = bytePosition || 0;
        this.bitPosition = bitPosition || 0;
    }

    get offset() {
        return BYTE * this.bytePosition + this.bitPosition;
    }

    get length() {
        return BYTE * this.bytes.length;
    }

    get hasData() {
        const {bytePosition, bitPosition} = this;
        return (bytePosition + bitPosition) < this.length;
    }

    reset() {
        this.bytePosition = 0;
        this.bitPosition = 0;
    }

    advance(bits) {
        const bitPosition = this.bitPosition + bits;
        this.bytePosition += Math.floor(bitPosition / 8);
        this.bitPosition = bitPosition & 7;
        return true;
    };

    seek(bitOffset) {
        this.bytePosition = Math.floor(bitOffset / 8);
        this.bitPosition = bitOffset & 7;
    }

    align() {
        this.bitPosition = 0;
        this.bytePosition++;
    }

    _peek(bits) {
        const {bitPosition} = this,
            bitOffset = bitPosition + bits - 1; //0-31 bits instead of 1-32

        switch (Math.floor(bitOffset / 8)) {
            case 0 : // bits <= 8
                const u8 = this._peek8();
                return ((u8 << bitPosition) & 0xff) >>> (8 - bits);
                break;
            case 1 : // 8 < bits <= 16
                const u16 = this._peek16();
                return ((u16 << bitPosition) & 0xffff) >>> (16 - bits);
                break;
            case 2 : // 16 < bits <= 24
                const u24 = this._peek24();
                return ((u24 << bitPosition) & 0xffffff) >>> (24 - bits);
                break;
            case 3 : // 24 < bits <= 32
                const u32 = this._peek32();
                return (u32 << bitPosition) >>> (32 - bits);
                break;
            default:
                throw new Error("No more than 32!");
        }
    }

    peek(bits) {
        return bits > 0 ? this._peek(bits) : 0;
    }

    read(bits,signed) {
        if (bits > 0) {
            const bitResult = this._peek(bits);
            this.advance(bits);
            return bitResult;
        }
        return 0;
    }

    _peek8() {
        const {bytePosition, bytes} = this;
        return bytes[bytePosition];
    }

    _peek16() {
        const {bytePosition, bytes} = this;
        return bytes[bytePosition] << 8 | bytes[bytePosition + 1];
    }

    _peek24() {
        const {bytePosition, bytes} = this;
        return bytes[bytePosition] << 16 | bytes[bytePosition + 1] << 8 | bytes[bytePosition + 2];
    }

    _peek32() {
        const {bytePosition, bytes} = this;
        return bytes[bytePosition] << 24 | bytes[bytePosition + 1] << 16 | bytes[bytePosition + 2] << 8 | bytes[bytePosition + 3];
    }

    destroy() {
        this.bytes = new Uint8Array(0);
        this.bytePosition = 0;
    }
}