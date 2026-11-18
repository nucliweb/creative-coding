// Vera Molnár, "(Des)Ordres" (1974). Concentric squares, a little disorder, a lot of rigour.
import { mountSketch } from './p5host.js';

export default async function mount(host, { media }) {
  let seed = 1;
  const s = mountSketch(host, (p) => {
    const N = 8, LAYERS = 9;
    p.setup = () => { p.frameRate(30); };
    p.draw = () => {
      p.background(2, 6, 4);
      if (p.frameCount % 45 === 0) seed++;
      p.randomSeed(seed);
      const cell = Math.min(p.width, p.height) / (N + 0.6);
      const ox = (p.width - cell * N) / 2, oy = (p.height - cell * N) / 2;
      const dis = 0.035 + media.level * 0.2;
      p.noFill();
      p.strokeWeight(Math.max(1, cell / 70));
      for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
        const cx = ox + gx * cell + cell / 2, cy = oy + gy * cell + cell / 2;
        for (let k = 1; k <= LAYERS; k++) {
          if (p.random() < 0.18) continue;
          const h = (k / LAYERS) * cell * 0.46, j = () => p.random(-1, 1) * dis * cell;
          (gx + gy) % 2 ? p.stroke(255, 43, 214, 220) : p.stroke(0, 240, 255, 220);
          p.quad(cx - h + j(), cy - h + j(), cx + h + j(), cy - h + j(), cx + h + j(), cy + h + j(), cx - h + j(), cy + h + j());
        }
      }
    };
  });
  return { destroy: s.destroy };
}
