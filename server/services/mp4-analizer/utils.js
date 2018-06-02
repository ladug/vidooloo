const BUFFER_READ_LENGTH_ERROR = "Attempting to read more than i got",
    BOX_HEADER_SIZE = 8,
    FULL_BOX_HEADER_SIZE = BOX_HEADER_SIZE + 4;
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
    return true;
};

const noBreakingError = (condition, message,line) => {
    if (condition) {
        console.error(line,message);
        return true;
    }
    return false;
};


module.exports = {
    BUFFER_READ_LENGTH_ERROR: BUFFER_READ_LENGTH_ERROR,
    assert: assert,
    noBreakingError: noBreakingError
};


