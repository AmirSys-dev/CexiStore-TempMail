const { createCanvas } = require('canvas');

function generateMathCaptcha() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const text = `${a} + ${b} = ?`;
    const answer = (a + b).toString();

    const canvas = createCanvas(200, 100);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 200, 100);

    // Noise (Lines)
    for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `rgba(0, 0, 0, 0.2)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * 200, Math.random() * 100);
        ctx.lineTo(Math.random() * 200, Math.random() * 100);
        ctx.stroke();
    }

    // Text
    ctx.font = '30px sans-serif';
    ctx.fillStyle = '#333';
    ctx.fillText(text, 20, 60);

    return { buffer: canvas.toBuffer('image/png'), answer };
}

module.exports = { generateMathCaptcha };
