/**
 * Created by vladi on 26-May-17.
 */
import EventEmitter from "../events/EventEmitter";
import {ManagerReadyEvent, ChunkDownloadedEvent} from "./DownloadManagerEvents";
import Stream from "../stream/Stream";
import {StreamSuccess, StreamError, StreamProgress, StreamAbort} from "../stream/StreamEvents";
import {PvfHeader} from "../readers/PvfReader";
import {assert, kb} from "../common";

export default class DownloadManager extends EventEmitter {
    streamThreads = [];
    queue = [];
    configurations = {
        src: null, //TODO: default demo url
        threads: 1,
        useWorkers: false,
        readOffset: 0,
        headerSize: 56,
        readSize: 32 * kb, //per thread?
        streamConfigurations: {
            responseType: "arraybuffer",
        }
    };
    headerStream = new Stream();

    constructor(configurations = {}, streamConfigurations = {}) {
        super();
        this.configurations = {
            ...this.configurations,
            ...configurations,
            streamConfigurations: {
                ...this.configurations.streamConfigurations,
                ...streamConfigurations
            }
        };
    }

    init() {
        const {threads, useWorkers, streamConfigurations} = this.configurations;
        assert(threads && threads > 0, "[DownloadManager] Illegal stream thread count!");
        if (useWorkers) {
            assert(false, "Not yet supported!")//TODO
        } else {
            this.streamThreads = (new Array(threads)).fill().map((a, index) => {
                const stream = new Stream(streamConfigurations);
                stream.addEventListener(StreamSuccess, this._chunkSuccess);
                stream.addEventListener(StreamError, this._chunkError);
                stream.addEventListener(StreamAbort, this._chunkAborted);
                stream.addEventListener(StreamProgress, this._chunkProgress);
                return stream;
            });
        }
        this._probeFile();
    }

    _updateReadOffset = (add) => {
        this.configurations.readOffset += add || 0;
    };
    _readHeader = (event) => {
        const {headerSize} = this.configurations;
        this.dispatchEvent(new ManagerReadyEvent(
            new PvfHeader(
                new Uint8Array(event.payload.response)
            )
        ));
        this.headerStream.destroy();
        this.headerStream = null;
    };
    _headerError = () => {
        assert(false, "Could not read file!");
        this.headerStream.destroy();
        this.headerStream = null;
    };

    _probeFile() {
        const {src, headerSize} = this.configurations,
            {headerStream} = this;
        headerStream.set({
            responseType: "arraybuffer"
        });
        headerStream.setHeaders({
            "range": "bytes=0-" + (headerSize - 1)
        });
        headerStream.addEventListener(StreamSuccess, this._readHeader);
        headerStream.addEventListener(StreamError, this._headerError);
        headerStream.get(src);
    };

    _chunkProgress = (event) => {
        console.info("_chunkProgress", event);
    };

    _chunkAborted = (event) => {
        console.error("Error reading chunk(aborted)!", event);
        this._checkChunkQueue();
    };

    _chunkError = (event) => {
        console.error("Error reading chunk!", event);
        this._checkChunkQueue();
    };

    _chunkSuccess = (event) => {
        this.dispatchEvent(new ChunkDownloadedEvent(event.payload.response));
        this._checkChunkQueue();
    };

    readChunks() {
        const {readOffset, readSize, src} = this.configurations;
        this.queue.push({
            src: src,
            size: readSize,
            readStart: readOffset,
            readEnd: readOffset + readSize
        });
        this._updateReadOffset(readSize);
        this._checkChunkQueue();
    }

    _checkChunkQueue() {
        if (!this.isQueueEmpty) {
            const {streamThreads} = this;
            streamThreads.forEach(stream => {
                if (!stream.isLoading && !this.isQueueEmpty) {
                    const {readStart, readEnd, size, src} = this.queue.shift();
                    stream.chunkData = {
                        offset: readStart,
                        size: size
                    };
                    stream.setHeaders({
                        "range": ["bytes=", readStart, "-", (readEnd - 1)].join('')
                    });
                    stream.get(src);
                }
            });
        }
    }

    get isQueueEmpty() {
        return !this.queue.length;
    }
}