/**
 * Created by vladi on 20-May-17.
 */
import {removeEventListener, activateListener, suspendListener, listenerExists} from './common'
export default class EventListener {
    _uid = null;

    constructor(listenerUid) {
        this._uid = listenerUid;
    }

    suspend() {
        suspendListener(this.uid);
        return this;
    }

    activate() {
        activateListener(this.uid);
        return this;
    }

    isRemoved() {
        return !listenerExists(this.uid);
    }

    remove() {
        removeEventListener(this.uid);
        return this;
    }

    get uid() {
        return this._uid;
    }
}