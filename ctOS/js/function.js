
/* global $ navigator checkStandalone */
var isConnected = false;
var appCache = window.applicationCache;
var softwareUpdate = false;

$(document).ready(function(){
    if (checkStandalone()) {
        setTimeout(setConnectionStatus, 1000);
        initAudio();
        // postAdvert();
    }
});

function appendLog(data, subtle) {
    if (data.substr(0, 3) === '[*]') { data = '<span class="point">[*]</span>' + data.substr(3); }
    if (data.substr(0, 3) === '[-]') { data = '<span class="red">[-]</span>' + data.substr(3); }
    if (data.substr(0, 3) === '[!]') { data = '<span class="red">[!]</span>' + data.substr(3); }
    if (data.substr(0, 3) === '[+]') { data = '<span class="green">[+]</span>' + data.substr(3); }
    if (data.substr(0, 3) === '[$]') { data = '<span class="green">[$]</span>' + data.substr(3); }
    if (data.substr(0, 3) === '[#]') { data = '<span class="yellow">[#]</span>' + data.substr(3); }
    
    if (!subtle) {
        if (data !== ' ') { console.log('[ctOS] ' + data); }
        if (isConnected) {
            $('.status-logs').html($('.status-logs').html() + 'root@' + $('#ctos_ip').html() + ':/>' + data + '<br />');
        } else { 
            $('.status-logs').html($('.status-logs').html() + 'web-user@' + $('#ctos_ip').html() + ':/>' + data + '<br />');
        }
    } else {
        $('.status-logs').html($('.status-logs').html() + '<span class="grey">' + data + '</span><br />');
    }
    $("#logs").scrollTop($("#logs")[0].scrollIntoView);
}

function bootMenu() {
    console.log('[ctOS] Loading menu..');
    appendLog('exploits/ctos-xmenu.sh');
    appendLog('[*] loading menu interface.. please wait..', true);
    
    setTimeout(function() {
        $('.page').html('<div align="center" id="mid-container"><table border="0" cellspacing="10px;" class="hack-menu"><tbody><tr><td class="menu-item" onclick="ExecHack(0)"><center><img alt="Steam Pipe" class="item-icon" src="images/icons/pipe.png"></center><span class="item-text">Pipes</span></td><td class="menu-item" onclick="ExecHack(1)"><center><img alt="Blackout" class="item-icon" src="images/icons/bolt.png"></center><span class="item-text">Blackout</span></td><td class="menu-item" onclick="ExecHack(2)"><center><img alt="Communications" class="item-icon" src="images/icons/conn.png"></center><span class="item-text">Comms Jam</span></td></tr><tr><td class="menu-item" onclick="ExecHack(3)"><center><img alt="Light" class="item-icon" src="images/icons/traffic.png"></center><span class="item-text">Light</span></td><td class="menu-item" onclick="ExecHack(4)"><center><img alt="Scan" class="item-icon" src="images/icons/scan.png"></center><span class="item-text">ctOS Scan</span></td><td class="menu-item" onclick="ExecHack(5)"><center><img alt="Train" class="item-icon" src="images/icons/rail.png"></center><span class="item-text">Train</span></td></tr><tr><td class="menu-item" onclick="ExecHack(6)"><center><img alt="Road Blocker" class="item-icon" src="images/icons/road.png"></center><span class="item-text">Blocker</span></td><td class="menu-item" onclick="ExecHack(7)"><center><img alt="Cell Phone" class="item-icon" src="images/icons/cell.png"></center><span class="item-text">Cellphone</span></td><td class="menu-item" onclick="ExecHack(8)"><center><img alt="Door" class="item-icon" src="images/icons/door.png"></center><span class="item-text">Door</span></td></tr></tbody></table></div>');
    }, 2100);
    setTimeout(function() {
        appendLog('[*] menu loaded! proceeding..', true);
    }, 2200);
    setTimeout(function() {
        appendLog(' ', true);
        appendLog('[#] copyright &copy; 2016 Cole Schaefer.', true);
        appendLog('[#] all rights reserved.', true);
    }, 2400);
}

function setConnectionStatus() {
    if (softwareUpdate) { 
        appendLog('[!] terminating due to software update...', true);
        return;
    } else { 
        appendLog('[#] loading ctOS De\'dsec hacking toy...', true);
        appendLog('[#] created by Cole Schaefer (cschaefer.us)', true);
        appendLog('[*] checking network connection..', true);
        if (navigator.onLine){
            console.log('[ctOS] CONNECTED!');
            $('#conn').html('<span class="grey">LOCAL</span> <span class="white">CLOUD</span>');
            $('.conn-status').html('CONNECTED');
            $('.connector').html('web-user@' + $('#ctos_ip').html() + ':/>');
            appendLog('[+] logged into \'' + $('#ctos_ip').html() + '\' as \'web-user\'', true);
            setTimeout(gainRoot, 1400);
        } else {
            console.log('[ctOS] UNABLE TO CONNECT!');
            $('#conn').html('<span class="white">LOCAL</span> <span class="grey">CLOUD</span>');
            $('.conn-status').html('DISCONNECTED');
            appendLog('[-] unable to connect to ctOS database!', true);
            appendLog('[-] check connection and try again..', true);
        }
    }
}

function forceUpdate() {
  try { appCache.swapCache(); }
  catch (ex) { try { appCache.update(); }
  catch (ex) { } }
}

function gainRoot() {
    appendLog('exploits/ctos-root.sh');
    appendLog('[*] gaining root access to ctOS system..', true);
    setTimeout(function(){
        $('.connector').html('root@' + $('#ctos_ip').html() + ':/>');
        appendLog('[+] logged into \'' + $('#ctos_ip').html() + '\' as \'root\'', true);
        appendLog('[*] root access obtained! have fun! ~dedsec <span class="off-point">;)</span>', true);
        isConnected = true;
    }, 2540);
    setTimeout(bootMenu, 2650);
}

function handleCacheEvent(e) {
    switch (e.type){ 
        case "noupdate":
            appendLog('[*] software up to date..', true);
            softwareUpdate = false;
            break;
        case "updateready":
            update();
            break;
    }
}

appCache.addEventListener('noupdate', handleCacheEvent, false);
appCache.addEventListener('updateready', handleCacheEvent, false);

function initAudio() {
    console.log('[ctOS] Audio driver initialized..');
    appendLog('[*] loading audio driver..', true);
	var self = this;
	var hackAudio = new Audio('hack.mp3');
	self.hackAudio = hackAudio;
}

function playAudio() {
	self.hackAudio.play();
}

function postAdvert() {
    setInterval(function() { appendLog('[#] created by Cole Schaefer.', true); }, 10000);
}

function randomBoolean(method) {
    var randomBoolean = [
        function(){ return Math.random()<.5; },
        function(){ return !(Math.random()+.5|0); },
        function(){ return !(+new Date()%2); }
    ];
    return randomBoolean[method]();
}

function update() {
    softwareUpdate = true;
	$.getJSON("update.json", function(data) {
		appendLog('[+] new software update found..', true);
		appendLog('[*] new update: ' + data.en.updates[0].change, true);
		appendLog('[#] please reboot ctOS app to install update..', true);
	});
    softwareUpdate = true;
}

randomBoolean(0); // Because I really don't like c9 bitching at me! >:(
