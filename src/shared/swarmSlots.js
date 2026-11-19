// Particle ownership for the swarm demo. Particle i belongs to slot (i % SWARM_SLOTS) and each slot
// belongs to one player, so every phone owns its own share of the million particles. Assignment is
// stable: when someone joins or leaves, only the slots that must change hands do, so the swarms of
// everyone else keep following their owners instead of reshuffling.
export const SWARM_SLOTS = 240;
export const NO_OWNER = 0xffffffff;

export function assignSlots(prev, ids) {
  const table = prev.map(() => null);
  if (!ids.length) return table;

  const held = new Map(ids.map((id) => [id, []]));
  const free = [];
  prev.forEach((id, slot) => (held.has(id) ? held.get(id).push(slot) : free.push(slot)));

  // Even split; the spare slots go to whoever already holds the most, so fewer slots move.
  const base = Math.floor(prev.length / ids.length);
  const extra = prev.length % ids.length;
  const byHeld = [...ids].sort((a, b) => held.get(b).length - held.get(a).length);
  const target = new Map(byHeld.map((id, k) => [id, base + (k < extra ? 1 : 0)]));

  for (const id of ids) {
    const mine = held.get(id), keep = target.get(id);
    mine.slice(0, keep).forEach((slot) => { table[slot] = id; });
    free.push(...mine.slice(keep));
  }
  for (const id of ids) {
    for (let need = target.get(id) - Math.min(held.get(id).length, target.get(id)); need > 0; need--) table[free.pop()] = id;
  }
  return table;
}

// Slot owners (ids) to indices into this frame's attractor list, as the GPU reads them.
export function ownerIndices(table, list) {
  const index = new Map(list.map((a, i) => [a.id, i]));
  return Uint32Array.from(table, (id) => index.get(id) ?? NO_OWNER);
}
