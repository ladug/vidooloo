/**
 * Created by vladi on 27-May-17.
 */
import EventEmitter from "../events/EventEmitter";
import DataParser from "../dataparser/DataParser";
import {sec} from "../common";
import {ChunkDownloadedEvent, ConnectionOpenedEvent} from "../downloadmanager/DownloadManagerEvents";
import {HeadersReadyEvent, ExtractedSamplesEvent} from "../dataparser/DataParserEvents";
import {DigestControlReady} from "./DigestControlEvents";


export default class DigestControl extends EventEmitter {
    dataParser = new DataParser();
    preloadCheckTimer = 0;
    pvfDownloadManager = null;
    svfDownloadManager = null;
    preload = {
        isPartialPvf: false,
        isPartialSvf: false,
        video: {
            preloadDuration: 0,
            loadedTime: 1,
            currentTime: 0,
        },
        audio: {
            preloadDuration: 0,
            loadedTime: 1,
            currentTime: 0,
        },
    };
    _basicInfo = {};
    _isPvfLoading = false;
    _isSvfLoading = false;
    headers = {
        pvf: null,
        svf: null,
    };
    configurations = {
        preload: 5,
    };

    constructor(pvfDownloadManager, svfDownloadManager, configurations = {}) {
        super();
        this.configurations = {
            ...this.configurations,
            ...configurations
        };
        this.dataParser.addEventListener(HeadersReadyEvent, this._onParserHeaders);
        this.dataParser.addEventListener(ExtractedSamplesEvent, this._onSamplesUpdate);
        this.pvfDownloadManager = pvfDownloadManager;
        this.pvfDownloadManager.addEventListener(ChunkDownloadedEvent, this._onPvfChunk);
        this.svfDownloadManager = svfDownloadManager;
        this.svfDownloadManager.addEventListener(ChunkDownloadedEvent, this._onSvfChunk);
    }

    shiftVideoSample() {
        const {timeScale} = this.preload.video,
            videoSample = this.dataParser.getVideoSample();
        if (!videoSample) {
            return null;
        }
        this.preload.video.currentTime += videoSample.duration;
        this._quePreloadCheck();
        return {
            ...videoSample,
            duration: videoSample.duration / timeScale * sec,
        };
    }

    _quePreloadCheck() {
        window.clearTimeout(this.preloadCheckTimer);
        this.preloadCheckTimer = window.setTimeout(this._checkRunPreloaded, 0);
    }

    shiftAudioSample() {
        const {timeScale} = this.preload.audio,
            audioSample = this.dataParser.getAudioSample();
        if (!audioSample) {
            return null;
        }
        this.preload.audio.currentTime += audioSample.duration;
        this._quePreloadCheck();
        return {
            ...audioSample,
            duration: audioSample.duration / timeScale * sec,
        };
    }

    digestSamples() {
        return this.dataParser.parse();
    }

    _onSamplesUpdate = (event) => {
        // console.log("_onSamplesUpdate", event);
        const {videoSamplesDuration, audioSamplesDuration, isPartialSvf, isPartialPvf} = event;
        this.preload.video.loadedTime = videoSamplesDuration;
        this.preload.audio.loadedTime = audioSamplesDuration;
        this.preload.isPartialPvf = isPartialPvf;
        this.preload.isPartialSvf = isPartialSvf;
        this._checkRunPreloaded();
    };

    _checkRunPreloaded = () => {
        const {
                video: {loadedTime: videoSamplesDuration, preloadDuration: videoPreloadDuration, currentTime: videoCurrentTime},
                audio: {loadedTime: audioSamplesDuration, preloadDuration: audioPreloadDuration, currentTime: audioCurrentTime},
            } = this.preload,
            isVideoPreloaded = (videoSamplesDuration - videoCurrentTime) >= videoPreloadDuration,
            isAudioPreloaded = (audioSamplesDuration - audioCurrentTime) >= audioPreloadDuration;

        if (!isVideoPreloaded /*|| !isAudioPreloaded*/) {
            this._loadNextChunk();
        }
    };

    _loadNextChunk() {
        const {_isPvfLoading: isPvfLoading, _isSvfLoading: isSvfLoading} = this,
            {isPartialPvf, isPartialSvf} = this.preload;
        if (!isPvfLoading && isPartialPvf) {
            this._isPvfLoading = true;
            this.pvfDownloadManager.readChunks();
        }
        if (!isSvfLoading && isPartialSvf) {
            this._isSvfLoading = true;
            this.svfDownloadManager.readChunk();
        }
    }

    _onParserHeaders = (event) => {
        const {duration: videoDuration, timeScale: videoTimeScale, videoWidth, videoHeight} = event.svfHeader.videoConfigurations,
            {duration: audioDuration, timeScale: audioTimeScale} = event.svfHeader.audioConfigurations,
            {preload} = this.configurations;
        this.headers = {
            pvf: event.pvfHeader,
            svf: event.svfHeader,
        };
        this.preload.video = {
            preloadDuration: preload * videoTimeScale,
            timeScale: videoTimeScale,
            currentTime: 0,
        };
        this.preload.audio = {
            preloadDuration: preload * audioTimeScale,
            timeScale: audioTimeScale,
            currentTime: 0,
        };

        this._basicInfo = {
            videoDuration: Math.floor(videoDuration / videoTimeScale) * sec,
            audioDuration: Math.floor(audioDuration / audioTimeScale) * sec,
            videoTimeScale,
            audioTimeScale,
            videoWidth,
            videoHeight,
        };
        this.dispatchEvent(new DigestControlReady(this._basicInfo));
    };

    getBasicInfo() {
        return this._basicInfo;
    }

    _onPvfChunk = (event) => {
        //console.log("_onPvfChunk", event);
        this._isPvfLoading = false;
        this.dataParser.addPvfChunk(new Uint8Array(event.chunk));
    };

    _onSvfConnectionOpened = () => {
        const {svfDownloadManager} = this;
        svfDownloadManager.readChunk();
    }
    _onSvfChunk = (event) => {
        //console.log("_onSvfChunk", event);
        this._isSvfLoading = false;
        this.dataParser.addSvfChunk(new Uint8Array(event.chunk));
    };

    init() {
        const {pvfDownloadManager, svfDownloadManager} = this;
        pvfDownloadManager.readChunks();
        svfDownloadManager.addEventListener(ConnectionOpenedEvent, this._onSvfConnectionOpened);
        svfDownloadManager.init();
    }
}