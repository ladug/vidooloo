/**
 * Created by vladi on 20-May-17.
 */
import Event from "../events/Event";

export class WorkerLoaded extends Event {
    _response = null;
    _type = null;
    _status = 0;

    constructor(payload = {}) {
        super();
        this._response = payload.response || null;
        this._status = payload.status || null;
        this._type = payload.type || null;
    }

    get response() {
        return this._response;
    }

    get status() {
        return this._status;
    }

    get type() {
        return this._type;
    }
}

export class WorkerError extends Event {
    _response = null;
    _message = null;
    _type = null;
    _status = 0;

    constructor(payload = {}) {
        super();
        this._response = payload.response || null;
        this._status = payload.status || null;
        this._type = payload.type || null;
        this._error = payload.error || null;
    }

    get response() {
        return this._response;
    }

    get status() {
        return this._status;
    }

    get type() {
        return this._type;
    }

    get error() {
        return this._error;
    }
}

export class WorkerReady extends Event {
    _worker = null;

    constructor(payload = {}) {
        super();
        this._worker = payload.worker || null;
    }

    get worker() {
        return this._worker;
    }
}