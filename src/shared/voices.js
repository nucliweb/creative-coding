// How loud a crash sounds: light touches stay audible, hard dashes hit full volume.
export function impactVolume(strength) {
  const s = Number.isFinite(strength) ? strength : 0;
  const k = Math.min(1, Math.max(0, (s - 0.6) / 12));
  return 0.15 + 0.85 * Math.sqrt(k);
}

// At most `max` sounds per `window` ms: with a full room, extra crashes are dropped instead of
// piling up into noise.
export function createVoiceGate({ max, window }) {
  let times = [];
  return {
    allow(now) {
      times = times.filter((t) => t > now - window);
      if (times.length >= max) return false;
      times.push(now);
      return true;
    },
  };
}
