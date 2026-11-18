// Shared logic for "one phone = one swarm": attractors from Firebase players, ghosts when nobody is connected.
export class Swarm {
  constructor(fb) {
    this.players = new Map();
    this.unsub = fb.watchPlayers(this.players);
    this.mouse = null;
  }

  attractors(time) {
    const list = [];
    const now = performance.now();
    for (const [id, p] of this.players) {
      if (now - (p.seen || 0) > 60_000) continue; // stale
      list.push({ id, x: p.x, y: p.y, hue: (p.h % 360) / 360, strength: 1 });
    }
    if (this.mouse) list.push({ id: 'mouse', x: this.mouse.x, y: this.mouse.y, hue: 0.33, strength: 1.6 });
    if (!list.length) {
      // three ghosts in Lissajous orbits so the field is never empty
      for (let i = 0; i < 3; i++) {
        const t = time * 0.25 + i * 2.1;
        list.push({ id: `ghost${i}`, ghost: true, x: 0.5 + Math.sin(t * (1 + i * 0.3)) * 0.32, y: 0.5 + Math.cos(t * (1.3 + i * 0.2)) * 0.32, hue: [0.33, 0.85, 0.52][i], strength: 1 });
      }
    }
    return list;
  }

  get count() { return this.players.size; }

  destroy() { this.unsub(); }
}

export function drawMarkers(g, list, w, h) {
  g.clearRect(0, 0, w, h);
  g.lineWidth = 2;
  for (const a of list) {
    if (a.ghost) continue;
    const x = a.x * w, y = a.y * h;
    g.strokeStyle = `hsl(${a.hue * 360} 100% 65%)`;
    g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.stroke();
    g.fillStyle = g.strokeStyle;
    g.fillRect(x - 2, y - 2, 4, 4);
  }
}
