function WebAssemblyRecorder(stream, config) {
    // based on: github.com/GoogleChromeLabs/webm-wasm
    if (typeof ReadableStream === 'undefined' || typeof WritableStream === 'undefined') {
        // because it fixes readable/writable streams issues
        console.error('Following polyfill is strongly recommended: https://unpkg.com/@mattiasbuelens/web-streams-polyfill/dist/polyfill.min.js');
    }

    config = config || {};

    config.width = config.width || 640;
    config.height = config.height || 480;
    config.frameRate = config.frameRate || 30;
    config.bitrate = config.bitrate || 1200;
    config.realtime = config.realtime || true;

    var finished;

    function cameraStream() {
        console.log('cameraStream')
        return new ReadableStream({
            start: function(controller) {
                console.log(controller);
                var cvs = document.createElement('canvas');
                var video = document.createElement('video');
                var first = true;
                video.srcObject = stream;
                video.muted = true;
                video.height = config.height;
                video.width = config.width;
                video.volume = 0;
                video.onplaying = function() {
                    cvs.width = config.width;
                    cvs.height = config.height;
                    var ctx = cvs.getContext('2d');
                    var frameTimeout = 1000 / config.frameRate;
                    var cameraTimer = setInterval(function f() {
                        if (finished) {
                            clearInterval(cameraTimer);
                            controller.close();
                        }

                        if (first) {
                            first = false;
                            if (config.onVideoProcessStarted) {
                                config.onVideoProcessStarted();
                            }
                        }

                        ctx.drawImage(video, 0, 0);
                        if (controller._controlledReadableStream?.state !== 'closed') {
                            try {
                                controller.enqueue(
                                    ctx.getImageData(0, 0, config.width, config.height)
                                );
                            } catch (e) {}
                        }
                    }, frameTimeout);
                };
                video.play();
            }
        });
    }

    var worker;

    function startRecording(stream, buffer) {
        console.log('startRecording', stream)
        if (!config.workerPath && !buffer) {
            finished = false;

            // is it safe to use @latest ?

            fetch(
                'https://unpkg.com/webm-wasm@latest/dist/webm-worker.js'
            ).then(function(r) {
                r.arrayBuffer().then(function(buffer) {
                    startRecording(stream, buffer);
                });
            });
            return;
        }

        if (!config.workerPath && buffer instanceof ArrayBuffer) {
            var blob = new Blob([buffer], {
                type: 'text/javascript'
            });
            config.workerPath = URL.createObjectURL(blob);
        }

        if (!config.workerPath) {
            console.error('workerPath parameter is missing.');
        }

        worker = new Worker(config.workerPath);

        worker.postMessage(config.webAssemblyPath || 'https://unpkg.com/webm-wasm@latest/dist/webm-wasm.wasm');
        worker.addEventListener('message', function(event) {
            if (event.data === 'READY') {
                worker.postMessage({
                    width: config.width,
                    height: config.height,
                    bitrate: config.bitrate || 1200,
                    timebaseDen: config.frameRate || 30,
                    realtime: config.realtime
                });

                cameraStream().pipeTo(new WritableStream({
                    write: function(image) {
                        if (finished) {
                            console.error('Got image, but recorder is finished!');
                            return;
                        }

                        worker.postMessage(image.data.buffer, [image.data.buffer]);
                    }
                }));
            } else if (!!event.data) {
                arrayOfBuffers.push(event.data);
            }
        });
    }

    /**
     * This method records video.
     * @method
     * @memberof WebAssemblyRecorder
     * @example
     * recorder.record();
     */
    this.record = function() {
        arrayOfBuffers = [];
        this.blob = null;
        startRecording(stream);

        if (typeof config.initCallback === 'function') {
            config.initCallback();
        }
    };

    function terminate(callback) {
        if (!worker) {
            if (callback) {
                callback();
            }

            return;
        }

        // Wait for null event data to indicate that the encoding is complete
        worker.addEventListener('message', function(event) {
            if (event.data === null) {
                worker.terminate();
                worker = null;

                if (callback) {
                    callback();
                }
            }
        });

        worker.postMessage(null);
    }

    var arrayOfBuffers = [];

    /**
     * This method stops recording video.
     * @param {function} callback - Callback function, that is used to pass recorded blob back to the callee.
     * @method
     * @memberof WebAssemblyRecorder
     * @example
     * recorder.stop(function(blob) {
     *     video.src = URL.createObjectURL(blob);
     * });
     */
    this.stop = function(callback) {
        finished = true;

        var recorder = this;

        terminate(function() {
            recorder.blob = new Blob(arrayOfBuffers, {
                type: 'video/webm'
            });

            callback(recorder.blob);
        });
    };

    // for debugging
    this.name = 'WebAssemblyRecorder';
    this.toString = function() {
        return this.name;
    };

    /**
     * @property {Blob} blob - The recorded blob object.
     * @memberof WebAssemblyRecorder
     * @example
     * recorder.stop(function(){
     *     var blob = recorder.blob;
     * });
     */
    this.blob = null;
}

export default WebAssemblyRecorder;
