/**
 * Created by vladi on 26-May-17.
 */
import Event from "../events/Event";
import {assert} from "../common";
export class ChunkDownloadedEvent extends Event {
    _chunk = null;

    constructor(chunk) {
        super();
        this._chunk = chunk || null;
    }

    get chunk() {
        return this._chunk;
    }
}

export class ConnectionOpenedEvent extends Event {

}

export class ManagerReadyEvent extends Event {
    _payload = null;

    constructor(payload) {
        super();
        this._payload = payload;
    }

    get payload() {
        return this._payload;
    }
}