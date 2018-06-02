/**
 * Created by vladi on 13-Aug-17.
 */
export default class FILStream {
    constructor(bitSteam, id) {
        let skip = id;
        if (skip === 15) {
            skip += bitSteam.read(8) - 1;
        }
        // skip for now...
        bitSteam.advance(skip * 8);
    }
}
