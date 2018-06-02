/**
 * Created by vladi on 20-May-17.
 */
import {
    getUid,
    isValidEvent,
    listenerExists,
    addEventListener,
    isValidEventConstructor,
    removeEventListener,
    clearEventListeners,
    dispatchEvent
} from "./common";
import EventListener from "./EventListener";
export default class EventEmitter {
    _uid = null;
    _activeEvents = {};
    _activeEventsCount = 0;
    _destroyAfterDispatch = false;

    constructor() {
        this._uid = getUid();
    }

    get uid() {
        return this._uid;
    }

    get isDispatchActive() {
        return this._activeEventsCount;
    }

    _markEventDispatchStart(eventUid) {
        this._activeEventsCount++;
        this._activeEvents[eventUid] = true;
    }

    _markEventDispatchEnd(eventUid) {
        this._activeEventsCount--;
        delete this._activeEvents[eventUid];
    }

    isEventDispatching(eventUid) {
        return this._activeEvents[eventUid];
    }

    addEventListener(event, handler) {
        if (isValidEventConstructor(event) && typeof handler === 'function') {
            return new EventListener(
                addEventListener({
                    _active: true,
                    _emitterUid: this.uid,
                    _eventUid: event.uid,
                    _handler: handler
                })
            );
        }
        return null;
    }

    removeEventListener(mixed) {
        const listenerUid = (EventListener.isPrototypeOf(mixed) && mixed.uid)
            || (typeof mixed === "string" && mixed)
            || null;
        if (listenerUid && listenerExists(listenerUid)) {
            removeEventListener(listenerUid);
        }
        return this;
    }

    dispatchEvent(event) {
        if (isValidEvent(event)) {
            if (this.isEventDispatching(event.uid)) {
                throw new Error("Event dispatch cause the same event to dispatch ( event-seption ! )")
            }
            this._markEventDispatchStart(event.uid);
            dispatchEvent(this.uid, event);
            this._markEventDispatchEnd(event.uid);

            !this.isDispatchActive && this._destroyAfterDispatch && this.destroyEvents();
        }
        return this;
    }

    destroyEvents() {
        if (this.isDispatchActive) {
            this._destroyAfterDispatch = true;
        } else {
            clearEventListeners(this.uid);
        }
    }
}