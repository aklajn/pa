'use strict';

const Settings = {
    MIN_WIDTH: 1,
    MIN_HEIGHT: 1,
    MAX_WIDTH: 200,
    MAX_HEIGHT: 200,
    DEFAULT_FRAME_COLOR: 0,
    DEFAULT_FIRST_LAYER_COLOR: 0,
    DEFAULT_LAYER_COLOR: undefined,
    RGB_COLOR_MASK: 0xFFFFFF,
    R_COLOR_MASK: 0xFF0000,
    G_COLOR_MASK: 0xFF00,
    B_COLOR_MASK: 0xFF,
    MINIMUM_DURAION: 10,
    DURATION_STEP: 10,
    END_OF_LINE: "\r\n",
    PIWO_FILE_HEADER: "PIWO_10_FILE",
    DEFAULT_DURAION: 100,
    DEFAULT_OPACITY: 100,
    // TODO uzyc tego wszedzie gdzie trzeba zamiast undefined
    TRANSPARENT_COLOR: undefined,
    TRANSPARENT_OUTPUT_COLOR: 'T',
    LAYER_TAG: 'L',
    DEFAULT_SCREEN_COLOR: '#000000',
    GRID_COLOR: '#888888',
    DEFAULT_GRID_STATE: true,
    THUMBNAIL_WIDTH: 80,
    MAX_TIME_DELAY: 5,
    P9_FILE: "PIWO_9_FILE",
    P7_FILE: "PIWO_7_FILE",
    P6_FILE: "PIWO_6_FILE",
    LEGACY_FILE: "PIWO_{version}_FILE",
    FONTS_PATH: "fonts/",
    DEFAULT_FILE_VERSION: 7,
    DEFAULT_EXTENSION: "piwo7",
    HISTORY_CHANGES_LIMIT: 100,
};

const Utils = {
    sanitizeWidth: function(x) {
        if (x < Settings.MIN_WIDTH) x = Settings.MIN_WIDTH;
        if (x > Settings.MAX_WIDTH) x = Settings.MAX_WIDTH;
        return x;
    },
    sanitizeHeight: function(y) {
        if (y < Settings.MIN_HEIGHT) y = Settings.MIN_HEIGHT;
        if (y > Settings.MAX_HEIGHT) y = Settings.MAX_HEIGHT;
        return y;
    },
    isResolutionValid: function(x, y) {
        if (x < Settings.MIN_WIDTH || x > Settings.MAX_WIDTH) return false;
        if (y < Settings.MIN_HEIGHT || y > Settings.MAX_HEIGHT) return false;
        return true;
    },
    sanitizeDuration: function(duration) {
        var step = Settings.DURATION_STEP;
        var min = Settings.MINIMUM_DURAION;
        if (step > min) step = min;
        if (duration < min) return min;
        return Math.round(duration / step) * step;
    },
    sanitizeOpacity : function(opacity) {
        if (opacity > 100) opacity = 100;
        if (opacity < 0) opacity = 0;
        return opacity;
    },
    printableColor: function(color) {
        if (color === Settings.TRANSPARENT_COLOR) return Settings.TRANSPARENT_OUTPUT_COLOR;
        return color;
    },
    intToRGB: function(color) {
        return {r: ((color & 0xFF0000) >> 16), g: ((color & 0xFF00) >> 8), b: (color & 0xFF)};
    },
    intToHTMLColor: function(color) {
        return '#' + (color).toString(16).padStart(6, '0');
    },
    htmlToInt: function(htmlColor) {
        return parseInt("0x" + htmlColor.substr(1))
    },
    array2D: function(x, y, value) {
        return Array(x).fill(0).map(i => Array(y).fill(value));
    },
    fromRange: function(val, min, max) {
        if (val < min) {
            return min;
        }
        if (val > max) {
            return max;
        }
        return val;
    },
};

class Layer
{
    constructor(x, y, color = Settings.DEFAULT_LAYER_COLOR, opacity = Settings.DEFAULT_OPACITY) {
        this.x = Utils.sanitizeWidth(x);
        this.y = Utils.sanitizeHeight(y);
        this.pixel = Utils.array2D(this.x, this.y, color);
        this.opacity = Utils.sanitizeOpacity(opacity);
    }

    setColor(color) {
        this.pixel = Utils.array2D(this.x, this.y, color);
    }

    clone() {
        var layer = new Layer(this.x, this.y, 0, this.opacity);
        layer.pixel = [];
        for (var i = 0; i < this.pixel.length; i++) {
            layer.pixel[i] = [...this.pixel[i]];
        }
        return layer;
    }

    resize(left, right, top, bottom, fillColor) {
        var oldX = this.x;
        var oldY = this.y;
        this.x = this.x + left + right;
        this.y = this.y + top + bottom;
        var newPixel = Utils.array2D(this.x, this.y);
        for (var x = 0; x < this.x; x++) {
            for (var y = 0 ; y < this.y ; y++) {
                var xIdx = x - left;
                var yIdx = y - top;
                if ((xIdx >= 0 && xIdx < oldX) && (yIdx >= 0 && yIdx < oldY)) {
                    newPixel[x][y] = this.pixel[xIdx][yIdx];
                } else {
                    newPixel[x][y] = fillColor;
                }
            }
        }
        this.pixel = newPixel;
    }

    createTransparent() {
        return new Layer(this.x, this.y, Settings.TRANSPARENT_COLOR, this.opacity);
    }
};

class Frame
{
    constructor(x, y, duration = Settings.DEFAULT_DURAION) {
        this.x = Utils.sanitizeWidth(x);
        this.y = Utils.sanitizeHeight(y);
        this.layer = [new Layer(x, y, Settings.DEFAULT_FIRST_LAYER_COLOR)];
        this._duration;
        this.duration = duration;
        this.id = Frame.lastId++;
    }

    get duration() {
        return this._duration
    }

    set duration(val) {
        this._duration = Utils.sanitizeDuration(val);
    }

    clone() {
        var frame = new Frame(this.x, this.y, this.duration);
        frame.layer = [];
        for (var i = 0; i < this.layer.length; i++) {
            frame.layer[i] = this.layer[i].clone();
        }
        return frame;
    }

    resize(left, right, top, bottom, fillColor) {
        this.x = this.x + left + right;
        this.y = this.y + top + bottom;
        for (var i = 0; i < this.layer.length; i++) {
            this.layer[i].resize(left, right, top, bottom, fillColor);
        }
    }

    createNewLayer(color = Settings.DEFAULT_LAYER_COLOR, opacity = Settings.DEFAULT_OPACITY)
    {
        return new Layer(this.x, this.y, color, opacity);
    }

    getPixelColor(x, y)
    {
        var color = 0;
        for (var i=0; i<this.layer.length; i++)
        {
            var layerPixelColor = this.layer[i].pixel[x][y];
            var layerOpacity = Utils.sanitizeOpacity(this.layer[i].opacity);
            if (Settings.TRANSPARENT_COLOR == layerPixelColor) continue;
            if (layerOpacity == 100)
            {
                color = layerPixelColor;
                continue;
            }
            var alpha = layerOpacity / 100;

            color = Math.round((alpha * layerPixelColor) + ((1 - alpha) * color));
        }
        return color;
    }

    getFlattenLayer() {
        var layer = new Layer(this.x, this.y, 0, 100);
        for (var x=0;x<this.x;x++) {
            for(var y=0;y<this.y;y++) {
                layer.pixel[x][y] = this.getPixelColor(x, y);
            }
        }
        return layer;
    }

    getTopLayer() {
        return this.layer[this.layer.length - 1];
    }
};

Frame.lastId = 0;

class FrameWidget {
    constructor(listDOM) {
        this.listDOM = listDOM;
    }

    create(frame, frameList) {
        var widget = document.createElement('div');
        widget.className = 'frame';
        widget.id = 'frame' + frame.id;
        var img = new Image();
        img.className = 'frameImg';
        img.id = 'frameImage' + frame.id;
        img.src = this.generateImage(frame);
        widget.appendChild(img);
        widget.onclick = evt => {
            if (evt.ctrlKey || evt.metaKey) {
                frameList.toggleSelectByFrameId(frame.id);
            } else if (evt.shiftKey) {
                frameList.selectRangeByFrameId(frame.id);
            } else {
                frameList.setCurrentByFrameId(frame.id);
            }
        };
        return widget;
    }

    generateImage(frame) {
        // TODO dynamic proportions ?
        var width = Math.floor(Settings.THUMBNAIL_WIDTH / frame.x) * frame.x;
        var height = Math.floor(Settings.THUMBNAIL_WIDTH / frame.x) * frame.y;
        var stepX = Math.floor(width / frame.x);
        var stepY = Math.floor(height / frame.y);
        var canvas = document.createElement('canvas');

        canvas.width = stepX * frame.x;
        canvas.height = stepY * frame.y;
        var ctx = canvas.getContext("2d");
        for (var x=0; x<frame.x; x++)
        {
            for (var y=0; y<frame.y; y++)
            {
                ctx.fillStyle = Utils.intToHTMLColor(frame.getPixelColor(x, y));
                ctx.fillRect(stepX * x, stepY * y, stepX, stepY);
            }
        }
        return canvas.toDataURL();
    }

    updateFrameImage(frame) {
        var img = this.listDOM.querySelector('#frameImage' + frame.id);
        if (img) {
            img.src = this.generateImage(frame);
        }
    }

    remove(frame) {
        var widget = this.listDOM.querySelector('#frame' + frame.id);
        if (widget) {
            widget.remove();
        }
    }

    removeAll() {
        while (this.listDOM.firstChild) {
            this.listDOM.removeChild(this.listDOM.firstChild);
        }
    }
}

class FrameWidgetController {
    constructor(listDOM) {
        this.listDOM = listDOM;
    }
    unsetCurrent() {
        var widgets = this.listDOM.querySelectorAll('.frameCurrent');
        for (var i=0;i<widgets.length;i++) {
            widgets[i].className = 'frame';
        }
    }

    setCurrent(frameId) {
        this.unsetCurrent();
        var widget = this.listDOM.querySelector('#frame' + frameId);
        if (widget) {
            widget.className = 'frameCurrent';
        }
    }

    unselectAll() {
        var widgets = this.listDOM.querySelectorAll('.frameSelected');
        for (var i=0;i<widgets.length;i++) {
            widgets[i].className = 'frame';
        }
    }

    unselect(frameId) {
        var widget = this.listDOM.querySelector('#frame' + frameId);
        if (widget) {
            widget.className = 'frame'
        }
    }

    select(frameId) {
        var widget = this.listDOM.querySelector('#frame' + frameId);
        if (widget) {
            widget.className = 'frameSelected'
        }
    }

    selectAll() {
        var widgets = this.listDOM.querySelectorAll('.frame');
        for (var i=0;i<widgets.length;i++) {
            widgets[i].className = 'frameSelected';
        }
    }

    scrollToFrame(frameId) {
        var widget = this.listDOM.querySelector('#frame' + frameId);
        if (widget) {
            widget.scrollIntoView();
        }
    }
}

class FrameList {
    constructor(x, y, listWidget, history) {
        this.x = x;
        this.y = y;
        this.frame = [];
        this.newFrameDuration = Settings.DEFAULT_DURAION;
        this.listWidget = listWidget;
        this.frameWidget = new FrameWidget(this.listWidget);
        this.frameWidgetController = new FrameWidgetController(this.listWidget);
        this.history = history;
        this.clipboard = [];
        this.selected = [];
        this.currentPos = 0;
        this.blocked = false;
        this.clipboard = [];
        this.onCurrentChanged;
        this.clearListWidget();
        this.createFirstFrame();
    }

    createEmptyFrame() {
        return new Frame(this.x, this.y, this.newFrameDuration);
    }

    createFirstFrame() {
        if (this.frame.length == 0) {
            var frame = this.createEmptyFrame();
            var pos0 = 0;
            this.addFrame(frame, pos0);
            this.setCurrent(pos0);
        }
    }

    // TODO set current odznacza zaznaczne
    setCurrent(pos) {
        if (pos < 0 || (pos >= this.frame.length)) return;
        this.frameWidgetController.setCurrent(this.frame[pos].id);
        this.currentPos = pos;
        this.frameWidgetController.unselectAll();
        this.selected = [];
        if (this.onCurrentChanged) {
            this.onCurrentChanged(this.frame[pos]);
        }
    }

    toggleSelection(frameId, pos) {
        for (var i=0; i<this.selected.length; i++) {
            if (this.selected[i] === pos) {
                this.frameWidgetController.unselect(frameId);
                this.selected.splice(i, 1);
                return;
            }
        }
        this.frameWidgetController.select(frameId);
        this.selected.push(pos);
    }

    setCurrentByFrameId(id) {
        var pos = this.getPositionByFrameId(id);
        if (pos !== undefined) {
            this.setCurrent(pos);
        }
    }

    clearListWidget() {
        while (this.listWidget.firstChild) {
            this.listWidget.removeChild(this.listWidget.firstChild);
        }
    }

    getPositionByFrameId(id) {
        for (var i=0;i<this.frame.length;i++) {
            if (this.frame[i].id == id) {
                return i;
            }
        }
    }

    unselectAndSelectFrame(pos, frameId) {
        for (var i=0; i<this.selected.length; i++) {
            if (this.selected[i] === pos) {
                this.selected.splice(i, 1);
                break;
            }
        }
        this.frameWidgetController.select(frameId);
        this.selected.push(pos);
    }

    selectRangeByFrameId(id) {
        var pos = this.getPositionByFrameId(id);
        var selectedNumber = this.selected.length;
        var lastSelected = selectedNumber > 0 ? this.selected[selectedNumber-1] : this.currentPos;
        if (pos >= lastSelected) {
            for (let i=lastSelected;i<=pos;i++) {
                this.unselectAndSelectFrame(i, this.frame[i].id);
            }
        } else {
            for (let i=lastSelected;i>=pos;i--) {
                this.unselectAndSelectFrame(i, this.frame[i].id);
            }
        }
    }

    toggleSelectByFrameId(id) {
        var pos = this.getPositionByFrameId(id);
        if (pos !== undefined) {
            var frame = this.getFrame(pos);
            this.toggleSelection(frame.id, pos);
        }
    }

    setNewFrameDuration(duration) {
        this.newFrameDuration = duration;
    }

    removeFrame(position) {
        if (this.blocked) return;
        if (position < 0 || position >= this.frame.length) {
            return;
        }
        var frame = this.frame[position];
        if (frame) {
            this.frameWidget.remove(frame);
            this.frame.splice(position, 1);
        }
        if (this.frame.length < 1) {
            this.createFirstFrame();
        }

        if (this.currentPos == position) {
            if (position > 0) {
                this.setCurrent(position-1);
            } else {
                this.setCurrent(position);
            }
        }
    }

    removeFrames(positions) {
        if (!Array.isArray(positions)) {
            positions = [positions];
        }
        positions.sort().reverse();
        var removed = [];
        for (var i=0;i<positions.length;i++) {
            var position = positions[i];
            removed[position] = this.frame[position];
            this.removeFrame(position);
        }
        this.history.framesRemoved(removed);
    }

    addNewFrame() {
        var pos = this.currentPos + 1;
        var frame = this.createEmptyFrame();
        frame.duration = this.getFrame(this.currentPos).duration;
        this.addFrame(frame, pos);
        this.setCurrent(pos);
        this.scrollToCurrent();
    }

    allSelected() {
        var selected = this.selected.slice(0);
        if (!selected.includes(this.currentPos)) {
            selected.unshift(this.currentPos);
        }
        return selected;
    }

    copy() {
        var selected = this.allSelected();
        this.clipboard = [];
        for (let i=0; i<selected.length; i++) {
            let idx = selected[i];
            this.clipboard.push(this.frame[idx].clone());
        }
    }

    paste(position = 0) {
        var frames = [];
        for (let i=0; i<this.clipboard.length; i++) {
            frames.push(this.clipboard[i].clone());
        }
        if (!position) {
            position = this.currentPos + 1;
        }
        this.addFrames(frames, position);
    }

    cut() {
        this.copy();
        this.removeSelected();
    }

    duplicate() {
        var position = Math.max(...this.allSelected()) + 1;
        this.copy();
        this.paste(position);
    }

    addMultiple(count, duration, firstColor, lastColor) {
        if (count < 1) count = 1;
        if (count > 1000) count = 1000;

        var rStart = (firstColor & 0xFF0000) >> 16;
        var gStart = (firstColor & 0xFF00) >> 8;
        var bStart = (firstColor & 0xFF);
        var steps = (count - 1) > 0 ? count - 1 : 1;
        var rStep  = ((lastColor & 0xFF0000) - (firstColor & 0xFF0000) >> 16) / steps;
        var gStep  = ((lastColor & 0xFF00) - (firstColor & 0xFF00) >> 8) / steps;
        var bStep  = ((lastColor & 0xFF) - (firstColor & 0xFF)) / steps;

        var frames = [];
        for (let i=0; i<count; i++) {
            let frame = this.createEmptyFrame();
            frame.duration = duration;
            let color = (Math.round(rStep * i + rStart) << 16) +
                        (Math.round(gStep * i + gStart) << 8) +
                        (Math.round(bStep * i + bStart));
            frame.layer[0].setColor(color);
            frames.push(frame);
        }
        this.addFrames(frames);
    }

    removeSelected() {
        this.removeFrames(this.allSelected());
    }

    addFrame(frame, pos) {
        this.addFrames([frame], pos);
    }

    addFrames(frames, pos) {
        if (pos === undefined) pos = this.currentPos + 1;
        if (this.blocked) return;
        if (pos < 0 || pos > this.frame.length) return;
        if (!Array.isArray(frames)) frames = [frames];
        if (frames.length == 0) return;
        this.frame.splice(pos, 0, ...frames);

        var frameList = this;
        var nextElement;
        if (pos < this.listWidget.children.length) {
            nextElement = this.listWidget.children[pos];
        }

        for (var i=0;i<frames.length;i++) {
            var widget = this.frameWidget.create(frames[i], frameList);
            if (nextElement) {
                this.listWidget.insertBefore(widget, nextElement);
            } else {
                this.listWidget.appendChild(widget);
            }
        }

        this.history.framesAdded(pos, frames.length);
    }

    // rename to repaintFrameThumbnail
    repaintFrame(frame) {
        this.frameWidget.updateFrameImage(frame);
    }

    get currentFrameDuration() {
        return this.frame[this.currentPos].duration;
    }

    set currentFrameDuration(duration) {
        let frame = this.frame[this.currentPos];
        let oldDuration = frame.duration;
        frame.duration = duration;

        this.history.frameDurationChanged(frame.id, oldDuration);
    }

    get currentFrame() {
        return this.frame[this.currentPos]
    }

    getFrame(i) {
        return this.frame[i];
    }

    getFrameCount() {
        return this.frame.length;
    }

    getCurrentPos() {
        return this.currentPos;
    }

    block() {
        this.blocked = true;
    }

    unblock() {
        this.blocked = false;
    }

    getCurentFrameTime() {
        var totalTime = 0;
        for (var i=0; i<this.currentPos; i++) {
            totalTime += this.frame[i].duration;
        }
        return totalTime;
    }

    // TODO otestowac skrajne przypadki
    showFrameByTime(time, stop) {
        var timeMs = time * 1000;
        var frameCount = this.frame.length;
        var totalTime = 0;
        var pos = frameCount - 1;
        var i;
        // TODO przemyslec czy optymalizacja potrzebna
        for (i=0; i<frameCount; i++) {
            totalTime += this.frame[i].duration;
            if (totalTime > timeMs) {
                pos = i;
                break;
            }
        }

        var framePos = stop ? this.currentPos : pos;

        if (this.onCurrentChanged) {
            this.onCurrentChanged(this.frame[framePos]);
        }

        this.frameWidgetController.scrollToFrame(this.frame[framePos].id);

        var nextFrameTime = totalTime;
        if (timeMs > totalTime) {
            nextFrameTime = -1;
        }
        return nextFrameTime;
    }

    setCurrentNext() {
        if (this.currentPos < (this.frame.length-1)) {
            this.setCurrent(this.currentPos + 1);
            this.scrollToCurrent();
        }
    }

    setCurrentPrevious() {
        if (this.currentPos > 0) {
            this.setCurrent(this.currentPos - 1);
            this.scrollToCurrent();
        }
    }

    setCurrentFirst() {
        this.setCurrent(0);
        this.scrollToCurrent();
    }

    setCurrentLast() {
        this.setCurrent(this.frame.length - 1);
        this.scrollToCurrent();
    }

    scrollToCurrent() {
        this.frameWidgetController.scrollToFrame(this.frame[this.currentPos].id);
    }

    recreateFrameWidgets(position) {
        var frameList = this;
        this.frameWidget.removeAll();
        for (var i=0; i<this.frame.length; i++) {
            var widget = this.frameWidget.create(this.frame[i], frameList);
            this.listWidget.appendChild(widget);
        }
        if (position !== undefined) {
            this.currentPos = position;
        }
        if (this.currentPos < this.frame.length) {
            this.setCurrent(this.currentPos);
        } else {
            this.setCurrent(0);
        }
    }

    validateNewResolution(left, right, top, bottom) {
        if ((this.x + left + right) > Settings.MAX_WIDTH) return false;
        if ((this.x - left - right) < Settings.MIN_WIDTH) return false;
        if ((this.y + top + bottom) > Settings.MAX_HEIGHT) return false;
        if ((this.y - top - bottom) < Settings.MIN_HEIGHT) return false;
        if (left == 0 && right == 0 && top == 0 && bottom == 0) return false;
        return true;
    }

    resize(left, right, top, bottom, fillColor) {
        if (!this.validateNewResolution(left, right, top, bottom)) {
            return;
        }
        this.x = this.x + left + right;
        this.y = this.y + top + bottom;

        for (var i=0; i<this.frame.length; i++) {
            this.frame[i].resize(left, right, top, bottom, fillColor);
            this.repaintFrame(this.frame[i]);
        }

        this.setCurrent(this.currentPos);
        this.history.clear();
    }
}

class Color {
    constructor(first = 0xFFFFFF, second = 0, third = 0) {
        this._first = first;
        this._second = second;
        this._third = third;
        this.button = 1;
        this.onFirstChanged = undefined;
        this.onSecondChanged = undefined;
    }

    get first() {
        if (this.button == 3) {
            return this._second;
        } else if (this.button == 2) {
            return this._third;
        }
        return this._first;
    }

    get absoluteFirst() {
        return this._first;
    }

    get second() {
        if (this.button == 3) {
            return this._first;
        }
        return this._second;
    }

    get absoluteSecond() {
        return this._second;
    }

    setForButton(color, button) {
        if (button == 1) {
            this._first = color;
            if (this.onFirstChanged) {
                this.onFirstChanged(color);
            }
        } else if (button == 3) {
            this._second = color;
            if (this.onSecondChanged) {
                this.onSecondChanged(color);
            }
        } else if (button == 2) {
            this._third = color;
        }
    }

    setCurrentButton(button) {
        this.button = button;
    }

    setActive(color) {
        this.setForButton(color, this.button);
    }

    resetButton() {
        this.button = 1;
    }
}

class Display {
    constructor(canvas, frame) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.grid = Settings.DEFAULT_GRID_STATE;
        this.setFrame(frame);
        this.editLayer = undefined;
        this.onFrameEdited = undefined;
    }

    setEditLayer(frame) {
        this.editLayer = frame;
        this.paint();
    }

    showGrid(tf) {
        if (tf != this.grid)
        {
            this.grid = tf;
            this.paint();
        }
    }

    get ediable() {
        if(this.frame) return true;
        return false;
    }

    setFrame(frame) {
        this.frame = frame;
        this.calculateSize();
        this.paint();
    }

    resetDisplay()
    {
        this.setFrame(undefined);
    }

    updateCanvasSize() {
        if (this.canvas.width != this.canvas.scrollWidth) {
            this.canvas.width = this.canvas.scrollWidth;
        }
        if (this.canvas.height != this.canvas.scrollWidth) {
            this.canvas.height = this.canvas.scrollHeight;
        }
    }

    calculateSize() {
        this.updateCanvasSize();
        if (this.frame)
        {
            this.x = Math.floor(this.canvas.scrollWidth / this.frame.x) * this.frame.x;
            this.y = Math.floor(this.canvas.scrollHeight / this.frame.y) * this.frame.y;
        }
        else
        {
            this.x = this.canvas.scrollWidth;
            this.y = this.canvas.scrollHeight;
        }
    }

    get stepX() {
        if (!this.frame) return 0;
        return Math.round(this.x / this.frame.x);
    }

    get stepY() {
        if (!this.frame) return 0;
        return Math.round(this.y / this.frame.y);
    }

    drawPixel(x, y, color)
    {
        if (!this.frame) return;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(this.stepX * x, this.stepY * y, this.stepX, this.stepY);
    }


    drawDashedLine(x1, y1, x2, y2) {
        this.ctx.strokeStyle = Settings.GRID_COLOR;
        this.ctx.beginPath();
        this.ctx.setLineDash([1, 1]);
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    drawGrid() {
        var width = this.stepX * this.frame.x;
        var height = this.stepY * this.frame.y;
        for(var x=1;x<(this.frame.x);x++)
        {
            this.drawDashedLine(this.stepX*x, 0, this.stepX*x, height);
        }
        for(var y=1;y<(this.frame.y);y++)
        {
            this.drawDashedLine(0, this.stepY*y, width, this.stepY*y);
        }
    }

    drawEditLayer() {
        if (!this.editLayer) return;
        for (var x=0; x<this.frame.x; x++)
        {
            for (var y=0; y<this.frame.y; y++)
            {
                if(this.editLayer.pixel[x][y]) {
                    this.drawPixel(x, y, Utils.intToHTMLColor(this.editLayer.pixel[x][y]));
                }
            }
        }
    }

    frameEdited() {
        this.paint();
        if (this.onFrameEdited) {
            this.onFrameEdited(this.frame);
        }
    }

    paint()
    {
        // TODO: check if int required
        if (!this.frame)
        {
            this.ctx.fillStyle = Settings.DEFAULT_SCREEN_COLOR;
            this.ctx.fillRect(0, 0, this.x, this.y);
            return;
        }
        this.calculateSize();

        for (var x=0; x<this.frame.x; x++)
        {
            for (var y=0; y<this.frame.y; y++)
            {
                this.drawPixel(x, y, Utils.intToHTMLColor(this.frame.getPixelColor(x, y)));
            }
        }

        if (this.editLayer) {
            this.drawEditLayer();
        }

        if (this.grid)
        {
            this.drawGrid();
        }

    }
}

class ToolHelper
{
    static drawLine(layer, color, x1, x2, y1, y2) {
        var maxX = Math.max(x1, x2);
        var maxY = Math.max(y1, y2);
        var dx = x2 - x1;
        var dy = y2 - y1;
        if(dx == 0 && dy ==0) {
            layer.pixel[x1][y1] = color;
            return;
        }
        var tan = dy/dx;
        if (tan < 1 && tan > -1) {
            for (var x=Math.min(x1, x2);x<=maxX;x++) {
                var y = Math.round(y1 + dy * (x-x1) / dx);
                layer.pixel[x][y] = color;
            }
        }
        else {
            for (var y=Math.min(y1, y2);y<=maxY;y++) {
                var x = Math.round(x1 + dx * (y-y1) / dy);
                layer.pixel[x][y] = color;
            }
        }
    }
}

class PenTool
{
    start(x, y, layer, color) {
        this.color = color;
        this.layer = layer.createTransparent();
        this.layer.pixel[x][y] = this.color.first;
        this.lastX = x;
        this.lastY = y;
        return this.layer;
    }

    moveTo(x, y) {
        // this is to avoid gaps in line when mouse is fast
        ToolHelper.drawLine(this.layer, this.color.first, this.lastX, x, this.lastY, y);
        this.lastX = x;
        this.lastY = y;
        return this.layer;
    }

    finish() {
        return this.layer;
    }
}

class RectTool
{

    start(x, y, layer, color) {
        this.color = color;
        this.startX = x;
        this.startY = y;
        this.layer = layer.createTransparent();
        this.layer.pixel[x][y] = this.color.first;
        return this.layer;
    }

    moveTo(x, y) {
        var minX = Math.min(this.startX, x);
        var maxX = Math.max(this.startX, x);
        var minY = Math.min(this.startY, y);
        var maxY = Math.max(this.startY, y);
        this.layer.setColor(Settings.TRANSPARENT_COLOR);
        for(var i=0;i<(maxX-minX);i++)
        {
            this.layer.pixel[minX+i][minY] = this.color.first;
            this.layer.pixel[minX+i][maxY] = this.color.first;
        }
        for(var i=0;i<(maxY-minY);i++)
        {
            this.layer.pixel[minX][minY+i] = this.color.first;
            this.layer.pixel[maxX][minY+i] = this.color.first;
        }
        this.layer.pixel[maxX][maxY] = this.color.first;
        return this.layer;
    }

    finish() {
        return this.layer;
    }
}

class FilledRectTool
{
    start(x, y, layer, color) {
        this.color = color;
        this.startX = x;
        this.startY = y;
        this.layer = layer.createTransparent();
        this.layer.pixel[x][y] = this.color.first;
        return this.layer;
    }

    moveTo(x, y) {
        var minX = Math.min(this.startX, x);
        var maxX = Math.max(this.startX, x);
        var minY = Math.min(this.startY, y);
        var maxY = Math.max(this.startY, y);
        this.layer.setColor(Settings.TRANSPARENT_COLOR);
        for(var i=0;i<(maxX-minX);i++)
        {
            this.layer.pixel[minX+i][minY] = this.color.first;
            this.layer.pixel[minX+i][maxY] = this.color.first;
        }
        for(var i=0;i<(maxY-minY);i++)
        {
            this.layer.pixel[minX][minY+i] = this.color.first;
            this.layer.pixel[maxX][minY+i] = this.color.first;
        }
        this.layer.pixel[maxX][maxY] = this.color.first;

        for(var i=minX+1;i<maxX;i++){
            for(var j=minY+1;j<maxY;j++) {
                this.layer.pixel[i][j] = this.color.second;
            }
        }
        return this.layer;
    }

    finish() {
        return this.layer;
    }
}

class LineTool
{
    start(x, y, layer, color) {
        this.color = color;
        this.startX = x;
        this.startY = y;
        this.layer = layer.createTransparent();
        this.layer.pixel[x][y] = this.color.first;
        return this.layer;
    }

    moveTo(x, y) {
        this.layer.setColor(Settings.TRANSPARENT_COLOR);
        ToolHelper.drawLine(this.layer, this.color.first, this.startX, x, this.startY, y);
        return this.layer;
    }

    finish() {
        return this.layer;
    }
}

class FillTool
{
    start(x, y, layer, color) {
        this.color = color;
        this.x = x;
        this.y = y;
        this.sourceLayer = layer.clone();
        this.layer = layer.createTransparent();
        this.startColor = this.sourceLayer.pixel[x][y];
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    floodFill(x, y) {
        if (this.startColor == this.color.first) {
            return;
        }
        var queue = [];
        queue.push({x: x, y: y});
        while (queue.length > 0) {
            var pos = queue.pop();
            if (pos.x < 0 || pos.y < 0 || pos.x >= this.layer.x || pos.y >= this.layer.y) {
                continue;
            }
            if (this.sourceLayer.pixel[pos.x][pos.y] == this.startColor) {
                this.sourceLayer.pixel[pos.x][pos.y] = this.color.first;
                this.layer.pixel[pos.x][pos.y] = this.color.first;
                queue.push({x: pos.x + 1, y:pos.y});
                queue.push({x: pos.x - 1, y:pos.y});
                queue.push({x: pos.x, y:pos.y + 1});
                queue.push({x: pos.x, y:pos.y - 1});
            }
        }
    }

    finish() {
        this.floodFill(this.x, this.y);
        return this.layer;
    }
}

class ProbeTool {
    start(x, y, layer, color) {
        this.color = color;
        this.x = x;
        this.y = y;
        this.layer = layer.createTransparent();
        this.sourceLayer = layer;
    }

    moveTo() {}

    finish() {
        let color = this.sourceLayer.pixel[this.x][this.y];
        this.color.setActive(color);
        return this.layer;
    }
}

class LayerEditor {
    static move(offsetX, offsetY, layer, color) {
        var sizeX = layer.x;
        var sizeY = layer.y;
        var originalLayer = layer.clone();
        for (var x=0; x<sizeX; x++) {
            for(var y=0;y<sizeY; y++) {
                var copyX = x + offsetX;
                var copyY = y + offsetY;
                if(copyX < 0 || copyX >= sizeX || copyY < 0 || copyY >= sizeY) {
                    layer.pixel[x][y] = color.absoluteSecond;
                } else {
                    layer.pixel[x][y] = originalLayer.pixel[copyX][copyY];
                }
            }
        }
    }

    static moveUp(layer, color) {
        LayerEditor.move(0, 1, layer, color);
    }

    static moveDown(layer, color) {
        LayerEditor.move(0, -1, layer, color);
    }

    static moveLeft(layer, color) {
        LayerEditor.move(1, 0, layer, color);
    }

    static moveRight(layer, color) {
        LayerEditor.move(-1, 0, layer, color);
    }

    static negative(layer) {
        for (var x=0; x<layer.x; x++) {
            for(var y=0;y<layer.y; y++) {
                if (undefined == layer.pixel[x][y]) continue;
                layer.pixel[x][y] = 0xFFFFFF - layer.pixel[x][y];
            }
        }
    }

    static reverseVertically(layer) {
        var originalLayer = layer.clone();
        for (var x=0; x<layer.x; x++) {
            for(var y=0;y<layer.y; y++) {
                layer.pixel[x][y] = originalLayer.pixel[x][layer.y-y-1];
            }
        }
    }

    static reverseHorizontaly(layer) {
        var originalLayer = layer.clone();
        for (var x=0; x<layer.x; x++) {
            for(var y=0;y<layer.y; y++) {
                layer.pixel[x][y] = originalLayer.pixel[layer.x-x-1][y];
            }
        }
    }
}

class Painter
{
    constructor(display, history)
    {
        this.display = display;
        this.drawingStarted = false;
        this.color = new Color;
        this.lastCursorPos = {x: -1, y: -1};
        this.tool = new PenTool;
        this.history = history;
        this.onPaintFinished;
    }

    setColor(color) {
        this.color = color;
    }

    compareAndUpdateLastPos(newPos) {
        if(!newPos) return false;
        if(this.lastCursorPos.x != newPos.x || this.lastCursorPos.y != newPos.y) {
            this.lastCursorPos = newPos;
            return true;
        }
        return false;
    }

    calculateCursorPosition(evt) {
        if(evt.offsetX < 0 ||  evt.offsetY < 0 ) {
            return undefined;
        }
        var x = Math.floor(evt.offsetX/this.display.stepX);
        var y = Math.floor(evt.offsetY/this.display.stepY);
        if (x >= this.display.frame.x || y >= this.display.frame.y) {
            return undefined;
        }
        return  {x: x, y: y};
    }

    setTool(tool) {
        if (typeof tool == "function") {
            this.tool = new tool;
        } else {
            this.tool = tool;
        }
    }

    startDrawing(evt) {
        if (!this.display.ediable) return;
        var pos = this.calculateCursorPosition(evt);
        if (!pos) return;
        this.lastCursorPos = pos;

        this.drawingStarted = true;
        this.color.setCurrentButton(evt.which);
        var layer = this.tool.start(pos.x, pos.y, this.display.frame.getFlattenLayer(), this.color);
        if (layer) {
            this.display.setEditLayer(layer);
        }
    }

    processDrawing(evt) {
        if (!this.display.ediable || !this.drawingStarted) return;
        var pos = this.calculateCursorPosition(evt);
        if (!this.compareAndUpdateLastPos(pos)) return;

        var layer = this.tool.moveTo(pos.x, pos.y);
        if(layer) {
            this.display.setEditLayer(layer);
        }
    }

    finishDrawing() {
        if (!this.drawingStarted) return;
        if (!this.display.ediable) return;
        this.lastCursorPos = {x: -1, y: -1};
        this.drawingStarted = false;
        var layer = this.tool.finish();
        if (layer) {
            this.editFrame(layer);
            this.display.frameEdited();
        }
        this.display.setEditLayer(undefined);
    }

    editFrame(editLayer) {
        let frame = this.display.frame;
        var topLayerIdx = frame.layer.length - 1;
        if (frame.x != editLayer.x || frame.y != editLayer.y) return;

        let oldLayer = frame.layer[topLayerIdx].clone();
        for (var x=0; x<frame.x; x++) {
            for (var y=0; y<frame.y; y++) {
                if (editLayer.pixel[x][y] != Settings.TRANSPARENT_COLOR) {
                    frame.layer[topLayerIdx].pixel[x][y] = editLayer.pixel[x][y];
                }
            }
        }
        this.history.layerChanged(frame.id, topLayerIdx, oldLayer);
    }

    applyEditor(editor) {
        if (editor) {
            // TODO layer idx
            let layerIdx = 0;
            let frame = this.display.frame;
            let oldLayer = frame.layer[layerIdx].clone();

            editor(frame.layer[layerIdx], this.color);
            this.display.frameEdited();

            this.history.layerChanged(frame.id, layerIdx, oldLayer);
        }
    }
}

class TextWidget {
    constructor(x, y, box, color) {
        this.x = x;
        this.y = y;
        this.box = box;
        this.color = color;
        this.fontsPath = Settings.FONTS_PATH;
        this.tryLoad = true;
        this.fonts = [];
        this.elem("generateText").disabled = true;
    }

    elem(id) {
        return this.box.querySelector("#" + id);
    }

    fontLoadFailed() {
        var textInfo = this.elem("textInfo");
        textInfo.textContent = "Nie udało się pobrać fontów. Generowanie tekstu nie będzie działać";
        textInfo.style.color = "red"
        this.tryLoad = false;
    }

    populateFontList() {
        let list = this.elem("fontSelect");
        let fonts = Object.keys(this.fonts);
        for (let i=0; i<fonts.length; i++) {
            let option = document.createElement("option");
            option.value = fonts[i];
            option.textContent = fonts[i];
            list.appendChild(option);
        }
    }

    prepareFonts() {
        if (!this.tryLoad) {
            return;
        }
        this.elem("textInfo").textContent = "";
        fetch(this.fontsPath + 'list.json').then(response => {
            return response.json();
        }).then(json => {
            this.fonts = json;
            this.tryLoad = false;
            this.populateFontList();
            this.elem("generateText").disabled = false;
            this.elem("textInfo").style.display = "none";
        }).catch(() => {
            this.fontLoadFailed();
        });
    }

    getConfig() {
        let font = this.fonts[this.elem("fontSelect").value];
        var config = {x: this.x, y: this.y, color: this.color, font: font};
        config.type = this.elem("textAnimation").value;
        config.text = this.elem("textToGenerate").value;
        config.duration = parseInt(this.elem("textFrameDuration").value);
        config.offset = parseInt(this.elem("textOffset").value);
        return config;
    }
}

class TextGenerator {

    static generate(config) {
        switch(config.type) {
            case "horizontal": return TextGenerator.horizontal(config);
            case "vertical": return TextGenerator.vertical(config);
            case "static": return TextGenerator.frameByFrame(config);
        }
        return [];
    }

    static removeInvalidChars(inStr, font) {
        var outStr = "";
        for (let i=0;i<inStr.length;i++) {
            if (font[inStr[i]]) {
                outStr += inStr[i];
            }
        }
        return outStr;
    }

    static horizontal(config) {
        var frames = [];
        var text = TextGenerator.removeInvalidChars(config.text, config.font);
        if (text.length < 1) {
            return frames;
        }

        var pixMapX = 0;
        var pixMapY = config.font[text[0]][0].length;

        for (let i=0; i<text.length; i++) {
            pixMapX += config.font[text[i]].length + 1;
        }

        var pixMap = Utils.array2D(pixMapX, pixMapY, false);
        var leftOffset = 0;
        for (let i=0; i<text.length; i++) {
            var char = text[i];
            var charPixMap = config.font[char];
            let charX = charPixMap.length;

            for (let x=0; x<charX; x++) {
                let charY = config.font[char][0].length;
                for (let y=0; y<charY; y++) {
                    if (charPixMap[x][y]) {
                        pixMap[leftOffset + x][y] = true;
                    }
                }
            }
            leftOffset += charX + 1;
        }

        var framesNumber = config.x - 1 + pixMapX;
        var xOffset = 0;
        var yOffset = config.offset;
        var yStart = yOffset >= 0 ? yOffset : 0;
        var yEnd = yOffset + pixMapY;

        for (let i=0; i<framesNumber; i++) {
            let frame = new Frame(config.x, config.y, config.duration);
            frame.layer[0].setColor(config.color.absoluteSecond);

            let startX = config.x - 1 - i;
            if (startX < 0) startX = 0;
            let endX = framesNumber - i;
            if (endX > config.x) endX = config.x;
            if (i >= config.x) {
                xOffset++;
            }

            for(let x=startX; x<endX; x++) {
                if (yEnd > config.y) yEnd = config.y;
                let pixX = x - startX + xOffset;
                for(let y=yStart; y<yEnd; y++) {
                    if (pixMap[pixX][y-yStart]) {
                        frame.layer[0].pixel[x][y] = config.color.absoluteFirst;
                    }
                }
            }
            frames.push(frame);
        }
        return frames;
    }

    static vertical(config) {
        var frames = [];
        var text = TextGenerator.removeInvalidChars(config.text, config.font);
        if (text.length < 1) {
            return frames;
        }

        var pixMapX = 0;
        var pixMapY = 0;
        for (let key in config.font) {
            let char = config.font[key];
            if (char.length > pixMapX) {
                pixMapX = char.length;
            }
        }

        for (let i=0; i<text.length; i++) {
            pixMapY += config.font[text[i]][0].length + 1;
        }
        pixMapY--;

        var pixMap = Utils.array2D(pixMapX, pixMapY, false);
        var topOffset = 0;
        let charY = config.font[text[0]][0].length;
        for (let i=0; i<text.length; i++) {
            var char = text[i];
            var charPixMap = config.font[char];
            let charX = config.font[char].length;
            let offsetX = Math.floor((pixMapX - charX) / 2);

            for (let x=0; x<charX; x++) {
                for (let y=0; y<charY; y++) {
                    if (charPixMap[x][y]) {
                        pixMap[offsetX + x][topOffset + y] = true;
                    }
                }
            }
            topOffset += charY + 1;
        }

        var framesNumber = config.y - 1 + pixMapY;
        var startX = config.offset >= 0 ? config.offset : 0;
        var yOffset = 0;
        var endX = startX + pixMapX;
        if (endX > config.x) endX = config.x;

        for (let i=0; i<framesNumber; i++) {
            let frame = new Frame(config.x, config.y, config.duration);
            frame.layer[0].setColor(config.color.absoluteSecond);
            if (i >= config.y) {
                yOffset++;
            }

            for(let x=startX; x<endX; x++) {
                let yStart = config.y - 1 - i;
                if (yStart < 0) yStart = 0;
                let yEnd = framesNumber - i;
                if (yEnd > config.y) yEnd = config.y;
                for(let y=yStart; y<yEnd; y++) {
                    let pixY = y - yStart + yOffset;
                    if (pixMap[x - startX][pixY]) {
                        frame.layer[0].pixel[x][y] = config.color.absoluteFirst;
                    }
                }
            }
            frames.push(frame);
        }
        return frames;
    }

    static frameByFrame(config) {
        var frames = [];
        for (var i=0; i<config.text.length; i++) {
            var char = config.text[i];
            var frame = new Frame(config.x, config.y, config.duration);
            var layer = frame.layer[0];
            layer.setColor(config.color.second);

            if (!config.font[char]) {
                frames.push(frame);
                continue;
            }

            var charPixMap = config.font[char];
            var charX = charPixMap.length;
            var charY = charPixMap[0].length;
            var leftOffset = Math.round((config.x - charX) / 2);

            for (var x=0; x<charX; x++) {
                var oX = x + leftOffset;
                if (oX < 0 || oX >= config.x) {
                    continue;
                }
                for (var y=0; y<charY; y++) {
                    var oY = y + config.offset;
                    if (oY < 0 || oY >= config.y) {
                        continue;
                    }
                    if (charPixMap[x][y]) {
                        layer.pixel[oX][oY] = config.color.first;
                    }
                }
            }
            frames.push(frame);
        }
        return frames;
    }
}

class PlayerTimeSource {
    constructor() {
        this.time = 0;
        this.startTime = new Date().getTime();
        this.paused = true;
    }

    play() {
        this.paused = false;
        this.startTime = new Date().getTime() - (this.time * 1000);
        this.time = 0;
    }

    pause() {
        this.paused = true;
        this.time = 0.001 * (new Date().getTime() - this.startTime);
    }

    get currentTime() {
        if (this.paused) {
            return this.time;
        } else {
            return 0.001 * (new Date().getTime() - this.startTime);
        }
    }

    set currentTime(time) {
        if (time < 0) {
            time = 0;
        }
        if (this.paused) {
            this.time = time;
        } else {
            this.startTime = new Date().getTime() - (1000 * time);
        }
    }
}

class Player {
    constructor(frameList, timeSource) {
        this.frameList = frameList;
        this.timeSource = timeSource;
        this.isPlaying = false;
        this.timeOutId = undefined;
        this.setTimeOutImpl = (callback, time) => { return setTimeout(callback, time) };
        this.onStop = false;
    }

    start() {
        var startTime = this.frameList.getCurentFrameTime();
        this.timeSource.currentTime = startTime * 0.001;
        if (Math.abs(this.timeSource.currentTime - (startTime * 0.001)) > Settings.MAX_TIME_DELAY) {
            // TODO print ze klatka jest poza czasem animacji
            return false;
        }
        this.isPlaying = true;
        this.frameList.block();
        this.timeSource.play();
        this.handleTimeOut();

    }

    stop() {
        if (!this.isPlaying) {
            return;
        }
        if (this.timeOutId !== undefined) {
            clearTimeout(this.timeOutId);
            this.timeOutId = false;
        }
        this.timeSource.pause();
        this.frameList.unblock();
        this.isPlaying = false;
        var endOfPlay = true;
        this.frameList.showFrameByTime(this.timeSource.currentTime, endOfPlay);
        if (this.onStop) {
            this.onStop();
        }
    }

    handleTimeOut() {
        var currentTime = 1000 * this.timeSource.currentTime;
        var nextTime = this.frameList.showFrameByTime(this.timeSource.currentTime);
        if (currentTime > nextTime || this.timeSource.paused) {
            this.stop();
            return;
        }
        var nextTimeOut = Math.round(nextTime - currentTime);
        var player = this;
        this.timeOutId = this.setTimeOutImpl(() => {player.handleTimeOut() }, nextTimeOut);
    }

    setTimeSource(timeSource) {
        if (!this.isPlaying) {
            this.timeSource = timeSource;
        }
    }
}

// TODO przerobic na static
class AnimationFile {

    static checkHeader(input, header) {
        if (input.substr(0, header.length) == header) {
            return true;
        } else {
            return false;
        }
    }

    static import(input) {
        if (AnimationFile.checkHeader(input, Settings.P6_FILE) ||
        AnimationFile.checkHeader(input, Settings.P7_FILE)) {
            return AnimationFile.importLegacy(input);
        }
        if (!AnimationFile.checkHeader(input, Settings.P9_FILE)) {
            return [];
        }
        // TODO napisac
        return [];
    }

    static importLegacy(input) {
        var frames = [];
        if (!AnimationFile.checkHeader(input, Settings.P6_FILE) &&
            !AnimationFile.checkHeader(input, Settings.P7_FILE)) {
            return frames;
        }
        var data = input.match(/[0-9]+/g);
        var width = parseInt(data[1]);
        var height = parseInt(data[2]);
        if (!Utils.isResolutionValid(width, height)) {
            return frames;
        }
        var idx = 2;
        var dataLenght = data.length;
        while(true)
        {
            idx++;
            if(idx >= dataLenght) {
                break;
            }
            var duration = parseInt(data[idx]);
            var frame = new Frame(width, height, duration);
            var layer = frame.layer[0];
            for (var y=0; y<height; y++) {
                for (var x=0; x<width; x++)
                {
                    idx++;
                    var color = parseInt(data[idx]);
                    layer.pixel[x][y] = color;
                }
            }
            frames.push(frame);
        }
        return frames;
    }

    static export(version) {
        if (version == 6 || version == 7) {
            return AnimationFile.exportLegacy(version);
        }
        if (version != 9) return;
        // TODO napiasc
        return false;
    }

    static exportLegacy(frameList, version) {
        if (version != 6 && version != 7) {
            return false;
        }
        var nl = "\r\n";
        var width = frameList.x;
        var height = frameList.y;
        var out = Settings.LEGACY_FILE.replace("{version}", version) + nl;
        out += width + ' ' + height + nl + nl;
        for (var i=0; i<frameList.frame.length; i++) {
            var frame = frameList.frame[i];
            var outBuffer = frame.duration + nl;
            for (var y=0; y<height; y++) {
                for (var x=0; x<width; x++) {
                    outBuffer += frame.getPixelColor(x, y) + ' ';
                }
                outBuffer += nl;
            }
            out += outBuffer + nl;
        }
        return out;
    }
}

class AnimationFileManager {
    constructor(frameList, storage = localStorage) {
        this.storage = storage;
        this.currentFile = undefined;
        this.frameList = frameList;
        this.fileVersion = Settings.DEFAULT_FILE_VERSION;
    }

    open(file, name = undefined) {
        this.currentFile = name;
        var frames = AnimationFile.import(file);
        if (frames.length > 0) {
            this.frameList.frame = frames;
            this.frameList.x = frames[0].x;
            this.frameList.y = frames[0].y;
            this.frameList.history.clear();
            this.frameList.recreateFrameWidgets(0);
            this.frameList.setCurrent(0);
            return true;
        }
        return false;
    }

    save() {
        if (!this.currentFile) {
            return false;
        }
        var data = AnimationFile.exportLegacy(this.frameList, this.fileVersion);
        this.storage.setItem(this.currentFile, data);
        return true;
    }

    saveAs(fileName) {
        this.currentFile = fileName;
        this.save();
    }

    toDataURL() {
        let header = "data:application/octet-stream,";
        return header + encodeURI(AnimationFile.exportLegacy(this.frameList, this.fileVersion));
    }

    getAnimationsList() {
        return Object.keys(this.storage);
    }
}

class History {
    constructor() {
        this.changes = [];
        this.blocked = false;
    }

    block() {
        this.bloced = true;
    }

    unblock() {
        this.bloced = false;
    }

    clear() {
        this.changes = [];
        this.blocked = false;
    }

    addChange(change) {
        if (this.blocked) {
            return;
        }
        this.changes.push(change);
        if (this.changes.length > Settings.HISTORY_CHANGES_LIMIT) {
            this.changes.shift();
        }
    }

    framesRemoved(removedFrames) {
        this.addChange({type: "framesRemoved", data: removedFrames});
    }

    framesAdded(startPosition, count) {
        var data = {positions: Array.from({length: count}, (v, k) => k+startPosition) };
        this.addChange({type: "framesAdded", data: data});
    }

    frameDurationChanged(frameId, oldDuration) {
        var data = {frameId: frameId, oldDuration: oldDuration}
        this.addChange({type: "frameDurationChanged", data: data});
    }

    layerChanged(frameId, layerIdx, oldLayer) {
        let data = {frameId: frameId, layerIdx: layerIdx, oldLayer: oldLayer};
        this.addChange({type: "layerChanged", data: data});
    }

    takeLastChange() {
        var change = this.changes.pop();
        if (!change) {
            return {type: "none"};
        } else {
            return change;
        }
    }

    clear() {
        this.changes = [];
        this.blocked = false;
    }
}

class HistoryRewinder {
    constructor(frameList) {
        this.history = frameList.history;
        this.frameList = frameList;
    }

    undoFramesRemoved(data) {
        let positions = Object.keys(data);
        for (let i=0; i<positions.length;i++) {
            let position = positions[i];
            this.frameList.addFrame(data[position], position);
        }
    }

    undoFramesAdded(data) {
        this.frameList.removeFrames(data.positions);
    }

    undoFrameDurationChanged(data) {
        let position = this.frameList.getPositionByFrameId(data.frameId);
        if (position !== undefined) {
            this.frameList.frame[position].duration = data.oldDuration;
            this.frameList.setCurrent(position);
        }
    }

    undoLayerChanged(data) {
        let position = this.frameList.getPositionByFrameId(data.frameId);
        if (position !== undefined) {
            let frame = this.frameList.frame[position];
            frame.layer[data.layerIdx] = data.oldLayer;
            this.frameList.setCurrent(position);
            this.frameList.repaintFrame(frame);
        }
    }

    undo() {
        this.history.block()
        var change = this.history.takeLastChange();
        switch(change.type) {
            case "framesRemoved":
                this.undoFramesRemoved(change.data);
                break;
            case "framesAdded":
                this.undoFramesAdded(change.data);
                break;
            case "frameDurationChanged":
                this.undoFrameDurationChanged(change.data);
                break;
            case "layerChanged":
                this.undoLayerChanged(change.data);
                break;
        }
        this.history.unblock()
    }
}

class Menu {
    constructor(painter, frameList, topMenu, player, colorMenu, box, durationMenu) {
        this.painter = painter;
        this.frameList = frameList;
        this.topMenu = topMenu;
        this.toolMenu = topMenu.querySelector('#toolMenu');
        this.audio = new Audio;
        this.player = player;
        this.isPlaying = false;
        this.colorMenu = colorMenu;
        this.color = new Color();
        this.box = box;
        this.historyRewinder = new HistoryRewinder(frameList);
        this.animationFileManager = new AnimationFileManager(frameList);
        this.textWidget = new TextWidget(frameList.x, frameList.y, box, this.color);
        this.rangeDuration  = durationMenu.querySelector("#durationRange");
        this.numberDuration = durationMenu.querySelector("#durationNumber");
        this.setPenTool();
        this.addOnclickHandlerToColors();
        this.addOnColorChangedHandlers();
        this.setCancelButtonHandling();
        this.setAudioErrorHandling();
        this.setUpMusicBox();
        this.setUpFileOpenBox();
        this.setUpResizeBox();
        this.setUpFileSaveBox();
        this.setUpDurationMenu();
        this.keyboardHandling("full");
    }

    keyboardHandling(mode) {
        if ("full" == mode) {
            window.onkeyup = evt => { this.shortCutsHandler(evt)};
        } else if ("simple" == mode) {
            window.onkeyup = evt => { this.shortCutsSimpleHandler(evt)};
        } else {
            window.onkeyup = undefined;
        }
    }

    setAudioErrorHandling() {
        this.audio.onerror = () => {
            this.player.setTimeSource(new PlayerTimeSource);
            this.setButtonPressed('music', false);
        }
    }

    updateDurationMenu(duration) {
        if (this.isPlaying) return;
        duration = parseInt(duration);
        if (this.rangeDuration.value != duration) {
            this.rangeDuration.value = duration;
        }
        if (this.numberDuration.value != duration) {
            this.numberDuration.value = duration;
        }
        if (this.frameList.currentFrameDuration != duration) {
            this.frameList.currentFrameDuration = duration;
        }
    }

    setUpDurationMenu() {
        let changeHandler = evt => { this.updateDurationMenu(evt.srcElement.value) };
        this.rangeDuration.onchange = changeHandler;
        this.numberDuration.onchange = changeHandler;
    }

    openWindow(id) {
        this.keyboardHandling("simple");
        this.box.style.display = 'flex';
        this.box.querySelector("#" + id).style.display = 'block';
    }

    closeWindow(id, enableKeyboardHandling = true) {
        this.box.querySelector("#" + id).style.display = 'none';
        this.box.style.display = 'none';
        if (enableKeyboardHandling) {
            this.keyboardHandling("full");
        }
    }

    closeAllWindows() {
        this.closeWindow('textBox', false);
        this.closeWindow("fileOpenBox", false);
        this.closeWindow("multipleFrameBox", false);
        this.closeWindow("musicBox", false);
        this.closeWindow("fileSaveBox", false);
        this.closeWindow('resizeBox', false);

        this.keyboardHandling("full");
    }

    addOnclickHandlerToColors() {
        var colorElement = this.colorMenu.querySelectorAll('.color');
        var menu = this;
        for (var i=0; i<colorElement.length; i++) {
            colorElement[i].onmouseup = (evt) => {
                let button = evt.which;
                let color = evt.srcElement.style.backgroundColor;
                menu.setColor(color , button);
            }
        }

    }

    addOnColorChangedHandlers() {
        var menu = this;
        this.color.onFirstChanged = (color) => {
            var color = Utils.intToHTMLColor(color);
            menu.colorMenu.querySelector('#colorFirst').style.backgroundColor = color;
        }
        this.color.onSecondChanged = (color) => {
            var color = Utils.intToHTMLColor(color);
            menu.colorMenu.querySelector('#colorSecond').style.backgroundColor = color;
        }
    }

    setColor(color, button) {
        let rgb = color.match(/[0-9]+/g);
        color = (rgb[0] << 16) + (rgb[1] << 8) + parseInt(rgb[2]);

        this.color.setForButton(color, button);
        this.painter.setColor(this.color);
    }

    releasePressedToolButton() {
        var button = this.toolMenu.querySelector('.menuButtonSelected');
        if (button) {
            button.className = 'menuButton';
        }
    }

    setButtonPressed(buttonId, pressed) {
        var className = pressed == true ? "menuButtonSelected" : 'menuButton';
        this.topMenu.querySelector('#' + buttonId).className = className;
    }

    pressToolButtonById(buttonId) {
        this.releasePressedToolButton();
        var button = this.toolMenu.querySelector('#' + buttonId);
        if (button) {
            button.className = 'menuButtonSelected';
        }
    }

    moveRight() {
        if (this.isPlaying) return;
        this.painter.applyEditor(LayerEditor.moveRight);
    }

    moveLeft() {
        if (this.isPlaying) return;
        this.painter.applyEditor(LayerEditor.moveLeft);
    }

    moveUp() {
        if (this.isPlaying) return;
        this.painter.applyEditor(LayerEditor.moveUp);
    }

    moveDown() {
        if (this.isPlaying) return;
        this.painter.applyEditor(LayerEditor.moveDown);
    }

    reverseVertically() {
        if (this.isPlaying) return;
        this.painter.applyEditor(LayerEditor.reverseVertically);
    }

    reverseHorizontaly() {
        if (this.isPlaying) return;
        this.painter.applyEditor(LayerEditor.reverseHorizontaly);
    }

    negative() {
        if (this.isPlaying) return;
        this.painter.applyEditor(LayerEditor.negative)
    }

    addFrame() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.frameList.addNewFrame();
    }

    copyFrames() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.frameList.copy();
    }

    cutFrames() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.frameList.cut();
    }

    pasteFrames() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.frameList.paste();
    }

    duplicateFrames() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.frameList.duplicate();
    }

    setUpFileOpenBox() {
        var fileForm = this.box.querySelector("#fileOpen");
        fileForm.onsubmit = evt => {

            if (fileForm['animationFile'].files.length > 0) {
                evt.preventDefault();
                var file = fileForm['animationFile'].files[0];
                if(file.size > 10*1024*1024) return false;
                var reader = new FileReader();
                reader.onloadend = fileEvt => {
                    if (fileEvt.target.readyState != FileReader.DONE) return;
                    this.animationFileManager.open(fileEvt.target.result);
                }
                reader.readAsBinaryString(file);
            }
            this.closeWindow('fileOpenBox');
            return false;
        };
    }

    setUpResizeBox() {
        var resizeForm = this.box.querySelector("#resizeForm");
        resizeForm.onsubmit = evt => {
            evt.preventDefault();

            var left = parseInt(resizeForm.leftResize.value);
            var right = parseInt(resizeForm.rightResize.value);
            var top = parseInt(resizeForm.topResize.value);
            var bottom = parseInt(resizeForm.bottomResize.value);

            if (!this.frameList.validateNewResolution(left, right, top, bottom)) {
                return alert("Nieprawidłowa nowa rozdzielczość animacji");
            }
            if (confirm("Czy na pewno chcesz zmienić? Tej operacji nie można cofnąć")) {
                this.frameList.resize(left, right, top, bottom, this.color.absoluteSecond);
            }
            this.closeWindow('resizeBox');
            return false;
        }
    }

    getFileNameFromInput(input, ext = Settings.DEFAULT_EXTENSION) {
        ext = "." + ext;
        var fileName = input.value;
        if (fileName.length < 1) {
            return 'animacja' + ext;
        }
        if (fileName.substr(-ext.length) != ext) {
            fileName += ext;
        }
        return fileName;
    }

    setUpFileSaveBox() {
        var fileNameInput = this.box.querySelector("#saveFileName");
        var downloadBtn = this.box.querySelector("#downloadFileBtn");
        var saveBtn = this.box.querySelector("#saveLocalBtn");

        downloadBtn.onclick = () => {
            downloadBtn.download = this.getFileNameFromInput(fileNameInput);
            downloadBtn.href = this.animationFileManager.toDataURL();
            this.closeWindow('fileSaveBox');
        };
        saveBtn.onclick = () => {
            let name = this.getFileNameFromInput(fileNameInput);
            if (fileNameInput.value.length == 0) {
                alert("Podaj nazwę animacji");
            } else {
                this.animationFileManager.saveAs(name);
            }
            this.closeWindow('fileSaveBox');
        };
    }

    setUpMusicBox() {
        var musicForm = this.box.querySelector("#musicForm");
        musicForm.onsubmit = evt => {
            evt.preventDefault();
            this.audio.currentTime = 0;
            switch(musicForm['musicSrc'].value) {
                case "local":
                    if (musicForm['musicFile'].files.length > 0) {
                        this.audio.src = URL.createObjectURL(musicForm['musicFile'].files[0]);
                        this.player.setTimeSource(this.audio);
                        this.setButtonPressed('music', true);
                    } else {
                        this.player.setTimeSource(new PlayerTimeSource);
                        this.setButtonPressed('music', false);
                    }
                    break;
                case "online":
                    if (musicForm['musicUrl'].value.length > 0) {
                        this.audio.src = musicForm['musicUrl'].value;
                        this.player.setTimeSource(this.audio);
                        this.setButtonPressed('music', true);
                    } else {
                        this.player.setTimeSource(new PlayerTimeSource);
                        this.setButtonPressed('music', false);
                    }
                    break;
                default:
                    this.player.setTimeSource(new PlayerTimeSource);
                    this.setButtonPressed('music', false);
                    break;
            }
            this.closeWindow('musicBox');
            return false;
        }
    }

    showMusicBox() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.openWindow('musicBox');
    }

    setCancelButtonHandling() {
        var cancelButtons = this.box.querySelectorAll(".cancelButton");
        for (let i=0; i<cancelButtons.length; i++) {
            cancelButtons[i].onclick = () => { this.closeAllWindows()};
        }
    }

    showTextBox() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.openWindow('textBox');
        this.textWidget.prepareFonts();

        var textForm = this.box.querySelector("#textForm");
        var textInput = this.box.querySelector("#textToGenerate");

        textInput.focus();
        textForm.onsubmit = evt => {
            evt.preventDefault();
            var frames = TextGenerator.generate(this.textWidget.getConfig())
            this.frameList.addFrames(frames);
            this.closeWindow('textBox');
            textInput.value = "";
            return false;
        };
    }

    showMultipleFramesBox() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();

        this.openWindow('multipleFrameBox');
        this.color.resetButton();

        var firstColor = this.box.querySelector("#addFramesFirstColor");
        var lastColor = this.box.querySelector("#addFramesLastColor");
        firstColor.value = Utils.intToHTMLColor(this.color.absoluteFirst);
        lastColor.value = Utils.intToHTMLColor(this.color.absoluteSecond);

        var count = this.box.querySelector("#addFrameCount");
        var duration = this.box.querySelector("#addFrameDuration");
        var submitButton = this.box.querySelector("#addMultipleSubmit");

        submitButton.onclick = () => {
            this.addMultipleFrames(Utils.fromRange(parseInt(count.value), 1, 1000),
                                   parseInt(duration.value),
                                   Utils.htmlToInt(firstColor.value),
                                   Utils.htmlToInt(lastColor.value));
            this.closeWindow('multipleFrameBox');
        };
    }

    addMultipleFrames(count, duration, firstColor, lastColor) {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.frameList.addMultiple(count, duration, firstColor, lastColor);
    }

    removeFrames() {
        if (this.isPlaying) return;
        this.frameList.removeSelected();
    }

    setPenTool() {
        this.pressToolButtonById('penTool');
        this.painter.setTool(PenTool);
    }

    setLineTool() {
        this.pressToolButtonById('lineTool');
        this.painter.setTool(LineTool);
    }

    setRectTool() {
        this.pressToolButtonById('rectTool');
        this.painter.setTool(RectTool);
    }

    setFilledRectTool() {
        this.pressToolButtonById('filledRectTool');
        this.painter.setTool(FilledRectTool);
    }

    setFillTool() {
        this.pressToolButtonById('fillTool');
        this.painter.setTool(FillTool);
    }

    setProbeTool() {
        this.pressToolButtonById('probeTool');
        this.painter.setTool(ProbeTool);
    }

    nextFrame() {
        if (this.isPlaying) return;
        this.frameList.setCurrentNext();
    }

    previousFrame() {
        if (this.isPlaying) return;
        this.frameList.setCurrentPrevious();
    }

    firstFrame() {
        if (this.isPlaying) return;
        this.frameList.setCurrentFirst();
    }

    lastFrame() {
        if (this.isPlaying) return;
        this.frameList.setCurrentLast();
    }

    shortCutsSimpleHandler(evt) {
        if (evt.code == "Escape") {
            this.closeAllWindows();
        }
    }

    shortCutsHandler(evt) {
        if (evt.code === 'Space') {
            evt.preventDefault();
            this.playPause();
            return;
        }
        if (this.isPlaying) return;

        if (evt.ctrlKey || evt.metaKey) {
            switch(evt.key) {
                case "ArrowLeft":  return this.moveLeft();
                case "ArrowRight": return this.moveRight();
                case "ArrowUp":    return this.moveUp();
                case "ArrowDown":  return this.moveDown();
                case "x":
                    this.cutFrames();
                    return evt.preventDefault();
                case "c":
                    this.copyFrames();
                    return evt.preventDefault();
                case "v":
                    this.pasteFrames();
                    return evt.preventDefault();
                case "d":
                    this.duplicateFrames();
                    return evt.preventDefault();
                case "o":
                    this.open();
                    return evt.preventDefault();
                case "b":
                    this.resize();
                    return evt.preventDefault();
                case "s":
                    this.save();
                    return evt.preventDefault();
                case "S":
                    this.saveAs();
                    return evt.preventDefault();
                case "z":
                    this.undo();
                    return evt.preventDefault();
            }
        } else {
            switch(evt.key) {
                case "ArrowUp"   : return this.previousFrame();
                case "ArrowDown" : return this.nextFrame();
                case "ArrowLeft" : return this.firstFrame();
                case "ArrowRight": return this.lastFrame();
                case "a": return this.addFrame();
                case "w": return this.showMultipleFramesBox();
                case "r": return this.removeFrames();
                case "v": return this.reverseVertically();
                case "h": return this.reverseHorizontaly();
                case "n": return this.negative();
                case "m": return this.showMusicBox();
                case "1": return this.setPenTool();
                case "2": return this.setLineTool();
                case "3": return this.setRectTool();
                case "4": return this.setFilledRectTool();
                case "5": return this.setFillTool();
                case "6": return this.setProbeTool();
                case "t":
                    evt.preventDefault();
                    return this.showTextBox();
                case "Delete":
                    evt.preventDefault();
                    return this.removeFrames();
                case "Backspace":
                        evt.preventDefault();
                        return this.removeFrames();
            }
        }
    }

    playPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    updatePlayPauseButton(btnClassName, imgSrc, desc) {
        var button = document.getElementById('playPause');
        var btnStyle = window.getComputedStyle(button, null);
        var lastWidth = btnStyle.getPropertyValue("width");
        button.className = btnClassName;
        document.getElementById('playPauseImg').src = imgSrc;
        document.getElementById('playPauseDesc').innerHTML = desc;
        if (button.style.width < lastWidth) {
            button.style.width = lastWidth;
        }
    }

    play() {
        this.isPlaying = true;
        this.updatePlayPauseButton('menuButtonSelected', 'media/icons/pause.png', 'Pauza');
        this.player.start();
    }

    pause() {
        this.isPlaying = false;
        this.updatePlayPauseButton('menuButton', 'media/icons/play.png', 'Odtwórz');
        this.player.stop();
    }

    open() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.openWindow('fileOpenBox');
    }

    resize() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.openWindow('resizeBox');
    }

    save() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        if (!this.animationFileManager.save()) {
            this.saveAs();
        }
    }

    saveAs() {
        if (this.isPlaying) return;
        this.painter.finishDrawing();
        this.openWindow('fileSaveBox');
    }

    undo() {
        this.historyRewinder.undo();
    }
}

function NewAnimation(x = 12, y = 10) {
    function DOM(id) {
        return document.getElementById(id);
    }

    var canvas = DOM('display');
    var list = DOM('frameList');
    var topMenu = DOM('topMenu');
    var colorMenu = DOM('colorMenu');
    var boxBg = DOM('boxBackground');
    var durationMenu = DOM('durationMenu');

    var history = new History;
    var frameList = new FrameList(x, y, list, history);
    var display = new Display(canvas, frameList.currentFrame);
    var painter = new Painter(display, history);
    var timeSource = new PlayerTimeSource;

    var player = new Player(frameList, timeSource);
    var menu = new Menu(painter, frameList, topMenu, player, colorMenu, boxBg, durationMenu);

    frameList.onCurrentChanged = frame => {
        display.setFrame(frame);
        menu.updateDurationMenu(frame.duration);
    };
    // move it to painter
    display.onFrameEdited = frame => { frameList.repaintFrame(frame) };
    player.onStop = () => { menu.pause() };

    window.onresize       = () => { display.paint() };
    window.oncontextmenu  = () => { return false;};
    canvas.onmousedown    = evt => { painter.startDrawing(evt); };
    canvas.onmousemove    = evt => { painter.processDrawing(evt); };
    window.onmouseup      = evt => { painter.finishDrawing(evt); };

    window.onbeforeunload = evt => { evt.preventDefault(); return "Na pewno?" }


    // TODO move to class ?
    DOM('moveRight').onclick = () => { menu.moveRight() };
    DOM('moveLeft').onclick  = () => { menu.moveLeft() };
    DOM('moveUp').onclick    = () => { menu.moveUp() };
    DOM('moveDown').onclick  = () => { menu.moveDown() };

    DOM('reverseVertically').onclick  = () => { menu.reverseVertically() };
    DOM('reverseHorizontaly').onclick = () => { menu.reverseHorizontaly() };
    DOM('negative').onclick           = () => { menu.negative() };
    DOM('textGen').onclick            = () => { menu.showTextBox() };

    DOM('addFrame').onclick        = () => { menu.addFrame() };
    DOM('addMultiple').onclick     = () => { menu.showMultipleFramesBox() };
    DOM('removeFrames').onclick    = () => { menu.removeFrames() };
    DOM('copyFrames').onclick      = () => { menu.copyFrames() };
    DOM('cutFrames').onclick       = () => { menu.cutFrames() };
    DOM('pasteFrames').onclick     = () => { menu.pasteFrames() };
    DOM('duplicateFrames').onclick = () => { menu.duplicateFrames() };

    DOM('undo').onclick            = () => { menu.undo() };

    DOM('penTool').onclick         = () => { menu.setPenTool() };
    DOM('lineTool').onclick        = () => { menu.setLineTool() };
    DOM('rectTool').onclick        = () => { menu.setRectTool() };
    DOM('filledRectTool').onclick  = () => { menu.setFilledRectTool() };
    DOM('fillTool').onclick        = () => { menu.setFillTool() };
    DOM('probeTool').onclick       = () => { menu.setProbeTool() };

    DOM('firstFrame').onclick      = () => { menu.firstFrame() };
    DOM('prevFrame').onclick       = () => { menu.previousFrame() };
    DOM('playPause').onclick       = () => { menu.playPause() };
    DOM('nextFrame').onclick       = () => { menu.nextFrame() };
    DOM('lastFrame').onclick       = () => { menu.lastFrame() };

    DOM('openAnimation').onclick   = () => { menu.open() };
    DOM('resize').onclick          = () => { menu.resize() };
    DOM('saveAnimation').onclick   = () => { menu.save() };
    DOM('saveAnimationAs').onclick = () => { menu.saveAs() };

    DOM('music').onclick           = () => { menu.showMusicBox() };
}
