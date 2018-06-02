/**
 * Created by vladi on 27-May-17.
 */
import Event from "../events/Event";
import {assert} from "../common";

export class DigestControlReady extends Event {
    _videoDuration = 0;
    _videoWidth = 0;
    _videoHeight = 0;

    constructor(payload = {}) {
        super();
        this._videoDuration = payload._videoDuration || 0;
        this._videoWidth = payload._videoWidth || 0;
        this._videoHeight = payload._videoHeight || 0;
    }

    get videoDuration() {
        return this._videoDuration;
    }

    get videoWidth() {
        return this._videoWidth;
    }

    get videoHeight() {
        return this._videoHeight;
    }
}