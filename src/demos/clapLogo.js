// Applause -> logo. 2019 idea, 2026 version: energy builds up while the room claps.
import { mountSketch } from './p5host.js';
import { stepEnergy } from '../shared/energy.js';

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

function tinted(img, w, h, color) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, w, h);
  return c;
}

export default async function mount(host, { media }) {
  const logo = await loadImg('logo-girotronica.svg');
  const LW = 1600, LH = Math.round(LW * logo.height / logo.width);
  const layers = { white: tinted(logo, LW, LH, '#eafff2'), green: tinted(logo, LW, LH, '#00ff6a'), cyan: tinted(logo, LW, LH, '#00f0ff'), magenta: tinted(logo, LW, LH, '#ff2bd6') };

  let energy = 0, peak = 0, won = false, wonAt = 0, lastT = null;
  const sparks = [];

  const s = mountSketch(host, (p) => {
    p.draw = () => {
      const g = p.drawingContext, W = p.width, H = p.height, now = p.millis();
      const dt = Math.min(0.05, (now - (lastT ?? now)) / 1000); lastT = now;
      const level = media.level;
      if (!won) {
        energy = stepEnergy(energy, level, dt);
        if (energy >= 1) { won = true; wonAt = now; burst(W / 2, H / 2, 600); }
      }
      peak = Math.max(peak * 0.995, level);

      p.background(2, 6, 4);
      // spectrum columns
      const bars = media.bands.length * 2;
      for (let i = 0; i < bars; i++) {
        const v = media.bands[i % media.bands.length];
        const bw = W / bars, bh = v * H * 0.9;
        const steps = Math.floor(bh / 18);
        for (let k = 0; k < steps; k++) {
          g.fillStyle = k > 28 ? '#ff003c' : k > 18 ? '#fcee0a' : '#0b6b32';
          g.fillRect(i * bw + 4, H - (k + 1) * 18, bw - 8, 12);
        }
      }

      // logo
      const e = won ? 1 : energy;
      const scale = Math.min(0.86, 0.08 + e * 0.72 + level * 0.1) * (won ? 1 + Math.sin(now / 90) * 0.02 : 1);
      const w = W * scale, h = w * LH / LW;
      const x = (W - w) / 2, y = (H - h) / 2;
      const split = (level * 40 + (won ? 8 : 0)) * (W / 1920);
      g.globalCompositeOperation = 'lighter';
      g.drawImage(layers.cyan, x - split, y, w, h);
      g.drawImage(layers.magenta, x + split, y, w, h);
      g.drawImage(layers.green, x, y, w, h);
      g.globalCompositeOperation = 'source-over';
      // horizontal tear glitch when loud
      const tears = Math.floor(level * 10) + (won ? 2 : 0);
      for (let i = 0; i < tears; i++) {
        const sy = y + Math.random() * h, sh = 4 + Math.random() * h * 0.08, dx = (Math.random() - 0.5) * w * 0.12;
        g.drawImage(p.canvas, 0, sy * p.pixelDensity(), W * p.pixelDensity(), sh * p.pixelDensity(), dx, sy, W, sh);
      }

      // sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.15; sp.life -= dt;
        if (sp.life <= 0) { sparks.splice(i, 1); continue; }
        g.fillStyle = sp.c; g.fillRect(sp.x, sp.y, sp.s, sp.s);
      }
      if (won && Math.random() < 0.3) burst(Math.random() * W, Math.random() * H * 0.6, 30);

      // HUD: energy bar
      const blocks = 40, filled = Math.round(e * blocks);
      const bw = Math.min(W * 0.8, 1400) / blocks, bx = (W - bw * blocks) / 2, by = H * 0.86;
      for (let i = 0; i < blocks; i++) {
        g.fillStyle = i < filled ? (i > blocks * 0.85 ? '#ff2bd6' : i > blocks * 0.6 ? '#fcee0a' : '#00ff6a') : '#0d2a18';
        g.fillRect(bx + i * bw + 2, by, bw - 4, H * 0.035);
      }
      g.font = `${Math.round(W / 70)}px "Press Start 2P"`;
      g.textAlign = 'left'; g.fillStyle = '#00ff6a';
      g.fillText(`ENERGIA ${String(Math.round(e * 100)).padStart(3, ' ')}%`, bx, by - H * 0.02);
      g.textAlign = 'center';
      if (won) {
        g.font = `${Math.round(W / 22)}px "Press Start 2P"`;
        g.fillStyle = Math.floor(now / 120) % 2 ? '#fcee0a' : '#ff2bd6';
        g.fillText('MAX POWER!', W / 2, H * 0.16);
      } else if (Math.floor(now / 500) % 2) {
        g.font = `${Math.round(W / 34)}px "Press Start 2P"`;
        g.fillStyle = '#fcee0a';
        g.fillText('APLAUDIU!', W / 2, H * 0.14);
      }
      // tiny VU in the corner, handy while calibrating
      g.textAlign = 'right'; g.font = `${Math.round(W / 110)}px "Press Start 2P"`; g.fillStyle = '#2f7a4d';
      g.fillText(`MIC ${Math.round(level * 100)} · PEAK ${Math.round(peak * 100)} · SENS ${media.sensitivity.toFixed(1)}`, W - 20, 30);
    };
  });

  function burst(x, y, n) {
    const colors = ['#00ff6a', '#00f0ff', '#ff2bd6', '#fcee0a'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 14;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, life: 1 + Math.random() * 1.5, s: 4 + Math.random() * 8, c: colors[i % 4] });
    }
  }

  return {
    onKey(e) {
      if (e.key === 'r') { energy = 0; won = false; sparks.length = 0; return true; }
      if (e.key === 'w') { energy = 1; won = true; wonAt = performance.now(); return true; }
      return false;
    },
    destroy: s.destroy,
  };
}
