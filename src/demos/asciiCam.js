// Webcam -> Matrix ASCII. The camera points at the audience: they become the rain.
import { GLYPHS } from '../fx/matrixRain.js';

const TINTS = ['#0b6b32', '#00ff6a', '#e6fff0'];

function glyphAtlas(cell) {
  const c = document.createElement('canvas');
  c.width = GLYPHS.length * cell; c.height = TINTS.length * cell;
  const g = c.getContext('2d');
  g.font = `${Math.floor(cell * 0.95)}px "Share Tech Mono", monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  TINTS.forEach((t, row) => {
    g.fillStyle = t;
    g.shadowColor = t; g.shadowBlur = row === 2 ? cell * 0.5 : 0;
    for (let i = 0; i < GLYPHS.length; i++) g.fillText(GLYPHS[i], i * cell + cell / 2, row * cell + cell / 2);
  });
  return c;
}

export default async function mount(host, { media }) {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const g = canvas.getContext('2d');
  const small = document.createElement('canvas');
  const sg = small.getContext('2d', { willReadFrequently: true });

  let cols = 120, cell, rows, atlas, glyph, heads, mirror = true, contrast = 1.6;

  function resize() {
    canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
    cell = Math.ceil(canvas.width / cols);
    rows = Math.ceil(canvas.height / cell);
    small.width = cols; small.height = rows;
    atlas = glyphAtlas(cell);
    glyph = new Uint8Array(cols * rows).map(() => (Math.random() * GLYPHS.length) | 0);
    heads = Array.from({ length: cols }, () => Math.random() * rows);
  }
  resize();
  addEventListener('resize', resize);

  let raf, last = 0;
  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    if (t - last < 30) return;
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    g.fillStyle = '#000'; g.fillRect(0, 0, canvas.width, canvas.height);

    let data = null;
    if (media.videoReady && media.video.videoWidth) {
      // cover-fit the video into the grid
      const vw = media.video.videoWidth, vh = media.video.videoHeight;
      const target = cols / rows, src = vw / vh;
      let sw = vw, sh = vh, sx = 0, sy = 0;
      if (src > target) { sw = vh * target; sx = (vw - sw) / 2; } else { sh = vw / target; sy = (vh - sh) / 2; }
      sg.save();
      if (mirror) { sg.translate(cols, 0); sg.scale(-1, 1); }
      sg.drawImage(media.video, sx, sy, sw, sh, 0, 0, cols, rows);
      sg.restore();
      data = sg.getImageData(0, 0, cols, rows).data;
    }

    const boost = media.level;
    for (let x = 0; x < cols; x++) {
      heads[x] += dt * (8 + (x * 7) % 11) * (1 + boost * 4);
      if (heads[x] > rows + 12) heads[x] = -Math.random() * 20;
      for (let y = 0; y < rows; y++) {
        const i = y * cols + x;
        let b = 0.06;
        if (data) {
          const p = i * 4;
          b = (data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114) / 255;
          b = Math.min(1, Math.max(0, (b - 0.5) * contrast + 0.5));
        }
        const d = heads[x] - y;
        const trail = d >= 0 && d < 14 ? 1 - d / 14 : 0;
        b = Math.min(1, b * (0.55 + trail * 0.9) + trail * 0.18);
        if (b < 0.07) continue;
        if (Math.random() < 0.02 + trail * 0.08) glyph[i] = (Math.random() * GLYPHS.length) | 0;
        const tint = d >= 0 && d < 1 ? 2 : b > 0.72 ? 2 : b > 0.3 ? 1 : 0;
        g.globalAlpha = Math.min(1, b * 1.3);
        g.drawImage(atlas, glyph[i] * cell, tint * cell, cell, cell, x * cell, y * cell, cell, cell);
      }
    }
    g.globalAlpha = 1;
  };
  raf = requestAnimationFrame(frame);

  const hud = document.createElement('div');
  hud.className = 'hud bl';
  hud.innerHTML = media.videoReady ? '&gt; CAM_01 :: AUDIÈNCIA DETECTADA<span class="cursor"></span>' : '<span class="c-red">&gt; SENSE CÀMERA</span>';
  host.append(hud);

  return {
    onKey(e) {
      if (e.key === 'm') { mirror = !mirror; return true; }
      if (e.key === '+' || e.key === '=') { cols = Math.min(240, cols + 20); resize(); return true; }
      if (e.key === '-') { cols = Math.max(40, cols - 20); resize(); return true; }
      if (e.key === 'c') { contrast = contrast > 2.4 ? 1 : contrast + 0.4; return true; }
      return false;
    },
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', resize); },
  };
}
