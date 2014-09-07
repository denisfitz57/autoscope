var join = require('path').join;
var THREE = require("three");

function video(name, deps) {
    var path = '/plugin/' + name + '/js/nodecopter-client.js';
    // serve nodecopter-client from node_modules:

    deps.app.get(path, function (req, res) {
        res.sendfile(join(
            'node_modules', 'dronestream', 'dist', 'nodecopter-client.js'
        ));
    });

    var tcpVid = deps.client.getVideoStream();

    require("dronestream").listen(3001, {tcpVideoStream: tcpVid });
}

module.exports = video;