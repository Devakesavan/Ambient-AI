import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const [titleRevealed, setTitleRevealed] = useState(false);
  const [showElements, setShowElements] = useState({
    wrap: false,
    ignite: false,
    settled: false,
    rule: false,
    subtitle: false,
    button: false
  });
  const [fadeOut, setFadeOut] = useState(false);

  const particleCanvasRef = useRef(null);
  const medCanvasRef = useRef(null);
  const dnaCanvasRef = useRef(null);
  const burstCanvasRef = useRef(null);
  const bloomCanvasRef = useRef(null);

  // Handle "Get Started" click
  const handleGetStarted = () => {
    setFadeOut(true);
    setTimeout(() => {
      navigate('/login');
    }, 650);
  };

  // Particle Mesh Animation
  useEffect(() => {
    const cv = particleCanvasRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    let W, H;
    const pts = [];
    let animationId;

    function resize() {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 75; i++) {
      pts.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.1 + 0.2,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        a: Math.random() * 0.3 + 0.06
      });
    }

    function loop() {
      cx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x = (p.x + p.vx + W) % W;
        p.y = (p.y + p.vy + H) % H;
        cx.beginPath();
        cx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        cx.fillStyle = `rgba(0,255,136,${p.a})`;
        cx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            cx.beginPath();
            cx.moveTo(pts[i].x, pts[i].y);
            cx.lineTo(pts[j].x, pts[j].y);
            cx.strokeStyle = `rgba(0,255,136,${0.05 * (1 - d / 90)})`;
            cx.lineWidth = 0.5;
            cx.stroke();
          }
        }
      }
      animationId = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Medical Icon Floaters Animation
  useEffect(() => {
    const cv = medCanvasRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    let W, H;
    let animationId;

    function resize() {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Icon draw functions
    function drawPill(c, s) {
      const w = s * 2.1, h = s * 0.85, r = h / 2;
      c.beginPath();
      c.moveTo(-w / 2 + r, -h / 2);
      c.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
      c.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
      c.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
      c.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(0, -h / 2);
      c.lineTo(0, h / 2);
      c.stroke();
      [[-w / 4, 0], [w / 4, 0]].forEach(([x, y]) => {
        c.beginPath();
        c.arc(x, y, s * 0.09, 0, Math.PI * 2);
        c.fill();
      });
    }

    function drawSyringe(c, s) {
      const bw = s * 2.6, bh = s * 0.55;
      c.beginPath();
      c.rect(-bw * 0.35, -bh / 2, bw * 0.7, bh);
      c.stroke();
      c.beginPath();
      c.rect(-bw * 0.35 - s * 0.16, -bh * 0.72, s * 0.1, bh * 1.44);
      c.stroke();
      const ow = c.lineWidth;
      c.lineWidth = ow * 0.55;
      c.beginPath();
      c.moveTo(-bw * 0.35, 0);
      c.lineTo(-bw * 0.35 + bw * 0.28, 0);
      c.stroke();
      c.lineWidth = ow;
      c.beginPath();
      c.moveTo(bw * 0.35, -bh / 2);
      c.lineTo(bw * 0.35, bh / 2);
      c.lineTo(bw * 0.35 + s * 0.65, 0);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(bw * 0.35 + s * 0.65, 0);
      c.lineTo(bw * 0.35 + s * 1.05, 0);
      c.stroke();
      for (let i = 1; i <= 3; i++) {
        const tx = -bw * 0.35 + (bw * 0.7 / 4) * i;
        c.beginPath();
        c.moveTo(tx, -bh / 2);
        c.lineTo(tx, -bh * 0.72);
        c.stroke();
      }
    }

    function drawStethoscope(c, s) {
      const arm = s * 1.0, th = s * 0.26;
      c.beginPath();
      c.rect(-th / 2, -arm, th, arm * 1.75);
      c.stroke();
      c.beginPath();
      c.rect(-arm, -th / 2, arm * 2, th);
      c.stroke();
      c.beginPath();
      c.arc(0, arm * 0.82, s * 0.35, 0, Math.PI * 2);
      c.stroke();
      [[-arm * 0.5, -arm * 0.74], [arm * 0.5, -arm * 0.74]].forEach(([x, y]) => {
        c.beginPath();
        c.arc(x, y, s * 0.13, 0, Math.PI * 2);
        c.stroke();
      });
    }

    function drawTablet(c, s) {
      const w = s * 1.1, h = s * 1.6, r = s * 0.3;
      c.beginPath();
      c.moveTo(-w / 2 + r, -h / 2);
      c.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
      c.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
      c.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
      c.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
      c.closePath();
      c.stroke();
      c.beginPath();
      c.moveTo(-w / 2 + r, 0);
      c.lineTo(w / 2 - r, 0);
      c.stroke();
      c.beginPath();
      c.arc(0, 0, s * 0.11, 0, Math.PI * 2);
      c.fill();
    }

    const TYPES = ['pill', 'syringe', 'stethoscope', 'tablet'];
    
    // Direction vectors for movement
    const DIRECTIONS = [
      { vx: 0.8, vy: 0.6 },   // diagonal down-right
      { vx: -0.8, vy: 0.6 },  // diagonal down-left
      { vx: 0.8, vy: -0.6 },  // diagonal up-right
      { vx: -0.8, vy: -0.6 }, // diagonal up-left
      { vx: 0.9, vy: 0.2 },   // mostly right
      { vx: -0.9, vy: 0.2 },  // mostly left
      { vx: 0.2, vy: 0.9 },   // mostly down
      { vx: -0.2, vy: -0.9 }, // mostly up
    ];

    // Helper to get starting position outside screen
    function getStartPosition(dir, delay) {
      let x, y;
      const W = window.innerWidth;
      const H = window.innerHeight;
      
      // Start from the opposite edge of movement direction
      if (dir.vx > 0) {
        // Moving right, start from left edge
        x = -100 - delay * 80;
        y = Math.random() * H;
      } else if (dir.vx < 0) {
        // Moving left, start from right edge
        x = W + 100 + delay * 80;
        y = Math.random() * H;
      } else if (dir.vy > 0) {
        // Moving down, start from top
        x = Math.random() * W;
        y = -100 - delay * 80;
      } else {
        // Moving up, start from bottom
        x = Math.random() * W;
        y = H + 100 + delay * 80;
      }
      return { x, y };
    }

    const floaters = [];
    for (let i = 0; i < 28; i++) {
      const dir = DIRECTIONS[i % DIRECTIONS.length];
      const speed = 0.6 + Math.random() * 0.5;
      const mag = Math.sqrt(dir.vx ** 2 + dir.vy ** 2);
      const delay = Math.floor(i / DIRECTIONS.length) + Math.random() * 3; // Stagger entry
      const startPos = getStartPosition(dir, delay);
      
      floaters.push({
        type: TYPES[i % TYPES.length],
        // Start from outside screen edges
        x: startPos.x,
        y: startPos.y,
        vx: (dir.vx / mag) * speed,
        vy: (dir.vy / mag) * speed,
        size: 20 + Math.random() * 20,
        alpha: 0.25 + Math.random() * 0.25,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.008,
        dirIdx: i % DIRECTIONS.length
      });
    }

    function offscreen(f) {
      return f.x < -120 || f.x > W + 120 || f.y < -120 || f.y > H + 120;
    }

    function respawn(f) {
      const dir = DIRECTIONS[f.dirIdx];
      const speed = 0.6 + Math.random() * 0.5;
      const mag = Math.sqrt(dir.vx ** 2 + dir.vy ** 2);
      
      // Respawn from opposite edge based on direction
      if (dir.vx > 0) {
        f.x = -80 - Math.random() * 100;
        f.y = Math.random() * H;
      } else if (dir.vx < 0) {
        f.x = W + 80 + Math.random() * 100;
        f.y = Math.random() * H;
      } else if (dir.vy > 0) {
        f.x = Math.random() * W;
        f.y = -80 - Math.random() * 100;
      } else {
        f.x = Math.random() * W;
        f.y = H + 80 + Math.random() * 100;
      }
      
      f.vx = (dir.vx / mag) * speed;
      f.vy = (dir.vy / mag) * speed;
      f.type = TYPES[Math.floor(Math.random() * TYPES.length)];
      f.size = 20 + Math.random() * 20;
      f.alpha = 0.25 + Math.random() * 0.25;
      f.rot = Math.random() * Math.PI * 2;
    }

    function loop() {
      cx.clearRect(0, 0, W, H);
      floaters.forEach(f => {
        f.x += f.vx;
        f.y += f.vy;
        f.rot += f.spin;
        if (offscreen(f)) respawn(f);

        cx.save();
        cx.translate(f.x, f.y);
        cx.rotate(f.rot);
        cx.globalAlpha = f.alpha;
        cx.strokeStyle = '#00FF99';
        cx.fillStyle = '#00FF99';
        cx.lineWidth = 2;
        cx.shadowColor = '#00FF88';
        cx.shadowBlur = 18;

        if (f.type === 'pill') drawPill(cx, f.size);
        else if (f.type === 'syringe') drawSyringe(cx, f.size);
        else if (f.type === 'stethoscope') drawStethoscope(cx, f.size);
        else if (f.type === 'tablet') drawTablet(cx, f.size);

        cx.restore();
      });
      animationId = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // DNA Helix Animation
  useEffect(() => {
    const cv = dnaCanvasRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    let W, H;
    let animationId;

    function resize() {
      W = cv.width = window.innerWidth;
      H = cv.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    let phase = 'intro';
    let fadeStart = null;
    let dnaAlpha = 1;
    const DNA_SHOW = 3000;
    const startTime = performance.now();

    function frame(ts) {
      cx.clearRect(0, 0, W, H);
      const elapsed = ts - startTime;

      if (phase === 'intro' && elapsed > DNA_SHOW) {
        phase = 'fading';
        fadeStart = ts;
      }
      if (phase === 'fading') {
        dnaAlpha = Math.max(0, 1 - (ts - fadeStart) / 700);
        if (dnaAlpha <= 0) {
          phase = 'done';
          revealTitle();
        }
      }

      if (phase === 'done') {
        animationId = requestAnimationFrame(frame);
        t += 0.022;
        return;
      }

      t += 0.022;

      cx.save();
      cx.globalAlpha = dnaAlpha;
      cx.translate(W / 2, H / 2);
      cx.rotate(Math.PI / 4);

      const len = Math.max(W, H) * 0.80;
      const segs = 38;
      const step = (len * 2) / segs;
      const amp = 62;
      const lw = 4.5;
      const nr = 5.0;

      cx.shadowColor = '#00FF88';

      // Two backbone strands
      for (const side of [1, -1]) {
        for (let i = 0; i < segs; i++) {
          const z0 = -len + i * step;
          const z1 = z0 + step;
          const w0 = Math.sin(i * 0.42 + t) * amp;
          const w1 = Math.sin((i + 1) * 0.42 + t) * amp;
          const depth = Math.sin(i * 0.42 + t);
          const a = side === 1
            ? (depth > 0 ? 1.0 : 0.20)
            : (depth < 0 ? 1.0 : 0.20);

          cx.beginPath();
          cx.moveTo(side * w0, z0);
          cx.lineTo(side * w1, z1);
          cx.strokeStyle = `rgba(0,255,136,${a * 0.35})`;
          cx.lineWidth = lw + 8;
          cx.shadowBlur = 30;
          cx.stroke();

          cx.beginPath();
          cx.moveTo(side * w0, z0);
          cx.lineTo(side * w1, z1);
          cx.strokeStyle = `rgba(0,255,136,${a})`;
          cx.lineWidth = lw;
          cx.shadowBlur = 20;
          cx.stroke();
        }
      }

      // Rungs
      for (let i = 0; i <= segs; i++) {
        const z = -len + i * step;
        const w = Math.sin(i * 0.42 + t) * amp;
        const depth = Math.sin(i * 0.42 + t);
        const show = Math.abs(depth) < 0.60;
        if (show) {
          const ra = (0.75 - Math.abs(depth) * 0.55);
          cx.beginPath();
          cx.moveTo(-w, z);
          cx.lineTo(w, z);
          cx.strokeStyle = `rgba(0,255,136,${ra * 0.4})`;
          cx.lineWidth = 5;
          cx.shadowBlur = 14;
          cx.stroke();

          cx.beginPath();
          cx.moveTo(-w, z);
          cx.lineTo(w, z);
          cx.strokeStyle = `rgba(0,255,136,${ra})`;
          cx.lineWidth = 2.2;
          cx.shadowBlur = 8;
          cx.stroke();
        }

        for (const sign of [1, -1]) {
          cx.beginPath();
          cx.arc(sign * w, z, nr + 4, 0, Math.PI * 2);
          cx.fillStyle = `rgba(0,255,136,0.12)`;
          cx.shadowBlur = 22;
          cx.fill();

          cx.beginPath();
          cx.arc(sign * w, z, nr, 0, Math.PI * 2);
          cx.fillStyle = `rgba(0,255,136,0.95)`;
          cx.shadowBlur = 18;
          cx.fill();

          cx.beginPath();
          cx.arc(sign * w, z, nr * 0.4, 0, Math.PI * 2);
          cx.fillStyle = `rgba(180,255,220,0.9)`;
          cx.shadowBlur = 10;
          cx.fill();
        }
      }

      cx.restore();
      animationId = requestAnimationFrame(frame);
    }

    animationId = requestAnimationFrame(frame);

    // Backup reveal timer
    const revealTimeout = setTimeout(() => {
      revealTitle();
    }, DNA_SHOW + 760);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
      clearTimeout(revealTimeout);
    };
  }, []);

  // Title reveal function
  const revealTitle = () => {
    if (titleRevealed) return;
    setTitleRevealed(true);

    // Phase 0: Show wrap
    setShowElements(prev => ({ ...prev, wrap: true }));

    // Bloom animation
    const bc = bloomCanvasRef.current;
    if (bc) {
      bc.width = window.innerWidth;
      bc.height = window.innerHeight;
      const bx = bc.getContext('2d');
      const CX = window.innerWidth / 2;
      const CY = window.innerHeight / 2;

      let bloomFrame = 0;
      const BLOOM_PEAK = 12;
      const BLOOM_END = 55;

      function bloomLoop() {
        bx.clearRect(0, 0, bc.width, bc.height);
        const t = bloomFrame;
        if (t <= BLOOM_END) {
          const peakA = t <= BLOOM_PEAK
            ? t / BLOOM_PEAK
            : 1 - (t - BLOOM_PEAK) / (BLOOM_END - BLOOM_PEAK);

          const r1 = 80 + t * 28;
          const g1 = bx.createRadialGradient(CX, CY, 0, CX, CY, r1);
          g1.addColorStop(0, `rgba(220,255,240,${peakA * 0.95})`);
          g1.addColorStop(0.15, `rgba(0,255,136,${peakA * 0.85})`);
          g1.addColorStop(0.45, `rgba(0,255,136,${peakA * 0.35})`);
          g1.addColorStop(1, 'rgba(0,255,136,0)');
          bx.fillStyle = g1;
          bx.fillRect(0, 0, bc.width, bc.height);

          const flareA = peakA * 0.55;
          const flareH = 4 + (1 - peakA) * 8;
          const g2 = bx.createLinearGradient(0, CY, bc.width, CY);
          g2.addColorStop(0, 'rgba(0,255,136,0)');
          g2.addColorStop(0.3, `rgba(0,255,136,${flareA * 0.4})`);
          g2.addColorStop(0.5, `rgba(220,255,240,${flareA})`);
          g2.addColorStop(0.7, `rgba(0,255,136,${flareA * 0.4})`);
          g2.addColorStop(1, 'rgba(0,255,136,0)');
          bx.fillStyle = g2;
          bx.fillRect(0, CY - flareH / 2, bc.width, flareH);

          if (t > 4) {
            const ringR = (t - 4) * 22;
            const ringA = Math.max(0, peakA * 0.8 - (t - 4) * 0.018);
            bx.beginPath();
            bx.arc(CX, CY, ringR, 0, Math.PI * 2);
            bx.strokeStyle = `rgba(0,255,136,${ringA})`;
            bx.lineWidth = 2.5;
            bx.shadowColor = '#00FF88';
            bx.shadowBlur = 16;
            bx.stroke();
          }

          bloomFrame++;
          requestAnimationFrame(bloomLoop);
        } else {
          bx.clearRect(0, 0, bc.width, bc.height);
        }
      }
      bloomLoop();
    }

    // Phase 2: Ignite title
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowElements(prev => ({ ...prev, ignite: true }));
        setTimeout(() => {
          setShowElements(prev => ({ ...prev, ignite: false, settled: true }));
        }, 750);
      });
    });

    // Phase 3: Cascade animations
    setTimeout(() => setShowElements(prev => ({ ...prev, rule: true })), 600);
    setTimeout(() => setShowElements(prev => ({ ...prev, subtitle: true })), 900);
    setTimeout(() => setShowElements(prev => ({ ...prev, button: true })), 1200);
  };

  return (
    <div className="landing-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@300;400;600&display=swap');

        .landing-page {
          --green: #00FF88;
          --green-dim: #00cc6a;
          --bg: #0A0A0A;
          width: 100%;
          height: 100vh;
          background: var(--bg);
          overflow: hidden;
          font-family: 'Rajdhani', sans-serif;
          color: #fff;
          position: relative;
        }

        .landing-page canvas {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }
        .landing-page #particleCanvas { z-index: 1; }
        .landing-page #medCanvas { z-index: 2; }
        .landing-page #dnaCanvas { z-index: 3; }
        .landing-page #burstCanvas { z-index: 11; }
        .landing-page #bloomCanvas { z-index: 15; }

        .landing-page .bg-glow {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse 55% 45% at 50% 52%, rgba(0,255,136,0.06) 0%, transparent 68%),
            radial-gradient(ellipse 25% 25% at 15% 85%, rgba(0,255,136,0.035) 0%, transparent 60%),
            radial-gradient(ellipse 20% 20% at 85% 15%, rgba(0,255,136,0.03) 0%, transparent 55%);
          pointer-events: none;
        }

        .landing-page #screen1 {
          position: fixed;
          inset: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .landing-page .title-wrap {
          position: relative;
          z-index: 2;
          text-align: center;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .landing-page .title-wrap.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .landing-page .eyebrow {
          font-size: clamp(10px, 1.4vw, 13px);
          letter-spacing: 0.55em;
          color: var(--green-dim);
          text-transform: uppercase;
          font-weight: 300;
          opacity: 0;
          margin-bottom: 16px;
          display: block;
          animation: fadeIn 0.7s ease 0.1s forwards;
        }

        .landing-page .brand-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(68px, 13vw, 148px);
          letter-spacing: 0.13em;
          line-height: 1;
          color: #fff;
          text-shadow:
            0 0 28px rgba(0,255,136,0.65),
            0 0 70px rgba(0,255,136,0.22),
            0 8px 28px rgba(0,0,0,0.85);
          position: relative;
          display: inline-block;
          overflow: hidden;
          cursor: default;
          clip-path: inset(50% 0 50% 0);
          filter: brightness(4) blur(3px);
        }

        .landing-page .brand-title.ignite {
          animation: irisOpen 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .landing-page .brand-title.settled {
          clip-path: inset(0% 0 0% 0);
          filter: brightness(1) blur(0);
          animation: glowBreathe 3s ease-in-out 0.1s infinite alternate;
        }

        @keyframes irisOpen {
          0% { clip-path: inset(50% 0 50% 0); filter: brightness(5) blur(4px); }
          18% { clip-path: inset(38% 0 38% 0); filter: brightness(8) blur(1px); }
          42% { clip-path: inset(5% 0 5% 0); filter: brightness(3) blur(0px); }
          62% { clip-path: inset(-2% 0 -2% 0); filter: brightness(1.6) blur(0); }
          78% { clip-path: inset(1% 0 1% 0); filter: brightness(1.2) blur(0); }
          100% { clip-path: inset(0% 0 0% 0); filter: brightness(1) blur(0); }
        }

        @keyframes glowBreathe {
          0% { text-shadow: 0 0 28px rgba(0,255,136,0.65), 0 0 70px rgba(0,255,136,0.22), 0 8px 28px rgba(0,0,0,0.85); }
          100% { text-shadow: 0 0 40px rgba(0,255,136,0.90), 0 0 110px rgba(0,255,136,0.38), 0 8px 28px rgba(0,0,0,0.85); }
        }

        @keyframes fadeIn { to { opacity: 1; } }

        .landing-page .subtitle {
          font-size: clamp(11px, 1.6vw, 14px);
          letter-spacing: 0.42em;
          color: rgba(0,255,136,0.6);
          text-transform: uppercase;
          font-weight: 300;
          margin-top: 14px;
          opacity: 0;
          display: block;
        }
        .landing-page .subtitle.show {
          animation: subtitleRise 1s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        @keyframes subtitleRise {
          0% { opacity: 0; transform: translateY(10px); letter-spacing: 0.7em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.42em; }
        }

        .landing-page .title-rule {
          width: 0;
          height: 1px;
          margin: 18px auto 0;
          background: linear-gradient(to right, transparent, var(--green), transparent);
          opacity: 0;
        }
        .landing-page .title-rule.show {
          animation: ruleExpand 0.9s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        @keyframes ruleExpand {
          to { width: 80px; opacity: 1; }
        }

        .landing-page .cta-btn {
          margin-top: 52px;
          padding: 17px 58px;
          border: 1.5px solid var(--green);
          border-radius: 50px;
          background: transparent;
          color: var(--green);
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: color 0.32s ease, box-shadow 0.32s ease;
          opacity: 0;
          box-shadow: 0 0 20px rgba(0,255,136,0.1);
          display: inline-block;
        }
        .landing-page .cta-btn.show {
          animation: btnMaterialise 1s cubic-bezier(0.22,1,0.36,1) forwards;
        }

        @keyframes btnMaterialise {
          0% { opacity: 0; transform: translateY(18px) scale(0.92); filter: blur(6px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        .landing-page .cta-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--green);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.38s cubic-bezier(0.76,0,0.24,1);
          border-radius: inherit;
        }
        .landing-page .cta-btn:hover::before { transform: scaleX(1); }
        .landing-page .cta-btn:hover {
          color: #0A0A0A;
          box-shadow: 0 0 44px rgba(0,255,136,0.55), 0 0 90px rgba(0,255,136,0.18);
        }
        .landing-page .cta-btn span { position: relative; z-index: 1; }

        .landing-page .fade-to-app {
          pointer-events: none;
          animation: fadeOutToApp 0.7s ease forwards;
        }

        @keyframes fadeOutToApp {
          to {
            opacity: 0;
            transform: scale(1.02);
            filter: blur(2px);
          }
        }
      `}</style>

      <div className="bg-glow"></div>
      <canvas ref={particleCanvasRef} id="particleCanvas"></canvas>
      <canvas ref={medCanvasRef} id="medCanvas"></canvas>
      <canvas ref={dnaCanvasRef} id="dnaCanvas"></canvas>
      <canvas ref={burstCanvasRef} id="burstCanvas"></canvas>
      <canvas ref={bloomCanvasRef} id="bloomCanvas"></canvas>

      <div id="screen1" className={fadeOut ? 'fade-to-app' : ''}>
        <div className={`title-wrap ${showElements.wrap ? 'visible' : ''}`}>
          <span className="eyebrow">Medical Artificial Intelligence</span>
          <div className={`brand-title ${showElements.ignite ? 'ignite' : ''} ${showElements.settled ? 'settled' : ''}`}>
            AMBIENT AI
          </div>
          <div className={`title-rule ${showElements.rule ? 'show' : ''}`}></div>
          <span className={`subtitle ${showElements.subtitle ? 'show' : ''}`}>
            Diagnose &nbsp;·&nbsp; Predict &nbsp;·&nbsp; Heal
          </span>
          <br />
          <button 
            className={`cta-btn ${showElements.button ? 'show' : ''}`}
            onClick={handleGetStarted}
          >
            <span>Get Started</span>
          </button>
        </div>
      </div>
    </div>
  );
}
