// Which presenter-view key presses are forwarded to the deck, so every demo key (climax, arena,
// combos) works from the presenter screen. Navigation and the timer stay local to the presenter.
const LOCAL = new Set(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageDown', 'PageUp', ' ', 'i']);
const DECK_ONLY = new Set(['P', 'F']); // Shift+P opens the presenter, Shift+F needs a click in the deck

export function remoteKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (LOCAL.has(e.key)) return null;
  if (e.shiftKey && DECK_ONLY.has(e.key)) return null;
  if (e.key.length !== 1 && e.key !== 'Tab') return null;
  return { key: e.key, shiftKey: e.shiftKey };
}
