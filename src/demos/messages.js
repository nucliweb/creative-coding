// Words from the audience fall through the digital rain and lock into place.
import { MatrixRain, randomGlyph } from '../fx/matrixRain.js';
import { qrBox } from '../fx/qr.js';

const TEST_WORDS = ['HOLA MÓN', 'GIROTRÒNICA', 'WAKE UP NEO', 'HELLO WORLD', 'CREATIVE CODING', 'P5.JS', 'SHADERS', 'BON DIA'];

export class MessageLayer {
  constructor(canvas, { rain = true, onText } = {}) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.words = [];
    this.queue = [];
    this.rain = rain ? new MatrixRain(canvas, { fontSize: 18, fade: 0.1 }) : null;
    this.onText = onText;
    this.resize();
    this._onResize = () => this.resize();
    addEventListener('resize', this._onResize);
  }

  resize() {
    if (!this.rain) { this.canvas.width = this.canvas.clientWidth; this.canvas.height = this.canvas.clientHeight; }
    this.W = this.canvas.clientWidth; this.H = this.canvas.clientHeight;
    this.big = Math.round(this.W / 26);
  }

  add(text) { this.queue.push(text); }

  _spawn(text) {
    const fs = this.big, cw = fs * 0.62;
    const used = this.words.map((w) => w.row);
    const rows = Math.floor((this.H * 0.72) / (fs * 1.5));
    let row = 0, best = -1;
    for (let r = 0; r < rows; r++) {
      const score = used.includes(r) ? -1 : Math.random();
      if (score > best) { best = score; row = r; }
    }
    const ty = this.H * 0.12 + row * fs * 1.5;
    const width = text.length * cw;
    const x0 = Math.random() * Math.max(0, this.W - width - this.W * 0.1) + this.W * 0.05;
    const letters = [...text].map((ch, i) => ({ ch, x: x0 + i * cw, y: -fs * (1 + Math.random() * 6), ty, v: 6 + Math.random() * 8, locked: false }));
    this.words.push({ text, row, letters, born: performance.now(), lockedAt: 0 });
    this.onText?.(text);
  }

  step(level = 0) {
    const now = performance.now();
    if (this.queue.length && (!this._lastSpawn || now - this._lastSpawn > 450)) { this._spawn(this.queue.shift()); this._lastSpawn = now; }
    if (this.rain) this.rain.step(level);
    else { this.g.clearRect(0, 0, this.W, this.H); }
    const g = this.g, fs = this.big;
    g.font = `${fs}px "Share Tech Mono", monospace`;
    g.textBaseline = 'top';
    for (let wi = this.words.length - 1; wi >= 0; wi--) {
      const w = this.words[wi];
      let all = true;
      const age = w.lockedAt ? (now - w.lockedAt) / 1000 : 0;
      if (age > 7) { this.words.splice(wi, 1); continue; }
      for (const l of w.letters) {
        if (!l.locked) {
          l.y += l.v; l.v += 0.6;
          if (l.y >= l.ty) { l.y = l.ty; l.locked = true; } else all = false;
        }
        const decaying = age > 5;
        const ch = !l.locked || (decaying && Math.random() < (age - 5) / 2) ? randomGlyph() : l.ch;
        const alpha = decaying ? Math.max(0, 1 - (age - 5) / 2) : 1;
        g.fillStyle = this.rain ? '#000' : 'rgba(0,0,0,0)';
        if (this.rain) g.fillRect(l.x - 2, l.y - 2, fs * 0.66, fs * 1.1);
        g.shadowColor = '#00ff6a'; g.shadowBlur = l.locked ? fs * 0.6 : 0;
        g.fillStyle = l.locked ? `rgba(230,255,240,${alpha})` : '#00ff6a';
        g.fillText(ch, l.x, l.y);
        g.shadowBlur = 0;
      }
      if (all && !w.lockedAt) w.lockedAt = now;
    }
  }

  destroy() { this.rain?.destroy(); removeEventListener('resize', this._onResize); }
}

export default async function mount(host, { fb, controlUrl }) {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const log = document.createElement('div');
  log.className = 'hud bl';
  log.style.cssText += ';font-family:var(--font-term);font-size:clamp(18px,2vw,36px);line-height:1.1';
  const lines = [];
  const layer = new MessageLayer(canvas, {
    onText(t) {
      const d = new Date();
      lines.unshift(`&gt; [${d.toTimeString().slice(0, 8)}] ${t.replace(/</g, '&lt;')}`);
      lines.length = Math.min(lines.length, 6);
      log.innerHTML = lines.join('<br>');
    },
  });
  const qr = qrBox(controlUrl, Math.round(innerHeight * 0.2));
  qr.classList.add('hud', 'br');
  const title = document.createElement('div');
  title.className = 'hud tl';
  title.innerHTML = 'ENVIEU UNA PARAULA<span class="cursor"></span>';
  host.append(log, qr, title);

  const unsub = fb.onMessages((text) => layer.add(text));
  let raf, last = 0;
  const loop = (t) => { raf = requestAnimationFrame(loop); if (t - last > 30) { layer.step(); last = t; } };
  raf = requestAnimationFrame(loop);

  return {
    onKey(e) {
      if (e.key === 'w') { layer.add(TEST_WORDS[(Math.random() * TEST_WORDS.length) | 0]); return true; }
      return false;
    },
    destroy() { cancelAnimationFrame(raf); unsub(); layer.destroy(); },
  };
}
