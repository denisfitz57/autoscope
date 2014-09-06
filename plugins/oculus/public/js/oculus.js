(function (window, $, undefined) {
    'use strict';
    var canvas = document.getElementsByTagName("canvas")[0];
    var ctx = canvas.getContext("2d");

    vr.load(function(error) {
        if (error) {
            window.alert('VR error:\n' + error.toString());
        }

        var state = new vr.State();
        console.log(state);
        function tick() {
            vr.requestAnimationFrame(tick);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'black';
            ctx.font = '12px monospace';
            var w = 8;
            var i0 = w * 0, i1 = w * 1, i2 = w * 2, i3 = w * 3;
            var h = 12;
            var y = 0;

            if (!vr.pollState(state)) {
                y += h; ctx.fillText('NPVR plugin not found/error polling', 0, y);
                return;
            }

            if (state.hmd.present) {
                y += h; ctx.fillText('oculus rift detected', 0, y);
                var hmdInfo = vr.getHmdInfo();
                if (hmdInfo) {
                    y += h; ctx.fillText('name: ' +
                                         hmdInfo.toString(), i1, y);
                    y += h; ctx.fillText('desktop position (px): ' +
                                         hmdInfo.desktopX + ',' + hmdInfo.desktopY, i1, y);
                    y += h; ctx.fillText('resolution (px): ' +
                                         hmdInfo.resolutionHorz + 'x' + hmdInfo.resolutionVert, i1, y);
                    y += h; ctx.fillText('screen size (m): ' +
                                         hmdInfo.screenSizeHorz + 'x' + hmdInfo.screenSizeVert, i1, y);
                    y += h; ctx.fillText('screen center (m): ' +
                                         hmdInfo.screenCenterVert, i1, y);
                    y += h; ctx.fillText('eye-to-screen (m): ' +
                                         hmdInfo.eyeToScreenDistance, i1, y);
                    y += h; ctx.fillText('lens separation (m): ' +
                                         hmdInfo.lensSeparationDistance, i1, y);
                    y += h; ctx.fillText('IPD (m): ' +
                                         hmdInfo.interpupillaryDistance, i1, y);
                    y += h; ctx.fillText('distortion k: ' +
                                         hmdInfo.distortionK[0] + ',' +
                                         hmdInfo.distortionK[1] + ',' +
                                         hmdInfo.distortionK[2] + ',' +
                                         hmdInfo.distortionK[3] + ',', i1, y);
                    y += h; ctx.fillText('chromaAbCorrection[0]: ' +
                                         hmdInfo.chromaAbCorrection[0], i1, y);
                    y += h; ctx.fillText('chromaAbCorrection[1]: ' +
                                         hmdInfo.chromaAbCorrection[1], i1, y);
                    y += h; ctx.fillText('chromaAbCorrection[2]: ' +
                                         hmdInfo.chromaAbCorrection[2], i1, y);
                    y += h; ctx.fillText('chromaAbCorrection[3]: ' +
                                         hmdInfo.chromaAbCorrection[3], i1, y);
                }
                y += h; ctx.fillText('rotation:', i1, y);
                y += h; ctx.fillText(state.hmd.rotation[0], i2, y);
                y += h; ctx.fillText(state.hmd.rotation[1], i2, y);
                y += h; ctx.fillText(state.hmd.rotation[2], i2, y);
                y += h; ctx.fillText(state.hmd.rotation[3], i2, y);
            } else {
                y += h; ctx.fillText('oculus rift not detected', 0, y);
            }
        };
        vr.requestAnimationFrame(tick);
    });
});