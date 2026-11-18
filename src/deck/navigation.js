export function next(slides, { index, step }) {
  if (step < (slides[index].steps || 0)) return { index, step: step + 1 };
  if (index < slides.length - 1) return { index: index + 1, step: 0 };
  return { index, step };
}

export function prev(slides, { index, step }) {
  if (step > 0) return { index, step: step - 1 };
  if (index > 0) return { index: index - 1, step: slides[index - 1].steps || 0 };
  return { index, step };
}

export function goTo(slides, index) {
  return { index: Math.min(slides.length - 1, Math.max(0, index)), step: 0 };
}

export function toHash(slides, { index, step }) {
  return `#/${slides[index].id}/${step}`;
}

export function parseHash(slides, hash) {
  const m = /^#\/([^/]+)\/?(\d+)?$/.exec(hash || '');
  if (!m) return { index: 0, step: 0 };
  const index = slides.findIndex((s) => s.id === m[1]);
  if (index < 0) return { index: 0, step: 0 };
  const step = Math.min(Number(m[2] || 0), slides[index].steps || 0);
  return { index, step };
}
