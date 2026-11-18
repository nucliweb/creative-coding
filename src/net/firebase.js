import { initializeApp } from 'firebase/app';
import {
  getDatabase, ref, onValue, set, update, push, remove, onDisconnect, serverTimestamp,
  query, orderByChild, startAt, onChildAdded, onChildChanged, onChildRemoved,
} from 'firebase/database';
import { CONFIG } from '../config.js';
import { clampParam, defaultRings, RING_PARAMS } from '../shared/params.js';
import { sanitizeMessage, isBlocked } from '../shared/sanitize.js';

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
