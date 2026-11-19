// Cheat-code style key combos (type the letters in order, case-insensitive, with short pauses).
// `consumed` says whether the key belongs to the combo, so the caller can stop its usual shortcut.
export const COMBO_START = { typed: '', at: 0, shown: '', done: false, consumed: false };

export function comboStep(state, key, now, word, timeout = 3000) {
  const k = String(key).toLowerCase();
  const typed = now - state.at > timeout ? '' : state.typed;
  let next = '';
  if (word.startsWith(typed + k)) next = typed + k;
  else if (word.startsWith(k)) next = k;
  const done = next === word;
  return { typed: done ? '' : next, at: now, shown: next.toUpperCase(), done, consumed: next !== '' };
}
