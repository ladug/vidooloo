/**
 * Created by vladi on 22-May-17.
 */
import Event from "../events/Event";
export class StreamSuccess extends Event {
    payload = null;

    constructor(event) {
        super();
        this.payload = event;
    }
}
export class StreamProgress extends Event {
    payload = null;

    constructor(event) {
        super();
        this.payload = event;
    }
}
export class StreamError extends Event {
    payload = null;

    constructor(event) {
        super();
        this.payload = event;
    }
}
export class StreamAbort extends Event {
    payload = null;

    constructor(event) {
        super();
        this.payload = event;
    }
}

