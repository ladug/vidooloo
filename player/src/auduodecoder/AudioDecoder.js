/**
 * Created by vladi on 08-Aug-17.
 */
import EventEmitter from '../events/EventEmitter';
import BitStream from "../bitstream/BitStream";
import FilterBank from "./helpers/FilterBank";
import FILStream from "./streams/FILStream";
import DSEStream from "./streams/DSEStream";
import ICStream from "./streams/ICStream";
import CPEStream from "./streams/CPEStream";
import CCEStream from "./streams/CCEStream";

export const SCE_ELEMENT = 0,
    CPE_ELEMENT = 1,
    CCE_ELEMENT = 2,
    LFE_ELEMENT = 3,
    DSE_ELEMENT = 4,
    PCE_ELEMENT = 5,
    FIL_ELEMENT = 6,
    END_ELEMENT = 7,
    ICS_STREAM = 1,
    CPE_STREAM = 2,
    CCE_STREAM = 3,
    DSE_STREAM = 4,
    FIL_STREAM = 5,
    AOT_AAC_MAIN = 1, // no
    AOT_AAC_LC = 2,   // yes
    AOT_AAC_LTP = 4,  // no
    AOT_ESCAPE = 31,
    BEFORE_TNS = 0,
    AFTER_TNS = 1,
    AFTER_IMDCT = 2;

const decodeElement = (eType, bitStream, config) => {
        const eId = bitStream.read(4);
        switch (eType) {
            case SCE_ELEMENT:
            case LFE_ELEMENT: // single channel and low frequency elements
                let ics = new ICStream(config);
                ics.id = eId;
                ics.decode(bitStream, config, false);
                return {
                    type: ICS_STREAM,
                    stream: ics
                };
                break;
            case CPE_ELEMENT: // channel pair element
                let cpe = new CPEStream(config);
                cpe.id = eId;
                cpe.decode(bitStream, config);
                return {
                    type: CPE_STREAM,
                    stream: cpe
                };
                break;
            case CCE_ELEMENT: // channel coupling element
                let cce = new CCEStream(config);
                cce.decode(bitStream, config);
                return {
                    type: CCE_STREAM,
                    stream: cce
                };
                break;
            case DSE_ELEMENT:  // data-stream element
                return {
                    type: DSE_STREAM,
                    stream: new DSEStream(bitStream)
                };
                break;
            case FIL_ELEMENT: // filler element
                return {
                    type: FIL_STREAM,
                    stream: new FILStream(bitStream, eId)
                };
                break;
            case PCE_ELEMENT: // program configuration element
                throw new Error("PCE_ELEMENT Not Supported!");
                break;
        }
    },
    // Intensity stereo
    processIntensityStereo = (element, left, right) => {
        var ics = element.right,
            info = ics.info,
            offsets = info.swbOffsets,
            windowGroups = info.groupCount,
            maxSFB = info.maxSFB,
            bandTypes = ics.bandTypes,
            sectEnd = ics.sectEnd,
            scaleFactors = ics.scaleFactors;

        var idx = 0, groupOff = 0;
        for (var g = 0; g < windowGroups; g++) {
            for (var i = 0; i < maxSFB;) {
                var end = sectEnd[idx];

                if (bandTypes[idx] === ICStream.INTENSITY_BT || bandTypes[idx] === ICStream.INTENSITY_BT2) {
                    for (; i < end; i++, idx++) {
                        var c = bandTypes[idx] === ICStream.INTENSITY_BT ? 1 : -1;
                        if (element.maskPresent)
                            c *= element.ms_used[idx] ? -1 : 1;

                        var scale = c * scaleFactors[idx];
                        for (var w = 0; w < info.groupLength[g]; w++) {
                            var off = groupOff + w * 128 + offsets[i],
                                len = offsets[i + 1] - offsets[i];

                            for (var j = 0; j < len; j++) {
                                right[off + j] = left[off + j] * scale;
                            }
                        }
                    }
                } else {
                    idx += end - i;
                    i = end;
                }
            }

            groupOff += info.groupLength[g] * 128;
        }
    },
    // Mid-side stereo
    processMidSideStereo = (element, left, right) => {
        const ics = element.left,
            info = ics.info,
            offsets = info.swbOffsets,
            windowGroups = info.groupCount,
            maxSFB = info.maxSFB,
            sfbCBl = ics.bandTypes,
            sfbCBr = element.right.bandTypes;

        let groupOff = 0, idx = 0;
        for (let g = 0; g < windowGroups; g++) {
            for (let i = 0; i < maxSFB; i++, idx++) {
                if (element.ms_used[idx] && sfbCBl[idx] < ICStream.NOISE_BT && sfbCBr[idx] < ICStream.NOISE_BT) {
                    for (let w = 0; w < info.groupLength[g]; w++) {
                        const off = groupOff + w * 128 + offsets[i];
                        for (let j = 0; j < offsets[i + 1] - offsets[i]; j++) {
                            const t = left[off + j] - right[off + j];
                            left[off + j] += right[off + j];
                            right[off + j] = t;
                        }
                    }
                }
            }
            groupOff += info.groupLength[g] * 128;
        }
    },
    isSupported = (profile) => {
        switch (profile) {
            case AOT_AAC_MAIN:
                throw new Error("Main prediction unimplemented");
                break;
            case AOT_AAC_LTP:
                throw new Error("LTP prediction unimplemented");
                break;
        }

    };
let clock = Date.now();
let lastPlay = Date.now();
let audioContext = new AudioContext();
let lastAudioTime = 0;
let nextFrameTime = 0;
let initialTime = 0;
let nextNoteTime = 0;
let oscStarted = false;
let sampleIndex = 0;
export default class AudioDecoder extends EventEmitter {
    _filterBank;
    _header = {};
    _audioConfig = {
        chanConfig: 2,
        frameLength: 1024,
        profile: 2,
        sampleIndex: 3,
        sampleRate: 48000
    };

    configure(audioConfigurations) {
        isSupported(audioConfigurations.profile || 2);              //TODO make sure profile is passed
        this._audioConfig = {
            channels: audioConfigurations.channels,
            chanConfig: audioConfigurations.channels,
            frameLength: audioConfigurations.frameLength || 1024,   //TODO make sure frameLength is passed
            profile: audioConfigurations.profile || 2,              //TODO make sure profile is passed
            sampleIndex: audioConfigurations.sampleIndex || 3,      //TODO make sure sampleIndex is passed
            sampleRate: audioConfigurations.timeScale
        };
        this._filterBank = new FilterBank(null, audioConfigurations.channels);
    }

    decode(sample) {
        const elements = [],
            couplingElements = [],
            config = this._audioConfig,
            sampleStream = new BitStream(sample.sampleData);
        if (sampleStream.peek(12) === 0xfff) {
            this._readHeader(sampleStream);
        }
        while (sampleStream.hasData) {
            const eType = sampleStream.read(3);
            if (eType === END_ELEMENT) {
                break; //END_ELEMENT reached, end here
            }
            const element = decodeElement(eType, sampleStream, config);
            if ([ICS_STREAM, CPE_STREAM, CCE_STREAM].indexOf(element.type) > -1) {
                elements.push(element);
                if (element.type === CCE_STREAM) {
                    couplingElements.push(element);
                }
            }
        }
        sampleStream.align();
        return this._process(elements, couplingElements);
    }

    _process(elements, couplingElements) {
        const {channels, frameLength} = this._audioConfig,
            data = new Array(channels).fill().map(() => new Float32Array(frameLength)),
            output = new Float32Array(frameLength * channels);

        elements.reduce((channel, {type, stream}) => {
            switch (type) {
                case ICS_STREAM:
                    this.processSingle(stream, channel, data, couplingElements);
                    channel += 1;
                    break;
                case CPE_STREAM:
                    this.processPair(stream, channel, data, couplingElements);
                    channel += 2;
                    break;
                case CCE_STREAM:
                    channel++;
                    break;
                case DSE_STREAM: //ignored for now
                case FIL_STREAM: //ignored for now
                    break;
                default:
                    throw new Error("Unknown element found.")
            }
            return channel;
        }, 0);
        let j = 0;
        for (let k = 0; k < frameLength; k++) {
            for (let i = 0; i < channels; i++) {
                output[j++] = data[i][k] / 32768;
            }
        }
        return output;
    }


    processSingle(element, channel, data, couplingElements) {
        const {info, data: elementData, tnsPresent, gainPresent} = element;
        if (gainPresent) {
            throw new Error("Gain control not implemented")
        }
        this.applyChannelCoupling(
            element,
            BEFORE_TNS,
            [elementData],
            couplingElements
        );
        tnsPresent && element.tns.process(element, elementData, false);
        this.applyChannelCoupling(
            element,
            AFTER_TNS,
            [elementData],
            couplingElements
        );
        this._filterBank.process(info, elementData, data[channel], channel);
        this.applyChannelCoupling(
            element,
            AFTER_IMDCT,
            [data[channel]],
            couplingElements
        );
    };

    processPair(element, channel, data, couplingElements) {
        const {left, right, commonWindow, maskPresent} = element,
            {info: leftInfo, data: leftData, tnsPresent: leftTnsPresent} = left,
            {info: rightInfo, data: rightData, tnsPresent: rightTnsPresent} = right;
        if (left.gainPresent || right.gainPresent) {
            throw new Error("Gain control not implemented");
        }


        commonWindow && maskPresent && processMidSideStereo(element, leftData, rightData);  // Mid-side stereo
        processIntensityStereo(element, leftData, rightData); // Intensity stereo
        this.applyChannelCoupling(
            element,
            BEFORE_TNS,
            [leftData, rightData],
            couplingElements
        );
        leftTnsPresent && left.tns.process(left, leftData, false);
        rightTnsPresent && right.tns.process(right, rightData, false);
        this.applyChannelCoupling(
            element,
            AFTER_TNS,
            [leftData, rightData],
            couplingElements
        );
        this._filterBank.process(leftInfo, leftData, data[channel], channel);
        this._filterBank.process(rightInfo, rightData, data[channel + 1], channel + 1);
        this.applyChannelCoupling(
            element,
            AFTER_IMDCT,
            [data[channel], data[channel + 1]],
            couplingElements
        );
    };


    applyChannelCoupling(element, couplingPoint, data, couplingElements) {
        const data1 = data[0],
            data2 = data[1],
            isChannelPair = data.length > 1,
            applyCoupling = couplingPoint === AFTER_IMDCT ? 'applyIndependentCoupling' : 'applyDependentCoupling';

        couplingElements.filter(
            ({ChannelCouplingPoint}) => ChannelCouplingPoint === couplingPoint
        ).forEach(
            (cce) => {
                let index = 0;
                for (let c = 0; c < cce.coupledCount; c++) {
                    const chSelect = cce.chSelect[c];
                    if (cce.channelPair[c] === isChannelPair && cce.idSelect[c] === element.id) {
                        if (chSelect !== 1) {
                            cce[applyCoupling](index, data1);
                            if (chSelect) index++;
                        }
                        if (chSelect !== 2) {
                            cce[applyCoupling](index++, data2);
                        }
                    } else {
                        index += 1 + (chSelect === 3 ? 1 : 0);
                    }
                }
            });
    };


    _readHeader(bitStream) {
        const version = bitStream.read(1),              //MPEG Version: 0 for MPEG-4, 1 for MPEG-2
            layer = bitStream.read(2),                  //Layer: always 0
            isProtected = !bitStream.read(1);           //protection absent, Warning, set to 1 if there is no CRC and 0 if there is CRC
        this._header = {
            version,
            layer,
            isProtected,
            profile: bitStream.read(2) + 1,             //profile, the MPEG-4 Audio Object Type minus 1
            frequency: bitStream.read(4),               //MPEG-4 Sampling Frequency Index (15 is forbidden)
            private: bitStream.read(1),                 //private bit, guaranteed never to be used by MPEG, set to 0 when encoding, ignore when decoding
            chanConfig: bitStream.read(3),              //MPEG-4 Channel Configuration (in the case of 0, the channel configuration is sent via an inband PCE)
            originality: bitStream.read(1),             //originality, set to 0 when encoding, ignore when decoding
            home: bitStream.read(1),                    //home, set to 0 when encoding, ignore when decoding
            copyrightBit: bitStream.read(1),            //copyrighted id bit, the next bit of a centrally registered copyright identifier, set to 0 when encoding, ignore when decoding
            copyrightStartBit: bitStream.read(1),       //copyright id start, signals that this frame's copyright id bit is the first bit of the copyright id, set to 0 when encoding, ignore when decoding
            frameLength: bitStream.read(13),            //frame length, this value must include 7 or 9 bytes of header length: FrameLength = (ProtectionAbsent == 1 ? 7 : 9) + size(AACFrame)
            fullness: bitStream.read(11),               //Buffer fullness
            numFrames: bitStream.read(2) + 1,           //Number of AAC frames (RDBs) in ADTS frame minus 1, for maximum compatibility always use 1 AAC frame per ADTS frame
            CRC: isProtected ? bitStream.read(16) : 0   //CRC if protection absent is 0
        }
    }

    get configuration() {
        return this._audioConfig;
    }

    get samples() {
        return [].concat(this._samples);
    }
}

