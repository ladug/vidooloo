/**
 * Created by vladi on 06-May-17.
 */
const {assert} = require('./utils'),
    BytesStream = require('./BytesStream');

class Track {
    constructor(file, trak) {
        assert(file && trak, "Missing data for [Track]");
        this.file = file;
        this.trak = trak;
        this.validateDuration(); //may not be necessary also seems like video trak is different from audio trak
    }

    get sampleSizeTable() {
        return this.trak.mdia.minf.stbl.stsz.table;
    }

    get sampleCount() {
        return this.trak.mdia.minf.stbl.stsz.table.length;
    }

    get timeScale() {
        return this.trak.mdia.mdhd.timeScale;
    }

    get duration() {
        return this.trak.mdia.mdhd.duration;
    }

    get fps() {
        return (this.sampleCount * this.timeScale) / this.duration;
    }

    get stscTable() {
        return this.trak.mdia.minf.stbl.stsc.table;
    }

    get sttsTable() {
        return this.trak.mdia.minf.stbl.stts.table;
    }

    get stcoTable() {
        return this.trak.mdia.minf.stbl.stco.table;
    }

    get height() {
        return Math.ceil(this.trak.tkhd.height);
    }

    get width() {
        return Math.ceil(this.trak.tkhd.width);
    }

    get avc() {
        return this.trak.mdia.minf.stbl.stsd.avc1.avcC;
    }

    get mp4a() {
        return this.trak.mdia.minf.stbl.stsd.mp4a;
    }

    get syncSampleTable() {
        return this.trak.mdia.minf.stbl.stss ? this.trak.mdia.minf.stbl.stss.samples : null;
    }

    timeToSeconds(time) {
        return time / this.timeScale
    };

    secondsToTime(seconds) {
        return (seconds * this.timeScale)
    } ;

    getTotalTimeInSeconds() {
        return this.timeToSeconds(this.duration);
    }

    chunkToOffset(chunk) {
        return (this.stcoTable[chunk]);
    }

    sampleToSize(start, length) {
        let size = 0;
        for (let i = start; i < start + length; i++) {
            size += this.sampleSizeTable[i];
        }
        return size;
    }

    sampleToChunk(sample) {
        const table = this.stscTable;
        let totalChunkCount = 0;

        if (table.length === 1) {
            const row = table[0];
            assert(row.firstChunk === 1);
            return {
                index: Math.floor(sample / row.samplesPerChunk),
                offset: sample % row.samplesPerChunk
            };
        }

        for (let i = 1; i < table.length; i++) {
            const row = table[i],
                previousRow = table[i - 1],
                previousChunkCount = row.firstChunk - previousRow.firstChunk,
                previousSampleCount = previousRow.samplesPerChunk * previousChunkCount;
            if (sample < previousSampleCount) {
                return {
                    index: totalChunkCount + Math.floor(sample / previousRow.samplesPerChunk),
                    offset: sample % previousRow.samplesPerChunk
                };
            }

            sample -= previousSampleCount;
            if (i == table.length - 1) {
                return {
                    index: totalChunkCount + previousChunkCount + Math.floor(sample / row.samplesPerChunk),
                    offset: sample % row.samplesPerChunk
                };
            }
            totalChunkCount += previousChunkCount;
        }
    }

    sampleToOffset(sample) {
        const res = this.sampleToChunk(sample);
        return this.chunkToOffset(res.index) + this.sampleToSize(sample - res.offset, res.offset);
    }

    timeToSample(time) { //TODO: this can probably be done alot better...
        let sample = 0;
        for (let i = 0; i < this.sttsTable.length; i++) {
            const delta = this.sttsTable[i].count * this.sttsTable[i].delta;
            if (time >= delta) {
                time -= delta;
                sample += this.sttsTable[i].count;
            } else {
                return sample + Math.floor(time / this.sttsTable[i].delta);
            }
        }
    }

    getSampleBytes(sample) {
        const bytes = this.file.stream.bytes,
            offset = this.sampleToOffset(sample),
            length = this.sampleToSize(sample, 1);
        return bytes.subarray(offset, offset + length);
    }

    digestSamplesTime() { // get time map of time/sample, sample/time and sample/length
        const table = this.sttsTable;
        return table.reduce((res, item) => {
            for (let i = 0; i < item.count; i++) {
                const sample = res.length,
                    total = res.total;
                res.sampleToTime[sample] = total; //sample offset time
                res.sampleToLength[sample] = item.delta;
                res.timeToSample[total + item.delta] = sample;
                res.length++;
                res.total += item.delta;
            }
            return res;
        }, {
            length: 0,
            total: 0,
            sampleToTime: {},
            sampleToLength: {},
            timeToSample: {}
        });
    }

    digestSampleBytes(sample, isKey) {
        const bytes = this.file.stream.bytes,
            offset = this.sampleToOffset(sample),
            size = this.sampleToSize(sample, 1);
        return {
            isKey: !!isKey,
            offset: offset,
            sample: sample,
            data: bytes.subarray(offset, offset + size),
            size: size
        }
    }

    getSampleNALUnits(sample) {
        const nalUnits = [],
            bytes = this.file.stream.bytes;
        let offset = this.sampleToOffset(sample);
        const end = offset + this.sampleToSize(sample, 1);
        //TODO: replace while with for loop
        while (end - offset > 0) {
            const length = (new BytesStream(bytes.buffer, offset)).readU32();
            nalUnits.push(bytes.subarray(offset + 4, offset + length + 4));
            offset += length + 4;
        }
        return nalUnits;
    }

    validateDuration() {
        const table = this.sttsTable;
        let duration = 0;
        for (let i = 0; i < table.length; i++) {
            duration += table[i].count * table[i].delta;
        }
        assert(this.trak.mdia.mdhd.duration === duration, "Invalid duration!");
    };
}

module.exports = Track;




