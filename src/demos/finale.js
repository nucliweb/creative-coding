// Everything at once: webcam shader + WebGPU swarms from phones + audience words + mic-driven logo.
import { GlitchCam } from '../fx/glitchCam.js';
import { GpuParticles } from '../fx/gpuParticles.js';
import { MessageLayer } from './messages.js';
import { Swarm, drawMarkers } from './swarm.js';
import { qrBox } from '../fx/qr.js';

export default async function mount(host, { media, fb, controlUrl }) {
  const layer = (blend) => {
    const c = document.createElement('canvas');
    c.style.cssText = `position:absolute;inset:0;width:100%;height:100%;${blend ? `mix-blend-mode:${blend}` : ''}`;
    host.append(c);
    return c;
  };
  const camCanvas = layer();
  camCanvas.style.filter = 'brightness(0.45) contrast(1.35) saturate(1.2)'; // keep the camera as a backdrop so swarms and words pop
  const gpuCanvas = layer('screen');
  const markCanvas = layer(); // transparent 2D layers composite fine without blending
  const msgCanvas = layer();

  const cam = new GlitchCam(camCanvas, media, { uBlock: 1, uRGB: 1, uScan: 1, uPal: 0 });
  let sim = null;
  try { sim = await GpuParticles.create(gpuCanvas, { count: 600_000 }); sim.fade = 0.18; } catch { gpuCanvas.remove(); }
  const swarm = new Swarm(fb);
  const words = new MessageLayer(msgCanvas, { rain: false });
  const unsubMsg = fb.onMessages((t) => words.add(t));
  const mg = markCanvas.getContext('2d');

  const logo = document.createElement('img');
  logo.src = 'logo-girotronica.svg';
  logo.style.cssText = 'position:absolute;left:50%;top:50%;width:46vw;transform:translate(-50%,-50%);mix-blend-mode:screen;pointer-events:none';
  host.append(logo);

  const hud = document.createElement('div');
  hud.className = 'hud tl';
  const qr = qrBox(controlUrl, Math.round(innerHeight * 0.16));
  qr.classList.add('hud', 'br');
  host.append(hud, qr);

  const resize = () => { markCanvas.width = markCanvas.clientWidth; markCanvas.height = markCanvas.clientHeight; };
  resize();
  addEventListener('resize', resize);

  let raf, showLogo = true, pal = false;
  const t0 = performance.now();
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const t = (performance.now() - t0) / 1000, L = media.level;
    cam.render(t, L);
    const list = swarm.attractors(t);
    sim?.frame(t, L, list);
    drawMarkers(mg, list, markCanvas.width, markCanvas.height);
    words.step(L);
    const s = 1 + L * 0.5, dx = L > 0.35 ? (Math.random() - 0.5) * L * 40 : 0;
    logo.style.opacity = showLogo ? String(0.25 + L * 0.75) : '0';
    logo.style.transform = `translate(calc(-50% + ${dx}px), -50%) scale(${s})`;
    logo.style.filter = `drop-shadow(${L * 12}px 0 #ff2bd6) drop-shadow(${-L * 12}px 0 #00f0ff)`;
    hud.innerHTML = `TOT JUNT<span class="cursor"></span><br><br><span class="c-cyan">${swarm.count}</span> MÒBILS · MIC ${'█'.repeat(Math.round(L * 10)).padEnd(10, '░')}`;
  };
  raf = requestAnimationFrame(loop);

  return {
    onKey(e) {
      if (e.key === 'l') { showLogo = !showLogo; return true; }
      if (e.key === 'p') { pal = !pal; cam.fx.uPal = pal ? 1 : 0; return true; }
      if (e.key === 'd') { cam.toggle('uMosh'); return true; }
      if (e.key === 'w') { words.add('TOT JUNT'); return true; }
      return false;
    },
    destroy() {
      cancelAnimationFrame(raf); removeEventListener('resize', resize);
      unsubMsg(); swarm.destroy(); words.destroy(); cam.destroy(); sim?.destroy();
    },
  };
}
