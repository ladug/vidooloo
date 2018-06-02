/**
 * Created by vladi on 18-Jun-17.
 */
import {sec} from '../common';

const intToTime = (time) => {
        time = Math.floor(time / sec);

        let hours = Math.floor(time / 3600),
            minutes = Math.floor((time - (hours * 3600)) / 60),
            seconds = time - (hours * 3600) - (minutes * 60);

        const result = [
            hours && (hours < 10 ? "0" + hours : hours),
            (minutes < 10 ? "0" + minutes : minutes),
            (seconds < 10 ? "0" + seconds : seconds),
        ];
        return result.filter(val => val).join(":");
    },
    getSlashSpacer = (style = '') => {
        let span = document.createElement("span");
        span.style.cssText = style;
        span.innerHTML = "&nbsp;/&nbsp;";
        return span;
    };

export default class PlayerTime {
    videoLengthDOM = document.createElement("div");
    videoTimeDOM = document.createElement("div");
    container = document.createElement("div");
    _videoLength = 0;
    _videoTime = 0;

    constructor(time, length) {
        const {container, videoTimeDOM, videoLengthDOM} = this;
        container.appendChild(videoLengthDOM);
        container.appendChild(getSlashSpacer("float:right"));
        container.appendChild(videoTimeDOM);

        container.style.cssText = "float:right";
        videoTimeDOM.style.cssText = "float:right";
        videoLengthDOM.style.cssText = "float:right";

        this.videoTime = time || 0;
        this.videoLength = length || 0;
    }

    set videoLength(time) {
        this._videoLength = parseInt(time) || 0;
        this.videoLengthDOM.innerHTML = intToTime(this._videoLength);
    }

    set videoTime(time) {
        this._videoTime = parseInt(time) || 0;
        this.videoTimeDOM.innerHTML = intToTime(this._videoTime);
    }


}