import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import '@fontsource/share-tech-mono';
import '../styles/theme.css';

import { SLIDES } from './slides.js';
import { next, prev, goTo, parseHash, toHash } from './navigation.js';
import { MatrixRain } from '../fx/matrixRain.js';
import { drawQR } from '../fx/qr.js';
import { media, hasWebGPU } from '../input/media.js';
import * as fb from '../net/firebase.js';
import { CONFIG, controlUrl } from '../config.js';

const $ = (s) => document.querySelector(s);
const deck = $('#deck'), stageEl = $('#stage');
const channel = new BroadcastChannel('cc-deck');
const ctx = { media, fb, config: CONFIG, controlUrl: controlUrl(), toast };

let state = parseHash(SLIDES, location.hash);
let current = { index: -1, demo: null, token: 0 };
let booted = false;

// ---------------------------------------------------------------- background rain
const rain = new MatrixRain($('#bg-rain'), { fontSize: 18, fade: 0.09 });

// ---------------------------------------------------------------- rendering
async function show(nextState, { transition = true } = {}) {
  const changed = nextState.index !== current.index;
  state = nextState;
  history.replaceState(null, '', toHash(SLIDES, state));
  const slide = SLIDES[state.index];

  if (changed) {
    const token = ++current.token;
    try { current.demo?.destroy(); } catch (e) { console.error(e); }
    current.demo = null;
    if (transition && current.index >= 0) {
      stageEl.classList.add('glitch-out');
      await wait(150);
      if (token !== current.token) return;
      stageEl.classList.remove('glitch-out');
    }
    current.index = state.index;
    stageEl.innerHTML = slide.html();
    stageEl.querySelectorAll('[data-qr]').forEach((el) => {
      const url = el.dataset.qr === 'repo' ? CONFIG.repoUrl : ctx.controlUrl;
      el.className = 'qr-box';
      const c = document.createElement('canvas');
      drawQR(c, url, { size: Math.round(innerHeight * (el.dataset.qr === 'repo' ? 0.42 : 0.5)) });
      const u = document.createElement('div');
      u.className = 'url'; u.textContent = url.replace(/^https?:\/\//, '');
      el.append(c, u);
    });
    stageEl.classList.add('glitch-in');
    setTimeout(() => stageEl.classList.remove('glitch-in'), 300);

    const bg = slide.bg !== false;
    deck.classList.toggle('no-bg', !bg);
    bg ? rain.start() : rain.stop();
    if (slide.stage) fb.setStage(slide.stage);

    if (slide.demo) {
      const host = stageEl.querySelector(slide.demoTarget || '.demo-host');
      try {
        const mod = await slide.demo();
        if (token !== current.token) return;
        const d = await mod.default(host, ctx);
        if (token !== current.token) { d?.destroy?.(); return; }
        current.demo = d;
      } catch (e) {
        console.error(e);
        host.innerHTML = `<div class="hud tl c-red">ERROR A LA DEMO<br><br>${String(e.message || e).replace(/</g, '&lt;')}</div>`;
      }
    }
  }

  stageEl.querySelectorAll('[data-step]').forEach((el) => el.classList.toggle('on', Number(el.dataset.step) <= state.step));
  current.demo?.onStep?.(state.step);
  broadcast();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- presenter sync
let timerStart = null;
function broadcast() {
  channel.postMessage({ type: 'state', index: state.index, step: state.step, timerStart });
}
channel.onmessage = ({ data }) => {
  if (data.type === 'nav') navigate(data.action, data.index);
  if (data.type === 'hello') broadcast();
  if (data.type === 'timer') { timerStart = data.timerStart; broadcast(); }
};

const players = new Map();
let watchingPlayers = false;
setInterval(() => {
  channel.postMessage({
    type: 'telemetry',
    level: media.level,
    sensitivity: media.sensitivity,
    video: media.videoReady, audio: media.audioReady,
    fb: fb.isConnected(), phones: players.size, webgpu: hasWebGPU(),
  });
}, 150);

function navigate(action, index) {
  if (!booted) return;
  if (action === 'next') {
    if (timerStart === null && state.index === 0) timerStart = Date.now();
    show(next(SLIDES, state));
  }
  if (action === 'prev') show(prev(SLIDES, state));
  if (action === 'goto') show(goTo(SLIDES, index));
}

// ---------------------------------------------------------------- keyboard
const NEXT = ['ArrowRight', 'ArrowDown', 'PageDown', ' '];
const PREV = ['ArrowLeft', 'ArrowUp', 'PageUp'];

addEventListener('keydown', (e) => {
  if (!booted || e.target.closest?.('input, select, textarea')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!e.shiftKey && current.demo?.onKey?.(e)) { e.preventDefault(); return; }
  if (NEXT.includes(e.key)) { e.preventDefault(); navigate('next'); return; }
  if (PREV.includes(e.key)) { e.preventDefault(); navigate('prev'); return; }
  if (e.key === 'Home') return navigate('goto', 0);
  if (e.key === 'End') return navigate('goto', SLIDES.length - 1);
  if (e.key === 'P') return openPresenter();
  if (e.key === 'F') return toggleFullscreen();
  if (e.key === 'S') return toggleSettings();
  if (e.key === 'C') { document.body.classList.toggle('no-crt'); return; }
  if (e.key === 'b' || e.key === '.' || e.key === 'B') { document.body.classList.toggle('blackout'); return; }
  if (e.key === 'q') { media.fakeMic = true; return; }
  if (e.key === '+' || e.key === '=' || e.key === ']') { media.setSensitivity(media.sensitivity * 1.25); toast(`SENSIBILITAT MIC ${media.sensitivity.toFixed(1)}`); return; }
  if (e.key === '-' || e.key === '[') { media.setSensitivity(media.sensitivity / 1.25); toast(`SENSIBILITAT MIC ${media.sensitivity.toFixed(1)}`); return; }
});
addEventListener('keyup', (e) => { if (e.key === 'q' || e.key === 'Q') media.fakeMic = false; });
addEventListener('hashchange', () => { const s = parseHash(SLIDES, location.hash); if (s.index !== state.index || s.step !== state.step) show(s); });

function openPresenter() {
  window.open('presenter.html', 'cc-presenter', 'width=1280,height=800');
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

// ---------------------------------------------------------------- settings (Shift+S)
async function toggleSettings() {
  const el = $('#settings');
  if (el.classList.toggle('open')) {
    const d = await media.devices();
    const opts = (list, sel) => list.map((x, i) => `<option value="${x.deviceId}" ${x.deviceId === sel ? 'selected' : ''}>${x.label || `Dispositiu ${i + 1}`}</option>`).join('');
    el.innerHTML = `
      <div class="panel-title">CONFIGURACIÓ</div>
      <label>Càmera</label><select id="set-cam">${opts(d.cameras, d.camera)}</select>
      <label>Micròfon</label><select id="set-mic">${opts(d.mics, d.mic)}</select>
      <label>Sensibilitat micro: <span id="sens-v">${media.sensitivity.toFixed(1)}</span></label>
      <input id="set-sens" type="range" min="0.5" max="20" step="0.1" value="${media.sensitivity}">
      <label>Nivell</label><div id="set-meter" class="c-green">░</div>
      <div class="keys">→ ← PageDown/Up: navegar · Shift+P: presentador · Shift+F: pantalla completa · Shift+C: CRT · B o . : pantalla negra · mantén Q: micro simulat · +/-: sensibilitat</div>`;
    el.querySelector('#set-cam').onchange = (e) => media.startVideo(e.target.value);
    el.querySelector('#set-mic').onchange = (e) => media.startAudio(e.target.value);
    el.querySelector('#set-sens').oninput = (e) => { media.setSensitivity(Number(e.target.value)); el.querySelector('#sens-v').textContent = media.sensitivity.toFixed(1); };
    const meter = () => {
      if (!el.classList.contains('open')) return;
      const m = el.querySelector('#set-meter');
      if (m) m.textContent = '█'.repeat(Math.round(media.level * 30)).padEnd(30, '░');
      requestAnimationFrame(meter);
    };
    meter();
  }
}

// ---------------------------------------------------------------- boot sequence
async function boot() {
  const box = $('#boot');
  const line = (html) => { const d = document.createElement('div'); d.className = 'line'; d.innerHTML = html; box.append(d); return d; };
  const check = async (label, fn) => {
    const d = line(`${label.padEnd(14, '.')} <span class="warn">...</span>`);
    let r;
    try { r = await fn(); } catch (e) { r = { ok: false, msg: e.message }; }
    d.innerHTML = `${label.padEnd(14, '.')} ${r.ok ? '<span class="ok">[OK]</span>' : `<span class="fail">[FAIL]</span> <span class="muted">${r.msg || ''}</span>`}`;
    return r.ok;
  };
  line(`<span class="c-magenta">GIROTRÒNICA_OS</span> v26.11 // creative_coding.exe`);
  line('&nbsp;');
  const go = line('PREM [ENTER] PER CONNECTAR<span class="cursor"></span>');

  await new Promise((res) => {
    const start = (e) => { if (e.type === 'click' || e.key === 'Enter') { removeEventListener('keydown', start); box.removeEventListener('click', start); res(); } };
    addEventListener('keydown', start);
    box.addEventListener('click', start);
  });
  go.textContent = '> JACKING IN...';

  // never let a pending permission prompt block the talk; media can be retried from Shift+S
  await Promise.race([media.start(), wait(15000)]);
  await check('CÀMERA', async () => ({ ok: media.videoReady, msg: media.errors.video }));
  await check('MICRÒFON', async () => ({ ok: media.audioReady, msg: media.errors.audio }));
  await check('WEBGL2', async () => ({ ok: !!document.createElement('canvas').getContext('webgl2') }));
  await check('WEBGPU', async () => ({ ok: hasWebGPU() && !!(await navigator.gpu.requestAdapter()) }));
  await check('FIREBASE', () => new Promise((res) => {
    fb.getDb();
    const off = fb.onConnection((c) => { if (c) { off(); res({ ok: true }); } });
    setTimeout(() => { off(); res({ ok: false, msg: 'sense connexió: les demos funcionen en local' }); }, 4000);
  }));
  if (!watchingPlayers) { fb.watchPlayers(players); watchingPlayers = true; }
  line('&nbsp;');
  line(`<span class="muted">Mòbils: ${ctx.controlUrl}</span>`);
  line('<span class="c-yellow">SISTEMA A PUNT.</span> Shift+P obre la vista de presentador.');
  await wait(1400);
  box.remove();
  booted = true;
  show(state, { transition: false });
}

boot();
