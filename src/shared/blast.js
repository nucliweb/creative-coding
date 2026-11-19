// The swarm climax: everyone gathers at the centre, then the presenter makes it explode.
// After the kick the swarms fly free for a moment and then re-form around their owners.
export const BLAST = {
  kick: 0.07,      // outward velocity added on the blast frame
  vmaxCalm: 0.03,  // normal speed limit
  vmaxBlast: 0.09, // speed limit right after the blast, easing back to calm
  calm: 1.4,       // seconds with no attraction at all
  recover: 4.5,    // seconds until the swarms are fully back
  target: 0.2,     // radius of the gathering target, as a fraction of the screen height
  ready: 0.7,      // share of phones inside the target for a full charge
  chargeUp: 1.2,   // charge rate towards a higher target (1/s)
  chargeDown: 3,   // drain rate towards a lower target (1/s)
};

const smoothstep = (k) => k * k * (3 - 2 * k);

// t: seconds since the blast, or null when nothing has exploded.
export function blastEnvelope(t) {
  if (t === null || t >= BLAST.recover) return { attract: 1, vmax: BLAST.vmaxCalm };
  if (t < BLAST.calm) {
    return { attract: 0, vmax: BLAST.vmaxBlast + (BLAST.vmaxCalm - BLAST.vmaxBlast) * (t / BLAST.calm) };
  }
  return { attract: smoothstep((t - BLAST.calm) / (BLAST.recover - BLAST.calm)), vmax: BLAST.vmaxCalm };
}

// How many phones are inside the target. Coordinates are 0..1 of width and height, so x is
// scaled by the aspect ratio to measure a round target; r is a fraction of the height.
export function gathered(list, { x, y, r, aspect }) {
  let inside = 0, total = 0;
  for (const a of list) {
    if (a.ghost || a.id === 'mouse') continue;
    total++;
    if (Math.hypot((a.x - x) * aspect, a.y - y) <= r) inside++;
  }
  return { inside, total };
}

// While gathering, the share of phones inside the target charges the core: full at BLAST.ready.
export function chargeTarget({ inside, total }) {
  return total ? Math.min(1, inside / total / BLAST.ready) : 0;
}

// Smooth approach to the target: builds up over a couple of seconds, drains faster.
export function nextCharge(charge, target, dt) {
  const rate = target > charge ? BLAST.chargeUp : BLAST.chargeDown;
  return charge + (target - charge) * (1 - Math.exp(-rate * dt));
}

// The more charged the core, the bigger the bang.
export function blastKick(charge) {
  return BLAST.kick * (0.6 + 0.6 * charge);
}

// "LLESTOS!": on at full charge, off only once it clearly drops, so the win fires once per moment.
export function nextReady(ready, charge) {
  return ready ? charge > 0.8 : charge >= 0.95;
}

// The climax as presenter keys: g calls everyone to the centre, x explodes, r starts a new round.
export const CLIMAX_START = { gathering: false, charge: 0, ready: false, blastAt: null };

export function climaxKey(state, key, now) {
  switch (key.toLowerCase()) {
    case 'g': return { ...state, gathering: !state.gathering };
    case 'x': return { ...state, gathering: false, charge: 0, ready: false, blastAt: now };
    case 'r': return { ...state, gathering: true, charge: 0, ready: false }; // blastAt kept: recovery goes on
    default: return null;
  }
}
