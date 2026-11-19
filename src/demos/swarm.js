// Shared logic for "one phone = one swarm": attractors from Firebase players, ghosts when nobody is connected.
import { SWARM_SLOTS, assignSlots, ownerIndices } from '../shared/swarmSlots.js';

export class Swarm {
  constructor(fb) {
    this.players = new Map();
    this.unsub = fb.watchPlayers(this.players);
    this.mouse = null;
    this.slots = new Array(SWARM_SLOTS).fill(null);
  }

  // Which attractor owns each particle slot this frame (stable across joins and leaves).
  owners(list) {
    this.slots = assignSlots(this.slots, list.map((a) => a.id));
    return ownerIndices(this.slots, list);
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

// "Tots al centre": progress ring around the target. As the core charges, the particle vortex
// takes over: the ring fades out and the labels move to the top and bottom of the screen.
export function drawGathering(g, w, h, { inside, total }, radius, time, charge, ready) {
  const cx = w / 2, cy = h / 2, r = radius * h;
  const ratio = total ? inside / total : 0;
  const color = ready ? '#ffe600' : '#00ff6a';
  const ring = 1 - Math.min(1, charge * 1.4);
  g.save();
  if (ring > 0) {
    g.globalAlpha = ring;
    g.lineWidth = Math.max(2, h * 0.004);
    g.setLineDash([h * 0.012, h * 0.012]);
    g.lineDashOffset = -time * h * 0.02;
    g.strokeStyle = 'rgb(255 255 255 / 0.35)';
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.lineWidth = Math.max(4, h * 0.01);
    g.strokeStyle = color; g.shadowColor = color; g.shadowBlur = h * 0.02;
    g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
  }
  const top = cy - r - h * 0.03 + (h * 0.1 - (cy - r - h * 0.03)) * (1 - ring);
  const bottom = cy + r + h * 0.06 + (h * 0.94 - (cy + r + h * 0.06)) * (1 - ring);
  g.shadowColor = color; g.shadowBlur = h * 0.02;
  g.fillStyle = color; g.textAlign = 'center';
  g.font = `${Math.round(h * (ready ? 0.045 : 0.028))}px "Press Start 2P", monospace`;
  g.fillText(ready ? 'LLESTOS!' : 'TOTS AL CENTRE', cx, top);
  g.font = `${Math.round(h * 0.028)}px "Press Start 2P", monospace`;
  g.fillText(`${inside} / ${total}`, cx, bottom);
  g.restore();
}

// Soft white flash at the moment of the blast: never full white, eases out (no strobing).
export function drawFlash(g, w, h, since) {
  const k = 1 - since / 0.6;
  if (k <= 0) return;
  const a = 0.45 * k * k;
  const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  grad.addColorStop(0, `rgb(255 255 255 / ${a})`);
  grad.addColorStop(1, `rgb(255 255 255 / ${a * 0.15})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}
