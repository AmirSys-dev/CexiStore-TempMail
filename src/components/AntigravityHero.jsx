import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

export default function AntigravityHero({ children }) {
  const sceneRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Matter.js setup
    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          MouseConstraint = Matter.MouseConstraint,
          Mouse = Matter.Mouse,
          Composite = Matter.Composite,
          Bodies = Matter.Bodies,
          Body = Matter.Body;

    const width = sceneRef.current.clientWidth;
    const height = sceneRef.current.clientHeight;

    const engine = Engine.create({
      gravity: { x: 0, y: 0.5 } // Normal gravity downwards initially
    });
    engineRef.current = engine;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width,
        height,
        background: 'transparent',
        wireframes: false,
        pixelRatio: window.devicePixelRatio
      }
    });

    // Create boundaries
    const ground = Bodies.rectangle(width / 2, height + 30, width * 2, 60, { isStatic: true, render: { visible: false } });
    const wallLeft = Bodies.rectangle(-30, height / 2, 60, height * 2, { isStatic: true, render: { visible: false } });
    const wallRight = Bodies.rectangle(width + 30, height / 2, 60, height * 2, { isStatic: true, render: { visible: false } });
    const ceiling = Bodies.rectangle(width / 2, -30, width * 2, 60, { isStatic: true, render: { visible: false } });

    // Enterprise aesthetic bodies (squares & specific shapes)
    const objects = [];
    const colors = ['#0f172a', '#334155', '#475569', '#94a3b8', '#cbd5e1', '#ffffff'];
    
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * width;
      const y = Math.random() * -height; // Start above screen
      const size = 30 + Math.random() * 50;
      
      const isCircle = Math.random() > 0.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const options = {
        restitution: 0.8, // Bounciness
        friction: 0.05,
        render: {
          fillStyle: Math.random() > 0.3 ? 'transparent' : color,
          strokeStyle: color,
          lineWidth: 2,
        }
      };

      let body;
      if (isCircle) {
        body = Bodies.circle(x, y, size / 2, options);
      } else {
        body = Bodies.rectangle(x, y, size, size, { ...options, chamfer: { radius: 10 } });
      }

      // Add spin
      Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.1);
      objects.push(body);
    }

    Composite.add(engine.world, [ground, wallLeft, wallRight, ceiling, ...objects]);

    // Add mouse control
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });

    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse;

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    // After 2 seconds, trigger "Antigravity" effect (invert gravity or random zero-G)
    setTimeout(() => {
      if (engineRef.current) {
        engineRef.current.gravity.y = -0.1; // Float up slowly! "Macam Google Antigravity"
        
        objects.forEach(obj => {
          Body.applyForce(obj, obj.position, {
            x: (Math.random() - 0.5) * 0.05,
            y: (Math.random() - 0.5) * 0.05
          });
        });
      }
    }, 2500);

    const handleResize = () => {
      const newWidth = sceneRef.current?.clientWidth || width;
      const newHeight = sceneRef.current?.clientHeight || height;
      render.canvas.width = newWidth;
      render.canvas.height = newHeight;
      Matter.Body.setPosition(ground, { x: newWidth / 2, y: newHeight + 30 });
      Matter.Body.setPosition(wallRight, { x: newWidth + 30, y: newHeight / 2 });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      Render.stop(render);
      Runner.stop(runner);
      Composite.clear(engine.world);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, []);

  // Pulse effect interaction
  const triggerPulse = () => {
    if (!engineRef.current) return;
    const bodies = Matter.Composite.allBodies(engineRef.current.world).filter(b => !b.isStatic);
    bodies.forEach(body => {
      Matter.Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * 0.1,
        y: (Math.random() - 0.5) * 0.1
      });
    });
  };

  return (
    <div className="relative w-full h-[600px] overflow-hidden bg-slate-950 border-b border-white/10" onClick={triggerPulse}>
      {/* Physics Canvas Background */}
      <div 
        ref={sceneRef} 
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-0"
        style={{ opacity: 0.6 }}
      />
      
      {/* Foreground Content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none px-4">
        {children}
      </div>
      
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none z-0" />
    </div>
  );
}
