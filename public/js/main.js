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

        var midnightCommanderStyle = 
        [{"featureType":"water","stylers":[{"color":"#021019"}]},{"featureType":"landscape","stylers":[{"color":"#08304b"}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#0c4152"},{"lightness":5}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#000000"}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#0b434f"},{"lightness":25}]},{"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"color":"#000000"}]},{"featureType":"road.arterial","elementType":"geometry.stroke","stylers":[{"color":"#0b3d51"},{"lightness":16}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#000000"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#ffffff"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#000000"},{"lightness":13}]},{"featureType":"transit","stylers":[{"color":"#146474"}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#000000"}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#144b53"},{"lightness":14},{"weight":1.4}]}]

        var mapOptions = {
            center: new google.maps.LatLng(lat, lng),
            zoom: 18,
            disableDefaultUI: true,
            styles: midnightCommanderStyle
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