// Single source of truth for everything the audience can control.
// The Firebase rules (database.rules.json) mirror these limits; a test keeps them in sync.

export const RING_PARAMS = {
  speed: { label: 'Velocitat', min: -300, max: 300, step: 1, default: 60 },
  size: { label: 'Mida', min: 0.4, max: 2.5, step: 0.01, default: 1 },
  hue: { label: 'Color', min: 0, max: 360, step: 1, default: 150 },
  thickness: { label: 'Gruix', min: 1, max: 24, step: 0.5, default: 4 },
  chaos: { label: 'Caos', min: 0, max: 1, step: 0.01, default: 0 },
  count: { label: 'Anells', min: 3, max: 48, step: 1, default: 16 },
};

export const STAGES = ['idle', 'rings', 'messages', 'particles', 'finale'];

export const PLAYER_LIMITS = { hueMax: 360 };

export const MESSAGE_MAX = 20;

export const AVATAR_LIMITS = { nameMax: 12, speedMin: 1, speedMax: 5, dashMax: 100000 };

export const SCORE_LIMITS = { hitsMax: 100000, playersMax: 1000 };

export function clampParam(key, value) {
  const p = RING_PARAMS[key];
  const n = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(n)) return p.default;
  return Math.min(p.max, Math.max(p.min, n));
}

export function defaultRings() {
  return Object.fromEntries(Object.entries(RING_PARAMS).map(([k, p]) => [k, p.default]));
}
