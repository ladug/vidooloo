/**
 * Created by volodya on 6/9/2017.
 */
//todo: atm nowhere used . replace hardcoded vals with the setting beyond

const config =
    {
            svfChunk : {dataLen : 2 , offset : 0, skipFactorLen : 1},
            clientHeaders : {dataLen : 3, offset : 1},
            clientHeadersDataOffset : 0,
            o2oMap : {dataLen : 3, offset : 1},
            svfOffSet : {boxSize: 13, boxReminder : 9, postHdLenOffset: 6, dataLen: 4, offset : 0},
            extractions : {dataLen : 4, offset: 0},
            saveToFile : true

    }


const ERR_CODES = {
    ERR_FILENAME : 1,
    ERR_OPEN_FILE : 2,
    ERR_EOF : 3,
    ERR_PVFOFFSET: 4,
    ERR_FACTORY_BIND: 5,
    ERR_READ_CHUNK_AND_ADD_BUFF: 6,
    ERR_JUST_FUCKED_UP: 7

};

const isErrCode = (val) => {
    if( ! val ) return false;
    for( let p in ERR_CODES) { if (ERR_CODES[p] === val) return true }
    return false;
}
module.exports =
    {
        config : config,
        ERR_CODES : ERR_CODES,
        isErrCode: isErrCode
    }