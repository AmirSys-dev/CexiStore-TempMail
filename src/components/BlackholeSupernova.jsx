import React, { useState, useEffect, useRef } from 'react';

// Uses ezgif-frame-001.jpg → ezgif-frame-090.jpg from /assets/explosion/
const TOTAL_FRAMES = 90;
const FPS = 30;
const FRAME_MS = 1000 / FPS;
const pad = (n) => String(n).padStart(3, '0');

export default function BlackholeSupernova() {
  const [phase, setPhase] = useState('idle'); // idle | ignition | explosion | done
  const [pct, setPct] = useState(0);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef(null);
  const frames = useRef([]);
  const timer = useRef(null);

  // Silently preload all 90 frames
  useEffect(() => {
    let n = 0;
    frames.current = [];
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = `/assets/explosion/ezgif-frame-${pad(i)}.jpg`;
      img.onload = img.onerror = () => {
        n++;
        setPct(Math.round((n / TOTAL_FRAMES) * 100));
        if (n === TOTAL_FRAMES) setReady(true);
      };
      frames.current.push(img);
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const ignite = () => {
    if (phase !== 'idle') return;
    setPhase('ignition');
    timer.current = setTimeout(() => {
      setPhase('explosion');
      playCanvas();
    }, 3000);
  };

  const playCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    let f = 0, last = performance.now();
    const draw = (t) => {
      if (f >= TOTAL_FRAMES) {
        setPhase('done');
        window.removeEventListener('resize', resize);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      if (t - last >= FRAME_MS) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const img = frames.current[f];
        if (img?.complete && img.naturalWidth) {
          const ir = img.naturalWidth / img.naturalHeight;
          const cr = canvas.width / canvas.height;
          let w, h, x, y;
          if (cr > ir) { w = canvas.width; h = w / ir; x = 0; y = (canvas.height - h) / 2; }
          else { w = canvas.height * ir; h = canvas.height; x = (canvas.width - w) / 2; y = 0; }
          ctx.drawImage(img, x, y, w, h);
        }
        f++;
        last = t - ((t - last) % FRAME_MS);
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  };

  if (phase === 'done') return null;

  return (
    <>
      {/* Full-screen canvas for explosion */}
      <canvas ref={canvasRef} style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        zIndex: 9999, pointerEvents: 'none', mixBlendMode: 'screen',
        opacity: phase === 'explosion' ? 1 : 0,
        transition: 'opacity 0.2s'
      }} />

      {/* White flash */}
      {phase === 'explosion' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
          background: 'white', animation: 'bh-flash 0.2s ease-out forwards'
        }} />
      )}

      
      {(phase === 'idle' || phase === 'ignition') && (
        <div style={{
          position: 'fixed',
          bottom: '5vh',
          right: '5vw',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'auto',
        }}>
          {/* Label */}
          <span style={{
            fontSize: '0.7rem',
            color: phase === 'ignition' ? '#ff6600' : 'rgba(255,150,50,0.7)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontWeight: 600,
            animation: phase === 'ignition' ? 'bh-txt-pulse 0.4s infinite alternate' : 'none',
          }}>
            {phase === 'ignition' ? '⚠ IGNITION IN PROGRESS...' : (ready ? 'CLICK TO EXPLODE' : `LOADING ${pct}%`)}
          </span>

          {/* Black Hole orb - uses FULL JPG as background-image, circular crop */}
          <div
            onClick={ignite}
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
              // The JPG frame as the visual
              backgroundImage: `url(/assets/explosion/ezgif-frame-${pad(1)}.jpg)`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              // Outer glow ring
              boxShadow: phase === 'ignition'
                ? '0 0 0 4px #ff6600, 0 0 80px 30px rgba(255,80,0,0.7), 0 0 200px 80px rgba(255,50,0,0.4)'
                : '0 0 0 2px rgba(255,100,0,0.4), 0 0 40px 15px rgba(255,60,0,0.25), 0 0 80px 30px rgba(200,40,0,0.15)',
              animation: phase === 'ignition'
                ? 'bh-shake 0.07s infinite, bh-pulse 0.35s infinite alternate'
                : 'bh-breathe 4s ease-in-out infinite',
              filter: phase === 'ignition'
                ? 'brightness(2.5) saturate(2) contrast(1.5)'
                : 'brightness(1.05) saturate(1.1)',
              transition: 'filter 0.5s',
              userSelect: 'none',
            }}
          >
            {/* Dark vignette to make circular edge look natural */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)',
              pointerEvents: 'none',
            }} />
            {/* Accretion ring shimmer */}
            <div style={{
              position: 'absolute', inset: '-2px',
              borderRadius: '50%',
              border: '2px solid rgba(255,120,0,0.2)',
              animation: 'bh-ring 3s linear infinite',
              pointerEvents: 'none',
            }} />
            {/* Ignition countdown overlay */}
            {phase === 'ignition' && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,60,0,0.3) 0%, transparent 70%)',
                animation: 'bh-core 0.3s infinite alternate',
              }} />
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bh-flash  { 0%{opacity:1} 100%{opacity:0} }
        @keyframes bh-shake  {
          0%  {transform:translate(0,0) rotate(0deg)}
          20% {transform:translate(-6px,4px) rotate(-1.5deg)}
          40% {transform:translate(7px,-5px) rotate(2deg)}
          60% {transform:translate(-7px,-4px) rotate(-1deg)}
          80% {transform:translate(5px,6px) rotate(1.5deg)}
          100%{transform:translate(3px,-3px) rotate(-0.5deg)}
        }
        @keyframes bh-pulse {
          0%  {box-shadow:0 0 0 4px #ff4400,0 0 60px 20px rgba(255,60,0,0.6)}
          100%{box-shadow:0 0 0 6px #ff8800,0 0 120px 50px rgba(255,100,0,0.9)}
        }
        @keyframes bh-breathe {
          0%,100%{box-shadow:0 0 0 2px rgba(255,100,0,0.35),0 0 40px 15px rgba(255,60,0,0.2)}
          50%    {box-shadow:0 0 0 3px rgba(255,120,0,0.55),0 0 65px 25px rgba(255,80,0,0.35)}
        }
        @keyframes bh-ring   { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes bh-core   { 0%{opacity:0.3} 100%{opacity:0.7} }
        @keyframes bh-txt-pulse {0%{color:rgba(255,80,0,0.7)} 100%{color:#ffaa00}}
      ` }} />
    </>
  );
}
