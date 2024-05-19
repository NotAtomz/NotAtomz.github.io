// Mock data for names and descriptions
const firstNames = ["John", "Jane", "Alex", "Emily", "Michael", "Sarah", "David", "Anna"];
const lastNames = ["Doe", "Smith", "Johnson", "Brown", "Taylor", "Anderson", "Thomas", "Jackson"];
const descriptions = [
    "Software Engineer",
    "Graphic Designer",
    "Data Analyst",
    "Project Manager",
    "Marketing Specialist",
    "Sales Representative",
    "Customer Support",
    "Human Resources"
];

// Function to get a random item from an array
function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Function to get a random face image URL from This Person Does Not Exist
function getRandomFaceUrl() {
    return `https://thispersondoesnotexist.com/image`;
}

function prepareHack(hackType) {
    const outputDiv = document.getElementById('output');

    const timestamp = new Date().toLocaleTimeString();
    outputDiv.innerHTML += `[${timestamp}] Preparing to execute ${hackType} hack...<br>`;
    outputDiv.scrollTop = outputDiv.scrollHeight; // Auto-scroll to bottom

    // Random delay between 1 and 6 seconds
    const delay = Math.floor(Math.random() * 6) + 1;

    if (hackType === 'ctOS Scan') {
        executeCtOSScan(delay * 1000);
    } else {
        setTimeout(() => executeHack(hackType), delay * 1000);
    }
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

function executeCtOSScan(delay) {
    const outputDiv = document.getElementById('output');
    outputDiv.innerHTML += '<div id="face-mosaic"></div>'; // Add a container for the mosaic
    const faceMosaicDiv = document.getElementById('face-mosaic');

    let mosaicInterval = setInterval(() => {
        faceMosaicDiv.innerHTML = '<img src="' + getRandomFaceUrl() + '" alt="Random Face">';
    }, 300); // Change face every 300ms for mosaic effect

    setTimeout(() => {
        clearInterval(mosaicInterval);
        displayFinalFace();
    }, delay);
}

function displayFinalFace() {
    const outputDiv = document.getElementById('output');
    const faceMosaicDiv = document.getElementById('face-mosaic');
    const finalFaceUrl = getRandomFaceUrl();

    faceMosaicDiv.innerHTML = `<img src="${finalFaceUrl}" alt="Final Face" onerror="this.src='fallback-image-url.jpg'">`;

    const firstName = getRandomItem(firstNames);
    const lastName = getRandomItem(lastNames);
    const description = getRandomItem(descriptions);
    const age = Math.floor(Math.random() * 42) + 18; // Age between 18 and 60

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'face-details';
    detailsDiv.innerHTML = `<p>Name: ${firstName} ${lastName}</p><p>Age: ${age}</p><p>Description: ${description}</p>`;
    outputDiv.appendChild(detailsDiv);
    outputDiv.scrollTop = outputDiv.scrollHeight; // Auto-scroll to bottom
}
