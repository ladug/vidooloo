/**
 * Created by vladi on 26-May-17.
 */

export const assert = (condition, message) => {
        if (!condition) {
            throw new Error(message);
        }
    },
    filterSome = (array,filterFunction) => {
        const filtered = [];
        array.every((item,index,original)=>filterFunction(item,index,original) && filtered.push(item));
        return filtered;
    },
    slice = (mixed, start, end) => {
        return Array.prototype.slice.call(mixed, start, end);
    },
    readByteString = (bytes, offset = 0, length = 4) => {
        return slice(bytes, offset, offset + length).map(byte => String.fromCharCode(byte)).join('');
    },
    mergeBuffers = (buffers) => {
        const bufferSize = buffers.reduce((total, buffer) => (total + buffer.length), 0),
            resBuffer = new Uint8Array(bufferSize);
        let offset = 0;
        buffers.forEach((chunk) => {
            resBuffer.set(chunk, offset);
            offset += chunk.length;
        });
        return resBuffer;
    },
    last = (arr) => {
        return arr[arr.length - 1];
    },
    lastIndex = (arr) => {
        return arr.length - 1;
    },
    sec = 1000,
    min = 60000,
    hour = 3600000,
    kb = 1024,
    mb = 1048576;
