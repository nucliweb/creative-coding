// Georg Nees, "Schotter" (1968). Disorder grows row by row; shout and it collapses faster.
import { mountSketch } from './p5host.js';

export default async function mount(host, { media }) {
  const s = mountSketch(host, (p) => {
    const COLS = 12, ROWS = 22;
    p.setup = () => { p.rectMode(p.CENTER); };
    p.draw = () => {
      p.background(2, 6, 4);
      const size = Math.min(p.width / (COLS + 2), p.height / (ROWS + 2));
      const ox = (p.width - COLS * size) / 2 + size / 2, oy = (p.height - ROWS * size) / 2 + size / 2;
      const chaos = 1 + media.level * 5;
      const t = p.millis() / 4000;
      p.noFill();
      p.strokeWeight(Math.max(1.5, size / 18));
      for (let j = 0; j < ROWS; j++) {
        const r = (j / ROWS) * chaos;
        for (let i = 0; i < COLS; i++) {
          const n1 = p.noise(i * 0.7, j * 0.7, t) - 0.5, n2 = p.noise(i * 0.7 + 50, j * 0.7, t) - 0.5, n3 = p.noise(i * 0.7, j * 0.7 + 90, t) - 0.5;
          p.push();
          p.translate(ox + i * size + n1 * r * size * 1.5, oy + j * size + n2 * r * size * 1.5);
          p.rotate(n3 * r * p.PI);
          p.stroke(0, 255, 106, 230);
          p.rect(0, 0, size, size);
          p.pop();
        }
      }
    };
  });
  return { destroy: s.destroy };
}
