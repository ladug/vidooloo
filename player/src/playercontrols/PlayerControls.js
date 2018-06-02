/**
 * Created by vladi on 26-May-17.
 */
import EventEmitter from "../events/EventEmitter";
import PlayerStatusBar from "./PlayerStatusBar";
import PlayerTime from "./PlayerTime";
import {PlayEvent, PauseEvent, StopEvent} from "./PlayerControlEvents";

const createButton = (value, onClick) => {
    let pauseButton = document.createElement("input");
    pauseButton.value = value;
    pauseButton.type = "button";
    pauseButton.addEventListener("click", onClick);
    return pauseButton
};

export default class PlayerControls extends EventEmitter {
    configurations = {};
    container = document.createElement("div");
    statusBar = new PlayerStatusBar();
    playerTime = new PlayerTime();

    constructor(configurations = {}) {
        super();
        this.configurations = {
            ...this.configurations,
            ...configurations
        };
        this._createControls();
    }

    _onPlayClick = () => {
        console.log("[PlayerControls]->_onPlayClick");
        this.dispatchEvent(new PlayEvent());
    };
    _onPauseClick = () => {
        console.log("[PlayerControls]->_onPauseClick");
        this.dispatchEvent(new PauseEvent());
    };
    _onStopClick = () => {
        console.log("[PlayerControls]->_onStopClick");
        this.dispatchEvent(new StopEvent());
    };
    _createControls = () => {
        const {container, statusBar, playerTime, _onPlayClick, _onPauseClick, _onStopClick} = this;
        statusBar.attachTo(container);
        container.appendChild(createButton("Play", _onPlayClick));
        container.appendChild(createButton("Pause", _onPauseClick));
        container.appendChild(createButton("Stop", _onStopClick));
        container.appendChild(playerTime.container);

    };

    setVideoLength(time) {
        this.playerTime.videoLength = time || 0;
    }

    setVideoTime(time) {
        this.playerTime.videoTime = time || 0;
    }

    setPlayProgress(pre) {
        this.statusBar.setPlayProgress(pre)
    }

    setPvfProgress(pre) {
        this.statusBar.setMainPreloaded(pre)
    }

    setSvfProgress(pre) {
        this.statusBar.setSecondaryPreloaded(pre)
    }

    attachTo(container) {
        container.appendChild(this.container);
    }
}