import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import '../styles/theme.css';
import './control.css';
import * as fb from '../net/firebase.js';
import { RING_PARAMS, clampParam } from '../shared/params.js';
import { sanitizeMessage, isBlocked, sanitizeName } from '../shared/sanitize.js';

const $ = (s) => document.querySelector(s);
fb.getDb();
fb.onConnection((c) => $('#conn').classList.toggle('on', c));

// ---------------------------------------------------------------- modes
let live = 'idle', manual = null;
const VIEWS = { idle: 'idle', rings: 'rings', messages: 'messages', particles: 'particles', finale: 'arena', arena: 'arena' };

function setView(mode) {
  const v = VIEWS[mode] || 'idle';
  document.querySelectorAll('section').forEach((s) => s.classList.toggle('on', s.dataset.view === v));
  document.querySelectorAll('#tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.mode === (manual || mode));
    b.classList.toggle('live', b.dataset.mode === live || (live === 'finale' && b.dataset.mode === 'arena'));
  });
  if (v === 'particles') joinSwarm(); else leaveSwarm();
  if (v === 'arena') joinArenaNow(); else leaveArena();
}
fb.onStage((s) => { live = s; manual = null; setView(s); });
$('#tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) { manual = b.dataset.mode; setView(manual); } };

// ---------------------------------------------------------------- rings
const sliders = $('#sliders');
sliders.innerHTML = Object.entries(RING_PARAMS).map(([k, p]) => `
  <div class="slider"><label>${p.label}<span id="v-${k}">${fmtVal(k, p.default)}</span></label>
  <input type="range" data-k="${k}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}"></div>`).join('');
const dragging = new Set();
const pending = {};
let flushTimer = 0;
sliders.addEventListener('pointerdown', (e) => e.target.dataset.k && dragging.add(e.target.dataset.k));
addEventListener('pointerup', () => dragging.clear());
sliders.addEventListener('input', (e) => {
  const k = e.target.dataset.k; if (!k) return;
  pending[k] = clampParam(k, Number(e.target.value));
  $(`#v-${k}`).textContent = fmtVal(k, pending[k]);
  if (!flushTimer) flushTimer = setTimeout(() => { flushTimer = 0; for (const [kk, v] of Object.entries(pending)) fb.setRing(kk, v); for (const kk in pending) delete pending[kk]; }, 80);
});
fb.onRings((v) => {
  for (const [k, val] of Object.entries(v)) {
    if (dragging.has(k)) continue;
    sliders.querySelector(`[data-k="${k}"]`).value = val;
    $(`#v-${k}`).textContent = fmtVal(k, val);
  }
});
function fmtVal(k, v) { return Number.isInteger(RING_PARAMS[k].step) ? Math.round(v) : v.toFixed(2); }

// ---------------------------------------------------------------- messages
let cooldownUntil = 0;
$('#msg-form').onsubmit = async (e) => {
  e.preventDefault();
  const input = $('#msg'), status = $('#msg-status'), btn = e.target.querySelector('button');
  const text = sanitizeMessage(input.value);
  if (!text) return;
  if (isBlocked(text)) { status.textContent = 'Prova amb una altra paraula 🙂'; return; }
  if (Date.now() < cooldownUntil) return;
  btn.disabled = true;
  try {
    await fb.sendMessage(text);
    status.textContent = `Enviat: ${text} ✓`;
    input.value = '';
    cooldownUntil = Date.now() + 4000;
    setTimeout(() => { btn.disabled = false; }, 4000);
  } catch (err) {
    status.textContent = 'No s’ha pogut enviar. Torna-ho a provar.';
    btn.disabled = false;
  }
};

// ---------------------------------------------------------------- swarm
const id = (() => {
  try { return sessionStorage.cc_id || (sessionStorage.cc_id = Math.random().toString(36).slice(2, 10)); } catch { return Math.random().toString(36).slice(2, 10); }
})();
const hue = (() => { try { return Number(sessionStorage.cc_hue || (sessionStorage.cc_hue = String(Math.floor(Math.random() * 360)))); } catch { return Math.floor(Math.random() * 360); } })();
const me = $('#me');
$('section[data-view="particles"]').style.setProperty('--me', hue); // the pad wears your swarm's colour
let player = null, pos = { x: 0.5, y: 0.5 };

function joinSwarm() {
  if (player) return;
  player = fb.joinAsPlayer(id, hue);
  player.move(pos.x, pos.y);
}
function leaveSwarm() { player?.leave(); player = null; }

const pad = $('#pad');
function onPad(e) {
  if (!e.isPrimary) return;
  const r = pad.getBoundingClientRect();
  pos = { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  me.style.left = `${pos.x * 100}%`; me.style.top = `${pos.y * 100}%`;
  joinSwarm();
  player.move(pos.x, pos.y);
}
pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); onPad(e); });
pad.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') onPad(e); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { leaveSwarm(); leaveArena(); return; }
  const v = VIEWS[manual || live];
  if (v === 'particles') joinSwarm();
  if (v === 'arena') joinArenaNow();
});

// ---------------------------------------------------------------- arena: name, colour, speed, joystick, dash
const HUES = [150, 185, 210, 270, 310, 340, 25, 55];
const saved = (k, d) => { try { return sessionStorage.getItem(k) ?? d; } catch { return d; } };
const keep = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } };
const profile = { n: saved('cc_name', ''), h: Number(saved('cc_arena_hue', HUES[Math.floor(Math.random() * HUES.length)])), s: Number(saved('cc_speed', 2)) };
let arena = null;

const nameInput = $('#arena-name');
nameInput.value = profile.n;
const swatches = $('#swatches');
swatches.innerHTML = HUES.map((h) => `<button type="button" data-h="${h}" aria-label="Color ${h}" style="background:hsl(${h} 100% 55%)"></button>`).join('');
const markSwatch = () => swatches.querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.h) === profile.h));
markSwatch();
const speedInput = $('#arena-speed');
speedInput.value = profile.s; $('#arena-speed-v').textContent = profile.s;

function joinArenaNow() {
  if (arena) return;
  arena = fb.joinArena(id, { n: profile.n, h: profile.h, s: profile.s });
  unwatchScore = fb.watchScore(id, showScore);
}
function leaveArena() { arena?.leave(); arena = null; unwatchScore(); unwatchScore = () => {}; }

// The deck sends back this phone's crashes and position: celebrate every new crash.
let unwatchScore = () => {}, lastHits = 0;
const scoreBox = $('#arena-score'), hitsEl = $('#score-hits'), rankEl = $('#score-rank'), ofEl = $('#score-of');
function showScore(s) {
  if (!s) { scoreBox.hidden = true; lastHits = 0; return; }
  scoreBox.hidden = false;
  hitsEl.textContent = s.h; rankEl.textContent = `#${s.r}`; ofEl.textContent = `/ ${s.n}`;
  rankEl.classList.toggle('lead', s.r === 1 && s.h > 0);
  if (s.h > lastHits) {
    hitsEl.classList.remove('bump'); void hitsEl.offsetWidth; hitsEl.classList.add('bump');
    navigator.vibrate?.(40);
  }
  lastHits = s.h;
}

const commitName = () => { profile.n = sanitizeName(nameInput.value); nameInput.value = profile.n; keep('cc_name', profile.n); arena?.profile({ n: profile.n }); };
nameInput.addEventListener('change', commitName);
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { nameInput.blur(); commitName(); } });
swatches.addEventListener('click', (e) => {
  const h = Number(e.target.dataset?.h); if (!Number.isFinite(h)) return;
  profile.h = h; keep('cc_arena_hue', h); markSwatch(); arena?.profile({ h });
});
speedInput.addEventListener('input', () => {
  profile.s = Number(speedInput.value); keep('cc_speed', profile.s); $('#arena-speed-v').textContent = profile.s; arena?.profile({ s: profile.s });
});

const stick = $('#stick'), knob = $('#knob');
function onStick(e) {
  const r = stick.getBoundingClientRect();
  let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; }
  knob.style.left = `${50 + x * 50}%`; knob.style.top = `${50 + y * 50}%`;
  joinArenaNow(); arena.stick(x, y);
}
function releaseStick() { knob.style.left = '50%'; knob.style.top = '50%'; arena?.stick(0, 0); }
stick.addEventListener('pointerdown', (e) => { stick.setPointerCapture(e.pointerId); onStick(e); });
stick.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') onStick(e); });
stick.addEventListener('pointerup', releaseStick);
stick.addEventListener('pointercancel', releaseStick);
$('#dash').addEventListener('click', () => { joinArenaNow(); arena.dash(); navigator.vibrate?.(30); });

setView('idle');
