const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROXY_PROVIDERS = [
    { name: 'ProxyScrape HTTP', url: 'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all', type: 'http' },
    { name: 'ProxyScrape SOCKS4', url: 'https://api.proxyscrape.com/v2/?request=get&protocol=socks4&timeout=10000&country=all', type: 'socks4' },
    { name: 'ProxyScrape SOCKS5', url: 'https://api.proxyscrape.com/v2/?request=get&protocol=socks5&timeout=10000&country=all', type: 'socks5' },
    { name: 'Proxifly All', url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/all/data.txt', type: 'mixed' },
    { name: 'Proxifly HTTP', url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/http/data.txt', type: 'http' },
    { name: 'Proxifly SOCKS4', url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks4/data.txt', type: 'socks4' },
    { name: 'Proxifly SOCKS5', url: 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/protocols/socks5/data.txt', type: 'socks5' },
    { name: 'TheSpeedX HTTP', url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', type: 'http' },
    { name: 'TheSpeedX SOCKS4', url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt', type: 'socks4' },
    { name: 'TheSpeedX SOCKS5', url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt', type: 'socks5' },
    { name: 'Clarketm HTTP', url: 'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt', type: 'http' },
    { name: 'ShiftyTR HTTP', url: 'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt', type: 'http' },
    { name: 'ShiftyTR SOCKS4', url: 'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks4.txt', type: 'socks4' },
    { name: 'ShiftyTR SOCKS5', url: 'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt', type: 'socks5' },
    { name: 'MuRongPIG HTTP', url: 'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/http.txt', type: 'http' },
    { name: 'MuRongPIG SOCKS4', url: 'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/socks4.txt', type: 'socks4' },
    { name: 'MuRongPIG SOCKS5', url: 'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/socks5.txt', type: 'socks5' },
    { name: 'Monosans HTTP', url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt', type: 'http' },
    { name: 'Monosans SOCKS4', url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks4.txt', type: 'socks4' },
    { name: 'Monosans SOCKS5', url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt', type: 'socks5' },
    { name: 'Hookzof', url: 'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt', type: 'socks5' },
    { name: 'Jetkai HTTP', url: 'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt', type: 'http' },
    { name: 'Jetkai SOCKS4', url: 'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-socks4.txt', type: 'socks4' },
    { name: 'Jetkai SOCKS5', url: 'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-socks5.txt', type: 'socks5' },
    { name: 'Roosterkid HTTP', url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt', type: 'http' },
    { name: 'ErcinDedeoglu HTTP', url: 'https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/http.txt', type: 'http' },
    { name: 'ErcinDedeoglu SOCKS4', url: 'https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/socks4.txt', type: 'socks4' },
    { name: 'ErcinDedeoglu SOCKS5', url: 'https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/socks5.txt', type: 'socks5' },
    { name: 'Sunny9577', url: 'https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/proxies.txt', type: 'http' },
    { name: 'Prxchk HTTP', url: 'https://raw.githubusercontent.com/prxchk/proxy-list/main/http.txt', type: 'http' },
    { name: 'Prxchk SOCKS4', url: 'https://raw.githubusercontent.com/prxchk/proxy-list/main/socks4.txt', type: 'socks4' },
    { name: 'Prxchk SOCKS5', url: 'https://raw.githubusercontent.com/prxchk/proxy-list/main/socks5.txt', type: 'socks5' },
    { name: 'Mmpx12 HTTP', url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt', type: 'http' },
    { name: 'Mmpx12 SOCKS4', url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/socks4.txt', type: 'socks4' },
    { name: 'Mmpx12 SOCKS5', url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/socks5.txt', type: 'socks5' },
    { name: 'Proxy4free HTTP', url: 'https://raw.githubusercontent.com/proxy4parsing/proxy-list/main/http.txt', type: 'http' },
    { name: 'RX4096 HTTP', url: 'https://raw.githubusercontent.com/rx443/proxy-list/main/online/http.txt', type: 'http' },
    { name: 'RX4096 SOCKS4', url: 'https://raw.githubusercontent.com/rx443/proxy-list/main/online/socks4.txt', type: 'socks4' },
    { name: 'RX4096 SOCKS5', url: 'https://raw.githubusercontent.com/rx443/proxy-list/main/online/socks5.txt', type: 'socks5' },
    { name: 'Zaeem20 HTTP', url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/http.txt', type: 'http' },
    { name: 'Zaeem20 SOCKS4', url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/socks4.txt', type: 'socks4' },
    { name: 'Zaeem20 SOCKS5', url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/socks5.txt', type: 'socks5' },
    { name: 'Almroot HTTP', url: 'https://raw.githubusercontent.com/almroot/proxylist/master/list.txt', type: 'http' },
    { name: 'Rdavydov HTTP', url: 'https://raw.githubusercontent.com/rdavydov/proxy-list/main/proxies/http.txt', type: 'http' },
    { name: 'Rdavydov SOCKS4', url: 'https://raw.githubusercontent.com/rdavydov/proxy-list/main/proxies/socks4.txt', type: 'socks4' },
    { name: 'Rdavydov SOCKS5', url: 'https://raw.githubusercontent.com/rdavydov/proxy-list/main/proxies/socks5.txt', type: 'socks5' },
    { name: 'Anonym0usWork1221 HTTP', url: 'https://raw.githubusercontent.com/Anonym0usWork1221/Free-Proxies/main/proxy_files/http_proxies.txt', type: 'http' },
    { name: 'Anonym0usWork1221 SOCKS4', url: 'https://raw.githubusercontent.com/Anonym0usWork1221/Free-Proxies/main/proxy_files/socks4_proxies.txt', type: 'socks4' },
    { name: 'Anonym0usWork1221 SOCKS5', url: 'https://raw.githubusercontent.com/Anonym0usWork1221/Free-Proxies/main/proxy_files/socks5_proxies.txt', type: 'socks5' },
    { name: 'Officialputuid HTTP', url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/http/http.txt', type: 'http' },
    { name: 'Officialputuid SOCKS4', url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/socks4/socks4.txt', type: 'socks4' },
    { name: 'Officialputuid SOCKS5', url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/socks5/socks5.txt', type: 'socks5' },
    { name: 'Zloi-user HTTP', url: 'https://raw.githubusercontent.com/zloi-user/hideip.me/main/http.txt', type: 'http' },
    { name: 'Zloi-user SOCKS4', url: 'https://raw.githubusercontent.com/zloi-user/hideip.me/main/socks4.txt', type: 'socks4' },
    { name: 'Zloi-user SOCKS5', url: 'https://raw.githubusercontent.com/zloi-user/hideip.me/main/socks5.txt', type: 'socks5' },
    { name: 'Vakhov HTTP', url: 'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/master/http.txt', type: 'http' },
    { name: 'Vakhov SOCKS4', url: 'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/master/socks4.txt', type: 'socks4' },
    { name: 'Vakhov SOCKS5', url: 'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/master/socks5.txt', type: 'socks5' },
    { name: 'Proxyspace HTTP', url: 'https://raw.githubusercontent.com/proxy-space/proxy-list/main/http.txt', type: 'http' },
    { name: 'Proxyspace SOCKS4', url: 'https://raw.githubusercontent.com/proxy-space/proxy-list/main/socks4.txt', type: 'socks4' },
    { name: 'Proxyspace SOCKS5', url: 'https://raw.githubusercontent.com/proxy-space/proxy-list/main/socks5.txt', type: 'socks5' },
    { name: 'Casals HTTP', url: 'https://raw.githubusercontent.com/casals-ar/proxy-list/main/http', type: 'http' },
    { name: 'Casals SOCKS4', url: 'https://raw.githubusercontent.com/casals-ar/proxy-list/main/socks4', type: 'socks4' },
    { name: 'Casals SOCKS5', url: 'https://raw.githubusercontent.com/casals-ar/proxy-list/main/socks5', type: 'socks5' },
    { name: 'Proxyhub HTTP', url: 'https://raw.githubusercontent.com/proxyhub/proxyhub/main/http.txt', type: 'http' },
    { name: 'Proxyhub SOCKS5', url: 'https://raw.githubusercontent.com/proxyhub/proxyhub/main/socks5.txt', type: 'socks5' },
    { name: 'Caliphdev HTTP', url: 'https://raw.githubusercontent.com/caliphdev/Starter-APIs/main/proxy-list/http.txt', type: 'http' },
    { name: 'Caliphdev SOCKS4', url: 'https://raw.githubusercontent.com/caliphdev/Starter-APIs/main/proxy-list/socks4.txt', type: 'socks4' },
    { name: 'Caliphdev SOCKS5', url: 'https://raw.githubusercontent.com/caliphdev/Starter-APIs/main/proxy-list/socks5.txt', type: 'socks5' },
    { name: 'Saschazesiger HTTP', url: 'https://raw.githubusercontent.com/saschazesiger/Free-Proxies/master/proxies/http.txt', type: 'http' },
    { name: 'Saschazesiger SOCKS4', url: 'https://raw.githubusercontent.com/saschazesiger/Free-Proxies/master/proxies/socks4.txt', type: 'socks4' },
    { name: 'Saschazesiger SOCKS5', url: 'https://raw.githubusercontent.com/saschazesiger/Free-Proxies/master/proxies/socks5.txt', type: 'socks5' },
    { name: 'Yemixzy HTTP', url: 'https://raw.githubusercontent.com/yemixzy/proxy-list/main/proxies/http.txt', type: 'http' },
    { name: 'Yemixzy SOCKS4', url: 'https://raw.githubusercontent.com/yemixzy/proxy-list/main/proxies/socks4.txt', type: 'socks4' },
    { name: 'Yemixzy SOCKS5', url: 'https://raw.githubusercontent.com/yemixzy/proxy-list/main/proxies/socks5.txt', type: 'socks5' },
    { name: 'Aslfrx HTTP', url: 'https://raw.githubusercontent.com/aslfrx/proxy-list/main/proxy-list/http.txt', type: 'http' },
    { name: 'Aslfrx SOCKS4', url: 'https://raw.githubusercontent.com/aslfrx/proxy-list/main/proxy-list/socks4.txt', type: 'socks4' },
    { name: 'Aslfrx SOCKS5', url: 'https://raw.githubusercontent.com/aslfrx/proxy-list/main/proxy-list/socks5.txt', type: 'socks5' },
    { name: 'Proxiware HTTP', url: 'https://raw.githubusercontent.com/proxiware/free-proxy-list/main/proxies/http.txt', type: 'http' },
    { name: 'Proxiware SOCKS4', url: 'https://raw.githubusercontent.com/proxiware/free-proxy-list/main/proxies/socks4.txt', type: 'socks4' },
    { name: 'Proxiware SOCKS5', url: 'https://raw.githubusercontent.com/proxiware/free-proxy-list/main/proxies/socks5.txt', type: 'socks5' },
    { name: 'B4ckh4ck HTTP', url: 'https://raw.githubusercontent.com/B4ckh4ck/proxy/main/HTTP.txt', type: 'http' },
    { name: 'B4ckh4ck SOCKS4', url: 'https://raw.githubusercontent.com/B4ckh4ck/proxy/main/SOCKS4.txt', type: 'socks4' },
    { name: 'B4ckh4ck SOCKS5', url: 'https://raw.githubusercontent.com/B4ckh4ck/proxy/main/SOCKS5.txt', type: 'socks5' },
    { name: 'Fahimscir);H HTTP', url: 'https://raw.githubusercontent.com/fahimscirex/proxybd/master/proxylist/http.txt', type: 'http' },
    { name: 'Fahimscirex SOCKS4', url: 'https://raw.githubusercontent.com/fahimscirex/proxybd/master/proxylist/socks4.txt', type: 'socks4' },
    { name: 'Fahimscirex SOCKS5', url: 'https://raw.githubusercontent.com/fahimscirex/proxybd/master/proxylist/socks5.txt', type: 'socks5' },
    { name: 'Hu3rtas HTTP', url: 'https://raw.githubusercontent.com/hu3rtas/proxy-list/main/http.txt', type: 'http' },
    { name: 'Hu3rtas SOCKS4', url: 'https://raw.githubusercontent.com/hu3rtas/proxy-list/main/socks4.txt', type: 'socks4' },
    { name: 'Hu3rtas SOCKS5', url: 'https://raw.githubusercontent.com/hu3rtas/proxy-list/main/socks5.txt', type: 'socks5' },
    { name: 'Proxylist-live HTTP', url: 'https://raw.githubusercontent.com/Tsprnay/Proxy-lists/master/proxies/http.txt', type: 'http' },
    { name: 'Proxylist-live SOCKS4', url: 'https://raw.githubusercontent.com/Tsprnay/Proxy-lists/master/proxies/socks4.txt', type: 'socks4' },
    { name: 'Proxylist-live SOCKS5', url: 'https://raw.githubusercontent.com/Tsprnay/Proxy-lists/master/proxies/socks5.txt', type: 'socks5' },
    { name: 'Openproxy HTTP', url: 'https://openproxy.space/list/http', type: 'http' },
    { name: 'Openproxy SOCKS4', url: 'https://openproxy.space/list/socks4', type: 'socks4' },
    { name: 'Openproxy SOCKS5', url: 'https://openproxy.space/list/socks5', type: 'socks5' },
    { name: 'Spys HTTP', url: 'https://spys.me/proxy.txt', type: 'http' },
    { name: 'Spys SOCKS', url: 'https://spys.me/socks.txt', type: 'socks5' },
    { name: 'Proxyscan HTTP', url: 'https://www.proxyscan.io/download?type=http', type: 'http' },
    { name: 'Proxyscan SOCKS4', url: 'https://www.proxyscan.io/download?type=socks4', type: 'socks4' },
    { name: 'Proxyscan SOCKS5', url: 'https://www.proxyscan.io/download?type=socks5', type: 'socks5' },
    { name: 'SocksProxyNet', url: 'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt', type: 'socks5' },
    { name: 'ProxyListDownload HTTP', url: 'https://www.proxy-list.download/api/v1/get?type=http', type: 'http' },
    { name: 'ProxyListDownload HTTPS', url: 'https://www.proxy-list.download/api/v1/get?type=https', type: 'http' },
    { name: 'ProxyListDownload SOCKS4', url: 'https://www.proxy-list.download/api/v1/get?type=socks4', type: 'socks4' },
    { name: 'ProxyListDownload SOCKS5', url: 'https://www.proxy-list.download/api/v1/get?type=socks5', type: 'socks5' },
    { name: 'Opsxcq HTTP', url: 'https://raw.githubusercontent.com/opsxcq/proxy-list/master/list.txt', type: 'http' },
    { name: 'Srmne HTTP', url: 'https://raw.githubusercontent.com/srmne/Proxies/master/http.txt', type: 'http' },
    { name: 'Srmne SOCKS4', url: 'https://raw.githubusercontent.com/srmne/Proxies/master/socks4.txt', type: 'socks4' },
    { name: 'Srmne SOCKS5', url: 'https://raw.githubusercontent.com/srmne/Proxies/master/socks5.txt', type: 'socks5' },
    { name: 'Bfcktr Mixed', url: 'https://raw.githubusercontent.com/Bfcktr/Free-Proxy-List/master/proxy.txt', type: 'mixed' },
    { name: 'Ubaii Mixed', url: 'https://raw.githubusercontent.com/Ubaii/script-de-proxies/main/proxies.txt', type: 'mixed' },
    { name: 'Keralahacker Mixed', url: 'https://raw.githubusercontent.com/keralahacker/proxy-list/main/proxy.txt', type: 'mixed' },
    { name: 'NotUnko HTTP', url: 'https://raw.githubusercontent.com/NotUnko/proxies/main/http.txt', type: 'http' },
    { name: 'NotUnko SOCKS4', url: 'https://raw.githubusercontent.com/NotUnko/proxies/main/socks4.txt', type: 'socks4' },
    { name: 'NotUnko SOCKS5', url: 'https://raw.githubusercontent.com/NotUnko/proxies/main/socks5.txt', type: 'socks5' },
    { name: 'Dxsdd Mixed', url: 'https://raw.githubusercontent.com/dxsdd/proxy-list/main/proxy.txt', type: 'mixed' },
    { name: 'Tohfu Mixed', url: 'https://raw.githubusercontent.com/tohfu2/proxy-list/master/proxy.txt', type: 'mixed' },
    { name: 'Bala Mixed', url: 'https://raw.githubusercontent.com/balal12/Proxy-List/main/proxies.txt', type: 'mixed' },
    { name: 'ProxyHub Mixed 2', url: 'https://raw.githubusercontent.com/yeyouget/proxy-list/main/proxy.txt', type: 'mixed' },
    { name: 'API.ProxyScrape Mixed', url: 'https://api.proxyscrape.com/?request=getproxies&proxytype=all&timeout=10000', type: 'mixed' },
    { name: 'Maniac Mac Mixed', url: 'https://raw.githubusercontent.com/Maniac-Mac/Proxy-List/master/proxies.txt', type: 'mixed' },
    { name: 'Vakhov Mixed', url: 'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/master/proxies.txt', type: 'mixed' },
    { name: 'TheSpeedX SOCKS4', url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt', type: 'socks4' },
    { name: 'TheSpeedX SOCKS5', url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt', type: 'socks5' },
    { name: 'TheSpeedX HTTP', url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', type: 'http' },
    { name: 'MuzafferAha HTTP', url: 'https://raw.githubusercontent.com/MuzafferAha/Proxy-List/main/http.txt', type: 'http' },
    { name: 'MuzafferAha SOCKS4', url: 'https://raw.githubusercontent.com/MuzafferAha/Proxy-List/main/socks4.txt', type: 'socks4' },
    { name: 'MuzafferAha SOCKS5', url: 'https://raw.githubusercontent.com/MuzafferAha/Proxy-List/main/socks5.txt', type: 'socks5' },
    { name: 'Zevtyardt HTTP', url: 'https://raw.githubusercontent.com/zevtyardt/proxy-list/main/http.txt', type: 'http' },
    { name: 'Zevtyardt SOCKS4', url: 'https://raw.githubusercontent.com/zevtyardt/proxy-list/main/socks4.txt', type: 'socks4' },
    { name: 'Zevtyardt SOCKS5', url: 'https://raw.githubusercontent.com/zevtyardt/proxy-list/main/socks5.txt', type: 'socks5' },
    { name: 'Zevtyardt ALL', url: 'https://raw.githubusercontent.com/zevtyardt/proxy-list/main/all.txt', type: 'mixed' },
    { name: 'ALIILAPRO HTTP', url: 'https://raw.githubusercontent.com/ALIILAPRO/Proxy/main/http.txt', type: 'http' },
    { name: 'ALIILAPRO SOCKS4', url: 'https://raw.githubusercontent.com/ALIILAPRO/Proxy/main/socks4.txt', type: 'socks4' },
    { name: 'ALIILAPRO SOCKS5', url: 'https://raw.githubusercontent.com/ALIILAPRO/Proxy/main/socks5.txt', type: 'socks5' },
    { name: 'RoosterKid HTTP', url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt', type: 'http' },
    { name: 'RoosterKid SOCKS4', url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS4_RAW.txt', type: 'socks4' },
    { name: 'RoosterKid SOCKS5', url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_RAW.txt', type: 'socks5' },
    { name: 'Prxign HTTP', url: 'https://raw.githubusercontent.com/prxign/Proxy-Scraper/main/http.txt', type: 'http' },
    { name: 'Prxign SOCKS4', url: 'https://raw.githubusercontent.com/prxign/Proxy-Scraper/main/socks4.txt', type: 'socks4' },
    { name: 'Prxign SOCKS5', url: 'https://raw.githubusercontent.com/prxign/Proxy-Scraper/main/socks5.txt', type: 'socks5' },
    { name: 'BBRyan SOCKS4', url: 'https://raw.githubusercontent.com/BBRyan/Socks4-Proxy/master/socks4.txt', type: 'socks4' },
    { name: 'ToShukKa HTTP', url: 'https://raw.githubusercontent.com/ToShukKa/Proxy-List/main/http.txt', type: 'http' },
    { name: 'ToShukKa SOCKS', url: 'https://raw.githubusercontent.com/ToShukKa/Proxy-List/main/socks.txt', type: 'socks5' },
    { name: 'Vempa HTTP', url: 'https://raw.githubusercontent.com/Vigdis-Group/Proxy-List/main/http.txt', type: 'http' },
    { name: 'Vempa SOCKS4', url: 'https://raw.githubusercontent.com/Vigdis-Group/Proxy-List/main/socks4.txt', type: 'socks4' },
    { name: 'Vempa SOCKS5', url: 'https://raw.githubusercontent.com/Vigdis-Group/Proxy-List/main/socks5.txt', type: 'socks5' }
];

function fetchUrl(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Request timeout limit reached'));
        }, timeout);

        const protocol = url.startsWith('https') ? https : http;
        const options = {
            timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/plain, */*',
                'Accept-Encoding': 'identity'
            }
        };

        const req = protocol.get(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                clearTimeout(timer);
                return fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                clearTimeout(timer);
                resolve(data);
            });
        });

        req.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });

        req.on('timeout', () => {
            clearTimeout(timer);
            req.destroy();
            reject(new Error('Socket timeout'));
        });
    });
}

function parseProxies(data) {
    const lines = data.split(/[\r\n]+/);
    const proxies = [];
    const ipPortRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})/g;

    for (const line of lines) {
        const matches = line.match(ipPortRegex);
        if (matches) {
            for (const match of matches) {
                if (!proxies.includes(match)) {
                    proxies.push(match);
                }
            }
        }
    }
    return proxies;
}

async function scrapeFromProvider(provider) {
    try {
        const data = await fetchUrl(provider.url);
        const proxies = parseProxies(data);
        return {
            name: provider.name,
            type: provider.type,
            count: proxies.length,
            proxies: proxies,
            success: true
        };
    } catch (error) {
        return {
            name: provider.name,
            type: provider.type,
            count: 0,
            proxies: [],
            success: false,
            error: error.message
        };
    }
}

async function validateProxies(proxies, maxConcurrency = 200, timeout = 3000) {
    const net = require('net');

    console.log(`\n⏳ Validating ${proxies.length} proxies for liveness... (Timeout: ${timeout}ms)`);
    const validProxies = [];
    let completed = 0;

    // Chunking the execution to not exceed max DNS/Socket limits
    for (let i = 0; i < proxies.length; i += maxConcurrency) {
        const chunk = proxies.slice(i, i + maxConcurrency);
        const promises = chunk.map(proxy => {
            return new Promise((resolve) => {
                const [host, portStr] = proxy.split(':');
                if (!host || !portStr) return resolve(null);

                const port = parseInt(portStr.trim(), 10);
                if (isNaN(port) || port <= 0 || port >= 65536) return resolve(null);

                const socket = new net.Socket();
                socket.setTimeout(timeout);

                socket.on('connect', () => {
                    socket.destroy();
                    resolve(proxy);
                }).on('timeout', () => {
                    socket.destroy();
                    resolve(null);
                }).on('error', () => {
                    socket.destroy();
                    resolve(null);
                });

                socket.connect(port, host);
            });
        });

        const results = await Promise.all(promises);
        results.forEach(res => {
            if (res) validProxies.push(res);
        });

        completed += chunk.length;
        process.stdout.write(`\r[${completed}/${proxies.length}] Valid proxies found: ${validProxies.length}`);
    }

    console.log(`\n✅ Liveness check complete. Found ${validProxies.length} ALIVE proxies.`);
    return validProxies;
}

async function scrapeAllProviders(options = {}) {
    const {
        concurrency = 100,
        filterType = null,
        onProgress = null
    } = options;

    let providers = PROXY_PROVIDERS;
    if (filterType) {
        providers = providers.filter(p => p.type === filterType);
    }

    const results = [];
    const allProxies = new Set();
    let completed = 0;

    const chunks = [];
    for (let i = 0; i < providers.length; i += concurrency) {
        chunks.push(providers.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(p => scrapeFromProvider(p)));
        for (const result of chunkResults) {
            results.push(result);
            result.proxies.forEach(proxy => allProxies.add(proxy));
            completed++;
            if (onProgress) {
                onProgress({
                    completed,
                    total: providers.length,
                    current: result.name,
                    success: result.success,
                    count: result.count
                });
            }
        }
    }

    return {
        providers: results,
        totalProviders: providers.length,
        successfulProviders: results.filter(r => r.success).length,
        failedProviders: results.filter(r => !r.success).length,
        uniqueProxies: Array.from(allProxies),
        totalUnique: allProxies.size,
        timestamp: new Date().toISOString()
    };
}

async function scrapeAndSave(outputPath = path.join(__dirname, '../../assets/proxy.txt'), options = {}) {
    const startTime = Date.now();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           🌐 PROXY SCRAPER - 100+ PROVIDERS            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const result = await scrapeAllProviders({
        ...options,
        onProgress: (progress) => {
            const status = progress.success ? '✓' : '✗';
            const count = progress.success ? `${progress.count} proxies` : 'failed';
            console.log(`[${progress.completed}/${progress.total}] ${status} ${progress.current}: ${count}`);
        }
    });

    let finalProxies = result.uniqueProxies;

    if (options.validate) {
        finalProxies = await validateProxies(result.uniqueProxies, 300, 2000);
        result.totalUnique = finalProxies.length;
        result.uniqueProxies = finalProxies;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                      📊 SUMMARY                        ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Total Providers:      ${String(result.totalProviders).padStart(10)}                   ║`);
    console.log(`║ Successful:           ${String(result.successfulProviders).padStart(10)}                   ║`);
    console.log(`║ Failed:               ${String(result.failedProviders).padStart(10)}                   ║`);
    console.log(`║ Unique Proxies:       ${String(result.totalUnique).padStart(10)}                   ║`);
    console.log(`║ Time Elapsed:         ${String(elapsed + 's').padStart(10)}                   ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    fs.writeFileSync(outputPath, finalProxies.join('\n'));
    console.log(`✅ Saved ${result.totalUnique} proxies to ${outputPath}\n`);

    if (options.servers && Array.isArray(options.servers)) {
        console.log(`🚀 Syncing proxies to ${options.servers.length} botnet API nodes...`);
        const axios = require('axios');
        for (const server of options.servers) {
            try {
                // Determine port to use based on URL or default to 5032 API
                const apiUrl = server.domain.includes('http') ? server.domain : `http://${server.domain}:5032`;

                await axios.post(`${apiUrl}/update-proxies`, {
                    proxies: finalProxies
                }, { timeout: 15000 });
                console.log(`  [+] Successfully synced to ${apiUrl}`);
            } catch (err) {
                console.log(`  [-] Failed to sync to ${server.domain}: ${err.message}`);
            }
        }
        console.log('✅ Proxy sync completed.\n');
    }

    return result;
}

function getLiveStats() {
    const proxyPath = require('path').join(__dirname, '../../assets/proxy.txt');
    if (!fs.existsSync(proxyPath)) {
        return { loaded: 0, lastUpdated: null };
    }

    const content = fs.readFileSync(proxyPath, 'utf8');
    const proxies = content.split('\n').filter(line => line.trim());
    const stats = fs.statSync(proxyPath);

    return {
        loaded: proxies.length,
        lastUpdated: stats.mtime.toISOString(),
        filePath: proxyPath
    };
}

function getProviderList() {
    return PROXY_PROVIDERS.map(p => ({
        name: p.name,
        type: p.type,
        url: p.url
    }));
}

function getProviderCount() {
    return PROXY_PROVIDERS.length;
}

module.exports = {
    PROXY_PROVIDERS,
    scrapeFromProvider,
    scrapeAllProviders,
    scrapeAndSave,
    getLiveStats,
    getProviderList,
    getProviderCount,
    fetchUrl,
    parseProxies
};

if (require.main === module) {
    scrapeAndSave(path.join(__dirname, '../../assets/proxy.txt')).catch(console.error);
}
