/**
 * Created by vladi on 20-May-17.
 */
import {BasicEvent, getUid} from './common';

export default class Event extends BasicEvent {
    constructor() {
        super();
        this.constructor.prototype._uid = this.constructor.prototype._uid || getUid();
    }

    get uid() {
        return this.constructor.prototype._uid;
    }

    static get uid() {
        return this.prototype._uid || (new this()).uid;
    }
}

