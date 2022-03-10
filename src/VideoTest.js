import React, { useRef, useEffect, useState } from 'react';
// import RecordRTC ,{  WebAssemblyRecorder } from './RecordRTC';
import WebAssemblyRecorder from './Test';

const VideoTest = () => {

    const recorder = useRef();
    const liveFeed = useRef();
    const video = useRef();

    const [res, setResult] = useState();

    const handleStart = event => {
        console.log(event.target);
        event.target.disabled = true

        recorder.current.record();

        setTimeout(() => {
            recorder.current.stop(function(blob) {
                console.log(blob);
                console.log(URL.createObjectURL(blob));
                const mp4Blob = new Blob([blob], {
                    type: 'video/mp4',
                });
                setResult(URL.createObjectURL(mp4Blob));

            });
        }, 5000)
        
    }

    const handleStop = () => {}

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({
            video: {
                width: {
                    ideal: 640
                },
                height: {
                    ideal: 480
                }
            },
            audio: true
        }).then(function(stream) {
            console.log(stream);
            liveFeed.current.hidden = false;
            liveFeed.current.srcObject = stream;
            // document.getElementById('video').srcObject = stream;
    
            recorder.current = new WebAssemblyRecorder(stream);
            //  RecordRTC(stream, {
            //     recorderType: WebAssemblyRecorder,
            //     // workerPath: 'https://unpkg.com/webm-wasm@latest/dist/webm-worker.js',
            //     // webAssemblyPath: 'https://unpkg.com/webm-wasm@latest/dist/webm-wasm.wasm',
            //     width: 640,
            //     height: 480,
            //     frameRate: 30,
            //     type: 'video'
            // });
            
    
            // document.getElementById('stop').disabled = false;
        });
    }, []);

    return (
        <div>
            {
                res ? 
                <video
                    style={{
                        width: '-webkit-fill-available'
                    }}
                    controls 
                    src={res} 
                /> :
                <>
                    <div>VideoTest 
                    <button onClick={handleStart}>Start</button> 
                    <button disabled onClick={handleStart}>Stop</button>
                    </div>
                    <br />
                    <br />
                    <video 
                        style={{
                            width: '-webkit-fill-available'
                        }}
                        ref={liveFeed} 
                        hidden 
                        autoPlay 
                        muted 
                    />
                </>
            }
            
        </div>
    )
}

export default VideoTest;
