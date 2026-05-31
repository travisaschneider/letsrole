"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var parser_1 = require("./parser");
var stream_1 = require("./stream");
var SuperGif = /** @class */ (function () {
  function SuperGif(gifImgElement, opts) {
    var _this = this;
    this.gifImgElement = gifImgElement;
    this.options = {
      autoPlay: true,
    };
    this.loading = false;
    this.ready = false;
    this.transparency = null;
    this.delay = null;
    this.disposalMethod = null;
    this.disposalRestoreFromIdx = null;
    this.lastDisposalMethod = null;
    this.frame = null;
    this.lastImg = null;
    this.playing = true;
    this.forward = true;
    this.ctxScaled = false;
    this.frames = [];
    this.frameOffsets = []; // Elements have .x and .y properties
    this.initialized = false;
    this.currentFrameIndex = -1;
    this.iterationCount = 0;
    this.stepping = false;
    this.handler = {
      hdr: this.withProgress(this.doHdr.bind(this)),
      gce: this.withProgress(this.doGCE.bind(this)),
      com: this.withProgress(this.doNothing.bind(this)),
      // I guess that's all for now.
      app: {
        // TODO: Is there much point in actually supporting iterations?
        NETSCAPE: this.withProgress(this.doNothing.bind(this)),
      },
      img: this.withProgress(this.doImg.bind(this)),
      eof: function () {
        _this.pushFrame();
        _this.canvas.width = _this.hdr.width * _this.getCanvasScale();
        _this.canvas.height = _this.hdr.height * _this.getCanvasScale();
        _this.playerInit();
        _this.loading = false;
        _this.ready = true;
        if (_this.loadCallback) {
          _this.loadCallback(_this.gifImgElement);
        }
      },
    };
    for (var i in opts) {
      this.options[i] = opts[i];
    }
    this.onEndListener = opts.onEnd;
    this.loopDelay = opts.loopDelay || 0;
    this.overrideLoopMode = opts.loopMode || "auto";
    this.drawWhileLoading = opts.drawWhileLoading || true;
  }
  SuperGif.prototype.init = function () {
    var parentNode = this.gifImgElement.parentNode;
    var divElement = document.createElement("div");
    this.canvas = document.createElement("canvas");
    this.canvasContext = this.canvas.getContext("2d");
    this.tmpCanvas = document.createElement("canvas");
    divElement.className = this.options.enclosingClass || "super-gif";
    divElement.appendChild(this.canvas);
    if (parentNode) {
      parentNode.insertBefore(divElement, this.gifImgElement);
      parentNode.removeChild(this.gifImgElement);
    }
    this.initialized = true;
  };
  SuperGif.prototype.loadSetup = function (callback) {
    if (this.loading) {
      return false;
    }
    if (callback) {
      this.loadCallback = callback;
    }
    this.loading = true;
    this.frames = [];
    this.clear();
    this.disposalRestoreFromIdx = null;
    this.lastDisposalMethod = null;
    this.frame = null;
    this.lastImg = null;
    return true;
  };
  SuperGif.prototype.completeLoop = function () {
    if (this.onEndListener) {
      this.onEndListener(this.gifImgElement);
    }
    this.iterationCount++;
    if (this.overrideLoopMode !== false || this.iterationCount < 0) {
      this.doStep();
    } else {
      this.stepping = false;
      this.playing = false;
    }
  };
  SuperGif.prototype.doStep = function () {
    this.stepping = this.playing;
    if (!this.stepping) {
      return;
    }
    this.stepFrame(1);
    var delay = this.frames[this.currentFrameIndex].delay * 10;
    if (!delay) {
      // FIXME: Should this even default at all? What should it be?
      delay = 100;
    }
    var nextFrameNo = this.getNextFrameNo();
    if (nextFrameNo === 0) {
      delay += this.loopDelay;
      setTimeout(this.completeLoop.bind(this), delay);
    } else {
      setTimeout(this.doStep.bind(this), delay);
    }
  };
  SuperGif.prototype.step = function () {
    if (!this.stepping) {
      setTimeout(this.doStep.bind(this), 0);
    }
  };
  SuperGif.prototype.putFrame = function () {
    var offset;
    this.currentFrameIndex = parseInt(this.currentFrameIndex.toString(), 10);
    if (this.currentFrameIndex > this.frames.length - 1) {
      this.currentFrameIndex = 0;
    }
    if (this.currentFrameIndex < 0) {
      this.currentFrameIndex = 0;
    }
    offset = this.frameOffsets[this.currentFrameIndex];
    this.tmpCanvas
      .getContext("2d")
      .putImageData(
        this.frames[this.currentFrameIndex].data,
        offset.x,
        offset.y
      );
    this.canvasContext.globalCompositeOperation = "copy";
    this.canvasContext.drawImage(this.tmpCanvas, 0, 0);
  };
  SuperGif.prototype.playerInit = function () {
    if (this.loadErrorCause) return;
    this.canvasContext.scale(this.getCanvasScale(), this.getCanvasScale());
    if (this.options.autoPlay) {
      this.step();
    } else {
      this.currentFrameIndex = 0;
      this.putFrame();
    }
  };
  SuperGif.prototype.clear = function () {
    this.transparency = null;
    this.delay = null;
    this.lastDisposalMethod = this.disposalMethod;
    this.disposalMethod = null;
    this.frame = null;
  };
  // XXX: There's probably a better way to handle catching exceptions when
  // callbacks are involved.
  SuperGif.prototype.parseStream = function (stream) {
    try {
      var parser = new parser_1.SuperGifParser(stream, this.handler);
      parser.parse();
    } catch (err) {
      this.handleError("parse");
    }
  };
  SuperGif.prototype.setSizes = function (width, height) {
    this.canvas.width = width * this.getCanvasScale();
    this.canvas.height = height * this.getCanvasScale();
    this.tmpCanvas.width = width;
    this.tmpCanvas.height = height;
    this.tmpCanvas.style.width = width + "px";
    this.tmpCanvas.style.height = height + "px";
    this.tmpCanvas.getContext("2d").setTransform(1, 0, 0, 1, 0, 0);
  };
  SuperGif.prototype.drawError = function () {
    this.canvasContext.fillStyle = "black";
    this.canvasContext.fillRect(0, 0, this.hdr.width, this.hdr.height);
    this.canvasContext.strokeStyle = "red";
    this.canvasContext.lineWidth = 3;
    this.canvasContext.moveTo(0, 0);
    this.canvasContext.lineTo(this.hdr.width, this.hdr.height);
    this.canvasContext.moveTo(0, this.hdr.height);
    this.canvasContext.lineTo(this.hdr.width, 0);
    this.canvasContext.stroke();
  };
  SuperGif.prototype.handleError = function (originOfError) {
    this.loadErrorCause = originOfError;
    this.hdr = {
      width: this.gifImgElement.width,
      height: this.gifImgElement.height,
    }; // Fake header.
    this.frames = [];
    this.drawError();
  };
  SuperGif.prototype.doHdr = function (_hdr) {
    this.hdr = _hdr;
    this.setSizes(this.hdr.width, this.hdr.height);
  };
  SuperGif.prototype.doGCE = function (gce) {
    this.pushFrame();
    this.clear();
    this.transparency = gce.transparencyGiven ? gce.transparencyIndex : null;
    this.delay = gce.delayTime;
    this.disposalMethod = gce.disposalMethod;
    // We don't have much to do with the rest of GCE.
  };
  SuperGif.prototype.pushFrame = function () {
    if (!this.frame) {
      return;
    }
    this.frames.push({
      data: this.frame.getImageData(0, 0, this.hdr.width, this.hdr.height),
      delay: this.delay,
    });
    this.frameOffsets.push({ x: 0, y: 0 });
  };
  SuperGif.prototype.doImg = function (img) {
    var _this = this;
    if (!this.frame) {
      this.frame = this.tmpCanvas.getContext("2d");
    }
    var currIndex = this.frames.length;
    //ct = color table, gct = global color table
    var ct = img.lctFlag ? img.lct : this.hdr.gct; // TODO: What if neither exists?
    if (currIndex > 0) {
      if (this.lastDisposalMethod === 3) {
        // Restore to previous
        // If we disposed every frame including first frame up to this point, then we have
        // no composited frame to restore to. In this case, restore to background instead.
        if (this.disposalRestoreFromIdx !== null) {
          this.frame.putImageData(
            frames[this.disposalRestoreFromIdx].data,
            0,
            0
          );
        } else {
          this.frame.clearRect(
            this.lastImg.leftPos,
            this.lastImg.topPos,
            this.lastImg.width,
            this.lastImg.height
          );
        }
      } else {
        this.disposalRestoreFromIdx = currIndex - 1;
      }
      if (this.lastDisposalMethod === 2) {
        // Restore to background color
        // Browser implementations historically restore to transparent; we do the same.
        // http://www.wizards-toolkit.org/discourse-server/viewtopic.php?f=1&t=21172#p86079
        this.frame.clearRect(
          this.lastImg.leftPos,
          this.lastImg.topPos,
          this.lastImg.width,
          this.lastImg.height
        );
      }
    }
    // else, Undefined/Do not dispose.
    // frame contains final pixel data from the last frame; do nothing
    //Get existing pixels for img region after applying disposal method
    var imgData = this.frame.getImageData(
      img.leftPos,
      img.topPos,
      img.width,
      img.height
    );
    //apply color table colors
    img.pixels.forEach(function (pixel, i) {
      // imgData.data === [R,G,B,A,R,G,B,A,...]
      if (pixel !== _this.transparency) {
        imgData.data[i * 4 + 0] = ct[pixel][0];
        imgData.data[i * 4 + 1] = ct[pixel][1];
        imgData.data[i * 4 + 2] = ct[pixel][2];
        imgData.data[i * 4 + 3] = 255; // Opaque.
      }
    });
    this.frame.putImageData(imgData, img.leftPos, img.topPos);
    if (!this.ctxScaled) {
      this.canvasContext.scale(this.getCanvasScale(), this.getCanvasScale());
      this.ctxScaled = true;
    }
    // We could use the on-page canvas directly, except that we draw a progress
    // bar for each image chunk (not just the final image).
    if (this.drawWhileLoading) {
      this.canvasContext.drawImage(this.tmpCanvas, 0, 0);
      this.drawWhileLoading = this.options.autoPlay;
    }
    this.lastImg = img;
  };
  SuperGif.prototype.doNothing = function () {};
  SuperGif.prototype.withProgress = function (fn) {
    return function (block) {
      fn(block);
    };
  };
  /**
   * Gets the index of the frame "up next".
   * @returns {number}
   */
  SuperGif.prototype.getNextFrameNo = function () {
    var delta = this.forward ? 1 : -1;
    return (
      (this.currentFrameIndex + delta + this.frames.length) % this.frames.length
    );
  };
  SuperGif.prototype.stepFrame = function (amount) {
    this.currentFrameIndex = this.currentFrameIndex + amount;
    this.putFrame();
  };
  SuperGif.prototype.getCanvasScale = function () {
    var scale;
    if (
      this.options.maxWidth &&
      this.hdr &&
      this.hdr.width > this.options.maxWidth
    ) {
      scale = this.options.maxWidth / this.hdr.width;
    } else {
      scale = window.devicePixelRatio || 1;
    }
    return scale;
  };
  SuperGif.prototype.play = function () {
    this.playing = true;
    this.step();
  };
  SuperGif.prototype.pause = function () {
    this.playing = false;
  };
  SuperGif.prototype.isPlaying = function () {
    return this.playing;
  };
  SuperGif.prototype.getCanvas = function () {
    return this.canvas;
  };
  SuperGif.prototype.isLoading = function () {
    return this.loading;
  };
  SuperGif.prototype.isReady = function () {
    return this.ready;
  };
  SuperGif.prototype.isAutoPlay = function () {
    return this.options.autoPlay;
  };
  SuperGif.prototype.getLength = function () {
    return this.frames.length;
  };
  SuperGif.prototype.getCurrentFrame = function () {
    return this.currentFrameIndex;
  };
  SuperGif.prototype.moveTo = function (idx) {
    this.currentFrameIndex = idx;
    this.putFrame();
  };
  SuperGif.prototype.loadURL = function (src, callback) {
    var _this = this;
    if (!this.loadSetup(callback)) {
      return;
    }
    var request = new XMLHttpRequest();
    // New browsers (XMLHttpRequest2-compliant)

    request.withCredentials = false;

    request.open("GET", src, true);
    if ("overrideMimeType" in request) {
      request.overrideMimeType("text/plain; charset=x-user-defined");
    } else if ("responseType" in request) {
      // old browsers (XMLHttpRequest-compliant)
      // @ts-ignore
      request.responseType = "arraybuffer";
    } else {
      // IE9 (Microsoft.XMLHTTP-compliant)
      // @ts-ignore
      request.setRequestHeader("Accept-Charset", "x-user-defined");
    }
    request.onloadstart = function () {
      // Wait until connection is opened to replace the gif element with a canvas to avoid a blank img
      if (!_this.initialized) {
        _this.init();
      }
    };
    request.onload = function () {
      if (request.status !== 200) {
        _this.handleError("xhr - response");
        return;
      }
      var data = request.response;
      if (data.toString().indexOf("ArrayBuffer") > 0) {
        data = new Uint8Array(data);
      }
      var stream = new stream_1.SuperGifStream(data);
      setTimeout(function () {
        _this.parseStream(stream);
      }, 0);
    };
    request.onerror = function () {
      _this.handleError("xhr");
    };
    request.send();
  };
  SuperGif.prototype.load = function (callback) {
    this.loadURL(this.gifImgElement.src, callback);
  };
  return SuperGif;
})();
exports.SuperGif = SuperGif;
