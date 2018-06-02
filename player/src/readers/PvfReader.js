/**
 * Created by vladi on 27-May-17.
 */
import {assert, readByteString} from "../common";
import ByteStream from '../ByteStream/ByteStream'
import BufferByteStream from '../ByteStream/BufferByteStream'
export default class PvfReader {
    constructor() {

    }
};


export class PvfHeader {
    _type = null;
    _version = null;
    _uid = null;

    constructor(headerBytes, expected = 56) {
        if (!(headerBytes instanceof BufferByteStream) && !(headerBytes instanceof ByteStream)) {
            headerBytes = new ByteStream(headerBytes);
            assert(headerBytes.length === expected, "Wrong header size!");
        } else {
            assert(headerBytes.length >= expected, "Wrong header size!");
        }
        this._type = headerBytes.readChar4();
        this._version = headerBytes.readChar4();
        this._uid = headerBytes.read(48);
    }

    get type() {
        return this._type;
    }

    get version() {
        return this._version;
    }

    get uid() {
        return this._uid;
    }
}