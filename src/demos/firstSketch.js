// The "hello world" of Processing, live: ellipse(mouseX, mouseY, 50, 50).
import { mountSketch } from './p5host.js';

export default async function mount(host) {
  let lastMove = -1e9;
  const s = mountSketch(host, (p) => {
    p.setup = () => { p.background(2, 6, 4); };
    p.mouseMoved = () => { lastMove = p.millis(); };
    p.draw = () => {
      let x = p.mouseX, y = p.mouseY;
      if (p.millis() - lastMove > 1500) {
        const t = p.millis() / 1000;
        x = p.width / 2 + Math.sin(t * 1.3) * p.width * 0.38;
        y = p.height / 2 + Math.sin(t * 2.1) * p.height * 0.36;
      }
      p.stroke(0); p.strokeWeight(2);
      p.fill((p.frameCount * 2) % 255, 255, 106 + ((p.frameCount * 3) % 149));
      p.ellipse(x, y, 50, 50);
    };
  });
  return {
    onKey(e) { if (e.key === 'x') { s.p.background(2, 6, 4); return true; } return false; },
    destroy: s.destroy,
  };
}
