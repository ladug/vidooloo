/**
 * Created by vladi on 27-May-17.
 */
import EventEmitter from "../events/EventEmitter";
import {ChunkDownloadedEvent, ConnectionOpenedEvent} from "./DownloadManagerEvents";
import {StreamError, StreamSuccess, StreamAbort} from "../stream/StreamEvents";
import {assert, kb} from "../common";
import {encode as QsEncode} from "querystring";

const SVF_URL = "ws://localhost:3101/";
export default class SvfStreamManager extends EventEmitter {
    configurations = {
        pvfUid: null,
        type: null,
        version: null,
        src: null,
        useWorkers: false,
        readOffset: 0,
        readSize: 5 * kb,
    };

    constructor(configurations = {}) {
        super();
        this.configurations = {
            ...this.configurations,
            ...configurations
        };
    }

    init() {
        const {configurations} = this,
            {pvfUid} = configurations;

        const fileId = Buffer.from(pvfUid).toString('hex')
        const params = QsEncode({fileId});

        this.readStream = new WebSocket(`${SVF_URL}?${params}`);
        this.readStream.onopen = this._onOpen;
        this.readStream.onmessage = this._onMessage;
        this.readStream.onerror = this._onChunkError;
    }

    _onOpen = () => {
        this.dispatchEvent(new ConnectionOpenedEvent());
    }

    _onMessage = (event) => {
        const fileReader = new FileReader();
        fileReader.addEventListener("load", () => this.dispatchEvent(new ChunkDownloadedEvent(fileReader.result)));
        fileReader.readAsArrayBuffer(event.data);
    };

    _onChunkError = (event) => {
        console.error("SVF-_onChunkError", event);
    };

    readChunk() {
        const {readStream} = this;

        readStream.send('');
    }
}