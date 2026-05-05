const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BROWSERS = {
    chrome: {
        name: 'Chrome',
        versions: Array.from({length: 80}, (_, i) => 70 + i),
        webkitVersions: ['537.36'],
        engines: ['AppleWebKit/537.36']
    },
    firefox: {
        name: 'Firefox',
        versions: Array.from({length: 100}, (_, i) => 60 + i),
        engines: ['Gecko/20100101']
    },
    safari: {
        name: 'Safari',
        versions: ['12.0', '12.1', '13.0', '13.1', '14.0', '14.1', '15.0', '15.1', '15.2', '15.3', '15.4', '15.5', '15.6', '16.0', '16.1', '16.2', '16.3', '16.4', '16.5', '16.6', '17.0', '17.1', '17.2', '17.3', '17.4', '17.5', '17.6', '18.0', '18.1', '18.2'],
        webkitVersions: ['605.1.15', '537.36', '604.1', '603.1.30']
    },
    edge: {
        name: 'Edg',
        versions: Array.from({length: 70}, (_, i) => 79 + i),
        engines: ['AppleWebKit/537.36']
    },
    opera: {
        name: 'OPR',
        versions: Array.from({length: 60}, (_, i) => 60 + i),
        engines: ['AppleWebKit/537.36']
    },
    brave: {
        name: 'Brave',
        versions: Array.from({length: 60}, (_, i) => 1.30 + i * 0.01).map(v => v.toFixed(2))
    },
    vivaldi: {
        name: 'Vivaldi',
        versions: Array.from({length: 40}, (_, i) => `${4 + Math.floor(i/8)}.${i % 8}.${Math.floor(Math.random() * 3000)}`)
    },
    yandex: {
        name: 'YaBrowser',
        versions: Array.from({length: 40}, (_, i) => `${18 + Math.floor(i/4)}.${i % 12}.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 1000)}`)
    },
    samsung: {
        name: 'SamsungBrowser',
        versions: Array.from({length: 20}, (_, i) => `${12 + i}.0`)
    },
    uc: {
        name: 'UCBrowser',
        versions: ['12.12.8.1206', '13.0.0.1288', '13.2.5.1300', '13.3.2.1303', '13.4.0.1306', '13.4.2.1402', '13.5.0.1206', '14.0.0.1025', '14.5.0.1250', '15.0.0.1125']
    },
    whale: {
        name: 'Whale',
        versions: Array.from({length: 15}, (_, i) => `3.${15 + i}.0.${Math.floor(Math.random() * 100)}`)
    },
    miui: {
        name: 'MiuiBrowser',
        versions: Array.from({length: 15}, (_, i) => `${10 + i}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}-gn`)
    },
    huawei: {
        name: 'HuaweiBrowser',
        versions: Array.from({length: 15}, (_, i) => `${11 + i}.0.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 400)}`)
    },
    puffin: {
        name: 'Puffin',
        versions: ['8.0.0', '8.2.0', '8.4.0', '9.0.0', '9.5.0', '9.7.0', '10.0.0', '10.1.0', '10.2.0']
    },
    maxthon: {
        name: 'Maxthon',
        versions: ['5.0', '5.1', '5.2', '5.3', '6.0', '6.1', '6.2', '7.0', '7.1', '7.2']
    },
    silk: {
        name: 'Silk',
        versions: Array.from({length: 20}, (_, i) => `${80 + i}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 200)}`)
    },
    coc_coc: {
        name: 'coc_coc_browser',
        versions: Array.from({length: 15}, (_, i) => `${95 + i}.0.${Math.floor(Math.random() * 200)}`)
    },
    qq: {
        name: 'QQBrowser',
        versions: ['10.5.3870.400', '10.6.4163.400', '10.7.4313.400', '10.8.4455.400', '11.0.5155.400', '11.1.5255.400', '11.5.5250.400']
    },
    sogou: {
        name: 'SogouMobileBrowser',
        versions: ['5.28.10', '5.29.15', '5.30.20', '5.31.25', '5.32.30']
    },
    baidu: {
        name: 'baiduboxapp',
        versions: ['11.0.0.10', '11.1.0.10', '11.2.0.10', '11.3.0.10', '12.0.0.10', '12.1.0.10', '13.0.0.10']
    },
    liebao: {
        name: 'LBBROWSER',
        versions: ['8.0.1.5305', '8.0.2.5401', '8.0.3.5505', '8.0.4.5601']
    },
    waterfox: {
        name: 'Waterfox',
        versions: Array.from({length: 20}, (_, i) => `G${3 + Math.floor(i/5)}.${i % 10}.${Math.floor(Math.random() * 5)}`)
    },
    palemoon: {
        name: 'PaleMoon',
        versions: Array.from({length: 15}, (_, i) => `${29 + Math.floor(i/3)}.${i % 5}.${Math.floor(Math.random() * 3)}`)
    },
    seamonkey: {
        name: 'SeaMonkey',
        versions: ['2.49.5', '2.53.1', '2.53.5', '2.53.10', '2.53.15', '2.53.18']
    },
    slimbrowser: {
        name: 'SlimBrowser',
        versions: ['14.0.0.0', '14.0.1.0', '15.0.0.0', '15.0.1.0']
    },
    avant: {
        name: 'Avant Browser',
        versions: ['2020 build 1', '2020 build 2', '2020 build 3', '2021 build 1']
    },
    lunascape: {
        name: 'Lunascape',
        versions: ['6.15.1', '6.15.2', '6.15.3']
    },
    tor: {
        name: 'Tor Browser',
        versions: Array.from({length: 20}, (_, i) => `${10 + Math.floor(i/5)}.${i % 10}`)
    },
    iron: {
        name: 'Iron',
        versions: Array.from({length: 30}, (_, i) => `${80 + i}.0.${4100 + Math.floor(Math.random() * 500)}.0`)
    },
    comodo: {
        name: 'Comodo Dragon',
        versions: Array.from({length: 20}, (_, i) => `${90 + i}.0.${4430 + Math.floor(Math.random() * 500)}.0`)
    },
    chromodo: {
        name: 'Chromodo',
        versions: ['58.0.3029.110', '60.0.3112.90', '62.0.3202.94']
    },
    cent: {
        name: 'Cent Browser',
        versions: Array.from({length: 15}, (_, i) => `${4 + Math.floor(i/5)}.${i % 10}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 100)}`)
    },
    epic: {
        name: 'Epic',
        versions: Array.from({length: 15}, (_, i) => `${85 + i}.0.${4183 + Math.floor(Math.random() * 500)}.${Math.floor(Math.random() * 200)}`)
    },
    beaker: {
        name: 'Beaker',
        versions: ['1.0.0', '1.1.0', '1.2.0']
    },
    polypane: {
        name: 'Polypane',
        versions: Array.from({length: 10}, (_, i) => `${12 + i}.${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 5)}`)
    },
    falkon: {
        name: 'Falkon',
        versions: ['3.1.0', '3.2.0', '23.04.0', '23.08.0', '24.02.0']
    },
    midori: {
        name: 'Midori',
        versions: ['9.0', '10.0', '11.0', '11.1', '11.2']
    },
    konqueror: {
        name: 'Konqueror',
        versions: ['5.0.97', '20.04.3', '20.12.3', '21.04.3', '22.08.3', '23.04.3']
    },
    dillo: {
        name: 'Dillo',
        versions: ['3.0.5', '3.1.0', '3.1.1']
    },
    netsurf: {
        name: 'NetSurf',
        versions: ['3.10', '3.11']
    },
    webpositive: {
        name: 'WebPositive',
        versions: ['1.2', '1.3']
    },
    otter: {
        name: 'Otter',
        versions: ['1.0.01', '1.0.02', '1.0.03']
    },
    minibrowser: {
        name: 'MiniBrowser',
        versions: ['1.0', '2.0']
    },
    gnomeweb: {
        name: 'GNOME Web',
        versions: ['40.0', '41.0', '42.0', '43.0', '44.0', '45.0', '46.0']
    },
    surf: {
        name: 'surf',
        versions: ['2.0', '2.1']
    },
    qutebrowser: {
        name: 'qutebrowser',
        versions: ['2.5.0', '2.5.1', '2.5.2', '2.5.3', '2.5.4', '3.0.0', '3.1.0']
    },
    uzbl: {
        name: 'uzbl',
        versions: ['0.9.1']
    },
    nyxt: {
        name: 'Nyxt',
        versions: ['2.0.0', '2.1.0', '2.2.0', '3.0.0', '3.1.0', '3.5.0']
    },
    liri: {
        name: 'Liri Browser',
        versions: ['0.3', '0.4']
    },
    arora: {
        name: 'Arora',
        versions: ['0.11.0']
    },
    k_meleon: {
        name: 'K-Meleon',
        versions: ['76.0', '76.1', '76.2', '76.3', '76.4', '76.5']
    },
    basilisk: {
        name: 'Basilisk',
        versions: ['2020.10.27', '2021.01.27', '2021.06.17', '2022.01.27', '2022.08.30', '2023.01.18', '2023.09.20']
    }
};

const OPERATING_SYSTEMS = {
    windows: [
        { name: 'Windows NT 10.0; Win64; x64', weight: 30 },
        { name: 'Windows NT 10.0; WOW64', weight: 6 },
        { name: 'Windows NT 10.0', weight: 3 },
        { name: 'Windows NT 11.0; Win64; x64', weight: 28 },
        { name: 'Windows NT 11.0; ARM64', weight: 5 },
        { name: 'Windows NT 6.3; Win64; x64', weight: 4 },
        { name: 'Windows NT 6.3; WOW64', weight: 2 },
        { name: 'Windows NT 6.2; Win64; x64', weight: 3 },
        { name: 'Windows NT 6.2; WOW64', weight: 1 },
        { name: 'Windows NT 6.1; Win64; x64', weight: 5 },
        { name: 'Windows NT 6.1; WOW64', weight: 3 },
        { name: 'Windows NT 6.1', weight: 2 },
        { name: 'Windows NT 6.0; Win64; x64', weight: 1 },
        { name: 'Windows NT 6.0', weight: 1 },
        { name: 'Windows NT 5.1', weight: 2 },
        { name: 'Windows NT 5.2; Win64; x64', weight: 1 },
        { name: 'Windows NT 5.0', weight: 1 },
        { name: 'Windows 98; Win 9x 4.90', weight: 1 },
        { name: 'Windows CE', weight: 1 }
    ],
    macos: [
        { name: 'Macintosh; Intel Mac OS X 10_14_6', weight: 5 },
        { name: 'Macintosh; Intel Mac OS X 10_15_0', weight: 6 },
        { name: 'Macintosh; Intel Mac OS X 10_15_7', weight: 12 },
        { name: 'Macintosh; Intel Mac OS X 11_0', weight: 6 },
        { name: 'Macintosh; Intel Mac OS X 11_2', weight: 5 },
        { name: 'Macintosh; Intel Mac OS X 11_4', weight: 5 },
        { name: 'Macintosh; Intel Mac OS X 11_6', weight: 6 },
        { name: 'Macintosh; Intel Mac OS X 12_0', weight: 8 },
        { name: 'Macintosh; Intel Mac OS X 12_3', weight: 6 },
        { name: 'Macintosh; Intel Mac OS X 12_6', weight: 7 },
        { name: 'Macintosh; Intel Mac OS X 13_0', weight: 10 },
        { name: 'Macintosh; Intel Mac OS X 13_2', weight: 8 },
        { name: 'Macintosh; Intel Mac OS X 13_4', weight: 9 },
        { name: 'Macintosh; Intel Mac OS X 13_6', weight: 8 },
        { name: 'Macintosh; Intel Mac OS X 14_0', weight: 12 },
        { name: 'Macintosh; Intel Mac OS X 14_1', weight: 10 },
        { name: 'Macintosh; Intel Mac OS X 14_2', weight: 10 },
        { name: 'Macintosh; Intel Mac OS X 14_3', weight: 9 },
        { name: 'Macintosh; Intel Mac OS X 14_4', weight: 10 },
        { name: 'Macintosh; Intel Mac OS X 14_5', weight: 8 },
        { name: 'Macintosh; Intel Mac OS X 15_0', weight: 8 },
        { name: 'Macintosh; Intel Mac OS X 15_1', weight: 6 },
        { name: 'Macintosh; Apple M1', weight: 15 },
        { name: 'Macintosh; Apple M1 Pro', weight: 10 },
        { name: 'Macintosh; Apple M1 Max', weight: 8 },
        { name: 'Macintosh; Apple M1 Ultra', weight: 5 },
        { name: 'Macintosh; Apple M2', weight: 12 },
        { name: 'Macintosh; Apple M2 Pro', weight: 8 },
        { name: 'Macintosh; Apple M2 Max', weight: 6 },
        { name: 'Macintosh; Apple M2 Ultra', weight: 4 },
        { name: 'Macintosh; Apple M3', weight: 10 },
        { name: 'Macintosh; Apple M3 Pro', weight: 7 },
        { name: 'Macintosh; Apple M3 Max', weight: 5 },
        { name: 'Macintosh; Apple M4', weight: 5 },
        { name: 'Macintosh; Apple M4 Pro', weight: 3 }
    ],
    linux: [
        { name: 'X11; Linux x86_64', weight: 25 },
        { name: 'X11; Linux i686', weight: 5 },
        { name: 'X11; Linux aarch64', weight: 10 },
        { name: 'X11; Linux armv7l', weight: 3 },
        { name: 'X11; Ubuntu; Linux x86_64', weight: 20 },
        { name: 'X11; Ubuntu; Linux i686', weight: 3 },
        { name: 'X11; Fedora; Linux x86_64', weight: 12 },
        { name: 'X11; Arch Linux x86_64', weight: 8 },
        { name: 'X11; Arch; Linux x86_64', weight: 6 },
        { name: 'X11; Debian; Linux x86_64', weight: 12 },
        { name: 'X11; CentOS; Linux x86_64', weight: 8 },
        { name: 'X11; RHEL; Linux x86_64', weight: 5 },
        { name: 'X11; Manjaro; Linux x86_64', weight: 6 },
        { name: 'X11; openSUSE; Linux x86_64', weight: 4 },
        { name: 'X11; Pop!_OS; Linux x86_64', weight: 6 },
        { name: 'X11; Elementary OS; Linux x86_64', weight: 3 },
        { name: 'X11; Kali; Linux x86_64', weight: 5 },
        { name: 'X11; Mint; Linux x86_64', weight: 8 },
        { name: 'X11; Gentoo; Linux x86_64', weight: 3 },
        { name: 'X11; Slackware; Linux x86_64', weight: 2 },
        { name: 'X11; Mageia; Linux x86_64', weight: 2 },
        { name: 'X11; PCLinuxOS; Linux x86_64', weight: 2 },
        { name: 'X11; Zorin OS; Linux x86_64', weight: 4 },
        { name: 'X11; MX Linux; Linux x86_64', weight: 3 },
        { name: 'X11; EndeavourOS; Linux x86_64', weight: 3 },
        { name: 'X11; Void; Linux x86_64', weight: 2 },
        { name: 'X11; NixOS; Linux x86_64', weight: 2 },
        { name: 'X11; Alpine; Linux x86_64', weight: 3 },
        { name: 'X11; Clear Linux; Linux x86_64', weight: 2 },
        { name: 'X11; Solus; Linux x86_64', weight: 2 },
        { name: 'X11; Garuda; Linux x86_64', weight: 2 },
        { name: 'X11; ArcoLinux; Linux x86_64', weight: 2 },
        { name: 'X11; Parrot; Linux x86_64', weight: 3 },
        { name: 'X11; BlackArch; Linux x86_64', weight: 2 },
        { name: 'X11; Raspbian; Linux armv7l', weight: 5 },
        { name: 'X11; Raspberry Pi OS; Linux aarch64', weight: 6 }
    ],
    android: [
        { name: 'Linux; Android 8.0', weight: 3 },
        { name: 'Linux; Android 8.1', weight: 4 },
        { name: 'Linux; Android 9', weight: 8 },
        { name: 'Linux; Android 10', weight: 12 },
        { name: 'Linux; Android 11', weight: 15 },
        { name: 'Linux; Android 12', weight: 18 },
        { name: 'Linux; Android 12L', weight: 5 },
        { name: 'Linux; Android 13', weight: 22 },
        { name: 'Linux; Android 14', weight: 25 },
        { name: 'Linux; Android 15', weight: 12 }
    ],
    ios: [
        { name: 'iPhone; CPU iPhone OS 12_0 like Mac OS X', weight: 2 },
        { name: 'iPhone; CPU iPhone OS 13_0 like Mac OS X', weight: 4 },
        { name: 'iPhone; CPU iPhone OS 14_0 like Mac OS X', weight: 6 },
        { name: 'iPhone; CPU iPhone OS 14_8 like Mac OS X', weight: 5 },
        { name: 'iPhone; CPU iPhone OS 15_0 like Mac OS X', weight: 10 },
        { name: 'iPhone; CPU iPhone OS 15_7 like Mac OS X', weight: 8 },
        { name: 'iPhone; CPU iPhone OS 16_0 like Mac OS X', weight: 15 },
        { name: 'iPhone; CPU iPhone OS 16_6 like Mac OS X', weight: 12 },
        { name: 'iPhone; CPU iPhone OS 17_0 like Mac OS X', weight: 20 },
        { name: 'iPhone; CPU iPhone OS 17_2 like Mac OS X', weight: 15 },
        { name: 'iPhone; CPU iPhone OS 17_4 like Mac OS X', weight: 18 },
        { name: 'iPhone; CPU iPhone OS 17_5 like Mac OS X', weight: 16 },
        { name: 'iPhone; CPU iPhone OS 17_6 like Mac OS X', weight: 14 },
        { name: 'iPhone; CPU iPhone OS 18_0 like Mac OS X', weight: 15 },
        { name: 'iPhone; CPU iPhone OS 18_1 like Mac OS X', weight: 12 },
        { name: 'iPhone; CPU iPhone OS 18_2 like Mac OS X', weight: 10 },
        { name: 'iPad; CPU OS 14_0 like Mac OS X', weight: 5 },
        { name: 'iPad; CPU OS 15_0 like Mac OS X', weight: 8 },
        { name: 'iPad; CPU OS 16_0 like Mac OS X', weight: 12 },
        { name: 'iPad; CPU OS 17_0 like Mac OS X', weight: 18 },
        { name: 'iPad; CPU OS 18_0 like Mac OS X', weight: 12 },
        { name: 'iPod touch; CPU iPhone OS 15_0 like Mac OS X', weight: 2 },
        { name: 'iPod touch; CPU iPhone OS 16_0 like Mac OS X', weight: 1 }
    ],
    chromeos: [
        { name: 'X11; CrOS x86_64 13729.56.0', weight: 8 },
        { name: 'X11; CrOS x86_64 14268.67.0', weight: 10 },
        { name: 'X11; CrOS x86_64 14541.0.0', weight: 15 },
        { name: 'X11; CrOS x86_64 14816.131.0', weight: 12 },
        { name: 'X11; CrOS x86_64 15117.0.0', weight: 18 },
        { name: 'X11; CrOS x86_64 15359.0.0', weight: 20 },
        { name: 'X11; CrOS x86_64 15474.0.0', weight: 15 },
        { name: 'X11; CrOS aarch64 14541.0.0', weight: 10 },
        { name: 'X11; CrOS aarch64 15359.0.0', weight: 15 },
        { name: 'X11; CrOS armv7l 13729.56.0', weight: 5 },
        { name: 'X11; CrOS armv7l 14541.0.0', weight: 7 }
    ],
    freebsd: [
        { name: 'X11; FreeBSD amd64', weight: 50 },
        { name: 'X11; FreeBSD i386', weight: 15 },
        { name: 'X11; FreeBSD arm64', weight: 20 },
        { name: 'X11; FreeBSD 13.2-RELEASE amd64', weight: 8 },
        { name: 'X11; FreeBSD 14.0-RELEASE amd64', weight: 7 }
    ],
    openbsd: [
        { name: 'X11; OpenBSD amd64', weight: 60 },
        { name: 'X11; OpenBSD i386', weight: 20 },
        { name: 'X11; OpenBSD arm64', weight: 20 }
    ],
    netbsd: [
        { name: 'X11; NetBSD amd64', weight: 50 },
        { name: 'X11; NetBSD i386', weight: 25 },
        { name: 'X11; NetBSD evbarm', weight: 25 }
    ],
    dragonfly: [
        { name: 'X11; DragonFly x86_64', weight: 100 }
    ],
    solaris: [
        { name: 'X11; SunOS sun4u', weight: 40 },
        { name: 'X11; SunOS i86pc', weight: 40 },
        { name: 'X11; illumos i86pc', weight: 20 }
    ],
    haiku: [
        { name: 'Haiku x86_64', weight: 70 },
        { name: 'Haiku x86', weight: 30 }
    ],
    aix: [
        { name: 'AIX', weight: 100 }
    ],
    hpux: [
        { name: 'HP-UX', weight: 100 }
    ],
    playstation: [
        { name: 'PlayStation 4 7.55', weight: 20 },
        { name: 'PlayStation 4 9.00', weight: 25 },
        { name: 'PlayStation 4 11.00', weight: 15 },
        { name: 'PlayStation 5 5.00', weight: 25 },
        { name: 'PlayStation 5 8.00', weight: 20 },
        { name: 'PlayStation Vita 3.74', weight: 10 },
        { name: 'PlayStation Portable 6.61', weight: 5 }
    ],
    xbox: [
        { name: 'Xbox One', weight: 30 },
        { name: 'Xbox One S', weight: 20 },
        { name: 'Xbox One X', weight: 15 },
        { name: 'Xbox Series S', weight: 15 },
        { name: 'Xbox Series X', weight: 20 }
    ],
    nintendo: [
        { name: 'Nintendo Switch', weight: 60 },
        { name: 'Nintendo 3DS', weight: 25 },
        { name: 'Nintendo WiiU', weight: 15 }
    ],
    tv: [
        { name: 'SMART-TV; Linux; Tizen 4.0', weight: 10 },
        { name: 'SMART-TV; Linux; Tizen 5.0', weight: 15 },
        { name: 'SMART-TV; Linux; Tizen 5.5', weight: 15 },
        { name: 'SMART-TV; Linux; Tizen 6.0', weight: 18 },
        { name: 'SMART-TV; Linux; Tizen 6.5', weight: 20 },
        { name: 'SMART-TV; Linux; Tizen 7.0', weight: 15 },
        { name: 'Web0S; Linux/SmartTV', weight: 20 },
        { name: 'WebOS; Linux/SmartTV', weight: 18 },
        { name: 'BRAVIA 4K 2020; Linux', weight: 10 },
        { name: 'BRAVIA 4K 2021; Linux', weight: 12 },
        { name: 'BRAVIA 4K 2022; Linux', weight: 10 },
        { name: 'AndroidTV 9; NVIDIA SHIELD', weight: 8 },
        { name: 'AndroidTV 10; NVIDIA SHIELD', weight: 10 },
        { name: 'AndroidTV 11; NVIDIA SHIELD', weight: 12 },
        { name: 'Roku/DVP-10.0', weight: 10 },
        { name: 'Roku/DVP-11.0', weight: 12 },
        { name: 'Roku/DVP-12.0', weight: 15 },
        { name: 'FireTV', weight: 15 },
        { name: 'Fire TV Stick', weight: 12 },
        { name: 'Fire TV Cube', weight: 8 },
        { name: 'VIDAA/4.0', weight: 8 },
        { name: 'VIDAA/5.0', weight: 10 },
        { name: 'Vizio SmartTV', weight: 10 },
        { name: 'Philips Smart TV', weight: 8 },
        { name: 'Apple TV', weight: 15 }
    ],
    wearable: [
        { name: 'Linux; Wear OS 3', weight: 40 },
        { name: 'Linux; Wear OS 4', weight: 35 },
        { name: 'watchOS 9', weight: 15 },
        { name: 'watchOS 10', weight: 10 }
    ],
    car: [
        { name: 'Android Automotive 12', weight: 30 },
        { name: 'Android Automotive 13', weight: 35 },
        { name: 'Android Automotive 14', weight: 25 },
        { name: 'CarPlay', weight: 10 }
    ],
    vr: [
        { name: 'Meta Quest 2', weight: 30 },
        { name: 'Meta Quest 3', weight: 35 },
        { name: 'Meta Quest Pro', weight: 15 },
        { name: 'Pico 4', weight: 10 },
        { name: 'Apple Vision Pro', weight: 10 }
    ],
    ereader: [
        { name: 'Kindle', weight: 50 },
        { name: 'Kindle Paperwhite', weight: 30 },
        { name: 'Kobo', weight: 20 }
    ]
};

const DEVICES = [
    'SM-G950F', 'SM-G955F', 'SM-G960F', 'SM-G965F', 'SM-G970F', 'SM-G973F', 'SM-G975F', 'SM-G980F', 'SM-G985F', 'SM-G988B',
    'SM-G990B', 'SM-G991B', 'SM-G996B', 'SM-G998B', 'SM-S901B', 'SM-S906B', 'SM-S908B', 'SM-S911B', 'SM-S916B', 'SM-S918B',
    'SM-S921B', 'SM-S926B', 'SM-S928B', 'SM-F900F', 'SM-F916B', 'SM-F926B', 'SM-F936B', 'SM-F946B', 'SM-F956B',
    'SM-N950F', 'SM-N960F', 'SM-N970F', 'SM-N975F', 'SM-N980F', 'SM-N981B', 'SM-N985F', 'SM-N986B',
    'SM-A105F', 'SM-A205F', 'SM-A305F', 'SM-A505F', 'SM-A515F', 'SM-A525F', 'SM-A535F', 'SM-A536B', 'SM-A546B', 'SM-A556B',
    'SM-M105F', 'SM-M205F', 'SM-M305F', 'SM-M515F', 'SM-M526B', 'SM-M536B', 'SM-M546B',
    'Pixel 2', 'Pixel 2 XL', 'Pixel 3', 'Pixel 3 XL', 'Pixel 3a', 'Pixel 3a XL', 'Pixel 4', 'Pixel 4 XL', 'Pixel 4a', 'Pixel 4a 5G',
    'Pixel 5', 'Pixel 5a', 'Pixel 6', 'Pixel 6 Pro', 'Pixel 6a', 'Pixel 7', 'Pixel 7 Pro', 'Pixel 7a',
    'Pixel 8', 'Pixel 8 Pro', 'Pixel 8a', 'Pixel 9', 'Pixel 9 Pro', 'Pixel 9 Pro XL', 'Pixel 9 Pro Fold', 'Pixel Fold', 'Pixel Tablet',
    'OnePlus 5', 'OnePlus 5T', 'OnePlus 6', 'OnePlus 6T', 'OnePlus 7', 'OnePlus 7 Pro', 'OnePlus 7T', 'OnePlus 7T Pro',
    'OnePlus 8', 'OnePlus 8 Pro', 'OnePlus 8T', 'OnePlus 9', 'OnePlus 9 Pro', 'OnePlus 9R', 'OnePlus 9RT',
    'OnePlus 10 Pro', 'OnePlus 10T', 'OnePlus 10R', 'OnePlus 11', 'OnePlus 11R', 'OnePlus 12', 'OnePlus 12R',
    'OnePlus Nord', 'OnePlus Nord N10', 'OnePlus Nord N100', 'OnePlus Nord 2', 'OnePlus Nord CE', 'OnePlus Nord CE 2', 'OnePlus Nord 3', 'OnePlus Nord CE 3',
    'MI 8', 'MI 9', 'MI 10', 'MI 11', 'MI 12', 'Xiaomi 12', 'Xiaomi 12 Pro', 'Xiaomi 12S', 'Xiaomi 12S Ultra',
    'Xiaomi 13', 'Xiaomi 13 Pro', 'Xiaomi 13 Ultra', 'Xiaomi 14', 'Xiaomi 14 Pro', 'Xiaomi 14 Ultra', 'Xiaomi MIX 4', 'Xiaomi MIX Fold', 'Xiaomi MIX Fold 2', 'Xiaomi MIX Fold 3',
    'Redmi Note 7', 'Redmi Note 8', 'Redmi Note 9', 'Redmi Note 10', 'Redmi Note 11', 'Redmi Note 12', 'Redmi Note 13',
    'Redmi Note 7 Pro', 'Redmi Note 8 Pro', 'Redmi Note 9 Pro', 'Redmi Note 10 Pro', 'Redmi Note 11 Pro', 'Redmi Note 12 Pro', 'Redmi Note 13 Pro',
    'Redmi K20', 'Redmi K20 Pro', 'Redmi K30', 'Redmi K30 Pro', 'Redmi K40', 'Redmi K40 Pro', 'Redmi K50', 'Redmi K50 Pro', 'Redmi K60', 'Redmi K60 Pro', 'Redmi K70', 'Redmi K70 Pro',
    'POCO F1', 'POCO F2 Pro', 'POCO F3', 'POCO F4', 'POCO F5', 'POCO F6', 'POCO F6 Pro',
    'POCO X2', 'POCO X3', 'POCO X3 Pro', 'POCO X4 Pro', 'POCO X5', 'POCO X5 Pro', 'POCO X6', 'POCO X6 Pro',
    'POCO M3', 'POCO M4 Pro', 'POCO M5', 'POCO M6 Pro',
    'OPPO Find X', 'OPPO Find X2', 'OPPO Find X2 Pro', 'OPPO Find X3', 'OPPO Find X3 Pro', 'OPPO Find X5', 'OPPO Find X5 Pro', 'OPPO Find X6', 'OPPO Find X6 Pro', 'OPPO Find X7', 'OPPO Find X7 Ultra',
    'OPPO Find N', 'OPPO Find N2', 'OPPO Find N2 Flip', 'OPPO Find N3', 'OPPO Find N3 Flip',
    'OPPO Reno', 'OPPO Reno2', 'OPPO Reno3', 'OPPO Reno4', 'OPPO Reno5', 'OPPO Reno6', 'OPPO Reno7', 'OPPO Reno8', 'OPPO Reno9', 'OPPO Reno10', 'OPPO Reno11', 'OPPO Reno12',
    'OPPO A5', 'OPPO A9', 'OPPO A52', 'OPPO A72', 'OPPO A74', 'OPPO A78', 'OPPO A98', 'OPPO A99',
    'vivo X50', 'vivo X50 Pro', 'vivo X60', 'vivo X60 Pro', 'vivo X70', 'vivo X70 Pro', 'vivo X80', 'vivo X80 Pro', 'vivo X90', 'vivo X90 Pro', 'vivo X100', 'vivo X100 Pro',
    'vivo V20', 'vivo V21', 'vivo V23', 'vivo V25', 'vivo V27', 'vivo V29', 'vivo V30',
    'vivo Y20', 'vivo Y21', 'vivo Y33', 'vivo Y53', 'vivo Y73', 'vivo Y78', 'vivo Y100',
    'vivo iQOO 3', 'vivo iQOO 5', 'vivo iQOO 7', 'vivo iQOO 9', 'vivo iQOO 10', 'vivo iQOO 11', 'vivo iQOO 12',
    'vivo iQOO Neo 3', 'vivo iQOO Neo 5', 'vivo iQOO Neo 6', 'vivo iQOO Neo 7', 'vivo iQOO Neo 8', 'vivo iQOO Neo 9',
    'Huawei P20', 'Huawei P20 Pro', 'Huawei P30', 'Huawei P30 Pro', 'Huawei P40', 'Huawei P40 Pro', 'Huawei P50', 'Huawei P50 Pro', 'Huawei P60', 'Huawei P60 Pro',
    'Huawei Mate 20', 'Huawei Mate 20 Pro', 'Huawei Mate 30', 'Huawei Mate 30 Pro', 'Huawei Mate 40', 'Huawei Mate 40 Pro', 'Huawei Mate 50', 'Huawei Mate 50 Pro', 'Huawei Mate 60', 'Huawei Mate 60 Pro',
    'Huawei Mate X', 'Huawei Mate X2', 'Huawei Mate Xs', 'Huawei Mate X3', 'Huawei Mate X5',
    'Huawei Pura 70', 'Huawei Pura 70 Pro', 'Huawei Pura 70 Ultra',
    'HONOR 50', 'HONOR 60', 'HONOR 70', 'HONOR 80', 'HONOR 90', 'HONOR 100',
    'HONOR Magic3', 'HONOR Magic4', 'HONOR Magic5', 'HONOR Magic6', 'HONOR Magic V', 'HONOR Magic V2', 'HONOR Magic V3', 'HONOR Magic Vs',
    'realme 5', 'realme 6', 'realme 7', 'realme 8', 'realme 9', 'realme 10', 'realme 11', 'realme 12',
    'realme 5 Pro', 'realme 6 Pro', 'realme 7 Pro', 'realme 8 Pro', 'realme 9 Pro', 'realme 10 Pro', 'realme 11 Pro', 'realme 12 Pro',
    'realme GT', 'realme GT Neo', 'realme GT 2', 'realme GT Neo 2', 'realme GT 3', 'realme GT Neo 3', 'realme GT 5', 'realme GT Neo 5', 'realme GT 6', 'realme GT Neo 6',
    'Sony Xperia 1', 'Sony Xperia 1 II', 'Sony Xperia 1 III', 'Sony Xperia 1 IV', 'Sony Xperia 1 V', 'Sony Xperia 1 VI',
    'Sony Xperia 5', 'Sony Xperia 5 II', 'Sony Xperia 5 III', 'Sony Xperia 5 IV', 'Sony Xperia 5 V',
    'Sony Xperia 10', 'Sony Xperia 10 II', 'Sony Xperia 10 III', 'Sony Xperia 10 IV', 'Sony Xperia 10 V', 'Sony Xperia 10 VI',
    'Sony Xperia Pro', 'Sony Xperia Pro-I',
    'Motorola Edge', 'Motorola Edge+', 'Motorola Edge 20', 'Motorola Edge 30', 'Motorola Edge 40', 'Motorola Edge 50',
    'Motorola Edge 20 Pro', 'Motorola Edge 30 Pro', 'Motorola Edge 40 Pro', 'Motorola Edge 50 Pro',
    'Motorola Razr 2020', 'Motorola Razr 5G', 'Motorola Razr 2022', 'Motorola Razr 40', 'Motorola Razr 40 Ultra', 'Motorola Razr 50', 'Motorola Razr 50 Ultra',
    'moto g power', 'moto g stylus', 'moto g play', 'moto g fast', 'moto g pure',
    'moto g52', 'moto g62', 'moto g72', 'moto g82', 'moto g84', 'moto g54', 'moto g64', 'moto g73', 'moto g74',
    'Nokia 7.2', 'Nokia 8.1', 'Nokia 8.3', 'Nokia 9 PureView', 'Nokia X10', 'Nokia X20', 'Nokia X30', 'Nokia XR20', 'Nokia XR21',
    'Nokia G10', 'Nokia G20', 'Nokia G50', 'Nokia G60', 'Nokia G22', 'Nokia G42', 'Nokia G310', 'Nokia G42', 'Nokia C02', 'Nokia C12', 'Nokia C22', 'Nokia C32',
    'LG G7', 'LG G8', 'LG V40', 'LG V50', 'LG V60', 'LG Velvet', 'LG Wing',
    'ASUS ROG Phone', 'ASUS ROG Phone II', 'ASUS ROG Phone 3', 'ASUS ROG Phone 5', 'ASUS ROG Phone 6', 'ASUS ROG Phone 7', 'ASUS ROG Phone 8',
    'ASUS Zenfone 6', 'ASUS Zenfone 7', 'ASUS Zenfone 8', 'ASUS Zenfone 9', 'ASUS Zenfone 10', 'ASUS Zenfone 11',
    'ZTE Axon 10 Pro', 'ZTE Axon 20', 'ZTE Axon 30', 'ZTE Axon 40', 'ZTE Axon 50', 'ZTE Axon 60',
    'ZTE Nubia Red Magic 3', 'ZTE Nubia Red Magic 5G', 'ZTE Nubia Red Magic 6', 'ZTE Nubia Red Magic 7', 'ZTE Nubia Red Magic 8', 'ZTE Nubia Red Magic 9', 'ZTE Nubia Z60',
    'Nothing Phone 1', 'Nothing Phone 2', 'Nothing Phone 2a',
    'Google Tensor', 'Google Tensor G2', 'Google Tensor G3', 'Google Tensor G4',
    'Fairphone 3', 'Fairphone 4', 'Fairphone 5',
    'Meizu 16', 'Meizu 17', 'Meizu 18', 'Meizu 20', 'Meizu 21',
    'Lenovo Legion Phone Duel', 'Lenovo Legion Phone Duel 2', 'Lenovo Legion Y90',
    'Nubia Z50', 'Nubia Z50 Ultra', 'Nubia Z60 Ultra',
    'Black Shark 3', 'Black Shark 4', 'Black Shark 5',
    'Infinix Zero 5G', 'Infinix Note 12', 'Infinix Hot 12',
    'Tecno Camon 18', 'Tecno Phantom X', 'Tecno Pova 3',
    'itel A49', 'itel P36', 'itel Vision 1',
    'Cubot X30', 'Cubot KingKong 5',
    'Ulefone Armor 11', 'Ulefone Power Armor 14',
    'Doogee S96 Pro', 'Doogee V20',
    'Oukitel WP15', 'Oukitel K15',
    'Umidigi A11', 'Umidigi Bison',
    'TCL 10L', 'TCL 20', 'TCL 30', 'TCL 40',
    'Alcatel 1', 'Alcatel 3',
    'iPhone SE', 'iPhone SE 2nd', 'iPhone SE 3rd',
    'iPhone 6', 'iPhone 6s', 'iPhone 7', 'iPhone 7 Plus', 'iPhone 8', 'iPhone 8 Plus',
    'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
    'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
    'iPhone 12 mini', 'iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
    'iPhone 13 mini', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
    'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
    'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
    'iPad 9th', 'iPad 10th', 'iPad Air 4th', 'iPad Air 5th', 'iPad mini 6th',
    'iPad Pro 11-inch', 'iPad Pro 11-inch 2nd', 'iPad Pro 11-inch 3rd', 'iPad Pro 11-inch 4th',
    'iPad Pro 12.9-inch', 'iPad Pro 12.9-inch 2nd', 'iPad Pro 12.9-inch 3rd', 'iPad Pro 12.9-inch 4th', 'iPad Pro 12.9-inch 5th', 'iPad Pro 12.9-inch 6th'
];

const LANGUAGES = [
    'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-NZ', 'en-IN', 'en-ZA', 'en-IE', 'en-SG', 'en-PH', 'en-HK', 'en-MY', 'en-KE', 'en-NG', 'en-PK', 'en-JM', 'en-TT', 'en-BZ', 'en-ZW',
    'de-DE', 'de-AT', 'de-CH', 'de-LI', 'de-LU', 'de-BE',
    'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr-LU', 'fr-MC', 'fr-SN', 'fr-CI', 'fr-ML', 'fr-CM', 'fr-CD', 'fr-MG', 'fr-MA', 'fr-TN', 'fr-DZ', 'fr-HT',
    'es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL', 'es-PE', 'es-VE', 'es-EC', 'es-GT', 'es-CU', 'es-BO', 'es-DO', 'es-HN', 'es-PY', 'es-SV', 'es-NI', 'es-CR', 'es-PA', 'es-UY', 'es-PR', 'es-GQ', 'es-419',
    'pt-BR', 'pt-PT', 'pt-AO', 'pt-MZ', 'pt-CV', 'pt-GW', 'pt-ST', 'pt-TL',
    'it-IT', 'it-CH', 'it-SM', 'it-VA',
    'nl-NL', 'nl-BE', 'nl-SR', 'nl-AW', 'nl-CW', 'nl-SX', 'nl-BQ',
    'pl-PL', 'cs-CZ', 'sk-SK', 'hu-HU', 'ro-RO', 'ro-MD', 'sl-SI', 'hr-HR', 'sr-RS', 'sr-Latn-RS', 'bs-BA', 'bg-BG', 'uk-UA', 'be-BY', 'mk-MK', 'sq-AL', 'sq-XK', 'mt-MT',
    'ru-RU', 'ru-BY', 'ru-KZ', 'ru-UA', 'ru-KG', 'ru-MD', 'ru-TJ', 'ru-TM', 'ru-UZ', 'ru-LV', 'ru-LT', 'ru-EE',
    'tr-TR', 'tr-CY',
    'ar-SA', 'ar-AE', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-OM', 'ar-QA', 'ar-SY', 'ar-TN', 'ar-YE', 'ar-DZ', 'ar-BH', 'ar-PS', 'ar-SD', 'ar-SO', 'ar-DJ', 'ar-KM', 'ar-MR',
    'he-IL', 'fa-IR', 'fa-AF', 'ur-PK', 'ur-IN', 'ps-AF', 'ku-TR', 'ku-IQ',
    'ja-JP', 'ko-KR', 'ko-KP',
    'zh-CN', 'zh-TW', 'zh-HK', 'zh-SG', 'zh-MO', 'zh-Hans', 'zh-Hant',
    'th-TH', 'vi-VN', 'id-ID', 'ms-MY', 'ms-SG', 'ms-BN', 'tl-PH', 'fil-PH', 'jv-ID', 'su-ID', 'ceb-PH', 'war-PH',
    'hi-IN', 'bn-IN', 'bn-BD', 'ta-IN', 'ta-LK', 'ta-SG', 'ta-MY', 'te-IN', 'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN', 'pa-PK', 'or-IN', 'as-IN', 'ne-NP', 'ne-IN', 'si-LK', 'my-MM', 'km-KH', 'lo-LA',
    'sv-SE', 'sv-FI', 'da-DK', 'no-NO', 'nb-NO', 'nn-NO', 'fi-FI', 'is-IS', 'fo-FO',
    'el-GR', 'el-CY',
    'af-ZA', 'zu-ZA', 'xh-ZA', 'sw-KE', 'sw-TZ', 'sw-UG', 'am-ET', 'ti-ET', 'ti-ER', 'om-ET', 'so-SO', 'so-ET', 'so-KE', 'ha-NG', 'yo-NG', 'ig-NG', 'rw-RW', 'ny-MW', 'sn-ZW', 'ln-CD',
    'ca-ES', 'ca-AD', 'eu-ES', 'gl-ES', 'ast-ES', 'oc-FR',
    'ga-IE', 'cy-GB', 'gd-GB', 'gv-IM', 'kw-GB', 'br-FR',
    'et-EE', 'lv-LV', 'lt-LT',
    'ka-GE', 'hy-AM', 'az-AZ', 'az-Latn-AZ', 'kk-KZ', 'uz-UZ', 'uz-Latn-UZ', 'tg-TJ', 'ky-KG', 'tk-TM', 'mn-MN',
    'bo-CN', 'bo-IN', 'dz-BT', 'ug-CN',
    'mi-NZ', 'sm-WS', 'to-TO', 'fj-FJ', 'ty-PF', 'haw-US',
    'lb-LU', 'rm-CH', 'gsw-CH',
    'eo', 'ia', 'vo', 'ie',
    'la', 'grc',
    'quz-PE', 'ay-BO', 'gn-PY'
];

const BUILD_IDS = [];
for (let i = 0; i < 500; i++) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let j = 0; j < randomInt(6, 12); j++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    BUILD_IDS.push(id);
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
        random -= item.weight;
        if (random <= 0) return item.name;
    }
    return items[items.length - 1].name;
}

function generateChromeUA(os) {
    const version = randomItem(BROWSERS.chrome.versions);
    const build = randomInt(4000, 7000);
    const patch = randomInt(50, 350);
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.${build}.${patch} Safari/537.36`;
}

function generateFirefoxUA(os) {
    const version = randomItem(BROWSERS.firefox.versions);
    const subVersion = randomInt(0, 10);
    return `Mozilla/5.0 (${os}; rv:${version}.${subVersion}) Gecko/20100101 Firefox/${version}.${subVersion}`;
}

function generateSafariUA(os) {
    const version = randomItem(BROWSERS.safari.versions);
    const webkitVersion = randomItem(BROWSERS.safari.webkitVersions);
    return `Mozilla/5.0 (${os}) AppleWebKit/${webkitVersion} (KHTML, like Gecko) Version/${version} Safari/${webkitVersion}`;
}

function generateEdgeUA(os) {
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    const edgeVersion = randomItem(BROWSERS.edge.versions);
    const build = randomInt(4000, 7000);
    const patch = randomInt(50, 350);
    const edgeBuild = randomInt(1000, 3500);
    const edgePatch = randomInt(10, 99);
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${build}.${patch} Safari/537.36 Edg/${edgeVersion}.0.${edgeBuild}.${edgePatch}`;
}

function generateOperaUA(os) {
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    const operaVersion = randomItem(BROWSERS.opera.versions);
    const build = randomInt(4000, 7000);
    const patch = randomInt(50, 350);
    const operaBuild = randomInt(3000, 6000);
    const operaPatch = randomInt(10, 99);
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${build}.${patch} Safari/537.36 OPR/${operaVersion}.0.${operaBuild}.${operaPatch}`;
}

function generateBraveUA(os) {
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    const build = randomInt(4000, 7000);
    const patch = randomInt(50, 350);
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${build}.${patch} Safari/537.36 Brave/${randomItem(BROWSERS.brave.versions)}`;
}

function generateVivaldiUA(os) {
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    const build = randomInt(4000, 7000);
    const patch = randomInt(50, 350);
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${build}.${patch} Safari/537.36 Vivaldi/${randomItem(BROWSERS.vivaldi.versions)}`;
}

function generateYandexUA(os) {
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    const build = randomInt(4000, 7000);
    const patch = randomInt(50, 350);
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${build}.${patch} YaBrowser/${randomItem(BROWSERS.yandex.versions)} Safari/537.36`;
}

function generateSamsungBrowserUA(androidOs) {
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    const build = randomInt(4000, 7000);
    const patch = randomInt(50, 350);
    return `Mozilla/5.0 (${androidOs}) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/${randomItem(BROWSERS.samsung.versions)} Chrome/${chromeVersion}.0.${build}.${patch} Mobile Safari/537.36`;
}

function generateUCBrowserUA(androidOs) {
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    return `Mozilla/5.0 (${androidOs}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Mobile Safari/537.36 UCBrowser/${randomItem(BROWSERS.uc.versions)}`;
}

function generateMiuiBrowserUA(androidOs) {
    return `Mozilla/5.0 (${androidOs}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/${randomItem(BROWSERS.miui.versions)}`;
}

function generateHuaweiBrowserUA(androidOs) {
    return `Mozilla/5.0 (${androidOs}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 HuaweiBrowser/${randomItem(BROWSERS.huawei.versions)} Mobile Safari/537.36`;
}

function generateQQBrowserUA(androidOs) {
    return `Mozilla/5.0 (${androidOs}) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36 QQBrowser/${randomItem(BROWSERS.qq.versions)}`;
}

function generateBaiduBrowserUA(androidOs) {
    return `Mozilla/5.0 (${androidOs}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Mobile Safari/537.36 ${randomItem(BROWSERS.baidu.versions)}`;
}

function generateSogouBrowserUA(androidOs) {
    return `Mozilla/5.0 (${androidOs}) AppleWebKit/537.36 (KHTML, like Gecko) SogouMobileBrowser/${randomItem(BROWSERS.sogou.versions)} Chrome/72.0.3626.121 Safari/537.36`;
}

function generateWhaleBrowserUA(os) {
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Whale/${randomItem(BROWSERS.whale.versions)} Safari/537.36`;
}

function generateMobileUA() {
    const android = weightedRandom(OPERATING_SYSTEMS.android);
    const device = randomItem(DEVICES);
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    const build = randomInt(4000, 7000);
    const patch = randomInt(50, 350);
    const fullOs = `${android}; ${device}`;
    
    const browserRand = Math.random();
    if (browserRand < 0.55) {
        return `Mozilla/5.0 (${fullOs}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${build}.${patch} Mobile Safari/537.36`;
    } else if (browserRand < 0.65) {
        const ffVersion = randomItem(BROWSERS.firefox.versions);
        return `Mozilla/5.0 (${fullOs}; rv:${ffVersion}.0) Gecko/${ffVersion}.0 Firefox/${ffVersion}.0`;
    } else if (browserRand < 0.72) {
        return generateSamsungBrowserUA(fullOs);
    } else if (browserRand < 0.78) {
        return `Mozilla/5.0 (${fullOs}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${build}.${patch} Mobile Safari/537.36 OPR/${randomItem(BROWSERS.opera.versions)}.0.0`;
    } else if (browserRand < 0.83) {
        return generateUCBrowserUA(fullOs);
    } else if (browserRand < 0.87) {
        return generateMiuiBrowserUA(fullOs);
    } else if (browserRand < 0.90) {
        return generateHuaweiBrowserUA(fullOs);
    } else if (browserRand < 0.93) {
        return generateQQBrowserUA(fullOs);
    } else if (browserRand < 0.96) {
        return generateBaiduBrowserUA(fullOs);
    } else {
        return generateSogouBrowserUA(fullOs);
    }
}

function generateIOSUA() {
    const ios = weightedRandom(OPERATING_SYSTEMS.ios);
    const webkitVersion = randomItem(['605.1.15', '604.1', '603.1.30']);
    const safariVersion = randomItem(BROWSERS.safari.versions);
    const buildId = randomItem(BUILD_IDS);
    
    const browserRand = Math.random();
    if (browserRand < 0.50) {
        return `Mozilla/5.0 (${ios}) AppleWebKit/${webkitVersion} (KHTML, like Gecko) Version/${safariVersion} Mobile/${buildId} Safari/${webkitVersion}`;
    } else if (browserRand < 0.75) {
        const chromeVersion = randomItem(BROWSERS.chrome.versions);
        return `Mozilla/5.0 (${ios}) AppleWebKit/${webkitVersion} (KHTML, like Gecko) CriOS/${chromeVersion}.0.${randomInt(4000, 7000)}.${randomInt(50, 350)} Mobile/${buildId} Safari/${webkitVersion}`;
    } else if (browserRand < 0.88) {
        const ffVersion = randomItem(BROWSERS.firefox.versions);
        return `Mozilla/5.0 (${ios}) AppleWebKit/${webkitVersion} (KHTML, like Gecko) FxiOS/${ffVersion}.0 Mobile/${buildId} Safari/${webkitVersion}`;
    } else if (browserRand < 0.94) {
        const edgeVersion = randomItem(BROWSERS.edge.versions);
        return `Mozilla/5.0 (${ios}) AppleWebKit/${webkitVersion} (KHTML, like Gecko) EdgiOS/${edgeVersion}.0.${randomInt(1000, 2500)} Mobile/${buildId} Safari/${webkitVersion}`;
    } else {
        const operaVersion = randomItem(BROWSERS.opera.versions);
        return `Mozilla/5.0 (${ios}) AppleWebKit/${webkitVersion} (KHTML, like Gecko) OPiOS/${operaVersion}.0.${randomInt(100, 500)} Mobile/${buildId} Safari/${webkitVersion}`;
    }
}

function generateCrawlerUA() {
    const crawlers = [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.139 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/131.0.6778.139 Safari/537.36',
        'Googlebot-Image/1.0',
        'Googlebot-Video/1.0',
        'Googlebot-News',
        'Mediapartners-Google',
        'AdsBot-Google (+http://www.google.com/adsbot.html)',
        'AdsBot-Google-Mobile (+http://www.google.com/mobile/adsbot.html)',
        'APIs-Google (+https://developers.google.com/webmasters/APIs-Google.html)',
        'Google-Read-Aloud',
        'Google-Site-Verification/1.0',
        'Google-Adwords-Instant (+http://www.google.com/adsbot.html)',
        'Feedfetcher-Google; (+http://www.google.com/feedfetcher.html)',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/131.0.0.0 Safari/537.36',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/W.X.Y.Z Safari/537.36 Edg/W.X.Y.Z',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'msnbot/2.0b (+http://search.msn.com/msnbot.htm)',
        'msnbot-media/1.1 (+http://search.msn.com/msnbot.htm)',
        'BingPreview/1.0b',
        'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
        'Mozilla/5.0 (compatible; YandexImages/3.0; +http://yandex.com/bots)',
        'Mozilla/5.0 (compatible; YandexVideo/3.0; +http://yandex.com/bots)',
        'Mozilla/5.0 (compatible; YandexMedia/3.0; +http://yandex.com/bots)',
        'Mozilla/5.0 (compatible; YandexNews/4.0; +http://yandex.com/bots)',
        'Mozilla/5.0 (compatible; YandexMetrika/2.0; +http://yandex.com/bots)',
        'Mozilla/5.0 (compatible; YandexDirect/3.0; +http://yandex.com/bots)',
        'Mozilla/5.0 (compatible; YandexAccessibilityBot/3.0; +http://yandex.com/bots)',
        'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
        'Mozilla/5.0 (compatible; Baiduspider-render/2.0; +http://www.baidu.com/search/spider.html)',
        'Mozilla/5.0 (compatible; Baiduspider-image/2.0; +http://www.baidu.com/search/spider.html)',
        'Mozilla/5.0 (compatible; Baiduspider-video/2.0; +http://www.baidu.com/search/spider.html)',
        'Baiduspider-news+(+http://www.baidu.com/search/spider.htm)',
        'Sogou web spider/4.0(+http://www.sogou.com/docs/help/webmasters.htm#07)',
        'Sogou News Spider/4.0(+http://www.sogou.com/docs/help/webmasters.htm#07)',
        '360Spider',
        'HaoSouSpider',
        'Bytespider/1.0',
        'Mozilla/5.0 (compatible; ByteDance; TikTok)',
        'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)',
        'DuckDuckGo-Favicons-Bot/1.0 (+http://duckduckgo.com)',
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'facebookcatalog/1.0',
        'Facebot',
        'Meta-ExternalAgent/1.1 (+https://www.facebook.com/externalhit_uatext.php)',
        'Twitterbot/1.0',
        'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
        'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
        'Slackbot 1.0(+https://api.slack.com/robots)',
        'WhatsApp/2.23.20.0 A',
        'WhatsApp/2.23.20.0 I',
        'TelegramBot (like TwitterBot)',
        'Discordbot/2.0',
        'Pinterest/0.2 (+http://www.pinterest.com/)',
        'Pinterestbot/1.0 (+http://www.pinterest.com/bot.html)',
        'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
        'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
        'Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)',
        'Mozilla/5.0 (compatible; DotBot/1.2; +https://opensiteexplorer.org/dotbot)',
        'Mozilla/5.0 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)',
        'Mozilla/5.0 (compatible; Applebot/0.3; +http://www.apple.com/go/applebot)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
        'CCBot/2.0 (https://commoncrawl.org/faq/)',
        'Mozilla/5.0 (compatible; DataForSeoBot/1.0; +https://dataforseo.com/dataforseo-bot)',
        'Mozilla/5.0 (compatible; Screaming Frog SEO Spider/19.0)',
        'Mozilla/5.0 (compatible; archive.org_bot +http://archive.org/details/archive.org_bot)',
        'ia_archiver (+http://www.alexa.com/site/help/webmasters; crawler@alexa.com)',
        'Mozilla/5.0 (compatible; Neevabot/1.0; +https://neeva.com/neevabot)',
        'Mozilla/5.0 (compatible; Seekport Crawler; http://seekport.com/)',
        'Mozilla/5.0 (compatible; SeznamBot/4.0; +http://napoveda.seznam.cz/seznambot-intro/)',
        'Mozilla/5.0 (compatible; Mail.RU_Bot/Img/2.0)',
        'Mozilla/5.0 (compatible; ZumBot/1.0; http://zum.com/searchbot.html)',
        'Mozilla/5.0 (compatible; Qwantify/2.4w; +https://www.qwant.com/)/2.4w',
        'Mozilla/5.0 (compatible; coccocbot-web/1.0; +http://help.coccoc.com/searchengine)',
        'Tweetmemebot/3.0 (+http://www.tweetmeme.com)',
        'claudebot',
        'Claude-User',
        'Claude-SearchBot/1.0',
        'ChatGPT-User',
        'GPTBot/1.0',
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1; +https://openai.com/gptbot)',
        'OAI-SearchBot/1.0',
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
        'anthropic-ai',
        'PerplexityBot',
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
        'cohere-ai',
        'Google-Extended',
        'YouBot/1.0 (+https://about.you.com/youbot/)',
        'Meta-ExternalFetcher/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
        'Amazonbot/0.1 (https://developer.amazon.com/amazonbot)',
        'Applebot-Extended/0.3',
        'omgili/0.5 +http://omgili.com',
        'webmeup-crawler.com (+webmeup-crawler.com)',
        'linkdexbot/2.1 (+http://www.linkdex.com/about/bots/)',
        'Exabot/3.0',
        'GrapeshotCrawler/2.0',
        'SEOkicks-Robot (http://www.seokicks.de/)',
        'BLEXBot/1.0',
        'Wotbox/2.01 (+http://www.wotbox.com/bot/)',
        'SeznamBot/3.2 (+http://napoveda.seznam.cz/en/seznambot-intro/)',
        'spbot/5.0.3 (+http://OpenLinkProfiler.org/bot)',
        'netsystemsresearch/1.0 (+http://www.netsystemsresearch.com/bot.html)',
        'python-requests/2.28.1',
        'python-requests/2.31.0',
        'python-httpx/0.24.1',
        'axios/1.4.0',
        'axios/1.6.2',
        'Go-http-client/1.1',
        'Go-http-client/2.0',
        'Scrapy/2.9.0',
        'curl/7.68.0',
        'curl/7.88.1',
        'curl/8.4.0',
        'Wget/1.21.4 (linux-gnu)',
        'Java/17.0.5',
        'okhttp/4.12.0',
        'libwww-perl/6.67',
        'PostmanRuntime/7.35.0',
        'insomnia/8.5.1',
        'httpie/3.2.2',
        'Ruby/3.2.2',
        'PHP/8.3.0',
        'Dart/3.2 (dart:io)',
        'Deno/1.38.0',
        'undici'
    ];
    return randomItem(crawlers);
}

function generateChromeOSUA() {
    const os = weightedRandom(OPERATING_SYSTEMS.chromeos);
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    const build = randomInt(4000, 7000);
    const patch = randomInt(50, 350);
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${build}.${patch} Safari/537.36`;
}

function generateSmartTVUA() {
    const tv = weightedRandom(OPERATING_SYSTEMS.tv);
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    return `Mozilla/5.0 (${tv}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
}

function generateConsoleUA() {
    const consoleRand = Math.random();
    if (consoleRand < 0.5) {
        const ps = weightedRandom(OPERATING_SYSTEMS.playstation);
        return `Mozilla/5.0 (${ps}) AppleWebKit/605.1.15 (KHTML, like Gecko)`;
    } else if (consoleRand < 0.85) {
        const xbox = weightedRandom(OPERATING_SYSTEMS.xbox);
        return `Mozilla/5.0 (Windows NT 10.0; ${xbox}; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edge/131.0.0.0`;
    } else {
        const nintendo = weightedRandom(OPERATING_SYSTEMS.nintendo);
        return `Mozilla/5.0 (${nintendo}; WifiWebAuthApplet) AppleWebKit/606.4 (KHTML, like Gecko) NF/6.0.1.15.4 NintendoBrowser/5.1.0.20393`;
    }
}

function generateWearableUA() {
    const wearable = weightedRandom(OPERATING_SYSTEMS.wearable);
    const chromeVersion = randomItem(BROWSERS.chrome.versions);
    return `Mozilla/5.0 (${wearable}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Mobile Safari/537.36`;
}

function generateVRUA() {
    const vr = weightedRandom(OPERATING_SYSTEMS.vr);
    if (vr.includes('Meta') || vr.includes('Pico')) {
        return `Mozilla/5.0 (X11; Linux x86_64; ${vr}) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/24.0.0.0.0 Chrome/115.0.0.0 VR Safari/537.36`;
    } else {
        return `Mozilla/5.0 (${vr}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15`;
    }
}

function generateCarUA() {
    const car = weightedRandom(OPERATING_SYSTEMS.car);
    return `Mozilla/5.0 (Linux; ${car}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`;
}

function generateEReaderUA() {
    const ereader = weightedRandom(OPERATING_SYSTEMS.ereader);
    if (ereader.includes('Kindle')) {
        return `Mozilla/5.0 (Linux; U; Android 4.4.3; ${ereader}) AppleWebKit/537.36 (KHTML, like Gecko) Silk/${randomItem(BROWSERS.silk.versions)} like Chrome/87.0.4280.141 Safari/537.36`;
    } else {
        return `Mozilla/5.0 (Linux; ${ereader}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.0 Safari/537.36`;
    }
}

function generateBSDUA() {
    const bsdRand = Math.random();
    let os;
    if (bsdRand < 0.5) {
        os = weightedRandom(OPERATING_SYSTEMS.freebsd);
    } else if (bsdRand < 0.8) {
        os = weightedRandom(OPERATING_SYSTEMS.openbsd);
    } else {
        os = weightedRandom(OPERATING_SYSTEMS.netbsd);
    }
    
    const browserRand = Math.random();
    if (browserRand < 0.6) {
        return generateFirefoxUA(os);
    } else {
        return generateChromeUA(os);
    }
}

function generateCurlLikeUA() {
    const tools = [
        `curl/${randomInt(7, 8)}.${randomInt(50, 88)}.${randomInt(0, 3)}`,
        `Wget/${randomInt(1, 1)}.${randomInt(20, 24)} (linux-gnu)`,
        `python-requests/${randomInt(2, 2)}.${randomInt(25, 31)}.${randomInt(0, 3)}`,
        `python-httpx/${randomInt(0, 0)}.${randomInt(23, 27)}.${randomInt(0, 3)}`,
        `python-urllib3/${randomInt(1, 2)}.${randomInt(0, 2)}.${randomInt(0, 5)}`,
        `aiohttp/${randomInt(3, 3)}.${randomInt(8, 10)}.${randomInt(0, 5)}`,
        `httpx/${randomInt(0, 0)}.${randomInt(25, 27)}.${randomInt(0, 2)}`,
        `axios/${randomInt(0, 1)}.${randomInt(4, 7)}.${randomInt(0, 5)}`,
        `node-fetch/${randomInt(2, 3)}.${randomInt(0, 6)}.${randomInt(0, 5)}`,
        `got/${randomInt(12, 14)}.${randomInt(0, 6)}.${randomInt(0, 5)}`,
        `ky/${randomInt(0, 1)}.${randomInt(0, 4)}.${randomInt(0, 5)}`,
        `superagent/${randomInt(8, 9)}.${randomInt(0, 5)}.${randomInt(0, 5)}`,
        `Go-http-client/${randomInt(1, 2)}.${randomInt(0, 1)}`,
        `Go-resty/${randomInt(2, 2)}.${randomInt(10, 14)}.${randomInt(0, 5)}`,
        `Java/${randomInt(11, 21)}.0.${randomInt(1, 10)}`,
        `Apache-HttpClient/${randomInt(4, 5)}.${randomInt(5, 5)}.${randomInt(10, 15)} (Java/${randomInt(11, 21)})`,
        `okhttp/${randomInt(4, 4)}.${randomInt(10, 12)}.${randomInt(0, 5)}`,
        `retrofit/${randomInt(2, 2)}.${randomInt(9, 11)}.${randomInt(0, 5)}`,
        `libwww-perl/${randomInt(6, 6)}.${randomInt(60, 70)}`,
        `LWP::Simple/${randomInt(6, 6)}.${randomInt(60, 70)}`,
        `Mechanize/${randomInt(2, 2)}.${randomInt(0, 5)}`,
        `WWW-Mechanize/${randomInt(2, 2)}.${randomInt(0, 18)}`,
        `Ruby/${randomInt(2, 3)}.${randomInt(0, 3)}.${randomInt(0, 5)}`,
        `Faraday/${randomInt(1, 2)}.${randomInt(0, 10)}.${randomInt(0, 5)}`,
        `RestClient/${randomInt(2, 2)}.${randomInt(0, 3)}.${randomInt(0, 5)}`,
        `PHP/${randomInt(7, 8)}.${randomInt(1, 4)}.${randomInt(0, 35)}`,
        `Guzzle/${randomInt(6, 7)}.${randomInt(0, 5)}.${randomInt(0, 10)}`,
        `PostmanRuntime/${randomInt(7, 7)}.${randomInt(30, 39)}.${randomInt(0, 5)}`,
        `insomnia/${randomInt(2023, 2024)}.${randomInt(1, 7)}.${randomInt(0, 5)}`,
        `HTTPie/${randomInt(3, 3)}.${randomInt(2, 2)}.${randomInt(2, 5)}`,
        `Dart/${randomInt(2, 3)}.${randomInt(0, 5)} (dart:io)`,
        `Deno/${randomInt(1, 1)}.${randomInt(35, 45)}.${randomInt(0, 5)}`,
        `Bun/${randomInt(1, 1)}.${randomInt(0, 1)}.${randomInt(0, 25)}`,
        `undici`,
        `httr/${randomInt(1, 1)}.${randomInt(4, 5)}.${randomInt(0, 5)}`,
        `RestSharp/${randomInt(106, 111)}.${randomInt(0, 15)}.${randomInt(0, 5)}`,
        `Typhoeus/${randomInt(1, 1)}.${randomInt(4, 5)}.${randomInt(0, 5)}`,
        `Scrapy/${randomInt(2, 2)}.${randomInt(8, 11)}.${randomInt(0, 5)}`,
        `scrapy-splash`,
        `Selenium`,
        `Puppeteer`,
        `Playwright`,
        `Cypress`,
        'HeadlessChrome',
        'PhantomJS/2.1.1',
        'SlimerJS',
        'htmlunit',
        'Lynx/2.9.0dev.10 libwww-FM/2.14',
        'Links (2.28; Linux 5.15.0)',
        'w3m/0.5.3+git20230121',
        'ELinks/0.15.0',
        'Googlebot-Image/1.0 (Fastbot)',
        `Nutch-${randomInt(1, 1)}.${randomInt(18, 20)} (+https://nutch.apache.org/)`,
        'Heritrix/3.4.0 (+https://github.com/internetarchive/heritrix3)',
        'StormCrawler/2.10',
        'Apache-HttpAsyncClient/5.2.1',
        'reactor-netty/1.1.13',
        'jetty-http-client',
        'ning/1.0',
        'async-http-client'
    ];
    return randomItem(tools);
}

function generateUA() {
    const rand = Math.random();
    let os;
    
    if (rand < 0.28) {
        os = weightedRandom(OPERATING_SYSTEMS.windows);
    } else if (rand < 0.42) {
        os = weightedRandom(OPERATING_SYSTEMS.macos);
    } else if (rand < 0.50) {
        os = weightedRandom(OPERATING_SYSTEMS.linux);
    } else if (rand < 0.72) {
        return generateMobileUA();
    } else if (rand < 0.85) {
        return generateIOSUA();
    } else if (rand < 0.89) {
        return generateChromeOSUA();
    } else if (rand < 0.93) {
        return generateCrawlerUA();
    } else if (rand < 0.95) {
        return generateSmartTVUA();
    } else if (rand < 0.96) {
        return generateConsoleUA();
    } else if (rand < 0.97) {
        return generateCurlLikeUA();
    } else if (rand < 0.98) {
        return generateBSDUA();
    } else if (rand < 0.985) {
        return generateWearableUA();
    } else if (rand < 0.99) {
        return generateVRUA();
    } else if (rand < 0.995) {
        return generateCarUA();
    } else {
        return generateEReaderUA();
    }
    
    const browserRand = Math.random();
    if (browserRand < 0.48) {
        return generateChromeUA(os);
    } else if (browserRand < 0.62) {
        return generateFirefoxUA(os);
    } else if (browserRand < 0.74) {
        return generateEdgeUA(os);
    } else if (browserRand < 0.82) {
        return generateSafariUA(os);
    } else if (browserRand < 0.88) {
        return generateOperaUA(os);
    } else if (browserRand < 0.92) {
        return generateBraveUA(os);
    } else if (browserRand < 0.95) {
        return generateVivaldiUA(os);
    } else if (browserRand < 0.97) {
        return generateYandexUA(os);
    } else {
        return generateWhaleBrowserUA(os);
    }
}

async function generateUAFile(outputPath, count = 10000000) {
    const writeStream = fs.createWriteStream(outputPath);
    const uniqueUAs = new Set();
    let lastProgress = 0;
    
    console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
    console.log(`║     🚀 ULTRA UA GENERATOR V5 - ${count.toLocaleString().padStart(14)} TARGET         ║`);
    console.log(`║                50+ Browsers | 35+ OS | 500+ Devices            ║`);
    console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);
    
    const batchSize = 100000;
    const startTime = Date.now();
    
    while (uniqueUAs.size < count) {
        const batch = [];
        for (let i = 0; i < batchSize && uniqueUAs.size < count; i++) {
            const ua = generateUA();
            if (!uniqueUAs.has(ua)) {
                uniqueUAs.add(ua);
                batch.push(ua);
            }
        }
        
        if (batch.length > 0) {
            writeStream.write(batch.join('\n') + '\n');
        }
        
        const progress = Math.floor((uniqueUAs.size / count) * 100);
        if (progress !== lastProgress && progress % 5 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = Math.floor(uniqueUAs.size / (elapsed || 1));
            console.log(`📊 Progress: ${progress}% | ${uniqueUAs.size.toLocaleString()}/${count.toLocaleString()} | ${rate.toLocaleString()}/s | ${elapsed}s`);
            lastProgress = progress;
        }
    }
    
    return new Promise((resolve, reject) => {
        writeStream.end(() => {
            const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`\n✅ Generated ${uniqueUAs.size.toLocaleString()} unique user agents in ${totalTime}s`);
            console.log(`📁 Saved to: ${outputPath}\n`);
            resolve({
                total: uniqueUAs.size,
                path: outputPath,
                timeSeconds: parseFloat(totalTime)
            });
        });
        writeStream.on('error', reject);
    });
}

function getRandomUA(uaFilePath) {
    try {
        const content = fs.readFileSync(uaFilePath, 'utf8');
        const uas = content.split('\n').filter(ua => ua.trim());
        return randomItem(uas);
    } catch (e) {
        return generateUA();
    }
}

function getRandomUAs(uaFilePath, count = 100) {
    try {
        const content = fs.readFileSync(uaFilePath, 'utf8');
        const uas = content.split('\n').filter(ua => ua.trim());
        const selected = [];
        for (let i = 0; i < count; i++) {
            selected.push(randomItem(uas));
        }
        return selected;
    } catch (e) {
        const generated = [];
        for (let i = 0; i < count; i++) {
            generated.push(generateUA());
        }
        return generated;
    }
}

function streamRandomUAs(uaFilePath, count, callback) {
    const stream = fs.createReadStream(uaFilePath, { encoding: 'utf8' });
    let buffer = '';
    let sent = 0;
    
    stream.on('data', (chunk) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
            if (line.trim() && sent < count) {
                if (Math.random() < 0.1) {
                    callback(line.trim());
                    sent++;
                    if (sent >= count) {
                        stream.destroy();
                        return;
                    }
                }
            }
        }
    });
    
    stream.on('end', () => {
        if (buffer.trim() && sent < count) {
            callback(buffer.trim());
        }
    });
}

module.exports = {
    generateUA,
    generateUAFile,
    getRandomUA,
    getRandomUAs,
    streamRandomUAs,
    BROWSERS,
    OPERATING_SYSTEMS,
    DEVICES,
    LANGUAGES,
    BUILD_IDS,
    generateMobileUA,
    generateIOSUA,
    generateCrawlerUA,
    generateChromeOSUA,
    generateSmartTVUA,
    generateConsoleUA,
    generateCurlLikeUA,
    generateBSDUA,
    generateWearableUA,
    generateVRUA,
    generateCarUA,
    generateEReaderUA
};

if (require.main === module) {
    const outputPath = process.argv[2] || path.join(__dirname, '..', 'ua.txt');
    const count = parseInt(process.argv[3]) || 10000000;
    generateUAFile(outputPath, count).catch(console.error);
}
