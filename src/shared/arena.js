// Arena simulation: the deck is the single source of truth for positions and collisions.
// Phones only send intent (joystick, speed, dash); everyone sees the same physics on the projector.
import { AVATAR_LIMITS } from './params.js';

export const ARENA = {
  radius: 10,          // arena floor radius (world units)
  avatarRadius: 0.72,
  baseSpeed: 2.2,      // units/s at speed setting 1
  response: 6,         // how fast velocity follows the joystick (1/s)
  restitution: 0.9,
  dashImpulse: 9,
  hitThreshold: 0.6,   // closing speed that counts as a "hit" (avoids counting gentle touches)
  rammerShare: 0.6,    // a player is credited with a crash if they pushed at least this share of the harder push
};

// Who caused a crash: whoever was moving into the other. Standing still or moving away earns
// nothing; in a head-on crash where both charged with similar force, both are credited.
function rammers(a, b, nx, nz) {
  const pushA = a.vx * nx + a.vz * nz;    // a's speed towards b
  const pushB = -(b.vx * nx + b.vz * nz); // b's speed towards a
  const top = Math.max(pushA, pushB);
  const by = [];
  if (pushA > 0 && pushA >= top * ARENA.rammerShare) by.push(a.id);
  if (pushB > 0 && pushB >= top * ARENA.rammerShare) by.push(b.id);
  return by;
}

const clamp = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

function normalizeInput(raw = {}) {
  return {
    n: typeof raw.n === 'string' ? raw.n : '',
    h: clamp(raw.h, 0, 360, 120),
    s: clamp(raw.s, AVATAR_LIMITS.speedMin, AVATAR_LIMITS.speedMax, 1),
    jx: clamp(raw.jx, -1, 1, 0),
    jy: clamp(raw.jy, -1, 1, 0),
    d: clamp(raw.d, 0, AVATAR_LIMITS.dashMax, 0),
  };
}

export function createWorld() {
  return { avatars: new Map(), collisions: 0, spawned: 0 };
}

function spawnPoint(world) {
  // golden-angle spiral: spreads any number of newcomers without overlaps
  const i = world.spawned++;
  const r = (ARENA.radius - ARENA.avatarRadius * 2) * Math.sqrt(((i % 60) + 0.5) / 60);
  const a = i * 2.399963;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

export function syncAvatar(world, id, raw) {
  const input = normalizeInput(raw);
  let a = world.avatars.get(id);
  if (!a) {
    const p = spawnPoint(world);
    a = { id, x: p.x, z: p.z, vx: 0, vz: 0, heading: 0, lastDash: input.d, input };
    world.avatars.set(id, a);
  }
  a.input = input;
  return a;
}

export function removeMissing(world, liveIds) {
  for (const id of world.avatars.keys()) if (!liveIds.has(id)) world.avatars.delete(id);
}

export function stepArena(world, dt) {
  const events = [];
  const list = [...world.avatars.values()];
  const k = 1 - Math.exp(-ARENA.response * dt);
  const R = ARENA.radius - ARENA.avatarRadius;

  for (const a of list) {
    const { jx, jy, s, d } = a.input;
    const max = ARENA.baseSpeed * s;
    a.vx += (jx * max - a.vx) * k;
    a.vz += (jy * max - a.vz) * k;

    if (d !== a.lastDash) {
      a.lastDash = d;
      const len = Math.hypot(jx, jy);
      const dir = len > 0.1 ? [jx / len, jy / len] : [Math.cos(a.heading), Math.sin(a.heading)];
      a.vx += dir[0] * ARENA.dashImpulse;
      a.vz += dir[1] * ARENA.dashImpulse;
      events.push({ type: 'dash', id: a.id, x: a.x, z: a.z });
    }

    a.x += a.vx * dt;
    a.z += a.vz * dt;
    if (Math.hypot(a.vx, a.vz) > 0.05) a.heading = Math.atan2(a.vz, a.vx);

    const dist = Math.hypot(a.x, a.z);
    if (dist > R) {
      const nx = a.x / dist, nz = a.z / dist;
      a.x = nx * R; a.z = nz * R;
      const vn = a.vx * nx + a.vz * nz;
      if (vn > 0) {
        a.vx -= (1 + ARENA.restitution) * vn * nx;
        a.vz -= (1 + ARENA.restitution) * vn * nz;
        if (vn > ARENA.hitThreshold) events.push({ type: 'wall', id: a.id, x: a.x, z: a.z, strength: vn });
      }
    }
  }

  const min = ARENA.avatarRadius * 2;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      let dx = b.x - a.x, dz = b.z - a.z;
      let dist = Math.hypot(dx, dz);
      if (dist >= min) continue;
      if (dist < 1e-6) { dx = 1; dz = 0; dist = 1e-6; }
      const nx = dx / dist, nz = dz / dist;
      const push = (min - dist) / 2;
      a.x -= nx * push; a.z -= nz * push;
      b.x += nx * push; b.z += nz * push;
      const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (closing > 0) {
        const by = rammers(a, b, nx, nz); // before the bounce changes the velocities
        const jImp = ((1 + ARENA.restitution) * closing) / 2;
        a.vx -= jImp * nx; a.vz -= jImp * nz;
        b.vx += jImp * nx; b.vz += jImp * nz;
        if (closing > ARENA.hitThreshold) {
          world.collisions++;
          events.push({ type: 'hit', a: a.id, b: b.id, by, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, strength: closing });
        }
      }
    }
  }
  return events;
}
