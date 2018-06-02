/**
 * Created by vladi on 13-Aug-17.
 */
export default class DSEStream{
    constructor(bitStream){
        let align = bitStream.read(1),
            count = bitStream.read(8);
        if (count === 255) {
            count += bitStream.read(8);
        }
        if (align) {
            bitStream.align();
        }
        // skip for now...
        bitStream.advance(count * 8);
    }
}