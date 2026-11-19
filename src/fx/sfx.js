// Synthesised sound effects (Web Audio, no files): arena crashes, a chiptune "win" arpeggio and a
// deep boom. Everything goes through one master bus so M can mute it all.
import { media } from '../input/media.js';

let own = null, master = null, noiseBuf = null;
let muted = (() => { try { return localStorage.getItem('cc.muted') === '1'; } catch { return false; } })();

export const isMuted = () => muted;
// M on the deck: silence every effect (and cut the ones still ringing). Remembered across reloads.
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('cc.muted', muted ? '1' : '0'); } catch { /* private mode */ }
  master?.gain.setTargetAtTime(muted ? 0 : 1, master.context.currentTime, 0.02);
  return muted;
}
// Reuse the deck's AudioContext (started on the boot screen). Call from a key press the first time,
// so a fallback context can start even if the boot screen was skipped.
export function audio() {
  const ctx = media.ctx || (own ||= new AudioContext());
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function bus(ctx) {
  if (!master || master.context !== ctx) {
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }
  return master;
}

function out(ctx, volume) {
  const g = ctx.createGain();
  g.gain.value = volume;
  g.connect(bus(ctx));
  return g;
}

function noise(ctx) {
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// Short noise burst through a filter: the "click" of an impact.
function click(ctx, dest, { at, dur, freq, type, vol }) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise(ctx); f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(at, Math.random() * 0.9); src.stop(at + dur + 0.01);
}

// Pitch sweep with a fast attack and decay: the body of an impact.
function sweep(ctx, dest, { type, from, to, at, dur, vol }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(g).connect(dest);
  o.start(at); o.stop(at + dur + 0.02);
}

// Two players crash: a chunky "bonk" (square drop through a lowpass) plus a click. volume 0..1.
export function playHit(volume) {
  if (muted) return;
  const ctx = audio(), t = ctx.currentTime + 0.005;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800 + volume * 2500;
  lp.connect(out(ctx, 0.35 * volume));
  const f = 190 * (0.85 + Math.random() * 0.3);
  sweep(ctx, lp, { type: 'square', from: f, to: f * 0.35, at: t, dur: 0.14, vol: 0.8 });
  sweep(ctx, lp, { type: 'sine', from: f * 0.5, to: 45, at: t, dur: 0.18, vol: 1 });
  click(ctx, lp, { at: t, dur: 0.035, freq: 1200, type: 'highpass', vol: 0.6 });
}

// A player bounces off the arena edge: a lighter, higher "tick". volume 0..1.
export function playWall(volume) {
  if (muted) return;
  const ctx = audio(), t = ctx.currentTime + 0.005, dest = out(ctx, 0.18 * volume);
  const f = 560 * (0.9 + Math.random() * 0.2);
  sweep(ctx, dest, { type: 'triangle', from: f, to: f * 0.62, at: t, dur: 0.08, vol: 1 });
  click(ctx, dest, { at: t, dur: 0.02, freq: 3000, type: 'highpass', vol: 0.5 });
}

function note(ctx, dest, { type, freq, at, dur, vol }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.01);
  g.gain.setValueAtTime(vol, at + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(g).connect(dest);
  o.start(at); o.stop(at + dur + 0.02);
  return o;
}

// Level-complete jingle: C E G C' climbing fast, then a held chord with a little vibrato.
export function playWin() {
  if (muted) return;
  const ctx = audio(), t = ctx.currentTime + 0.02, dest = out(ctx, 0.22);
  [523.25, 659.25, 783.99].forEach((f, i) => {
    note(ctx, dest, { type: 'square', freq: f, at: t + i * 0.09, dur: 0.12, vol: 0.5 });
    note(ctx, dest, { type: 'triangle', freq: f / 2, at: t + i * 0.09, dur: 0.12, vol: 0.6 });
  });
  const end = t + 0.27;
  for (const f of [1046.5, 1318.5, 1568]) {
    const o = note(ctx, dest, { type: 'square', freq: f, at: end, dur: 0.9, vol: 0.28 });
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 7; depth.gain.value = f * 0.012;
    lfo.connect(depth).connect(o.frequency);
    lfo.start(end); lfo.stop(end + 0.95);
  }
  note(ctx, dest, { type: 'triangle', freq: 261.63, at: end, dur: 0.9, vol: 0.7 });
}

// Explosion: filtered noise sweeping down plus a sub-bass drop.
export function playBoom() {
  if (muted) return;
  const ctx = audio(), t = ctx.currentTime + 0.01, dest = out(ctx, 0.5);
  const len = Math.floor(ctx.sampleRate * 1.6);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
  noise.buffer = buf; lp.type = 'lowpass';
  lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(80, t + 1.4);
  ng.gain.setValueAtTime(0.9, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  noise.connect(lp).connect(ng).connect(dest);
  noise.start(t); noise.stop(t + 1.6);

  const sub = ctx.createOscillator(), sg = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(140, t); sub.frequency.exponentialRampToValueAtTime(32, t + 0.9);
  sg.gain.setValueAtTime(1, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
  sub.connect(sg).connect(dest);
  sub.start(t); sub.stop(t + 1.2);
}
