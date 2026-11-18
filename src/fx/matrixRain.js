// Classic digital rain. Used as slide background and as the base layer of the messages demo.
export const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:.=*+-<>¦｜';

export function randomGlyph() { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; }

export class MatrixRain {
  constructor(canvas, { fontSize = 20, speed = 1, fade = 0.08, color = '#00ff6a' } = {}) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    Object.assign(this, { fontSize, speed, fade, color });
    this.running = false;
    this.resize();
    this._onResize = () => this.resize();
    addEventListener('resize', this._onResize);
  }

  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.canvas.width = w * dpr; this.canvas.height = h * dpr;
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    this.cols = Math.ceil(w / this.fontSize);
    this.drops = Array.from({ length: this.cols }, () => Math.random() * -h / this.fontSize);
    this.speeds = Array.from({ length: this.cols }, () => 0.3 + Math.random() * 0.7);
    this.g.fillStyle = '#000'; this.g.fillRect(0, 0, w, h);
  }

  step(boost = 0) {
    const { g, fontSize: fs } = this;
    g.fillStyle = `rgba(0,0,0,${this.fade})`;
    g.fillRect(0, 0, this.w, this.h);
    g.font = `${fs}px "Share Tech Mono", monospace`;
    g.textBaseline = 'top';
    for (let i = 0; i < this.cols; i++) {
      const y = this.drops[i] * fs;
      if (y > -fs) {
        g.fillStyle = Math.random() < 0.08 ? '#d8ffe6' : this.color;
        g.fillText(randomGlyph(), i * fs, y);
      }
      this.drops[i] += this.speeds[i] * this.speed * (1 + boost * 3);
      if (y > this.h && Math.random() > 0.975) this.drops[i] = Math.random() * -20;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = 0;
    const loop = (t) => {
      if (!this.running) return;
      if (t - last > 33) { this.step(); last = t; } // 30 fps is enough and cheap
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); }

  destroy() { this.stop(); removeEventListener('resize', this._onResize); }
}
