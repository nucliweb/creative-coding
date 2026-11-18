import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import '../styles/theme.css';
import './control.css';
import * as fb from '../net/firebase.js';
import { RING_PARAMS, clampParam } from '../shared/params.js';
import { sanitizeMessage, isBlocked } from '../shared/sanitize.js';

const $ = (s) => document.querySelector(s);
fb.getDb();
fb.onConnection((c) => $('#conn').classList.toggle('on', c));

// ---------------------------------------------------------------- modes
let live = 'idle', manual = null;
const VIEWS = { idle: 'idle', rings: 'rings', messages: 'messages', particles: 'particles', finale: 'particles' };

function setView(mode) {
  const v = VIEWS[mode] || 'idle';
  document.querySelectorAll('section').forEach((s) => s.classList.toggle('on', s.dataset.view === v || (mode === 'finale' && s.dataset.view === 'messages')));
  document.querySelectorAll('#tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.mode === (manual || mode));
    b.classList.toggle('live', b.dataset.mode === live || (live === 'finale' && b.dataset.mode !== 'rings'));
  });
  if (v === 'particles') joinSwarm(); else leaveSwarm();
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
me.style.borderColor = `hsl(${hue} 100% 60%)`;
me.style.boxShadow = `0 0 14px hsl(${hue} 100% 60%)`;
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
document.addEventListener('visibilitychange', () => { if (document.hidden) leaveSwarm(); else if (['particles', 'finale'].includes(manual || live)) joinSwarm(); });

setView('idle');
