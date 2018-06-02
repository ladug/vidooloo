/**
 * Created by vladi on 27-May-17.
 */
export default class PlayerStatusBar {
    container = document.createElement("div");
    playProgress = document.createElement("div");
    mainProgress = document.createElement("div");
    secondaryProgress = document.createElement("div");

    constructor() {
        const {container, playProgress, mainProgress, secondaryProgress} = this;
        container.style.cssText = "position:relative;height:20px;width:100%;background-color:#bbb";
        playProgress.style.cssText = "float:left;clear:both;position:relative;height:8px;width:0;background-color:#666";
        mainProgress.style.cssText = "float:left;clear:both;position:relative;height:8px;width:0;background-color:blue";
        secondaryProgress.style.cssText = "float:left;clear:both;position:relative;height:4px;width:0;background-color:yellow";

        container.appendChild(playProgress);
        container.appendChild(mainProgress);
        container.appendChild(secondaryProgress)
    }

    setPlayProgress(pre) {
        this.playProgress.style.width = pre + "%";
    }

    setMainPreloaded(pre) {
        this.mainProgress.style.width = pre + "%";
    }

    setSecondaryPreloaded(pre) {
        this.secondaryProgress.style.width = pre + "%";
    }

    attachTo(container) {
        container.appendChild(this.container);
    }
}