// Display preferences that change on site: colour theme (screen vs projector) and text size (room distance).
export const THEMES = ['dark', 'light'];

export function nextTheme(current) {
  return current === 'light' ? 'dark' : 'light';
}

export const TEXT_SCALE = { min: 0.8, max: 1.2, step: 0.1 };

export function stepTextScale(current, direction) {
  const base = Number.isFinite(current) ? current : 1;
  const next = Math.round((base + direction * TEXT_SCALE.step) * 100) / 100;
  return Math.min(TEXT_SCALE.max, Math.max(TEXT_SCALE.min, next));
}
