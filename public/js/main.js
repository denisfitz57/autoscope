var map;
var markArr = [];

function initialize() {

    function panToPosition(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;

        for (var marker in markArr) {
            markArr[marker].setMap(null);
        }
        markArr = [];

        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat, lng),
            title: "",
            map: map
        });

        map.panTo(marker.getPosition());
        markArr.push(marker);
        var copterStream = new NodecopterStream(document.querySelector('#dronestream'));
    }

    function onPositionUpdate(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;

        var mapOptions = {
            center: new google.maps.LatLng(lat, lng),
            zoom: 18,
            disableDefaultUI: true
        };

        map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    }

    setInterval(function(e) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(panToPosition);
        }
    }, 5000);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(onPositionUpdate);
    }
}