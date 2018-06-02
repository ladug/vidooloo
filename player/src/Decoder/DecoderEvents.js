/**
 * Created by vladi on 12-Jun-17.
 */
import Event from '../events/Event';
export class DecoderReadyEvent extends Event{

}

export class PictureDecodedEvent extends Event {
    _data = null;
    _width = null;
    _height = null;
    _info = {};

    constructor(payload = {}) {
        super();
        this._data = payload.data || null;
        this._width = payload.width || 0;
        this._height = payload.height || 0;
        this._info = payload.info | {};
        payload = null;
    }

    get data() {
        return this._data;
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    get info() {
        return this._info;
    }
}