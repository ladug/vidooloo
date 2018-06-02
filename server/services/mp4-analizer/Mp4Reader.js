/**
 * Created by vladi on 06-May-17.
 */
const {assert, noBreakingError, BOX_HEADER_SIZE, FULL_BOX_HEADER_SIZE} = require('./utils'),
    Track = require('./Track'),
    Size = require('./Size'),
    BytesStream = require('./BytesStream');
const boxTypeName = {
    "adcd": "Audio Decoder Config Descriptor",
    "ftyp": "File Type Box",
    "moov": "Movie Box",
    "mvhd": "Movie Header Box",
    "trak": "Track Box",
    "tkhd": "Track Header Box",
    "mdia": "Media Box",
    "mdhd": "Media Header Box",
    "hdlr": "Handler Reference Box",
    "minf": "Media Information Box",
    "stbl": "Sample Table Box",
    "stsd": "Sample Description Box",
    "avc1": "",
    "mp4a": "",
    "esds": "Elementary Stream Descriptor",
    "avcC": "AVC Configuration Box",
    "btrt": "Bit Rate Box",
    "stts": "Decoding Time to Sample Box",
    "stss": "Sync Sample Box",
    "stsc": "Sample to Chunk Box",
    "stsz": "Sample Size Box",
    "stco": "Chunk Offset Box",
    "smhd": "Sound Media Header Box",
    "mdat": "Media Data Box",
    "free": "free",
};


class MP4Reader {
    constructor(stream) {
        assert(stream, "No stream provided!");
        this.stream = new BytesStream(stream);
        this.tracks = {};
        this.file = {};
        this.logBoxTypes = false;
    }

    read(logBoxTypes) {
        this.logBoxTypes = !!logBoxTypes;
        const start = (new Date()).getTime();
        this.readBoxes(this.stream, this.file);
        const end = (new Date()).getTime();
        console.info("Read complete in " + (end - start) + " ms");
    }

    readBoxes(stream, parent) {
        //TODO fix while problem, Adjust to work with arrays instead of this switch routine
        while (stream.peek32()) { //peek32 does not advance read so if anything inside fails, infinite loop ahoy!
            const child = this.readBox(stream);
            assert(child, "No idia what this box is! Error...")
            if (!parent[child.type]) {
                parent[child.type] = child;
                continue;
            }
            if (!Array.isArray(parent[child.type])) {
                parent[child.type] = [parent[child.type]]; //array-fi
            }
            parent[child.type].push(child);
        }
    }

    getBoxVersion(stream) {
        const version = stream.readU8();
        assert(version === 0, "Unknown version!");
        return version;
    };

    //TODO: optimize code further!
    /*getVersionFlags = (stream) => ({
     version: this.getBoxVersion(stream),
     flags: stream.readU24(),
     });*/
    ftypBox(stream, box) {
        Object.assign(box, {
            majorBrand: stream.read4CC(),
            minorVersion: stream.readU32(),
            compatibleBrands: (new Array((box.size - 16) / 4)).fill().map(() => stream.read4CC())
        })
    };

    mdhdBox(stream, box) {
        Object.assign(box, {
            version: this.getBoxVersion(stream),
            flags: stream.readU24(),
            creationTime: stream.readU32(),
            modificationTime: stream.readU32(),
            timeScale: stream.readU32(),
            duration: stream.readU32(),
            language: stream.readISO639(),
        });
        stream.skip(2);
    };

    mvhdBox(stream, box) {
        Object.assign(box, {
            version: this.getBoxVersion(stream),
            flags: stream.readU24(),
            creationTime: stream.readU32(),
            modificationTime: stream.readU32(),
            timeScale: stream.readU32(),
            duration: stream.readU32(),
            rate: stream.readFP16(),
            volume: stream.readFP8(),
            matrix: stream.skip(10) && stream.readU32Array(9),
            nextTrackId: stream.skip(6 * 4) && stream.readU32()
        });
    };

    tkhdBox(stream, box) {
        Object.assign(box, {
            version: this.getBoxVersion(stream),
            flags: stream.readU24(),
            creationTime: stream.readU32(),
            modificationTime: stream.readU32(),
            trackId: stream.readU32(),
            duration: stream.skip(4) && stream.readU32(),
            layer: stream.skip(8) && stream.readU16(),
            alternateGroup: stream.readU16(),
            volume: stream.readFP8(),
            matrix: stream.skip(2) && stream.readU32Array(9),
            width: stream.readFP16(),
            height: stream.readFP16()
        });
    };

    esdsBox(stream, box) {
        Object.assign(box, {
            version: stream.readU8(),
            flags: stream.readU24(),
            adcd: stream.readU8Array(box.size - (stream.position - box.offset))
        });
    };

    btrtBox(stream, box) {
        Object.assign(box, {
            bufferSizeDb: stream.readU32(),
            maxBitrate: stream.readU32(),
            avgBitrate: stream.readU32()
        })
    };

    sttsBox(stream, box) {
        Object.assign(box, {
            version: stream.readU8(),
            flags: stream.readU24(),
            table: (stream.readU32Array(stream.readU32(), ["count", "delta"]))
        })
    };

    stssBox(stream, box) {
        Object.assign(box, {
            version: stream.readU8(),
            flags: stream.readU24(),
            samples: stream.readU32Array(stream.readU32())
        })
    };

    stscBox(stream, box) {
        Object.assign(box, {
            version: stream.readU8(),
            flags: stream.readU24(),
            table: stream.readU32Array(stream.readU32(), ["firstChunk", "samplesPerChunk", "sampleDescriptionId"])
        })
    };

    stszBox(stream, box) {
        const
            version = stream.readU8(),
            flags = stream.readU24(),
            sampleSize = stream.readU32(),
            count = stream.readU32();

        Object.assign(box, {
            version: version,
            flags: flags,
            sampleSize: sampleSize,
            table: sampleSize === 0 ? stream.readU32Array(count) : []
        }); //TODO: something is missing, no default table! no idia what count is eather
    };

    stcoBox(stream, box) {
        Object.assign(box, {
            version: stream.readU8(),
            flags: stream.readU24(),
            table: stream.readU32Array(stream.readU32())
        })
    };

    smhdBox(stream, box) {
        Object.assign(box, {
            version: stream.readU8(),
            flags: stream.readU24(),
            balance: stream.readFP8()
        });
        stream.reserved(2, 0);
    };

    mdatBox(stream, box) {
        assert(box.size >= 8, "Cannot parse large media data yet.")
        Object.assign(box, {
            data: stream.readU8Array(box.size - (stream.position - box.offset))
        });
    };

    hdlrBox(stream, box) {
        const bytesLeft = box.size - 32;
        Object.assign(box, {
            version: stream.readU8(),
            flags: stream.readU24(),
            handlerType: stream.skip(4) && stream.read4CC(),
            name: stream.skip(4 * 3) && ( bytesLeft > 0 ? stream.readUTF8(bytesLeft) : box.name)
        })
    };

    avcCBox(stream, box) {
        //TODO: update box parsing
        // The NAL Length is not required to be 4!
        // The AvcConfigurationBox ('moov/trak/mdia/minf/stbl/stsd/avc1/avcC') contains a field 'lengthSizeMinusOne' specifying the length. But the default is 4.
        // box guide http://doublescn.appspot.com/?p=3124001
        Object.assign(box, {
            configurationVersion: stream.readU8(),
            avcProfileIndication: stream.readU8(),
            profileCompatibility: stream.readU8(),
            avcLevelIndication: stream.readU8(),
            lengthSizeMinusOne: stream.readU8() & 3,
            sps: (new Array(stream.readU8() & 31)).fill().map(() => stream.readU8Array(stream.readU16()))[0],
            pps: (new Array(stream.readU8() & 31)).fill().map(() => stream.readU8Array(stream.readU16()))[0]
        });
        assert(box.lengthSizeMinusOne === 3, "TODO");
        stream.skip(box.size - (stream.position - box.offset));
    };

    avc1Box(stream, box) {
        Object.assign(box, {
            dataReferenceIndex: stream.reserved(6, 0) && stream.readU16(),
            version: stream.readU16(),
            revisionLevel: stream.readU16(),
            vendor: stream.readU32(),
            temporalQuality: stream.readU32(),
            spatialQuality: stream.readU32(),
            width: stream.readU16(),
            height: stream.readU16(),
            horizontalResolution: stream.readFP16(),
            verticalResolution: stream.readFP16(),
            reserved: stream.readU32(),
            frameCount: stream.readU16(),
            compressorName: stream.readPString(32),
            depth: stream.readU16(),
            colorTableId: stream.readU16(),
        });
        // verifications
        assert(box.version === 0, "Bad Version");
        assert(box.revisionLevel === 0, "Bad Revision Level");
        assert(box.reserved === 0, "Bad Reserved");
        assert(box.colorTableId == 0xFFFF); // Color Table Id
        const subStream = stream.subStream(stream.position, box.size - (stream.position - box.offset));
        this.readBoxes(subStream, box);
        stream.skip(subStream.length); //TODO: check if we need to skip last parts of the stream, probably need but still

    };

    moovBox(stream, box) {
        const subStream = stream.subStream(stream.position, box.size - (stream.position - box.offset));
        this.readBoxes(subStream, box);
        stream.skip(subStream.length);
    };

    mdiaBox(stream, box) {
        const subStream = stream.subStream(stream.position, box.size - (stream.position - box.offset));
        this.readBoxes(subStream, box);
        stream.skip(subStream.length);
    };

    minfBox(stream, box) {
        const subStream = stream.subStream(stream.position, box.size - (stream.position - box.offset));
        this.readBoxes(subStream, box);
        stream.skip(subStream.length);
    };

    stblBox(stream, box) {
        const subStream = stream.subStream(stream.position, box.size - (stream.position - box.offset));
        this.readBoxes(subStream, box);
        stream.skip(subStream.length);
    };

    mp4aBox(stream, box) {
        Object.assign(box, {
            dataReferenceIndex: stream.reserved(6, 0) && stream.readU16(),
            version: stream.readU16(),
            channelCount: stream.skip(6) && stream.readU16(),
            sampleSize: stream.readU16(),
            compressionId: stream.readU16(),
            packetSize: stream.readU16(),
            sampleRate: stream.readU32() >>> 16,
        });
        // TODO: Parse other version levels.
        assert(box.version == 0);
        const subStream = stream.subStream(stream.position, box.size - (stream.position - box.offset));
        this.readBoxes(subStream, box);
        stream.skip(subStream.length);
    };

    trakBox(stream, box) {
        const subStream = stream.subStream(stream.position, box.size - (stream.position - box.offset));
        this.readBoxes(subStream, box);
        stream.skip(subStream.length);
        //TODO what if tkhd is in another location? what then? Fix bug, also why this and not stream?
        this.tracks[box.tkhd.trackId] = new Track(this, box);
    };

    stsdBox(stream, box) {
        Object.assign(box, {
            version: stream.readU8(),
            flags: stream.readU24(),
            sd: [], //TODO - check and fill sd or remove it
            entries: stream.readU32(), //TODO find out what entries mean
        });
        const subStream = stream.subStream(stream.position, box.size - (stream.position - box.offset));
        this.readBoxes(subStream, box);
        stream.skip(subStream.length);
    };

    readBox(stream) {
        //TODO: remove the annoying position advance on read
        let box = {
            offset: stream.position,
            size: stream.readU32(),
            type: stream.read4CC()
        };
        //box name is not nessesary for anything really
        box.name = boxTypeName[box.type] || box.type;

        this.logBoxTypes && console.log("Reading [" + box.type + "]", JSON.stringify(box));
        //TODO: fix this god damn switch, its too damn high!
        switch (box.type) {
            case 'ftyp':
                this.ftypBox(stream, box);
                break;
            case 'mdhd':
                this.mdhdBox(stream, box);
                break;
            case 'mvhd':
                this.mvhdBox(stream, box);
                break;
            case 'tkhd':
                this.tkhdBox(stream, box);
                break;
            case 'esds':
                this.esdsBox(stream, box);
                break;
            case 'btrt':
                this.btrtBox(stream, box);
                break;
            case 'stts':
                this.sttsBox(stream, box);
                break;
            case 'stss':
                this.stssBox(stream, box);
                break;
            case 'stsc':
                this.stscBox(stream, box);
                break;
            case 'stsz':
                this.stszBox(stream, box);
                break;
            case 'stco':
                this.stcoBox(stream, box);
                break;
            case 'smhd':
                this.smhdBox(stream, box);
                break;
            case 'mdat':
                this.mdatBox(stream, box);
                break;
            case 'hdlr':
                this.hdlrBox(stream, box);
                break;
            case 'avcC':
                this.avcCBox(stream, box);
                break;
            case 'avc1':
                this.avc1Box(stream, box);
                break;
            case 'moov':
                this.moovBox(stream, box);
                break;
            case 'mdia':
                this.mdiaBox(stream, box);
                break;
            case 'minf':
                this.minfBox(stream, box);
                break;
            case 'stbl':
                this.stblBox(stream, box);
                break;
            case 'mp4a':
                this.mp4aBox(stream, box);
                break;
            case 'trak':
                this.trakBox(stream, box);
                break;
            case 'stsd':
                this.stsdBox(stream, box);
                break;
            case 'free' :
            default:
                console.warn("Unknown box type!", box.type);
                stream.skip(box.size - (stream.position - box.offset));
                break;
        }
        return box;
    }

    digestSamples() {
        const video = this.tracks[1],
            audio = this.tracks[2],
            videoKeySamples = video.syncSampleTable,
            videoSampleToKey = videoKeySamples.reduce((res, sample) => {
                res[sample - 1] = true; //the only table that has sample numbers uses 1-x instead of 0-x, floor it down
                return res;
            }, {}),
            videoSamples = [],
            audioSamples = [];

        //get video samples and shove them in audio array
        for (let i = 0; i < video.sampleCount; i++) {
            videoSamples.push(video.digestSampleBytes(i, videoSampleToKey[i]));
        }
        //get audio samples and shove them in audio array
        for (let i = 0; i < audio.sampleCount; i++) {
            audioSamples.push(audio.digestSampleBytes(i, (Math.random() * 10 >= 5))); //all the audio frames are key frames, can safely randomize
        }
        return {
            videoSamplesTime: video.digestSamplesTime(),
            audioSamplesTime: audio.digestSamplesTime(),
            videoTimeScale: video.timeScale,
            audioTimeScale: audio.timeScale,
            audioSamples: audioSamples,
            videoSamples: videoSamples,
            total: audioSamples.length + videoSamples.length
        }
    }

    readSortSamples() {
        const {audioSamples, videoSamples, total, videoSamplesTime, audioSamplesTime, audioTimeScale, videoTimeScale} = this.digestSamples(), sortedSamples = [];
        //samples were read in order so i can assume the video and audio are already sorted, now lets merge them
        let videoIndex = 0, audioIndex = 0, maxSize = 0;
        for (let i = 0; i < total; i++) {
            const videoSample = videoSamples[videoIndex] || {},
                audioSample = audioSamples[audioIndex] || {},
                videoOffset = videoSample ? videoSample.offset : null,
                audioOffset = audioSample ? audioSample.offset : null;
            assert((audioOffset || videoOffset) && videoOffset !== audioOffset, "Fatal! bad frames extraction!");

            if (audioOffset > videoOffset || !audioOffset) { //video is behind, push that
                sortedSamples.push({
                    isVideo: true,
                    isKey: videoSample.isKey,
                    sample: videoSample.sample,
                    data: videoSample.data,
                    size: videoSample.size
                });
                maxSize = videoSample.size > maxSize ? videoSample.size : maxSize;
                videoIndex++;
                continue; //tiny optimization
            }
            if (videoOffset > audioOffset || !videoOffset) { // audio is behind or video offset is null, push that
                sortedSamples.push({
                    isVideo: false,
                    isKey: audioSample.isKey,
                    sample: audioSample.sample,
                    data: audioSample.data,
                    size: audioSample.size
                });
                maxSize = audioSample.size > maxSize ? audioSample.size : maxSize;
                audioIndex++;
            }
        }
        return {
            videoSamplesTime,
            audioSamplesTime,
            audioTimeScale,
            videoTimeScale,
            largestSize: maxSize, //probably for debug only
            sortedSamples: sortedSamples
        };
    }
}

module.exports = MP4Reader;


