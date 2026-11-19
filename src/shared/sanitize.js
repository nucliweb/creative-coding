import { MESSAGE_MAX, AVATAR_LIMITS } from './params.js';

// Short blocklist (ca/es/en). It only needs to stop the obvious on a projector.
const BLOCKED = [
  'puta', 'puto', 'merda', 'mierda', 'polla', 'cony', 'coño', 'collons', 'cojones', 'gilipollas',
  'fill de puta', 'hijo de puta', 'marica', 'maricon', 'zorra', 'subnormal', 'retrasado', 'nazi',
  'putes', 'merdes', 'fuck', 'shit', 'bitch', 'cunt', 'dick', 'porn', 'sex', 'polla', 'follar', 'cabron', 'cabró',
];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$]/g, (c) => LEET[c])
    .replace(/[^a-zñ ]/g, '');
}

export function sanitizeMessage(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, MESSAGE_MAX);
}

// Word based match, so "COMPUTADORA" is fine but "P.U.T.A" or "PUTES" are not.
export function isBlocked(text) {
  const n = normalize(text);
  const words = n.split(' ').filter(Boolean);
  const joined = words.join(' ');
  return BLOCKED.some((b) => {
    const w = normalize(b);
    if (w.includes(' ')) return joined.includes(w);
    return words.some((t) => t.startsWith(w) && t.length <= w.length + 2);
  });
}

// Arena nicknames: same cleanup as messages, shorter, and blocked words become empty (caller shows a default).
export function sanitizeName(raw) {
  const clean = sanitizeMessage(raw).slice(0, AVATAR_LIMITS.nameMax).trim();
  return clean && !isBlocked(clean) ? clean : '';
}
