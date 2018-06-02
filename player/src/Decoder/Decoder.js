/**
 * Created by vladi on 12-Jun-17.
 */
import EventEmitter from '../events/EventEmitter';
import WorkerLoader from '../workerloader/WorkerLoader'
import {WorkerReady, WorkerError} from '../workerloader/WorkerLoaderEvents'
import ByteStream from '../ByteStream/ByteStream';
import {PictureDecodedEvent, DecoderReadyEvent} from './DecoderEvents';
import {assert} from '../common';

const getNalUnits = (sampleData) => {
    const sampleStream = new ByteStream(sampleData),
        units = [];
    while (sampleStream.hasData) {
        units.push(sampleStream.read(sampleStream.read32()))
    }
    return units;
};

export default class Decoder extends EventEmitter {
    sampleQue = [];
    worker = null;
    decoder = null;
    isWorkerReady = false;
    _isWorkerBusy = false;
    isDecoderReady = false;
    _isDecoderBusy = false;
    decodingTimeout = 0;
    configurations = {
        src: null,
        useWebgl: true,
        reuseMemory: true,
        useWorker: true,
        useDocker: true
    };

    get isBusy() {
        const {isDecoderBusy, isWorkerBusy} = this;
        return isDecoderBusy && isWorkerBusy;
    }

    get isDecoderBusy() {
        const {isDecoderReady, _isDecoderBusy} = this;
        return !isDecoderReady || _isDecoderBusy;
    }

    get isWorkerBusy() {
        const {isWorkerReady, _isWorkerBusy} = this;
        return !isWorkerReady || _isWorkerBusy;
    }

    get isReady() {
        const {worker, isWorkerReady, decoder, isDecoderReady} = this;
        return (worker && isWorkerReady) || (decoder && isDecoderReady)
    }

    constructor(configurations = {}) {
        super();
        this.configurations = {
            ...this.configurations,
            ...configurations,
        }
    }

    init() {
        const {useWorker, useDocker, src} = this.configurations;
        if (useWorker) {
            const workerLoader = new WorkerLoader(src);
            workerLoader.addEventListener(WorkerReady, this._onWorkerReady);
            workerLoader.addEventListener(WorkerError, this._onWorkerError);
        }
        if (useDocker) {
            //TODO: add inline decoder to improve performance
        }
    }


    decode(sample) {
        const sampleUnits = getNalUnits(sample.sampleData);
        this.sampleQue.push(sampleUnits);
        this._runDecoderQue();
    }

    configure(sps, pps) {
        const {worker} = this;
        worker.postMessage({buf: sps.buffer, offset: 0, length: sps.length}, [sps.buffer]);
        worker.postMessage({buf: pps.buffer, offset: 0, length: pps.length}, [pps.buffer]);
    }

    _decodeSample(nalUnits) {
        const {isWorkerBusy, isDecoderBusy, worker} = this;
        if (!isWorkerBusy) {
            return nalUnits.forEach((data) => {
                data.length && worker.postMessage(
                    {
                        buf: data.buffer,
                        offset: 0,
                        length: data.length,
                        info: undefined
                    },
                    [data.buffer]
                );
            })
        }

        if (!isDecoderBusy) {
            return;
        }
        throw new Error("Sample was dropped!");
    }

    _runDecoderQue = () => {
        window.clearTimeout(this.decodingTimeout);
        this.decodingTimeout = window.setTimeout(this._runDecode, 0);
    };

    _runDecode = () => {
        const {isReady, isBusy, sampleQue} = this;
        if (isReady && !isBusy && sampleQue.length) {
            this._decodeSample(sampleQue.shift());
        }
    };

    _onWorkerReady = (e) => {
        this.worker = e.worker;
        this._initWorker();
    };

    _initWorker = () => {
        const {isReady, worker, _onWorkerMessage} = this, {useWebgl, reuseMemory} = this.configurations;
        worker.addEventListener('message', _onWorkerMessage);
        worker.postMessage({
            type: "Broadway.js - Worker init", options: {
                rgb: !useWebgl,
                reuseMemory: reuseMemory
            }
        });
    };

    _onWorkerMessage = ({data}) => {
        //console.error("_onWorkerMessage", data);

        if (data.consoleLog) {
            if (data.consoleLog === "broadway worker initialized") {
                this.dispatchEvent(new DecoderReadyEvent());
                this.isWorkerReady = true;
            } else {
                console.warn(data.consoleLog);
                this._isWorkerBusy = false;
                this._runDecoderQue();
            }
        } else {
            window.setTimeout(() => {
                this.dispatchEvent(new PictureDecodedEvent({
                    data: new Uint8Array(data.buf),
                    width: data.width,
                    height: data.height,
                    info: data.infos
                }));
                this._isWorkerBusy = false;
                this._runDecoderQue();
            }, 0)
        }
    };

    _onWorkerError = (e) => {
        console.error("_onWorkerError", e);
    };
}