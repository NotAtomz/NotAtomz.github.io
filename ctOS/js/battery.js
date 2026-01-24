
navigator.getBattery().then(function(battery) {
    battery.addEventListener('levelchange', function(){
        // $('.charge').html(battery.level * 100 + "%");
    });
});
