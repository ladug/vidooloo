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


const digester=require('../fileCreators/digestSvf');
module.exports = () => {
     const svfUrl = "./files/svf/720p-sample.svf"; //1494876554244
    digester.digest(svfUrl);
    return {success: true};
};