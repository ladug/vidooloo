/**
 * Created by vladi on 27-May-17.
 */
import Event from "../events/Event";

export class HeadersReadyEvent extends Event {
    _pvfHeader = null;
    _svfHeader = null;

    constructor(pvfHeader, svfHeader) {
        super();
        this._pvfHeader = pvfHeader || null;
        this._svfHeader = svfHeader || null;
    }

    get pvfHeader() {
        return this._pvfHeader;
    }

    get svfHeader() {
        return this._svfHeader;
    }
}

export class ExtractedSamplesEvent extends Event {
    _videoSamplesDuration = 0;
    _audioSamplesDuration = 0;
    _partialPvf = false;
    _partialSvf = false;

    constructor(payload = {}) {
        super();
        this._videoSamplesDuration = payload.videoSamplesDuration || 0;
        this._audioSamplesDuration = payload.audioSamplesDuration || 0;
        this._partialPvf = !!payload.partialPvf;
        this._partialSvf = !!payload.partialSvf;
    }

    get isPartialPvf() {
        return this._partialPvf;
    }

    get isPartialSvf() {
        return this._partialSvf;
    }

    get videoSamplesDuration() {
        return this._videoSamplesDuration;
    }

    get audioSamplesDuration() {
        return this._audioSamplesDuration;
    }
}
