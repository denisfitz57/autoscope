function IDE(rootElement) {
    this.rootElement = rootElement;
    var rootBounds = rootElement.getBoundingClientRect();

    var canvas = document.createElement("canvas");
    canvas.width = rootBounds.width;
    canvas.height = rootBounds.height;
    this.canvas = canvas;

    var texture = new THREE.Texture(canvas);
    this.texture = texture;

    var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1, 1, 1),
        new THREE.MeshBasicMaterial({map: this.texture})
    ); 
    this.mesh = mesh;

    this.updateCanvas = function() {
        var ctx = canvas.getContext("2d");
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "red";
        ctx.rect(0,0,canvas.width,canvas.height);
        ctx.fill();

        function render(element) {
            var bounds = element.getBoundingClientRect();
            var style = document.defaultView.getComputedStyle(element);

            ctx.fillStyle = style["background-color"];
            ctx.fillRect(bounds.left-rootBounds.left, bounds.top-rootBounds.top, bounds.width, bounds.height);
            if (element.children.length == 0) {
                ctx.font = style.font; 
                ctx.fillStyle = style.color;
                var text = element.innerText;
                var left = bounds.left - rootBounds.left + parseInt(style.paddingLeft);

                if (element.tagName == "INPUT") {
                    text = element.value;
                    ctx.strokeStyle = style.color;
                    var leftSelect = ctx.measureText(text.substr(0, element.selectionStart)).width;
                    var rightSelect = ctx.measureText(text.substr(0, element.selectionEnd)).width;
                    ctx.strokeRect(left+leftSelect, bounds.top-rootBounds.top, rightSelect+1-leftSelect, bounds.height);
                }
                ctx.fillText(text, left, bounds.bottom-rootBounds.top);
            } else {
                for(var i=0; i<element.children.length; ++i) {
                    render(element.children[i]);
                }
            }
        }
        rootBounds = rootElement.getBoundingClientRect();
        render(rootElement);

        texture.needsUpdate = true;
    }

    this.updateCanvas();
}

//------------------ WebGL renderer for use with THREE.js and the Occulus Rift -------------------\\

// Hardware configuration for the Oculus Rift Kickstarter dev kit. This is from the SDK docs.
// TF2 IPD = 67.5mm, 504px
var HMDInfo_DevKit1 = {
    HScreenSize: .14976,
    VScreenSize: .0935,
    VScreenCenter: .0935 / 2,
    EyeToScreenDistance: .051,
    LensSeperationDistance: .067,
    InterpupillaryDistance: .0675,
    HResolution: 1280,
    VResolution: 800,
    Distortion: [1, .22, .24, 0]
};

var Nexus4 = {
    HScreenSize: .14976,
    VScreenSize: .0935,
    VScreenCenter: .0935 / 2,
    EyeToScreenDistance: .051,
    LensSeperationDistance: .067,
    InterpupillaryDistance: .0675,
    HResolution: 1280,
    VResolution: 768,
    Distortion: [1, .22, .24, 0]
};

var HMDInfo_DevKit2 = {
    HScreenSize: .14976,
    VScreenSize: .0935,
    VScreenCenter: .0935 / 2,
    EyeToScreenDistance: .051,
    LensSeperationDistance: .067,
    InterpupillaryDistance: .0675,
    HResolution: 1920,
    VResolution: 1080,
    Distortion: [1, .22, .24, 0]
};

function RiftCamera (hmd, pixelScale, flipEyes) {
    this.info = hmd;

    //render modes
    this.MODE_MONO = "MODE_MONO";
    this.MODE_RIFT = "MODE_RIFT";
    this.currentRenderMode = this.MODE_RIFT;
    this.changeRenderMode = function (newMode) {
        if (typeof newMode == "undefined") {
            newMode = 
                this.currentRenderMode == this.MODE_MONO ? this.MODE_RIFT : this.MODE_MONO;
        }
        this.currentRenderMode = newMode;
        this.createDistortionMesh(this.currentRenderMode == this.MODE_RIFT);
        return  this.currentRenderMode;
    }

    THREE.Camera.call(this);
    // define shaders
    var VERTEX_SHADER = [ 
        "varying vec2 vUv;",
        "attribute vec2 aberration;",
        "varying vec2 vAberration;",
        "",
        "void main(void){",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "  vUv=uv;",
        "  vAberration=aberration;",
        "}"
    ];

    var FRAGMENT_SHADER_CHROMATIC_ABERRATION = [
        "varying vec2 vUv;",
        "varying vec2 vAberration;",
        "uniform sampler2D tex;",
        "",
        "void main() {",
        "  gl_FragColor.r = texture2D(tex, vUv+vAberration).r;",
        "  gl_FragColor.g = texture2D(tex, vUv).g;",
        "  gl_FragColor.b = texture2D(tex, vUv-vAberration).b;",
        "  gl_FragColor.a = 1.0;",
        "}"
    ];

    function formatShader() {
        var shaderString = "";
        for (var i=0; i<arguments.length; ++i) {
            array = arguments[i];
            shaderString += array.join("\n");
        }
        return shaderString;
    }

    FRAGMENT_SHADER_CHROMATIC_ABERRATION = formatShader(FRAGMENT_SHADER_CHROMATIC_ABERRATION);

    // define hardcoded values
    var DISPLAY_WIDTH = hmd.HResolution / 2;
    var DISPLAY_HEIGHT = hmd.VResolution;
    var SCENE_FOV = 2 * (180 * Math.atan(.5 * hmd.VScreenSize / hmd.EyeToScreenDistance) / Math.PI);

    // initialize the "display" which is the pair of quads that show the rendered scene
    var displayCamera = new THREE.OrthographicCamera(
        -DISPLAY_WIDTH, DISPLAY_WIDTH, DISPLAY_HEIGHT / 2, -DISPLAY_HEIGHT / 2, -10000, 10000);
    displayCamera.position.z = 100;

    // these are the render targets for each eye
    var leftTex = new THREE.WebGLRenderTarget(pixelScale * DISPLAY_WIDTH, pixelScale * DISPLAY_HEIGHT,
                                              {minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat});
    var rightTex = new THREE.WebGLRenderTarget(pixelScale * DISPLAY_WIDTH, pixelScale * DISPLAY_HEIGHT,
                                               {minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat});

    // Warp configuration
    var lensCenterOffset =
        4 * (.25 * hmd.HScreenSize - .5 * hmd.LensSeperationDistance) / hmd.HScreenSize;
    var leftLensCenter = new THREE.Vector2(lensCenterOffset, 0);
    var rightLensCenter = new THREE.Vector2(-lensCenterOffset, 0);
    var screenCenter = new THREE.Vector2(.5, .5);
    var scale = 2;
    var scale2 = 1/1.6;
    var ar = DISPLAY_WIDTH / DISPLAY_HEIGHT;
    var scaleIn = new THREE.Vector2(scale, scale);
    var scale = new THREE.Vector2(scale2 / scale, scale2 / scale);
    var hmdWarpParam = new THREE.Vector4(
        hmd.Distortion[0], hmd.Distortion[1], hmd.Distortion[2], hmd.Distortion[3]);
    var resolution = new THREE.Vector2(DISPLAY_WIDTH, DISPLAY_HEIGHT);

    // Create the quads for each eye
    var MESH_ELEMENTS = 30
    var aberration = [];
    var leftQuad = new THREE.Mesh(
        new THREE.PlaneGeometry(DISPLAY_WIDTH, DISPLAY_HEIGHT, MESH_ELEMENTS, MESH_ELEMENTS),
        generateShader(leftTex, FRAGMENT_SHADER_CHROMATIC_ABERRATION, aberration));
    var rightQuad = new THREE.Mesh(
        new THREE.PlaneGeometry(DISPLAY_WIDTH, DISPLAY_HEIGHT, MESH_ELEMENTS, MESH_ELEMENTS),
        generateShader(rightTex, FRAGMENT_SHADER_CHROMATIC_ABERRATION, aberration));

    if (!flipEyes) {
        leftQuad.position.x = -DISPLAY_WIDTH / 2;
        rightQuad.position.x =  DISPLAY_WIDTH / 2;
    } else {
        leftQuad.position.x =  DISPLAY_WIDTH / 2;
        rightQuad.position.x = -DISPLAY_WIDTH / 2;
    }

    var referencePlane = new THREE.PlaneGeometry(DISPLAY_WIDTH, DISPLAY_HEIGHT, MESH_ELEMENTS, MESH_ELEMENTS);
    this.distortMesh = function(centerX, centerY, a, b, c, abr) {
        for (var j=0; j<=MESH_ELEMENTS; ++j) {
            for (var i=0; i<=MESH_ELEMENTS; ++i) {
                var vertexU = referencePlane.vertices[j*(MESH_ELEMENTS+1)+i]; // undistorted vertex
                var vertexL = leftQuad.geometry.vertices[j*(MESH_ELEMENTS+1)+i];
                var vertexR = rightQuad.geometry.vertices[j*(MESH_ELEMENTS+1)+i];
                var center = {x:centerX, y:centerY};
                var norm = {x: vertexU.x/(.5*DISPLAY_WIDTH), y: vertexU.y/(.5*DISPLAY_HEIGHT)};
                var distance = (norm.x - center.x) * (norm.x - center.x) + (norm.y - center.y) * (norm.y - center.y);
                var norm2 = {x:0, y:0};
                norm2.x = norm.x / (a + b * distance + c * distance * distance);
                norm2.y = norm.y / (a + b * distance + c * distance * distance);
                vertexL.x = norm2.x * (.5 * DISPLAY_WIDTH);
                vertexL.y = norm2.y * (.5 * DISPLAY_HEIGHT);
                vertexR.x = norm2.x * (.5 * DISPLAY_WIDTH);
                vertexR.y = norm2.y * (.5 * DISPLAY_HEIGHT);
                var ab = aberration[j*(MESH_ELEMENTS+1)+i];
                ab.x = norm2.x* abr;
                ab.y = norm2.y* abr;
            }
        }
        leftQuad.geometry.verticesNeedUpdate = true;
        rightQuad.geometry.verticesNeedUpdate = true;
        leftQuad.material.attributes.aberration.needsUpdate = true;
        rightQuad.material.attributes.aberration.needsUpdate = true;
    }
    this.createDistortionMesh = function(distort) {
        if (distort) {
            this.distortMesh(0,0,1,.05,.04,-.006);
        } else {
            this.distortMesh(0,0,1,0,0,0);
        }
    }
    for (var i=0; i<leftQuad.geometry.vertices.length; ++i) {
        aberration.push(new THREE.Vector2(0,0));
    }
    this.createDistortionMesh(true);

    // Setup the shader
    function generateShader(texture, fragmentShader, aberration) {
        //return gridTexture = new THREE.MeshBasicMaterial({color: 0xffffff, wireframe: true});
        return new THREE.ShaderMaterial({
            attributes: {
                aberration: {type: "v2", value: aberration}
            },
            uniforms: {
                tex: {type: "t", value: texture},
                resolution: {type: "v2", value: resolution},
            },
            vertexShader: formatShader(VERTEX_SHADER),
            fragmentShader: fragmentShader});
    }

    var display = new THREE.Scene();
    display.add(leftQuad);
    display.add(rightQuad);
    this.display = display;

    // setup the cameras used to render the actual scene
    var ipdOffsetMeters = hmd.HScreenSize / 4 - hmd.InterpupillaryDistance / 2;
    var leftCamera = new THREE.PerspectiveCamera(SCENE_FOV, DISPLAY_WIDTH / DISPLAY_HEIGHT);
    leftCamera.projectionMatrix.elements[3] = ipdOffsetMeters;
    leftCamera.position.x = -hmd.InterpupillaryDistance / 2;
    var rightCamera = new THREE.PerspectiveCamera(SCENE_FOV, DISPLAY_WIDTH / DISPLAY_HEIGHT);
    rightCamera.projectionMatrix.elements[3] = -ipdOffsetMeters;
    rightCamera.position.x = hmd.InterpupillaryDistance / 2;
    this.head = new THREE.Object3D();
    this.head.add(leftCamera);
    this.head.add(rightCamera);
    this.add(this.head);

    this.setRendererSize = function(renderer) {
        renderer.setSize(DISPLAY_WIDTH * 2 / window.devicePixelRatio, DISPLAY_HEIGHT / window.devicePixelRatio);
    }

    this.render = function(renderer, scene, prerender) {
        // render the scene with each camera and then render the final display
        if (!!this.vrPosDev) {
            var state = this.vrPosDev.getState();
            var qrot = new THREE.Quaternion();
            qrot.set(state.orientation.x, state.orientation.y, state.orientation.z, state.orientation.w);
            this.head.setRotationFromQuaternion(qrot);
        } else if (this.gyroOrientation != undefined) {
            var euler = new THREE.Euler();
            euler.set(
                THREE.Math.degToRad(this.gyroOrientation.beta),
                THREE.Math.degToRad(this.gyroOrientation.alpha),
                THREE.Math.degToRad(-this.gyroOrientation.gamma),
                'YXZ');
            var qrot = new THREE.Quaternion();
            qrot.setFromEuler(euler);
            qrot.multiply(new THREE.Quaternion(-.71,0,0,.71));
            var screenQuat = new THREE.Quaternion();
            screenQuat.setFromAxisAngle(new THREE.Vector3(0,0,1), -THREE.Math.degToRad(window.orientation));
            qrot.multiply(screenQuat);
            this.head.setRotationFromQuaternion(qrot);
        } 
        this.updateMatrixWorld();
        if (prerender !== undefined) {prerender('left');}
        renderer.render(scene, leftCamera, leftTex, true);
        if (this.currentRenderMode == this.MODE_RIFT) {
            if (prerender !== undefined) {prerender('right');}
            renderer.render(scene, rightCamera, rightTex, true);
        }
        renderer.render(display, displayCamera);
    }

    this.setupMouseLook =function(element) {
        var hmd = this;
        element.addEventListener('mousemove',
                                 function(event) {
            if (event.buttons !== undefined && event.buttons != 1) {return false;} // Firefox
            if (event.which != 1) {return false;} // Chrome check
            hmd.rotation.y = -(event.pageX - renderer.domElement.width  / 2) *
                (Math.PI / renderer.domElement.width);
            hmd.rotation.x = -(event.pageY - renderer.domElement.height / 2) *
                (Math.PI / renderer.domElement.height);
        }, false);
    }

    this.setupHardware = function() {
        var hmd = this;
        function configureDevices(devices) {
            hmd.vrDevices = devices;
            console.log("Found " + devices.length + " VR devices");
            for (var i=0; i<devices.length; ++i) {
                if (devices[i] instanceof HMDVRDevice) {
                    hmd.vrHMD = devices[i];
                    break;
                }
            }
            if (!hmd.vrHMD) {
                console.log("No VR devices instanceof HMDVRDevice");
                return;
            }

            for (var i=0; i<devices.length; ++i) {
                if (devices[i] instanceof PositionSensorVRDevice &&
                    devices[i].hardwareUnitId == hmd.vrHMD.hardwareUnitId) {
                    hmd.vrPosDev = devices[i];
                    break;
                }
            }
            if (!hmd.vrPosDev) {
                console.log("No VR devices matching position sensor");
                return;
            }

            console.log("VR HMD enabled: " + hmd.vrHMD.hardwareUnitId);
        };
        if (navigator.mozGetVRDevices) {
            navigator.mozGetVRDevices(configureDevices);
        } else if (navigator.getVRDevices) {
            navigator.getVRDevices().then(configureDevices);
        } else {
            console.log("No navigator.mozGetVRDevices. VR disabled");
        }
    }

    this.setupGyroControl = function () {
        var hmd = this;
        window.ondeviceorientation = function (event) {
            if(hmd.gyroOrientation == undefined) {
                hmd.gyroOrientation = {
                    alpha: 0,
                    beta: 0,
                    gamma: 0
                }
            }

            hmd.gyroOrientation.alpha = event.alpha;
            hmd.gyroOrientation.beta = event.beta;
            hmd.gyroOrientation.gamma = event.gamma;
        }
    }

    this.setupFpsControl = function(element, moveSpeed, rotateSpeed) {
        rotateSpeed *= Math.PI / 180;

        var hmd = this;
        this.keyDownListener =  function(event) {
            switch(event.keyCode) {
                case 38: // Up
                    if (event.shiftKey) {
                        hmd.translateY( moveSpeed);
                    } else {
                        hmd.translateZ(-moveSpeed);
                    }
                    break;
                case 37: // Left
                    if (event.shiftKey) {
                        hmd.translateX(-moveSpeed);
                    } else {
                        hmd.rotation.y += rotateSpeed;
                    }
                    break;
                case 40: // Down
                    if (event.shiftKey) {
                        hmd.translateY(-moveSpeed);
                    } else {
                        hmd.translateZ( moveSpeed);
                    }
                    break;
                case 39: // Right
                    if (event.shiftKey) {
                        hmd.translateX( moveSpeed);
                    } else {
                        hmd.rotation.y -= rotateSpeed;
                    }
                    break;
            }
        }
        element.addEventListener('keydown', this.keyDownListener, false);
    }

    this.lastGamepadTick = 0;
    this.pad = null;
    this.updateGamepad = function(moveSpeed, rotateSpeed) {
        var hmd = this;
        if (hmd.lastGamepadTick == 0) {
            hmd.lastGamepadTick = Date.now();
            return;
        }
        var now = Date.now();
        var delta = (now - hmd.lastGamepadTick) / 1000;
        hmd.lastGamepadTick = now;

        rotateSpeed *= Math.PI / 180;

        if (this.pad == null && navigator.getGamepads != undefined) {
            var pads = navigator.getGamepads();
            if (pads.length == 0) {
                return;
            }
            for (var i=0; i<pads.length; ++i) {
                if (pads[i] != null) {
                    if (pads[i].axes.length > 4) {
                        console.warn("Skipping gamepad due to too many axes: " + pads[0].id);
                        continue;
                    }
                    this.pad = pads[i];
                    if (pads.length > 1) {
                        console.log(pads.length + " gamepads detected.");
                    }
                    console.log("Gamepad enabled: " + pads[i].id);
                    break;
                }
            }
        }
        if (this.pad == null) {return;}

        navigator.getGamepads(); // refresh data
        pad = this.pad;
        pad.leftStickX = pad.axes[0];
        pad.leftStickY = pad.axes[1];
        pad.rightStickX = pad.axes[2];
        pad.rightStickY = pad.axes[3];
        pad.leftShoulder1 = pad.buttons[6].value;
        pad.rightShoulder1 = pad.buttons[7].value;
        pad.deadZoneLeftStick = .2;
        pad.deadZoneRightStick = .2;
        // Left stick to slide around
        if (Math.abs(pad.leftStickX) > pad.deadZoneLeftStick) {
            hmd.translateX(moveSpeed * pad.leftStickX * delta);
        }
        if (Math.abs(pad.leftStickY) > pad.deadZoneLeftStick) {
            hmd.translateZ(moveSpeed * pad.leftStickY * delta);
        }
        // Right stick to drive around
        if (Math.abs(pad.rightStickX) > pad.deadZoneRightStick) {
            hmd.rotation.y -= rotateSpeed * pad.rightStickX * delta;
        }
        if (Math.abs(pad.rightStickY) > pad.deadZoneRightStick) {
            hmd.translateZ(moveSpeed * pad.rightStickY * delta);
        }
        // Shoulder buttons to turn
        if (Math.abs(pad.leftShoulder1)) {
            hmd.translateY(-moveSpeed * pad.leftShoulder1* delta);
        }
        if (Math.abs(pad.rightShoulder1)) {
            hmd.translateY(moveSpeed * pad.rightShoulder1* delta);
        }
    }
}

RiftCamera.prototype = new THREE.Camera();

function bindConsole(divName) {
    var con = document.getElementById(divName);
    console.element = con;
    con.stdout = document.createElement("div");
    con.stdout.id = "stdout";
    con.appendChild(con.stdout);

    console.oldLog = console.log;
    console.log = function log(msg) {
        console.oldLog(msg);
        var now = new Date();
        var nowStr = now.getHours() + ":" +
            now.getMinutes() + ":" + 
            now.getSeconds() + "." +
            now.getMilliseconds();

        var newLine = document.createElement("div");

        var timestamp = document.createElement("span");
        timestamp.innerHTML = nowStr;
        timestamp.className = "timestamp";
        newLine.appendChild(timestamp);

        var msgSpan = document.createElement("span");
        msgSpan.innerHTML = msg;
        msgSpan.className = "msg";
        newLine.appendChild(msgSpan);

        con.stdout.appendChild(newLine);
    }
    console.log("Console Bound");
}

function VideoPlayer(videoElement) {
    videoplayer = this;
    this.video = videoElement;
    this.vrRendering = false;

    var texture = new THREE.Texture();
    this.texture = texture;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.image = this.video;

    this.mesh = new THREE.Mesh(
        new THREE.PlaneGeometry( 1, 1, 1, 1 ),
        new THREE.MeshBasicMaterial( { map: this.texture, overdraw: 0.5 } ));
    var faceUvsMono = [
        [ new THREE.Vector2(0,1),
         new THREE.Vector2(0,0),
         new THREE.Vector2(1,1)],
        [ new THREE.Vector2(0,0),
         new THREE.Vector2(1,0),
         new THREE.Vector2(1,1)]];
    var faceUvsLeft = [
        [ new THREE.Vector2(0  ,1),
         new THREE.Vector2(0  ,0),
         new THREE.Vector2( .5,1)],
        [ new THREE.Vector2(0  ,0),
         new THREE.Vector2( .5,0),
         new THREE.Vector2( .5,1)]];
    var faceUvsRight = [
        [ new THREE.Vector2( .5,1),
         new THREE.Vector2( .5,0),
         new THREE.Vector2(1  ,1)],
        [ new THREE.Vector2( .5,0),
         new THREE.Vector2(1  ,0),
         new THREE.Vector2(1  ,1)]];

    this.setScale = function(scale) {
        videoplayer.scale = scale;
        videoplayer.mesh.scale.x = scale;
        videoplayer.mesh.scale.y = scale;
    }
    videoplayer.aspectRatio = 0;

    this.render = function(mode) {
        if ( videoplayer.video.readyState === videoplayer.video.HAVE_ENOUGH_DATA ) {
            if (videoplayer.aspectRatio == 0 ) {
                videoplayer.aspectRatio = videoplayer.video.videoWidth / videoplayer.video.videoHeight;
            }
            videoplayer.mesh.scale.x = videoplayer.scale * videoplayer.aspectRatio;
            videoplayer.mesh.scale.y = videoplayer.scale;
            if (videoplayer.vrRendering) {
                if (mode == "left") {
                    texture.needsUpdate = true;
                    if (videoplayer.mesh.geometry.faceVertexUvs[0] != faceUvsLeft) {
                        videoplayer.mesh.geometry.faceVertexUvs[0] = faceUvsLeft;
                        videoplayer.mesh.geometry.uvsNeedUpdate = true;
                    }
                } else if (mode == "right") {
                    if (videoplayer.mesh.geometry.faceVertexUvs[0] != faceUvsRight) {
                        videoplayer.mesh.geometry.faceVertexUvs[0] = faceUvsRight;
                        videoplayer.mesh.geometry.uvsNeedUpdate = true;
                    }
                }
            } else {
                if (mode == "left") {
                    texture.needsUpdate = true;
                    if (videoplayer.mesh.geometry.faceVertexUvs[0] != faceUvsMono) {
                        videoplayer.mesh.geometry.faceVertexUvs[0] = faceUvsMono;
                        videoplayer.mesh.geometry.uvsNeedUpdate = true;
                    }
                }
            }
        }
    }

    this.togglePlayPause = function() {
        if (videoplayer.video.paused) {
            videoplayer.video.play();
        } else {
            videoplayer.video.pause();
        }
    }

    this.toggleMute = function() {
        videoplayer.video.muted = !videoplayer.video.muted;
    }

    this.toggleVrRendering = function() {
        this.vrRendering = !this.vrRendering;
    }

    this.seek = function(offset) {
        videoplayer.video.currentTime += offset;
    }

}