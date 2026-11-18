import { GpuParticles } from '../fx/gpuParticles.js';
import { Swarm, drawMarkers } from './swarm.js';
import { qrBox } from '../fx/qr.js';

export default async function mount(host, { media, fb, controlUrl }) {
  const canvas = document.createElement('canvas');
  const overlay = document.createElement('canvas');
  overlay.style.cssText = 'position:absolute;inset:0';
  host.append(canvas, overlay);
  const hud = document.createElement('div');
  hud.className = 'hud tl';
  const qr = qrBox(controlUrl, Math.round(innerHeight * 0.18));
  qr.classList.add('hud', 'br');
  host.append(hud, qr);

  let sim;
  try {
    sim = await GpuParticles.create(canvas, { count: 1_000_000 });
  } catch (e) {
    hud.innerHTML = `<span class="c-red">WEBGPU NO DISPONIBLE<br><br>${e.message}</span>`;
    return { destroy() {} };
  }
  host.__sim = sim; // handy for live tuning from the console during rehearsal
  const swarm = new Swarm(fb);
  const og = overlay.getContext('2d');
  const sizeOverlay = () => { overlay.width = overlay.clientWidth; overlay.height = overlay.clientHeight; };
  sizeOverlay();
  addEventListener('resize', sizeOverlay);

  const onMove = (e) => { if (e.buttons) swarm.mouse = { x: e.offsetX / host.clientWidth, y: e.offsetY / host.clientHeight }; };
  const onUp = () => { swarm.mouse = null; };
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerdown', onMove);
  addEventListener('pointerup', onUp);

  let raf, fps = 60, last = performance.now();
  const t0 = last;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    fps = fps * 0.95 + (1000 / Math.max(1, now - last)) * 0.05; last = now;
    const t = (now - t0) / 1000;
    const list = swarm.attractors(t);
    sim.frame(t, media.level, list);
    drawMarkers(og, list, overlay.width, overlay.height);
    hud.innerHTML = `COMPUTE SHADER // WEBGPU<br><br><span class="big-hud c-yellow">${(sim.count / 1e6).toFixed(1)}M</span>PARTÍCULES<br><br><span class="big-hud c-cyan">${swarm.count}</span>MÒBILS<br><br><span class="muted">${Math.round(fps)} FPS</span>`;
  };
  raf = requestAnimationFrame(loop);

  return {
    onKey(e) {
      if (e.key === 's') { sim.swirl = sim.swirl > 1.6 ? 0 : sim.swirl + 0.45; return true; }
      if (e.key === 'f') { sim.fade = sim.fade > 0.3 ? 0.04 : sim.fade + 0.08; return true; }
      return false;
    },
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener('resize', sizeOverlay); removeEventListener('pointerup', onUp);
      swarm.destroy(); sim.destroy();
    },
  };
}
