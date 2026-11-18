import { GlitchCam, EFFECTS } from '../fx/glitchCam.js';

export default async function mount(host, { media }) {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const cam = new GlitchCam(canvas, media, { uBlock: 1, uRGB: 1, uScan: 1 });
  const hud = document.createElement('div');
  hud.className = 'hud tl';
  const meter = document.createElement('div');
  meter.className = 'hud br';
  host.append(hud, meter);
  const renderHud = () => {
    hud.innerHTML = '<div style="margin-bottom:1em;color:var(--magenta)">FRAGMENT SHADER // WEBGL2</div>' + EFFECTS.map((e) =>
      `<div style="margin-bottom:.6em;color:${cam.fx[e.id] ? 'var(--green)' : 'var(--dim)'}">[${e.key}] ${cam.fx[e.id] ? '■' : '□'} ${e.label}</div>`).join('');
  };
  renderHud();

  let raf;
  const t0 = performance.now();
  const loop = () => {
    raf = requestAnimationFrame(loop);
    cam.render((performance.now() - t0) / 1000, media.level);
    const n = Math.round(media.level * 20);
    meter.textContent = `MIC ${'█'.repeat(n)}${'░'.repeat(20 - n)}`;
  };
  raf = requestAnimationFrame(loop);

  return {
    onKey(e) {
      const fx = EFFECTS.find((x) => x.key === e.key);
      if (fx) { cam.toggle(fx.id); renderHud(); return true; }
      if (e.key === '0') { for (const x of EFFECTS) cam.fx[x.id] = 0; renderHud(); return true; }
      if (e.key === 'm') { cam.mirror = 1 - cam.mirror; return true; }
      return false;
    },
    destroy() { cancelAnimationFrame(raf); cam.destroy(); },
  };
}
