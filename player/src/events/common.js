/**
 * Created by vladi on 20-May-17.
 */
let listenerRegistry = {};
let dispatchRegistry = {};
let uid = 1;

export class BasicEvent {
}

export const
    getUid = () => ++uid,
    isValidEvent = (event) => (BasicEvent.isPrototypeOf(event.constructor)),
    isValidEventConstructor = (event) => (BasicEvent.isPrototypeOf(event)),
    listenerExists = (listenerUid) => !!listenerRegistry[listenerUid],
    dispatchExists = (emitterUid, eventUid) => !!(dispatchRegistry[emitterUid] && dispatchRegistry[emitterUid][eventUid]),
    emitterExists = (emitterUid) => !!dispatchRegistry[emitterUid],
    suspendListener = (listenerUid) => {
        if (listenerExists(listenerUid)) {
            listenerRegistry[listenerUid]._active = false;
        }
    },
    activateListener = (listenerUid) => {
        if (listenerExists(listenerUid)) {
            listenerRegistry[listenerUid]._active = true;
        }
    },
    addEventListener = ({_emitterUid, _active, _eventUid, _handler}) => {
        const listenerUid = getUid();
        listenerRegistry[listenerUid] = {
            _uid: listenerUid,
            _active: _active,
            _emitterUid: _emitterUid,
            _eventUid: _eventUid,
            _handler: _handler,
        };
        dispatchRegistry[_emitterUid] = dispatchRegistry[_emitterUid] || {};
        dispatchRegistry[_emitterUid][_eventUid] = dispatchRegistry[_emitterUid][_eventUid] || [];
        dispatchRegistry[_emitterUid][_eventUid].push(listenerUid);
        return listenerUid;
    },
    removeEventListener = (listenerUid) => {
        const {_eventUid, _emitterUid} = listenerRegistry[listenerUid];
        if (emitterExists(_emitterUid) && dispatchExists(_emitterUid, _eventUid)) {
            const dispatchRegister = dispatchRegistry[_emitterUid][_eventUid],
                listenerLocation = dispatchRegister.indexOf(listenerUid);
            (listenerLocation > -1) && dispatchRegister.splice(listenerLocation, 1);
        }
    },
    clearEventListeners = (emitterUid) => {
        if (emitterExists(emitterUid)) {
            const emitterEvents = dispatchRegistry[emitterUid];
            Object.keys(emitterEvents).forEach(
                eventUid => emitterEvents[eventUid].forEach(
                    listenerUid => delete listenerRegistry[listenerUid]
                )
            );
            delete dispatchRegistry[emitterUid];
        }
    },
    dispatchEvent = (emitterUid, event) => {
        const eventUid = event.uid;
        if (emitterExists(emitterUid) && dispatchExists(emitterUid, eventUid)) {
            dispatchRegistry[emitterUid][eventUid].forEach(
                (listenerUid) => {
                    const listenerInfo = listenerRegistry[listenerUid];
                    listenerInfo && listenerInfo._active && listenerInfo._handler(event)
                }
            );
        }
    };