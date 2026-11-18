// Remake of the 2019 "orbitals" demo: the audience drives the rings from their phones.
import { mountSketch } from './p5host.js';
import { RING_PARAMS, defaultRings, clampParam } from '../shared/params.js';
import { qrBox } from '../fx/qr.js';

export default async function mount(host, { fb, controlUrl }) {
  let opt = defaultRings();
  const target = { ...opt };
  const log = [];
  const unsub = fb.onRings((v) => {
    for (const k of Object.keys(v)) if (v[k] !== target[k]) { log.unshift({ k, v: v[k], t: performance.now() }); }
    log.length = Math.min(log.length, 5);
    Object.assign(target, v);
    syncPanel();
  });

  let lastT = null;
  const phases = Array.from({ length: 64 }, () => Math.random() * Math.PI * 2);
  const dirs = Array.from({ length: 64 }, (_, i) => (i % 3 === 1 ? -1 : 1));
  const arcs = Array.from({ length: 64 }, () => 1 + ((Math.random() * 3) | 0));

  const s = mountSketch(host, (p) => {
    p.setup = () => { p.colorMode(p.HSB, 360, 100, 100, 1); p.background(0); };
    p.draw = () => {
      // ease towards the shared state so phone changes feel smooth
      for (const k of Object.keys(opt)) opt[k] += (target[k] - opt[k]) * (k === 'count' ? 1 : 0.12);
      const now = p.millis(), count = Math.round(opt.count);
      const dt = Math.min(0.05, (now - (lastT ?? now)) / 1000); lastT = now;
      p.blendMode(p.BLEND);
      p.background(0, 0, 0, 0.16 + (1 - Math.min(1, Math.abs(opt.speed) / 300)) * 0.1);
      p.blendMode(p.ADD);
      p.noFill();
      p.translate(p.width / 2, p.height / 2);
      const R = Math.min(p.width, p.height) * 0.46 * opt.size;
      for (let i = 0; i < count; i++) {
        const f = (i + 1) / count;
        phases[i] += dirs[i] * (opt.speed / 60) * (1.6 - f) * dt;
        const jitter = opt.chaos > 0 ? (Math.random() - 0.5) * opt.chaos * 60 : 0;
        const r = Math.max(2, f * R + jitter);
        const hue = (opt.hue + f * 120 + (Math.random() - 0.5) * opt.chaos * 180 + 360) % 360;
        const n = arcs[i];
        for (let a = 0; a < n; a++) {
          const start = phases[i] + (a * p.TWO_PI) / n, len = (p.TWO_PI / n) * 0.55;
          p.stroke(hue, 90, 60, 0.35); p.strokeWeight(opt.thickness * 2.6);
          p.arc(0, 0, r * 2, r * 2, start, start + len);
          p.stroke(hue, 40, 100, 0.95); p.strokeWeight(Math.max(1, opt.thickness * 0.6));
          p.arc(0, 0, r * 2, r * 2, start, start + len);
          // light ray to the arc head
          p.stroke(hue, 80, 100, 0.08); p.strokeWeight(1);
          p.line(0, 0, Math.cos(start + len) * r, Math.sin(start + len) * r);
        }
        if (opt.chaos > 0.5 && Math.random() < (opt.chaos - 0.5) * 0.15) {
          p.stroke(0, 0, 100, 0.6); p.strokeWeight(2);
          p.line(-p.width, (Math.random() - 0.5) * p.height, p.width, (Math.random() - 0.5) * p.height);
        }
      }
      p.blendMode(p.BLEND);
      drawHud();
    };
  });

  // ---- HUD: QR, live values and the last changes coming from phones
  const qr = qrBox(controlUrl, Math.round(innerHeight * 0.2));
  qr.classList.add('hud', 'br');
  const vals = document.createElement('div');
  vals.className = 'hud tl';
  host.append(qr, vals);
  function drawHud() {
    const now = performance.now();
    vals.innerHTML = Object.entries(RING_PARAMS).map(([k, d]) => {
      const hot = log.find((l) => l.k === k && now - l.t < 1200);
      const v = target[k];
      return `<div style="margin-bottom:.7em;color:${hot ? 'var(--yellow)' : 'var(--green)'}">${d.label.toUpperCase().padEnd(10, '.')} ${Number.isInteger(d.step) ? Math.round(v) : v.toFixed(2)}</div>`;
    }).join('');
  }

  // ---- plan B: local panel (G) writes the same params
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.style.cssText = 'position:absolute;left:2.5vw;bottom:3vh;width:min(420px,40vw);display:none;z-index:6;font-size:20px';
  panel.innerHTML = '<div class="panel-title">CONTROL LOCAL</div>' + Object.entries(RING_PARAMS).map(([k, d]) =>
    `<label style="display:block;color:var(--cyan)">${d.label}<input data-k="${k}" type="range" min="${d.min}" max="${d.max}" step="${d.step}" style="width:100%"></label>`).join('');
  host.append(panel);
  function syncPanel() { panel.querySelectorAll('input').forEach((el) => { if (document.activeElement !== el) el.value = target[el.dataset.k]; }); }
  panel.addEventListener('input', (e) => {
    const k = e.target.dataset.k, v = clampParam(k, Number(e.target.value));
    target[k] = v;
    fb.setRing(k, v);
  });
  syncPanel();

  return {
    onKey(e) {
      if (e.key === 'g') { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; return true; }
      if (e.key === 'r') { fb.resetRings(); Object.assign(target, defaultRings()); syncPanel(); return true; }
      return false;
    },
    destroy() { unsub(); s.destroy(); },
  };
}
