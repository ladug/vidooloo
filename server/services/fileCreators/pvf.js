/**
 * Created by vladi on 12-May-17.
 */
const File = require('./common'),
    fs = require('fs');
/* Create PVF File */
const create = (digest, filename, fileId) => {
    const {sortedSamples, videoSamplesTime, audioSamplesTime, videoTimeScale, audioTimeScale} = digest,
        start = (new Date()).getTime(),
        pvfFile = fs.createWriteStream(filename),
        pvfExtractions = [],
        pvfVideoMap = [],
        pvfAudioMap = [];
    let fileOffset = 56, //i include the fileId and file type here
        isFirstVideo = sortedSamples[0].isVideo,
        isPreviousVideo = !isFirstVideo,
        isAudioMapPending = false,
        storedAudioSampleInfo = null,
        originalFramesSize = 0,
        svfExtractionSize = 0,
        pvfWriteSize = 0;

    /* write pvf file type and id */
    File.writeString(pvfFile, "ftyp"); //write file type header -- no real reason to write this... still
    File.writeString(pvfFile, "pvf1"); //write file type version
    File.writeString(pvfFile, fileId); //48 bytes of random

    sortedSamples.forEach(({isVideo, sample, isKey, size, data}) => {
        const skipFactor = File.generateSkipFactor(size),
            {pvfChunk, svfChunk, pvfChunkSize, svfChunkSize} = File.getSplitSample(data, size, skipFactor),
            sampleDuration = isVideo ? videoSamplesTime.sampleToLength[sample] : audioSamplesTime.sampleToLength[sample];

        originalFramesSize += size;
        svfExtractionSize += svfChunkSize;
        pvfWriteSize += pvfChunkSize;
        pvfExtractions.push({
            isVideo: isVideo,
            skipFactor: skipFactor,
            chunk: svfChunk,
            chunkSize: svfChunkSize
        });

        if (isVideo) {
            if (isKey) {
                pvfVideoMap.push({
                    offset: fileOffset, //offset from the beginning of the file
                    sample: sample,
                    isVideo: true,
                    svfChunkSize: svfChunkSize,
                    time: videoSamplesTime.sampleToTime[sample],
                    timeInSeconds: videoSamplesTime.sampleToTime[sample] / videoTimeScale
                });
                isAudioMapPending = true;
            }
        } else {
            if (isPreviousVideo) {
                if (isAudioMapPending) {
                    const audioTimeInSeconds = audioSamplesTime.sampleToTime[sample] / audioTimeScale,
                        videoTimeInSeconds = pvfVideoMap[pvfVideoMap.length - 1].time / videoTimeScale
                    if (isAudioMapPending && audioTimeInSeconds > videoTimeInSeconds) {
                        pvfAudioMap.push(storedAudioSampleInfo || {
                                offset: fileOffset, //offset from the beginning of the file
                                sample: sample,
                                isVideo: false,
                                svfChunkSize: svfChunkSize,
                                time: audioSamplesTime.sampleToTime[sample],
                                timeInSeconds: audioSamplesTime.sampleToTime[sample] / audioTimeScale
                            });
                        isAudioMapPending = false;
                    }
                } else {
                    //keep the last audio group lead sample
                    storedAudioSampleInfo = {
                        offset: fileOffset, //offset from the beginning of the file
                        sample: sample,
                        isVideo: false,
                        svfChunkSize: svfChunkSize,
                        time: audioSamplesTime.sampleToTime[sample],
                        timeInSeconds: audioSamplesTime.sampleToTime[sample] / audioTimeScale
                    }
                }
            }
        }

        /*Write To PVF File*/
        File.writeSizeAndFlags(pvfFile, size, isVideo, isKey); //write sample header
        fileOffset += 3; // add header size to the total offset

        File.writeUint16(pvfFile, sampleDuration); //write sample duration //TODO:Check if its a good idea or better to export the original table instead
        fileOffset += 2; // add duration size to the total offset

        File.writeData(pvfFile, pvfChunk); //write sample data
        fileOffset += pvfChunkSize; // add data size to the total offset

        isPreviousVideo = isVideo;
    });
    pvfFile.end();
    File.assert(pvfVideoMap.length === pvfAudioMap.length, "Bad map extraction!");

    console.log("=======================================");
    console.log(filename, " => ", fileOffset);
    console.log("Original Size => ", originalFramesSize);
    console.log("Written Size => ", pvfWriteSize);
    console.log("Extracted Size => ", svfExtractionSize, "( " + pvfExtractions.length + " samples )");
    console.info("Execution complete in " + ((new Date()).getTime() - start) + " ms");
    console.log("=======================================");

    return {
        extractions: pvfExtractions,
        audioMap: pvfAudioMap,
        videoMap: pvfVideoMap
    }
};

module.exports = {
    create
};