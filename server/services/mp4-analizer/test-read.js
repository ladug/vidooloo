/**
 * Created by volodya on 5/12/2017.
 */
module.exports = () => {
    const fs = require('fs'),
    svfReader = require('../fileCreators/svfReader');

    const data = fs.readFileSync('./files/svf/u.svf');
    reader = new svfReader(data);
    reader.read();

    return {success: true, data: reader.file};
};
