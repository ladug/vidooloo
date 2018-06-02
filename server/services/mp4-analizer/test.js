/**
 * Created by vladi on 07-May-17.
 */
/* Debug functions */
const convertHeadersForComparison = (mp4) => {
        mp4.file.mdat.data = mp4.file.mdat.data.length;
        mp4.stream.bytes = mp4.stream.bytes.length;
        mp4.tracks = Object.keys(mp4.tracks).reduce((res, key) => {
            res[key] = {trak: mp4.tracks[key].trak}
            return res;
        }, {});
        return mp4;
    },
    createBinaryString = (nMask) => {
        // nMask must be between -2147483648 and 2147483647
        for (let nFlag = 0, nShifted = nMask, sMask = ''; nFlag < 32;
             nFlag++, sMask += String(nShifted >>> 31), nShifted <<= 1);
        return sMask.slice(-24);
    };


const fs = require('fs'),
    svfDataBase = require("../DataBase/SvfDataBase"),
    Mp4Reader = require('./Mp4Reader'),
    pvf = require('../fileCreators/pvf'),
    svf = require('../fileCreators/svf');


const writeDataToFile = (mp4, pvfFileName, svfFileName) => {
    const start = (new Date()).getTime(),
        digest = mp4.readSortSamples(),
        pvfId = svfDataBase.generatePvfId(),
        {extractions, audioMap, videoMap} = pvf.create(digest, pvfFileName, pvfId),
        isComplete = svf.create(mp4, extractions, audioMap, videoMap, svfFileName);
    console.info("File split complete in " + ((new Date()).getTime() - start) + " ms");
    return !!isComplete;
};
module.exports = () => {
    // const data = fs.readFileSync('./demo-movies/tree.mp4'),
    const data = fs.readFileSync('./demo-movies/mozilla_story.mp4'),
        mp4 = new Mp4Reader(data);
    mp4.read();
    writeDataToFile(
        mp4,
        "./files/pvf/720p-sample.pvf",
        "./files/svf/720p-sample.svf"
    );


    // mp4.readSortSamples(); // returns sorted audio and video data with sizes and sample counter
    //return {success:true , headers : convertHeadersForComparison(mp4)};
    return {success: true, headers: convertHeadersForComparison(mp4)};
};