/**
 * Created by vladi on 11-May-17.
 */
/*
 Library Reference -> https://www.npmjs.com/package/node-localdb
 SVF structure
 {
    _id: "UID", //Unique generated ID
    pvfId: "pvf file id", //Id embedded in Pvf File
    svfFileLocation: "", //Location of the generated svf file
    tracks : {
        video : {
            timescale : [int], //time scale of the track
            height: "", //Video Height (px value)
            width: "" //Video Width (px value)
            fps: "", //Frames Per Second
            avc: {
                pps: "", //Video Decoder configuration
                sps: "",  //Video Decoder configuration
            }
        },
        audio : {
            timescale : [int], //time scale of the track
            avc: {
                pps: "", //Video Decoder configuration
                sps: "",  //Video Decoder configuration
            }
        }
    }
 }

 */


const crypto = require('crypto'),
    localDb = require('node-localdb'),
    SVF_DATA_LOCATION = './services/DataBase/data/svf.json'; //Path relative to node run file!

class SvfDataBase {
    constructor() {
        this.db = localDb(SVF_DATA_LOCATION);
    }

    generatePvfId() {
        return crypto.randomBytes(48);
    }

    insertSvf(data) {
        this.db.insert(data);
    }

    getByPvfId(pvfId, cb) {
        this.findOne({pvfId: pvfId}).then(cb);
    }

    getById(id, cb) {
        this.findOne({pvfId: pvfId}).then(cb);
    }
}


module.exports = new SvfDataBase();