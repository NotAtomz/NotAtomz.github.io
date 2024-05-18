function prepareHack(hackType) {
    const outputDiv = document.getElementById('output');
    const timestamp = new Date().toLocaleTimeString();
    outputDiv.innerHTML += `[${timestamp}] Preparing to execute ${hackType} hack...<br>`;
    outputDiv.scrollTop = outputDiv.scrollHeight; // Auto-scroll to bottom

    // Random delay between 1 and 6 seconds
    const delay = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => executeHack(hackType), delay * 1000);
}

function executeHack(hackType) {
    const outputDiv = document.getElementById('output');
    const timestamp = new Date().toLocaleTimeString();
    const messages = {
        'Pipes': 'Pipe burst activated!',
        'Blackout': 'City-wide blackout initiated!',
        'Comms Jam': 'Communications jammed!',
        'Light': 'Traffic lights changed!',
        'ctOS Scan': 'ctOS scan completed!',
        'Train': 'Train systems controlled!',
        'Blocker': 'Blockers raised!',
        'Cellphone': 'Cellphone hacked!',
        'Door': 'Door unlocked!'
    };

    outputDiv.innerHTML += `[${timestamp}] ${messages[hackType]}<br>`;
    outputDiv.scrollTop = outputDiv.scrollHeight; // Auto-scroll to bottom
}
