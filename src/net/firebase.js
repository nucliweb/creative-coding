import { initializeApp } from 'firebase/app';
import {
  getDatabase, ref, onValue, set, update, push, remove, onDisconnect, serverTimestamp,
  query, orderByChild, startAt, onChildAdded, onChildChanged, onChildRemoved,
} from 'firebase/database';
import { CONFIG } from '../config.js';
import { clampParam, defaultRings, RING_PARAMS } from '../shared/params.js';
import { sanitizeMessage, isBlocked, sanitizeName } from '../shared/sanitize.js';

let db = null;
let connected = false;
let serverOffset = 0;
const connListeners = new Set();

export function getDb() {
  if (db) return db;
  if (!CONFIG.firebaseUrl) return null;
  const app = initializeApp({ databaseURL: CONFIG.firebaseUrl, projectId: new URL(CONFIG.firebaseUrl).hostname.split('-default')[0] });
  db = getDatabase(app);
  onValue(ref(db, '.info/connected'), (s) => { connected = !!s.val(); connListeners.forEach((f) => f(connected)); });
  onValue(ref(db, '.info/serverTimeOffset'), (s) => { serverOffset = s.val() || 0; });
  return db;
}

export const isConnected = () => connected;
export const serverNow = () => Date.now() + serverOffset;
export function onConnection(fn) { connListeners.add(fn); fn(connected); return () => connListeners.delete(fn); }

// ---- stage: which demo is on screen, so phones switch UI automatically
export function setStage(name) {
  const d = getDb(); if (!d) return Promise.resolve();
  return set(ref(d, 'stage'), name).catch((e) => console.warn('[fb] stage', e.message));
}
export function onStage(cb) {
  const d = getDb(); if (!d) return () => {};
  return onValue(ref(d, 'stage'), (s) => cb(s.val() || 'idle'));
}

// ---- rings
export function onRings(cb) {
  const d = getDb(); if (!d) { cb(defaultRings()); return () => {}; }
  return onValue(ref(d, 'rings'), (s) => {
    const v = s.val() || {};
    cb(Object.fromEntries(Object.keys(RING_PARAMS).map((k) => [k, clampParam(k, v[k])])));
  });
}
export function setRing(key, value) {
  const d = getDb(); if (!d) return Promise.resolve();
  return set(ref(d, `rings/${key}`), clampParam(key, value)).catch((e) => console.warn('[fb] ring', e.message));
}
export function resetRings() {
  const d = getDb(); if (!d) return Promise.resolve();
  return Promise.all(Object.entries(defaultRings()).map(([k, v]) => set(ref(d, `rings/${k}`), v))).catch(() => {});
}

// ---- players: one per phone
export function watchPlayers(players) {
  const d = getDb(); if (!d) return () => {};
  const r = ref(d, 'players');
  const put = (s) => { const v = s.val(); if (v) players.set(s.key, { ...players.get(s.key), ...v, seen: performance.now() }); };
  const offs = [onChildAdded(r, put), onChildChanged(r, put), onChildRemoved(r, (s) => players.delete(s.key))];
  return () => offs.forEach((f) => f());
}
export function joinAsPlayer(id, hue) {
  const d = getDb(); if (!d) return { move() {}, leave() {} };
  const r = ref(d, `players/${id}`);
  onDisconnect(r).remove();
  let last = 0, pending = null, timer = 0;
  const flush = () => { timer = 0; if (pending) { set(r, pending).catch(() => {}); pending = null; last = performance.now(); } };
  return {
    move(x, y) {
      pending = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)), h: hue };
      const wait = 90 - (performance.now() - last); // ~11 writes/s max
      if (wait <= 0) flush(); else if (!timer) timer = setTimeout(flush, wait);
    },
    leave() { remove(r).catch(() => {}); },
  };
}

// ---- arena avatars: phones send intent, the deck simulates
export function watchAvatars(onChange) {
  const d = getDb(); if (!d) return () => {};
  const r = ref(d, 'avatars');
  const put = (s) => onChange('put', s.key, s.val());
  const offs = [onChildAdded(r, put), onChildChanged(r, put), onChildRemoved(r, (s) => onChange('remove', s.key))];
  return () => offs.forEach((f) => f());
}
export function joinArena(id, profile) {
  const d = getDb(); if (!d) return null;
  const r = ref(d, `avatars/${id}`);
  const state = { n: sanitizeName(profile.n) || 'ANÒNIM', h: profile.h, s: profile.s, jx: 0, jy: 0, d: 0 };
  onDisconnect(r).remove();
  onDisconnect(ref(d, `scores/${id}`)).remove();
  set(r, state).catch((e) => console.warn('[fb] arena', e.message));
  let timer = 0, dirty = {};
  const flush = () => { timer = 0; const patch = dirty; dirty = {}; update(r, patch).catch(() => {}); };
  const queue = (patch, now = false) => {
    Object.assign(state, patch); Object.assign(dirty, patch);
    if (now) { clearTimeout(timer); flush(); } else if (!timer) timer = setTimeout(flush, 80); // ~12 writes/s max
  };
  return {
    profile(p) { queue({ ...(p.n !== undefined ? { n: sanitizeName(p.n) || 'ANÒNIM' } : {}), ...(p.h !== undefined ? { h: p.h } : {}), ...(p.s !== undefined ? { s: p.s } : {}) }, true); },
    stick(jx, jy) { queue({ jx: Math.round(jx * 100) / 100, jy: Math.round(jy * 100) / 100 }); },
    dash() { queue({ d: (state.d + 1) % 100000 }, true); },
    leave() { clearTimeout(timer); remove(r).catch(() => {}); },
  };
}

// ---- arena scores: the deck tells each phone its crashes and position
export function publishScores(patch) {
  const d = getDb(); if (!d || !Object.keys(patch).length) return;
  update(ref(d, 'scores'), patch).catch((e) => console.warn('[fb] scores', e.message));
}
export function watchScore(id, cb) {
  const d = getDb(); if (!d) return () => {};
  return onValue(ref(d, `scores/${id}`), (s) => cb(s.val()));
}

// ---- messages
export function sendMessage(text) {
  const d = getDb(); if (!d) return Promise.reject(new Error('offline'));
  const clean = sanitizeMessage(text);
  if (!clean) return Promise.reject(new Error('empty'));
  return push(ref(d, 'messages'), { text: clean, t: serverTimestamp() });
}
export function onMessages(cb) {
  const d = getDb(); if (!d) return () => {};
  const since = serverNow() - 2000;
  const q = query(ref(d, 'messages'), orderByChild('t'), startAt(since));
  return onChildAdded(q, (s) => {
    const v = s.val();
    const text = sanitizeMessage(v?.text);
    if (text && !isBlocked(text)) cb(text, s.key);
  });
}

export { update };
