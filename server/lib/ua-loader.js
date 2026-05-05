const fs = require('fs');
const path = require('path');

const UA_FILE = path.join(__dirname, '../../assets/ua.txt');
let userAgents = [];
let loaded = false;

function loadUserAgents() {
    if (loaded && userAgents.length > 0) return userAgents;

    try {
        const content = fs.readFileSync(UA_FILE, 'utf8');
        userAgents = content.split('\n').filter(ua => ua.trim().length > 0);
        loaded = true;
        console.log(`[UA] Loaded ${userAgents.length} user agents`);
    } catch (e) {
        userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        ];
        console.log(`[UA] Using fallback ${userAgents.length} user agents`);
    }

    return userAgents;
}

function getRandomUA() {
    if (!loaded) loadUserAgents();
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getMultipleUA(count = 10) {
    if (!loaded) loadUserAgents();
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(userAgents[Math.floor(Math.random() * userAgents.length)]);
    }
    return result;
}

function getUACount() {
    if (!loaded) loadUserAgents();
    return userAgents.length;
}

function getAllUA() {
    if (!loaded) loadUserAgents();
    return userAgents;
}

loadUserAgents();

module.exports = {
    loadUserAgents,
    getRandomUA,
    getMultipleUA,
    getUACount,
    getAllUA,
    UA_FILE
};
