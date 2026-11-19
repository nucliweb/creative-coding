import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import '../styles/theme.css';
import './presenter.css';
import { SLIDES } from './slides.js';
import { remoteKey } from '../shared/remoteKeys.js';

const $ = (s) => document.querySelector(s);
const ch = new BroadcastChannel('cc-deck');
let index = 0, step = 0, timerStart = null, pausedAt = null, tele = null, lastSeen = 0;

const starts = []; let acc = 0;
for (const s of SLIDES) { starts.push(acc); acc += s.minutes || 0; }
const TOTAL = acc;

$('#list').innerHTML = SLIDES.map((s, i) => `<li data-i="${i}"><span class="muted">${fmt(starts[i] * 60)}</span> ${s.title}</li>`).join('');
$('#list').onclick = (e) => { const li = e.target.closest('li'); if (li) ch.postMessage({ type: 'nav', action: 'goto', index: Number(li.dataset.i) }); };
$('#b-prev').onclick = () => ch.postMessage({ type: 'nav', action: 'prev' });
$('#b-next').onclick = () => ch.postMessage({ type: 'nav', action: 'next' });
$('#b-timer').onclick = toggleTimer;
$('#b-reset').onclick = () => { timerStart = null; pausedAt = null; sendTimer(); };

addEventListener('keydown', (e) => {
  if (['ArrowRight', 'PageDown', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); ch.postMessage({ type: 'nav', action: 'next' }); }
  if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { e.preventDefault(); ch.postMessage({ type: 'nav', action: 'prev' }); }
  if (e.key === 'i') toggleTimer();
  const fwd = remoteKey(e); // every other key drives the deck: demo keys, theme, text size, mute…
  if (fwd) { if (e.key === 'Tab') e.preventDefault(); ch.postMessage({ type: 'key', ...fwd }); }
});
addEventListener('keyup', (e) => { const fwd = remoteKey(e); if (fwd) ch.postMessage({ type: 'keyup', ...fwd }); });

function toggleTimer() {
  if (timerStart === null) timerStart = Date.now();
  else if (pausedAt === null) pausedAt = Date.now();
  else { timerStart += Date.now() - pausedAt; pausedAt = null; }
  sendTimer();
}
function sendTimer() { ch.postMessage({ type: 'timer', timerStart }); }

ch.onmessage = ({ data }) => {
  lastSeen = Date.now();
  if (data.type === 'state') {
    if (data.timerStart !== undefined && data.timerStart !== timerStart && pausedAt === null) timerStart = data.timerStart;
    if (data.index !== index || data.step !== step) { index = data.index; step = data.step; render(); }
  }
  if (data.type === 'telemetry') tele = data;
};
ch.postMessage({ type: 'hello' });

function fmt(sec) {
  const s = Math.max(0, Math.round(Math.abs(sec)));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function render() {
  const s = SLIDES[index], n = SLIDES[index + 1];
  $('#pos').textContent = `${index + 1} / ${SLIDES.length}${s.steps ? ` · pas ${step}/${s.steps}` : ''} · previst ${fmt(starts[index] * 60)} (${s.minutes} min)`;
  $('#title').textContent = s.title;
  $('#notes').textContent = s.notes || '';
  $('#next-title').textContent = n ? n.title : '— FI —';
  $('#next-notes').textContent = n ? (n.notes || '').split('\n')[0] : '';
  document.querySelectorAll('#list li').forEach((li, i) => li.classList.toggle('on', i === index));
  document.querySelector('#list li.on')?.scrollIntoView({ block: 'nearest' });
}

function tick() {
  const now = pausedAt ?? Date.now();
  const el = timerStart === null ? 0 : (now - timerStart) / 1000;
  $('#timer').textContent = fmt(el);
  $('#b-timer').textContent = timerStart === null ? 'INICIA' : pausedAt ? 'CONTINUA' : 'PAUSA';
  const planned = starts[index] * 60;
  const d = el - planned;
  const slideEnd = (starts[index] + (SLIDES[index].minutes || 0)) * 60;
  $('#delta').textContent = timerStart === null ? `TOTAL ${fmt(TOTAL * 60)}` : `${d > 0 ? '+' : '-'}${fmt(d)}`;
  $('#delta').className = `pixel ${timerStart === null ? 'muted' : el > slideEnd + 15 ? 'c-red' : d > 20 ? 'c-yellow' : 'c-green'}`;
  $('#clock').textContent = new Date().toTimeString().slice(0, 5);
  const ok = (b, label) => `<span class="${b ? 'c-green' : 'c-red'}">${b ? '■' : '□'} ${label}</span>`;
  const alive = Date.now() - lastSeen < 2000;
  $('#status').innerHTML = !alive ? '<span class="c-red">SENSE CONNEXIÓ AMB LES SLIDES<br>(obre-les en aquest navegador)</span>' : tele ? `
    ${ok(tele.video, 'CÀMERA')} ${ok(tele.audio, 'MICRO')} ${ok(tele.webgpu, 'WEBGPU')} ${ok(tele.fb, 'FIREBASE')}<br>
    MIC <span class="c-green">${'█'.repeat(Math.round(tele.level * 24)).padEnd(24, '░')}</span> sens ${tele.sensitivity.toFixed(1)}<br>
    MÒBILS <span class="c-cyan">${tele.phones}</span>` : '...';
  requestAnimationFrame(tick);
}
render();
tick();
