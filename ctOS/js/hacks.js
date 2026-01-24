
/* global appendLog playAudio postAdvert */

function ExecHack(index) {
	if (index != -1) { playAudio(); }
	// clearInterval();
	switch (index) {
		case -1: 
			setTimeout(function() { appendLog(' ', true); appendLog('<span style="color:lime;">C:\\DEDSEC_TAKEOVER......', true); }, 8245);
			setTimeout(function() { appendLog('<span style="color:lime;">..........</span>', true); }, 9590);
			setTimeout(function() { appendLog('<span style="color:lime;">..........</span>', true); }, 10000);
			setTimeout(function() { appendLog('<span style="color:lime;">ACTIVATED_</span>', true); }, 10200);
			setTimeout(function() { appendLog(' ', true); appendLog('<span style="color:lime;">PREPARE YOURSELVES////', true); }, 11345);
			setTimeout(function() { appendLog('<span style="color:lime;">WE ARE COMING', true); }, 12345);
			setTimeout(function() { appendLog('<span style="color:lime;">WE ARE COMING', true); }, 12545);
			setTimeout(function() { appendLog('<span style="color:lime;">WE ARE COMING', true); }, 12745);
			setTimeout(function() { appendLog('<span style="color:lime;">WE ARE COMING', true); }, 12945);
			setTimeout(function() { appendLog('<span style="color:lime;">WE ARE COMING_', true); appendLog(' ', true); }, 13145);
			break;
		case 0:
			//Steam Pipes
			appendLog('exploits/steam-pipe.sh');
			appendLog('[*] scanning area for pipe control module..', true);
			setTimeout(function() { appendLog('[+] found pipe control module! overloading..', true); }, 1245);
			setTimeout(function() { appendLog('[*] pipe control module overloaded! blowing..<span class="green" style="float:right;">[ OK ]</span>', true); }, 2590);
			setTimeout(function() { appendLog('[*] thnx u dedsec <span class="off-point">;)</span>', true); }, 3000);
			setTimeout(function() { appendLog(' '); }, 3200);
			break;
		case 1:
			//Blackout
			appendLog('exploits/blackout.sh');
			appendLog('[*] oh goodie! my favorite!', true);
			appendLog('[*] scanning area for power generator..', true);
			setTimeout(function() { appendLog('[+] found power generator! sending overflow command..', true); }, 1360);
			setTimeout(function() { appendLog('[*] generator latency rising..', true); }, 2000);
			setTimeout(function() { appendLog('[*] initializing power surge..<span class="green" style="float:right;">[ OK ]</span>', true); }, 2520);
			setTimeout(function() { appendLog('[*] god said \'let there be light!\'', true); }, 3000);
			setTimeout(function() { appendLog('[*] <span class="white">de\'dsec</span> said <span class="red">no</span>..', true); }, 3100);
			setTimeout(function() { appendLog(' '); }, 3300);
			break;
		case 2:
			//Comms Jam
			appendLog('exploits/comms-jam.sh');
			appendLog('[*] scanning for closest ctOS tower..', true);
			setTimeout(function() { appendLog('[*] found ctOS tower! gaining root..', true); }, 1360);
			setTimeout(function() { appendLog('[+] root gained! beginning jam..', true); }, 1900);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(10)</span>..', true); }, 2000);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(9)</span>..', true); }, 3000);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(8)</span>..', true); }, 4000);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(7)</span>..', true); }, 5000);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(6)</span>..', true); }, 6000);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(5)</span>..', true); }, 7000);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(4)</span>..', true); }, 8000);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(3)</span>..', true); }, 9000);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(2)</span>..', true); }, 10000);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(1)</span>..', true); }, 11000);
			setTimeout(function() { appendLog('[*] jamming comms signal <span class="white">(0)</span>..', true); }, 12000);
			setTimeout(function() { appendLog('[-] killing comms jam..<span class="green" style="float:right;">[ OK ]</span>', true); }, 13250);
			setTimeout(function() { appendLog('[*] comms jam ended! thnx dedsec! <span class="off-point">;)</span>', true); }, 14000);
			setTimeout(function() { appendLog(' '); }, 14200);
			break;
		case 3:
			//Traffic Light
			appendLog('exploits/traffic-light.sh');
			appendLog('[*] I\'m the <span class="red">hacker</span> Oprah! Who wants a <span class="green">GREEN</span> light?!', true);
			setTimeout(function() { appendLog('[*] YOU get a <span class="green">GREEN</span> light!', true); }, 1000);
			setTimeout(function() { appendLog('[*] YOU get a <span class="green">GREEN</span> light!', true); }, 2100);
			setTimeout(function() { appendLog('[*] YOU get a <span class="green">GREEN</span> light!', true); }, 3200);
			setTimeout(function() { appendLog('[*] <span class="green">GREEN</span> LIGHTS FOR EVERYBODY!', true); }, 4300);
			setTimeout(function() { appendLog('[+] AHHHHHHHHHHHHHHHHH! ~<span style="color:orange;">tlop</span>', true); }, 4300);
			setTimeout(function() { appendLog(' '); }, 4500);
			
			break;
		case 4:
			//ctOS Scan
			var devRands =  Math.floor((Math.random() * 10) + 1);
			appendLog('exploits/ctos-scan.sh');
			appendLog('[*] time for some hide and seek!', true);
			appendLog('[*] beginning ctOS scan..', true);
			setTimeout(function() { appendLog('[*] searching area for nearby ctOS signals <span class="white">(3)</span>..', true); }, 500);
			setTimeout(function() { appendLog('[*] searching area for nearby ctOS signals <span class="white">(2)</span>..', true); }, 1500);
			setTimeout(function() { appendLog('[*] searching area for nearby ctOS signals <span class="white">(1)</span>..', true); }, 2500);
			setTimeout(function() { appendLog('[*] searching area for nearby ctOS signals <span class="white">(0)</span>..', true); }, 3500);
			setTimeout(function() { appendLog('[*] pinging all located signals <span class="white">(' + devRands + ')</span>..', true); }, 5000);
			setTimeout(function() { appendLog('[+] received locations for ' + devRands + ' devices..', true); }, 7250);
			setTimeout(function() { appendLog('[+] ctOS scan complete! results show \'<span class="white">' + devRands + '</span>\' entries..', true); }, 7850);
			setTimeout(function() { appendLog('[*] cleaning up.. thnx dedsec!', true); }, 9500);
			setTimeout(function() { appendLog(' '); }, 9700);
			break;
		case 5:
			//Railway
			var distRands =  Math.floor((Math.random() * 500) + 100);
			var optRands = ''; var runRands =  Math.random(); 
		 	runRands = false; if (runRands < 0) { runRands = true; }
		 	runRands = 'idle'; optRands = 'start'; 
		 	if (runRands) { runRands = 'active'; optRands = 'stopp'; }
			
			
			appendLog('exploits/train-run.sh');
			appendLog('[*] looking for nearest ctOS train station signal..', true);
			setTimeout(function() { appendLog('[+] found a train nearby! <span class="white">(' + distRands + 'ft)</span>', true); }, 1200);
			setTimeout(function() { appendLog('[*] checking train status..', true); }, 1400);
			setTimeout(function() { appendLog('[*] train is \'<span class="white">' + runRands + '</span>\'.. ' + optRands + 'ing train..', true); }, 3500);
			setTimeout(function() { appendLog('[*] thnx dedsec! ur tha best! <span class="off-point">;)</span>', true); }, 4500);
			setTimeout(function() { appendLog(' '); }, 4700);
			
			break;
		case 6:
			//Road Blocker
			var distRands =  Math.floor((Math.random() * 500) + 100);
			var optRands = ''; 	var runRands =  Math.random(); 
		 	runRands = false; if (runRands < 0) { runRands = true; }
		 	runRands = 'down'; optRands = 'rais'; 
		 	if (runRands) { runRands = 'up'; optRands = 'lower'; }
		 	
			appendLog('exploits/road-block.sh');
			appendLog('[*] looking for nearest road blocker signal..', true);
			setTimeout(function() { appendLog('[+] found a blocker nearby! <span class="white">(' + distRands + 'ft)</span>', true); }, 1200);
			setTimeout(function() { appendLog('[*] checking blocker status..', true); }, 1400);
			setTimeout(function() { appendLog('[*] blocker is \'<span class="white">' + runRands + '</span>\'.. ' + optRands + 'ing blocker..', true); }, 3500);
			setTimeout(function() { appendLog('[*] thnk yu dedsec! ur tha grateest! <span class="off-point">;)</span>', true); }, 4500);
			setTimeout(function() { appendLog(' '); }, 4700);
			break;
		case 7:
			//Cellphone
			var countRands =  Math.floor((Math.random() * 5000) + 1000);
		 	
			appendLog('exploits/fr33-m0n3y.sh');
			appendLog('[*] scanning for active cell phone connection..', true);
			setTimeout(function() { appendLog('[+] found a cellphone!<span class="green" style="float:right;">[ OK ]</span>', true); }, 1200);
			setTimeout(function() { appendLog('[*] knocking..</span>', true); }, 1300);
			setTimeout(function() { appendLog('[*] received a response! shaking hands..', true); }, 6600);
			setTimeout(function() { appendLog('[+] remote device has accepted payload! connecting..', true); }, 12200);
			setTimeout(function() { appendLog('[*] modifying payload permissions..<span class="green" style="float:right;">[ OK ]</span>', true); }, 13350);
			setTimeout(function() { appendLog('[*] changing payload owner..<span class="green" style="float:right;">[ OK ]</span>', true); }, 13450);
			setTimeout(function() { appendLog('[*] moving payload to device root <span class="white">(root@/)</span>..<span class="green" style="float:right;">[ OK ]</span>', true); }, 13550);
			setTimeout(function() { appendLog('[*] executing payload <span class="white">(./m0n3y-h00k.sh)</span>', true); }, 13650);
			setTimeout(function() { appendLog('[+] loaded device bank data..<span class="green" style="float:right;">[ OK ]</span>', true); }, 17350);
			setTimeout(function() { appendLog('[*] transferring..', true); }, 22350);
			setTimeout(function() { appendLog('[*] transferring..', true); }, 23350);
			setTimeout(function() { appendLog('[*] transferring..', true); }, 24350);
			setTimeout(function() { appendLog('[*] transferring..', true); }, 25350);
			setTimeout(function() { appendLog('[*] transferring..<span class="green" style="float:right;">[ OK ]</span>', true); }, 26350);
			setTimeout(function() { appendLog('[+] received <span class="green">$' + countRands + '</span>', true); }, 26350);
			setTimeout(function() { appendLog('[-] closing connection..', true); }, 26650);
			setTimeout(function() { appendLog('[*] h4x0r\'d by de\'dsec..', true); }, 27000);
			setTimeout(function() { appendLog(' '); }, 27200);
			break;
		case 8:
			//Doors
			var distRands =  Math.floor((Math.random() * 50) + 10);
			var optRands = ''; 	var runRands =  Math.random(); 
		 	runRands = false; if (runRands < 0) { runRands = true; }
		 	runRands = 'locked'; optRands = 'unlock'; 
		 	if (runRands) { runRands = 'unlocked'; optRands = 'lock'; }
		 	
			appendLog('exploits/d00r-h00k.sh');
			appendLog('[*] looking for nearest door signal..', true);
			setTimeout(function() { appendLog('[*] found a door nearby! <span class="white">(' + distRands + 'ft)</span>', true); }, 1200);
			setTimeout(function() { appendLog('[*] checking door status..', true); }, 1400);
			setTimeout(function() { appendLog('[*] door is \'<span class="white">' + runRands + '</span>\'.. ' + optRands + 'ing door..', true); }, 3500);
			setTimeout(function() { appendLog('[*] thnx dedsec! u the win! <span class="off-point">;)</span>', true); }, 4500);
			setTimeout(function() { appendLog(' '); }, 4700);
			break;
			
		default: 
			appendLog('exploits/.sh');
			appendLog('[-] no script specified. unloading..');
			break;
	}
	// postAdvert();
}

ExecHack(-1);
