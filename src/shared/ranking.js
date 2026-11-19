// Crash leaderboard: most crashes first, ties share a position (1, 2, 2, 4) and are ordered by
// name so the list stays put between pauses.
export function ranking(players, limit = Infinity) {
  const sorted = [...players].sort((a, b) => b.hits - a.hits || a.name.localeCompare(b.name));
  let rank = 0;
  return sorted.slice(0, limit).map((p, i) => {
    if (i === 0 || p.hits !== sorted[i - 1].hits) rank = i + 1;
    return { id: p.id, name: p.name, hue: p.hue, hits: p.hits, rank };
  });
}

// What the deck tells each phone (crashes h, position r, room size n), sent as a patch with only
// the players whose numbers changed, plus null for players who left. Bots are left out via include.
export function scorePatch(sent, rows, include = () => true) {
  const n = rows.length, next = {}, patch = {};
  for (const row of rows) {
    if (!include(row.id)) continue;
    const v = { h: row.hits, r: row.rank, n };
    next[row.id] = v;
    const old = sent[row.id];
    if (!old || old.h !== v.h || old.r !== v.r || old.n !== v.n) patch[row.id] = v;
  }
  for (const id of Object.keys(sent)) if (!(id in next)) patch[id] = null;
  return { patch, sent: next };
}
