import { GpuParticles, MAX_ATTRACTORS } from '../fx/gpuParticles.js';
import { Swarm, drawMarkers, drawGathering, drawFlash } from './swarm.js';
import { BLAST, blastEnvelope, gathered, chargeTarget, nextCharge, blastKick, nextReady, CLIMAX_START, climaxKey } from '../shared/blast.js';
import { audio, playWin, playBoom } from '../fx/sfx.js';
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
  host.__swarm = swarm; // rehearsal: fake players from the console
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
  let c = CLIMAX_START; // the climax: 'g' calls everyone to the centre, 'x' explodes, 'r' new round
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = (now - last) / 1000;
    fps = fps * 0.95 + (1000 / Math.max(1, now - last)) * 0.05; last = now;
    const t = (now - t0) / 1000;
    const list = swarm.attractors(t).slice(0, MAX_ATTRACTORS);
    const since = c.blastAt === null ? null : (now - c.blastAt) / 1000;
    const w = overlay.width, h = overlay.height;
    const crowd = gathered(list, { x: 0.5, y: 0.5, r: BLAST.target, aspect: w / h });
    const charge = nextCharge(c.charge, c.gathering ? chargeTarget(crowd) : 0, Math.min(0.1, dt));
    const ready = c.gathering && nextReady(c.ready, charge);
    if (ready && !c.ready) playWin();
    c = { ...c, charge, ready };
    const env = blastEnvelope(since);
    sim.attract = env.attract; sim.vmax = env.vmax + 0.025 * charge; sim.charge = charge;
    sim.frame(t, media.level, list, swarm.owners(list));
    drawMarkers(og, list, w, h);
    if (c.gathering) drawGathering(og, w, h, crowd, BLAST.target, t, charge, ready);
    if (since !== null) drawFlash(og, w, h, since);
    hud.innerHTML = `COMPUTE SHADER // WEBGPU<br><br><span class="big-hud c-yellow">${(sim.count / 1e6).toFixed(1)}M</span>PARTÍCULES<br><br><span class="big-hud c-cyan">${swarm.count}</span>MÒBILS<br><br><span class="muted">${Math.round(fps)} FPS</span>`;
  };
  raf = requestAnimationFrame(loop);

  return {
    onKey(e) {
      if (e.key === 's') { sim.swirl = sim.swirl > 1.6 ? 0 : sim.swirl + 0.45; return true; }
      if (e.key === 'f') { sim.fade = sim.fade > 0.3 ? 0.04 : sim.fade + 0.08; return true; }
      const next = climaxKey(c, e.key, performance.now());
      if (!next) return false;
      audio(); // first key press unlocks sound if the boot screen did not
      if (next.blastAt !== c.blastAt) { sim.explode(0.5, 0.5, blastKick(c.charge)); playBoom(); }
      c = next;
      return true;
    },
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener('resize', sizeOverlay); removeEventListener('pointerup', onUp);
      swarm.destroy(); sim.destroy();
    },
  };
}
