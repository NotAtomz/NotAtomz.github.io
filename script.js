let key = ''; // Declare key globally

function generateKey() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=-[]{};:,<.>/?';
    const keyLength = 50; // Change this to 40
    key = ''; // Reset key before generating a new one

    for (let i = 0; i < keyLength; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        key += characters.charAt(randomIndex);
    }

    document.getElementById('generatedKey').innerHTML = key;
}

function savekey() {
    // Create a Blob with the content
    const content = key;
    const blob = new Blob([content], { type: 'text/plain' });

    // Create a link element
    const link = document.createElement('a');

    // Set link attributes, including the file name
    link.href = window.URL.createObjectURL(blob);
    link.download = 'savedkeyfile.txt';

    // Append the link to the document
    document.body.appendChild(link);

    // Trigger a click on the link to start the download
    link.click();

    // Remove the link from the document
    document.body.removeChild(link);
}
