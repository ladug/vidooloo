/**
 * Created by vladi on 21-Feb-17.
 */
import CanvasPlayer from "./canvasplayer/CanvasPlayer";
import DownloadManager from "./downloadmanager/DownloadManager";
import PlayerControls from "./playercontrols/PlayerControls";
import SvfStreamManager from "./downloadmanager/SvfStreamManager";
import DigestControl from "./controlers/DigestControl";
import PlayBackControl from "./controlers/PlayBackControl";
import {DigestControlReady} from "./controlers/DigestControlEvents";
import {PlayEvent, PauseEvent, StopEvent} from "./playercontrols/PlayerControlEvents";
import {ManagerReadyEvent} from "./downloadmanager/DownloadManagerEvents";
import {CanvasReady} from "./canvasplayer/CanvasEvents";
import {DecoderReadyEvent} from "./Decoder/DecoderEvents";
import {assert, sec} from "./common";
import Decoder from "./Decoder/Decoder";
import AudioDecoder from "./auduodecoder/AudioDecoder";
const DEBUG_SVF_SRC = "http://vido.com/720p-sample.svf.digest";
const DEBUG_SVF_SRC_FILE = "720p-sample"; //TODO:Itai - User PVF ID not file name.
//const DEBUG_SVF_SRC = "http://vidooloo.com/wp-content/test-files/mozilla_story.svf.digest";
const DECODE_WORKER_SRC = "decoder.bundle.js";

const getConfigurations = hostingTag => ({
    width: hostingTag.getAttribute('width') * 1 || 300,
    height: hostingTag.getAttribute('height') * 1 || 200,
    src: hostingTag.getAttribute('video') || "Default Url" //TODO: setup demo file
});

export default class VidoolooPlayer {
    configurations = {};
    container = document.createElement("div");
    canvasPlayer = null;
    controls = null;
    svfStream = null;
    digester = null;
    decoder = null;
    audioDecoder = null;
    playback = null;
    _readyState = {
        canvasPlayer: false,
        digester: false,
        decoder: false,
        audioDecoder: false
    };

    constructor(sourceTag) {
        assert(sourceTag, "No target DOMElement!");
        sourceTag.parentNode.insertBefore(this.container, sourceTag);
        this.configurations = getConfigurations(sourceTag);
        this.init();
    }

    init() {
        this.createPlayerComponent();
        this.createDownloadManager();
        this.createDecoder();
    }

    onPlayerReady() {
        const {canvasPlayer, digester, decoder, audioDecoder, controls} = this;
        this.playback = new PlayBackControl(canvasPlayer, digester, decoder, audioDecoder, controls);
        this.playback.init();
    }

    createDecoder() {
        const decoder = new Decoder({src: DECODE_WORKER_SRC});
        decoder.addEventListener(DecoderReadyEvent, this._onDecoderReady)
        decoder.init();
        this.decoder = decoder;
    }

    createPlayerComponent() {
        const {container, configurations: {width, height}} = this;
        container.style.cssText = ["width:", width, "px;height:", height, "px"].join('');
        this.canvasPlayer = new CanvasPlayer(container, width, height);
        this.canvasPlayer.addEventListener(CanvasReady, this._onCanvasReady);
        this.canvasPlayer.init();
    }

    createDownloadManager() {
        const {src} = this.configurations;
        this.downloadManager = new DownloadManager({src});
        this.downloadManager.addEventListener(ManagerReadyEvent, this._onDownloadManagerReady);
        this.downloadManager.init();
    }

    _onCanvasReady = (event) => {
        console.log("_onCanvasReady", event);
        this.updateReadyState("canvasPlayer", true);
        this.controls = new PlayerControls();
        this.controls.attachTo(this.container);
    };

    updateReadyState(item, value) {
        this._readyState[item] = value;
        const {canvasPlayer, digester, decoder, audioDecoder} = this._readyState;
        if (canvasPlayer && digester && decoder && audioDecoder) {
            this.onPlayerReady();
        }
    }

    _onDecoderReady = (event) => {
        console.log("_onDecoderReady", event);
        this.updateReadyState("decoder", true);
    };

    _onDigestControlReady = (event) => {
        console.log("_onDigestControlReady", event);
        this.updateReadyState("digester", true);
        this.audioDecoder = new AudioDecoder();
        this.updateReadyState("audioDecoder", true);
    };

    _onDownloadManagerReady = (event) => {
        console.log("_onDownloadManagerReady", event);
        this.svfStream = new SvfStreamManager({
            type: event.payload.type,
            version: event.payload.version,
            pvfUid: event.payload.uid,
            src: DEBUG_SVF_SRC,
        });
        this.digester = new DigestControl(
            this.downloadManager,
            this.svfStream,
            {
                preloadTime: 5 * sec
            }
        );

        this.digester.addEventListener(DigestControlReady, this._onDigestControlReady);
        this.digester.init();
    };
}

/*place the player in the position of the script tag*/
const currentScript = document.currentScript;
window.vidoolooPlayer = new VidoolooPlayer(currentScript); //pass script tag to the player to use for configurations //TODO: create safe wrapper
currentScript.parentNode.removeChild(currentScript); //remove the tag, no reason to keep it around

