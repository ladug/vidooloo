/**
 * Created by vladi on 22-May-17.
 */
import EventEmitter from "../events/EventEmitter";
import {StreamProgress, StreamError, StreamSuccess, StreamAbort} from "./StreamEvents";

export default class Stream extends EventEmitter {
    _http = null;
    _loading = false;
    _destroyed = false;
    _configurations = {};
    _headers = {};
    _chunkData = null;

    constructor(configurations = {}) {
        super();
        this._http = new XMLHttpRequest();
        this._configurations = {
            ...this._configurations,
            ...configurations
        };
        this._connectXHttp();
    }

    set chunkData(chunkData) {
        this._chunkData = {...chunkData};
    }

    _connectXHttp() {
        this._http = Object.assign(this._http, this._configurations);
        this._http.onload = this._onLoad;
        this._http.ontimeout = this._onError;
        this._http.onerror = this._onError;
        this._http.onProgress = this._onProgress;
    }

    _onLoad = () => {
        this._loading = false;
        this.dispatchEvent(new StreamSuccess({
            response: this._http.response,
            status: this._http.status,
            time: (new Date()).getTime() - this._start,
            type: "success",
            chunkData: this._chunkData
        }));
    };
    _onError = ({type}) => {
        this._loading = false;
        this.dispatchEvent(new StreamError({
            response: null,
            status: this._http.status,
            time: (new Date()).getTime() - this._start,
            type: type,
            chunkData: this._chunkData
        }));
    };
    _onProgress = (event) => {
        this.dispatchEvent(new StreamProgress({
            response: null,
            time: (new Date()).getTime() - this._start,
            status: this._http.status,
            type: "progress",
            chunkData: this._chunkData
        }));
    };
    _applyHeaders = () => {
        const {_headers, _http} = this;
        Object.keys(_headers).forEach(header => {
            _http.setRequestHeader(header, _headers[header])
        })
    };

    set(configurations) {
        delete configurations.onload;
        delete configurations.ontimeout;
        delete configurations.onerror;
        delete configurations.onProgress;
        this._http = Object.assign(this._http, configurations);
    }

    setHeaders(headers) {
        this._headers = {
            ...this._headers,
            ...headers
        }
    }

    abort() {
        if (this._loading && !this._destroyed) {
            this._http.abort();
            this._loading = false;
            this.dispatchEvent(new StreamAbort());
        }
    }

    get(url) {
        if (!this._loading && !this._destroyed) {
            this._loading = true;
            this._http.open("GET", url, true);
            this._applyHeaders();
            this._start = (new Date()).getTime();
            this._http.send();
        }
    }

    post(url) {
        if (!this._loading && !this._destroyed) {
            this._loading = true;
            this._http.open("POST", url, true);
            this._applyHeaders();
            this._start = (new Date()).getTime();
            this._http.send();
        }
    }

    get isLoading() {
        return this._loading;
    }

    get isDestroyed() {
        return this._destroyed;
    }

    destroy() { //cleanup
        this._http.onload = null;
        this._http.ontimeout = null;
        this._http.onerror = null;
        this._http.onProgress = null;
        this._http = null;
        this._configurations = {};
        this._destroyed = true;
        this.destroyEvents();
    }
}