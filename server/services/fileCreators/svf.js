/**
 * Created by vladi on 12-May-17.
 */

/*
 map sample =>

 offset: fileOffset,                                [Uint32] -> up to 4,294,967,295 ~ 4Gb - location of the sample in pvf file
 sample: sample,                                    [Uint24] -> up to 16,777,215 - our vid was ~2 mins and had 3195/5673 samples video/audio we can cover around 100 hours, while Uint16 covers 20 mins
 time: audioSamplesTime.sampleToTime[sample],       [Uint32] -> up to 4,294,967,295 - don't see a reason to skimp here, it hits over 1 Mil for a short film
 /== extra data used in other map tables ==/
 isVideo: true,
 svfChunkSize: svfChunkSize,
 timeInSeconds: videoSamplesTime.sampleToTime[sample] / videoTimeScale


 extraction sample =>

 skipFactor: skipFactor,    [tiny int](16-255)  [Uint8]  -> up to 255, we can change in future versions
 chunk: svfChunk,           [Uint8Array]        [~]      -> unknown size here
 chunkSize: svfChunkSize    [int]               [Uint16] -> Pvf chunk reach Uint20 (1Mb) svf chunk is at least 16 times smaller (max is 65535)

 NOTE* thought the SVF chunk size is Uint8 we will have to resort to Uint20 when sending to client
 */

const File = require('./common'),
    fs = require('fs');

const extractMp4aData = mp4a => {
    return {
        channels: mp4a.channelCount,
        compressionId: mp4a.compressionId, //not sure we need this
        adcd: mp4a.esds.adcd,
        adcdSize: mp4a.esds.adcd.byteLength,
        packetSize: mp4a.packetSize,
        sampleRate: mp4a.sampleRate,
        sampleSize: mp4a.sampleSize,
        version: mp4a.version
    };
};

const extractAvcData = avc => {
    File.assert(avc.configurationVersion === 1, "Cant handle other levels yet!")
    return {
        version: avc.configurationVersion,
        level: avc.avcLevelIndication,
        profile: avc.avcProfileIndication,
        compatibility: avc.profileCompatibility,
        pps: avc.pps,
        ppsSize: avc.pps.byteLength,
        sps: avc.sps,
        spsSize: avc.sps.byteLength,
    };
};

const writeSvfMap = (file, map) => {
    map.forEach(({offset, sample, time}) => {
        File.writeUint32(file, offset); //4 bytes
        File.writeUint24(file, sample); //3 bytes
        File.writeUint32(file, time);   //4 bytes
    });
};

const writePvfToSvfMap = (file, map) => {
    map.forEach(({isVideo, pvfOffset, svfOffset, time}) => {
        File.writeUint32(file, pvfOffset);          //4 bytes
        File.writeUint32(file, svfOffset);          //4 bytes
        File.writeUint8(file, isVideo ? 1 : 0);     //1 byte
        File.writeUint32(file, time);          //4 bytes
    });
};

const createPvfToSvfMap = (fileOffset, audioMap, videoMap) => {
    return videoMap.concat(audioMap).sort((a, b) => {
        if (a.offset < b.offset) {
            return -1;
        }
        if (a.offset > b.offset) {
            return 1;
        }
        return 0;
    }).map(unit => {
        const offsetMapUnit = {
            pvfOffset: unit.offset, //Unit32 (4) - no idea what size PVF will reach, safeguard 4gig
            svfOffset: fileOffset,  //Uint32 (4) - no idea what size SVF will reach, safeguard 4gig
            isVideo: unit.isVideo,  //Uint8  (1) - is video flag
            time: unit.time,        //Uint32 (4) - time since the beginning of the video
        };
        //add size of the svf frame
        //Uint16 ( svf data size ) + Uint8 ( skip factor ) +  SVF Data Size
        fileOffset += 2 + 1 + unit.svfChunkSize;
        return offsetMapUnit;
    });
};

const writeExtractions = (file, extractions) => {
    extractions.forEach(extraction => {
        File.writeUint16(file, extraction.chunkSize);
        File.writeUint8(file, extraction.skipFactor);
        File.writeData(file, extraction.chunk);
    });
};

const getExtractionsSize = (extractions) => extractions.reduce(
    (total, extraction) => (total + 2 + 1 + extraction.chunkSize ),
    0
);

/* Create SVF File */
const create = (mp4, extractions, audioMap, videoMap, filename) => {
    const start = (new Date()).getTime(),
        video = mp4.tracks[1],
        audio = mp4.tracks[2],
        svfFile = fs.createWriteStream(filename),
        avc = extractAvcData(video.avc),
        mp4a = extractMp4aData(audio.mp4a),
        videoMapSize = videoMap.length * 11,
        audioMapSize = audioMap.length * 11,
        mapsSize = 2 + videoMapSize + 2 + audioMapSize,//2 is the size of the header ( Uint16 )
        videoConfigSize = 4 + 3 + 2 + 2 + 2 + avc.spsSize + 2 + avc.ppsSize,
        audioConfigSize = 4 + 3 + 1 + 1 + 1 + 1 + 3 + 2 + mp4a.adcdSize,
        offsetToOffsetMapSize = (audioMap.length + videoMap.length) * 13,
        svfHeaderSize = 9 + 3 + mapsSize + videoConfigSize + audioConfigSize,
        extractionsSize = getExtractionsSize(extractions);
    let offset = 0;

    /* Client related Headers Size*/
    File.writeUint24(svfFile, svfHeaderSize);
    offset += 3; //header tables and config size

    /*write headers*/
    File.writeString(svfFile, "ftyp"); //write file type header -- no real reason to write this... still
    File.writeString(svfFile, "svf0"); //write svf main file type version
    File.writeUint8(svfFile, 1); //write svf file sub-version type
    offset += 9; // 8 is the size of 'ftyp' and 'svf1' + 1 byte subversion

    /*write headers sizes*/ //making this so the server can skip them and go straight to parsing
    File.writeUint24(svfFile, mapsSize);
    offset += 3; //skip maps size

    /*write skip maps*/
    File.writeUint16(svfFile, videoMapSize); //write video map size
    writeSvfMap(svfFile, videoMap); //write Video Map
    File.writeUint16(svfFile, audioMapSize); //write audio map size
    writeSvfMap(svfFile, audioMap); //write Audio Map
    offset += mapsSize; //skip maps data length

    /*Video Configurations*/
    File.writeUint32(svfFile, video.duration);
    File.writeUint24(svfFile, video.timeScale);
    File.writeUint16(svfFile, video.width);
    File.writeUint16(svfFile, video.height);
    File.writeUint16(svfFile, avc.spsSize);
    File.writeData(svfFile, avc.sps);
    File.writeUint16(svfFile, avc.ppsSize);
    File.writeData(svfFile, avc.pps);
    offset += videoConfigSize;

    /* Audio Configurations */
    File.writeUint32(svfFile, audio.duration);
    File.writeUint24(svfFile, audio.timeScale);
    File.writeUint8(svfFile, mp4a.channels);         //1 byte
    File.writeUint8(svfFile, mp4a.compressionId);    //1 byte
    File.writeUint8(svfFile, mp4a.packetSize);       //1 byte
    File.writeUint8(svfFile, mp4a.sampleSize);       //1 byte total:4 bytes
    File.writeUint24(svfFile, mp4a.sampleRate);      //3 bytes
    File.writeUint16(svfFile, mp4a.adcdSize);      //2 bytes
    File.writeData(svfFile, mp4a.adcd);
    offset += audioConfigSize;

    /*================================================================================*/
    /*============ All above are sent to client without interpretation ===============*/
    /*================================================================================*/

    /*Write Pvf Offset to Svf Offset table*/
    File.writeUint24(svfFile, offsetToOffsetMapSize);
    offset += 3; //Offset To Offset map size

    /* write map used for skipping on server side */
    writePvfToSvfMap(svfFile, createPvfToSvfMap(4 + offset + 3 + offsetToOffsetMapSize, audioMap, videoMap));
    offset += offsetToOffsetMapSize; //OffsetToOffset table data length

    //write size of extractions chunk
    File.writeUint32(svfFile, extractionsSize);

    /*Finally write the extractions*/
    writeExtractions(svfFile, extractions);
    svfFile.end();

    const estimatedFileSize = offset + extractions.reduce((total, extraction) => (total + 2 + 1 + extraction.chunkSize ), 0);
    console.log("=======================================");
    console.log(filename + " => " + estimatedFileSize);
    console.log("Client Header Size =>", svfHeaderSize);
    console.log("Full Header Size =>", offset);
    console.log("Extractions Size =>", extractionsSize);
    console.info("Execution complete in " + ((new Date()).getTime() - start) + " ms");
    console.log("=======================================");
    return {
        sampleMap: []
    };
};

module.exports = {
    create
};