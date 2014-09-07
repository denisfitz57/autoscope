var Video = function Video(cockpit) {
    var $video1, $video2, $videoBuffer, dronestream, processFrame, video1, video1Ctx, video2, video2Ctx, videoBuffer, _RATIO;
    _RATIO = 0.5;
    console.log("Initializing video stream plugin.");
    var video = this;

    // Add some UI elements
    var cp = document.querySelector("#glasspane");
    
    cp.innerHTML = cp.innerHTML + '<div id="oculus-stream"><div id="oculus-left" class="oculus-eye"></div><div id="oculus-right" class="oculus-eye"></div></div>';

    // Start the stream

    dronestream = new NodecopterStream(document.getElementById("oculus-stream"),{port: 3001});
    $videoBuffer = document.querySelector('canvas#oculus-stream');
    videoBuffer = $videoBuffer[0];
    $video1 = $videoBuffer.clone().appendTo('#oculus-left').attr('id', 'oculus-stream-left');
    $video2 = $videoBuffer.clone().appendTo('#oculus-right').attr('id', 'oculus-stream-right');

    video1 = $video1[0];
    video1Ctx = video1.getContext('2d');
    video2 = $video2[0];
    video2Ctx = video2.getContext('2d');
    processFrame = function() {
        requestAnimationFrame(processFrame);
        video1.width = video1.width;
        video1Ctx.drawImage(videoBuffer, 0, 0, videoBuffer.width, videoBuffer.height);
        video2.width = video2.width;
        return video2Ctx.drawImage(videoBuffer, 0, 0, videoBuffer.width, videoBuffer.height);
    };
    $videoBuffer.remove();
    return processFrame();

};

window.Cockpit.plugins.push(Video);