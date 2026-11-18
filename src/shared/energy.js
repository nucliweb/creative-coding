// Applause "game": energy accumulates while the room is loud and leaks during silence.
const THRESHOLD = 0.45; // ignore murmurs and the speaker voice below this level
const GAIN = 0.36;      // energy per second per unit of level above the threshold
const LEAK = 0.08;      // energy lost per second

export function stepEnergy(energy, level, dt) {
  const push = Math.max(0, level - THRESHOLD) * GAIN;
  const next = energy + (push - (push > 0 ? 0 : LEAK)) * dt;
  return Math.min(1, Math.max(0, next));
}

// Envelope follower: fast attack, slow release, so claps read as a continuous level.
export function smoothLevel(current, input, attack = 0.6, release = 0.06) {
  const k = input > current ? attack : release;
  return current + (input - current) * k;
}

// Microphone RMS -> 0..1 on a dB scale (-40 dBFS .. -6 dBFS), so distant claps still register.
const DB_FLOOR = -40, DB_RANGE = 34;
export function levelFromRms(rms, sensitivity = 1) {
  const db = 20 * Math.log10(Math.max(1e-9, rms * sensitivity));
  return Math.min(1, Math.max(0, (db - DB_FLOOR) / DB_RANGE));
}
