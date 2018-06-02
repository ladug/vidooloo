/**
 * Created by vladi on 27-May-17.
 */
import {assert} from "../common";
import ByteStream from "../ByteStream/ByteStream";
export default class SvfReader {
    constructor() {

    }
};
//TODO: export SVF header reading into a separate NPM
const readHeaderMap = (stream, version, subversion) => {
        assert(version === "svf0", "Version [" + version + "] is not supported!");
        assert(subversion === 1, "Sub-Version [" + subversion + "] is not supported!");
        let result = {};
        while (stream.hasData) {
            const offset = stream.read32(),
                sample = stream.read24(),
                time = stream.read32();
            result[offset] = {
                sample,
                time
            }
        }
        return result;
    },
    readVideoConfig = (stream, version, subversion) => {
        assert(version === "svf0", "Version [" + version + "] is not supported!");
        assert(subversion === 1, "Sub-Version [" + subversion + "] is not supported!");
        return {
            duration: stream.read32(),          // File.writeUint32(svfFile, video.duration);
            timeScale: stream.read24(),         // File.writeUint24(svfFile, video.timeScale);
            videoWidth: stream.read16(),        // File.writeUint16(svfFile, video.width);
            videoHeight: stream.read16(),       // File.writeUint16(svfFile, video.height);
            sps: stream.read(stream.read16()),  // File.writeUint16(svfFile, avc.spsSize); -> File.writeData(svfFile, avc.sps);
            pps: stream.read(stream.read16()),  // File.writeUint16(svfFile, avc.ppsSize); -> File.writeData(svfFile, avc.pps);
        }
    },
    readAudioConfig = (stream, version, subversion) => {
        assert(version === "svf0", "Version [" + version + "] is not supported!");
        assert(subversion === 1, "Sub-Version [" + subversion + "] is not supported!");
        return {
            duration: stream.read32(),         // File.writeUint32(svfFile, audio.duration);
            timeScale: stream.read24(),          // File.writeUint24(svfFile, audio.timeScale);
            channels: stream.read8(),            // File.writeUint8(svfFile, mp4a.channels);
            compressionId: stream.read8(),     // File.writeUint8(svfFile, mp4a.compressionId);
            packetSize: stream.read8(),        // File.writeUint8(svfFile, mp4a.packetSize);
            sampleSize: stream.read8(),          // File.writeUint8(svfFile, mp4a.sampleSize);
            sampleRate: stream.read24(),       // File.writeUint24(svfFile, mp4a.sampleRate);
            adcd: stream.read(stream.read16()) // File.writeUint16(svfFile, mp4a.adcdSize); -> File.writeData(svfFile, mp4a.adcd);
        }
    };

export class SvfHeader {
    _basicInfo = null;
    _size = null;
    _videoMap = {};
    _audioMap = {};
    _videoConfigurations = {};
    _audioConfigurations = {};

    constructor(bufferStream) {
        this._readBasicInfo(bufferStream)
        this._readSvfHeader(bufferStream);
        this._size = bufferStream.offset;
    }

    _readBasicInfo(bufferStream) {
        this._basicInfo = {
            _type: bufferStream.readChar4(),
            _version: bufferStream.readChar4(),
            _subVersion: bufferStream.read8(),
            _headersSize: bufferStream.read24()
        };
    }

    _readSvfHeader(bufferStream) {
        const {_basicInfo: {_version, _subVersion}} = this;
        this._videoMap = readHeaderMap(
            new ByteStream(bufferStream.read(bufferStream.read16())),
            _version,
            _subVersion
        );
        this._audioMap = readHeaderMap(
            new ByteStream(bufferStream.read(bufferStream.read16())),
            _version,
            _subVersion
        );
        this._videoConfigurations = readVideoConfig(bufferStream, _version, _subVersion);
        this._audioConfigurations = readAudioConfig(bufferStream, _version, _subVersion);
    }

    get videoConfigurations() {
        return this._videoConfigurations;
    }

    get audioConfigurations() {
        return this._audioConfigurations;
    }

    get pps() {
        return this._videoConfigurations.pps;
    }

    get sps() {
        return this._videoConfigurations.sps;
    }

    get length() {
        return this._size;
    }
}
