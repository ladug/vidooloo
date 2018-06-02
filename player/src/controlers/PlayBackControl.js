/**
 * Created by vladi on 16-Jun-17.
 */
import EventEmitter from '../events/EventEmitter';
import {} from "./DigestControlEvents";
import {PictureDecodedEvent} from "../Decoder/DecoderEvents";
import {} from "../canvasplayer/CanvasEvents";
import {sec, assert} from '../common';
let sampleCount = 0;
let timer = 0;

const audioContext = new AudioContext(),
    audioNode = audioContext.createScriptProcessor(1024, 2, 2),
    source = audioContext.createBufferSource();

audioNode.connect(audioContext.destination);


const dataStore = [];
//https://github.com/taisel/XAudioJS resampler
audioNode.onaudioprocess = function (event) {
    var channelCount, channels, data, i, j, k, l, n, outputBuffer, ref, ref1, ref2;
    outputBuffer = event.outputBuffer;
    channelCount = outputBuffer.numberOfChannels;
    channels = new Array(channelCount);

    for (i = j = 0, ref = channelCount; j < ref; i = j += 1) {
        channels[i] = outputBuffer.getChannelData(i);
    } 

    data = dataStore.shift();
    if (!data) {
        return;
    }
    for (i = k = 0, ref1 = outputBuffer.length; k < ref1; i = k += 1) {
        for (n = l = 0, ref2 = channelCount; l < ref2; n = l += 1) {
            channels[n][i] = data[i * channelCount + n];
        }
    }
};

export default class PlayBackControl extends EventEmitter {
    digester = null;
    canvasPlayer = null;
    controls = null;
    decoder = null;
    audioDecoder = null;
    currentTime = 0;
    minBuffer = 2;
    pictureBuffer = [];
    _fpsFactor = 0;

    constructor(canvasPlayer, digester, decoder, audioDecoder, controls) {
        super();
        assert(canvasPlayer, "Error #2213");
        assert(digester, "Eror #2214");
        assert(decoder, "Error #2215");
        assert(controls, "Error #2216");

        this.canvasPlayer = canvasPlayer;
        this.digester = digester;
        this.decoder = decoder;
        this.audioDecoder = audioDecoder;
        this.controls = controls;
        this._connectEvents();
        this._setBasicInfo();
    }

    _updatePlaybackTime(frameSeconds) {
        this.currentTime += frameSeconds;
        this.controls.setVideoTime(this.currentTime);
    }

    _setBasicInfo() {
        const basicInfo = this.digester.getBasicInfo();
        this.controls.setVideoLength(basicInfo.videoDuration);
    }

    _connectEvents = () => {
        this.decoder.addEventListener(PictureDecodedEvent, this._onPictureReady)
    };

    _onPictureReady = (event) => {
        //console.error("_onPictureReady", event);
        const {pictureBuffer, _displayFrame} = this;
        pictureBuffer.push({
            data: event.data,
            width: event.width,
            height: event.height
        });

        const compensation = this._fpsFactor ? 34 - ((new Date()).getTime() - this._fpsFactor) : 0;

        window.setTimeout(() => {
            _displayFrame();
            this._fpsFactor = (new Date()).getTime();
        }, compensation > 0 ? compensation : 0);

    };

    _displayFrame = () => {
        const {minBuffer, _decodeVideoSample, pictureBuffer, canvasPlayer} = this;
        if (pictureBuffer.length < minBuffer) {
            window.setTimeout(_decodeVideoSample, 0)
        }
        canvasPlayer.renderPicture(pictureBuffer.shift());
    };

    _decodeVideoSample = () => {
        const {digester, decoder} = this;
        const sample = digester.shiftVideoSample();
        if (sample) {
            //console.error("sample[", sampleCount, "] sent to decode");
            this._updatePlaybackTime(sample.duration);
            decoder.decode(sample);
            sampleCount++;
        } else {
            window.setTimeout(() => {
                this._decodeVideoSample();
            }, 100);
            //alert("no more samples! Average FPS : " + (sampleCount / (((new Date()).getTime() - timer) / 1000)));
        }
    };

    _decodeAudioSample = () => {
        const {digester, audioDecoder} = this;
        const sample = digester.shiftAudioSample();

        if (sample) {

            dataStore.push(audioDecoder.decode(sample));
            /*audioContext.decodeAudioData(audioData.buffer,function(buffer){
             console.log("SUCCESS!");
             },function(buffer){
             console.log("EPIC FAIL!");
             });*/

            window.setTimeout(() => {
                this._decodeAudioSample();
            }, 1);
        } else {
            window.setTimeout(() => {
                this._decodeAudioSample();
            }, 1);
        }

    };

    _initVideoDecoder = ({svf}) => {
        const {decoder} = this;
        decoder.configure(svf.sps, svf.pps);
    };
    _initAudioDecoder = ({svf}) => {
        const {audioDecoder} = this;
        audioDecoder.configure(svf.audioConfigurations);
    };

    init() {
        const {digester, _initVideoDecoder, _initAudioDecoder, _decodeVideoSample, _decodeAudioSample} = this;
        digester.digestSamples();
        _initVideoDecoder(digester.headers);
        _initAudioDecoder(digester.headers);
        _decodeVideoSample();
        _decodeAudioSample();
        timer = (new Date()).getTime();

    }


}