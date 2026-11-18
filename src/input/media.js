// Shared camera + microphone. Started once from the boot screen (user gesture) and reused by every demo.
import { smoothLevel, levelFromRms } from '../shared/energy.js';

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

export const media = {
  video: null,
  videoReady: false,
  audioReady: false,
  level: 0,          // smoothed 0..1
  raw: 0,            // instant 0..1
  bands: new Float32Array(8),
  sensitivity: store.get('cc.sensitivity', 4),
  fakeMic: false,    // hold M to simulate applause (plan B)
  errors: {},
  ctx: null,
  analyser: null,
  _videoStream: null,
  _audioStream: null,
  _buf: null,
  _freq: null,
  _loop: 0,

  async start() {
    this.video = this.video || Object.assign(document.createElement('video'), { muted: true, playsInline: true, autoplay: true });
    this.ctx = this.ctx || new AudioContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    await Promise.all([this.startVideo(store.get('cc.camera', null)), this.startAudio(store.get('cc.mic', null))]);
    if (!this._loop) this._tick();
  },

  async startVideo(deviceId) {
    this._videoStream?.getTracks().forEach((t) => t.stop());
    try {
      this._videoStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      this.video.srcObject = this._videoStream;
      await this.video.play();
      this.videoReady = true;
      delete this.errors.video;
      if (deviceId) store.set('cc.camera', deviceId);
    } catch (e) {
      this.videoReady = false;
      this.errors.video = e.name || String(e);
      if (deviceId) return this.startVideo(null);
    }
  },

  async startAudio(deviceId) {
    this._audioStream?.getTracks().forEach((t) => t.stop());
    try {
      this._audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const src = this.ctx.createMediaStreamSource(this._audioStream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.5;
      src.connect(this.analyser);
      this._buf = new Float32Array(this.analyser.fftSize);
      this._freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.audioReady = true;
      delete this.errors.audio;
      if (deviceId) store.set('cc.mic', deviceId);
    } catch (e) {
      this.audioReady = false;
      this.errors.audio = e.name || String(e);
      if (deviceId) return this.startAudio(null);
    }
  },

  async devices() {
    const list = await navigator.mediaDevices.enumerateDevices();
    return {
      cameras: list.filter((d) => d.kind === 'videoinput'),
      mics: list.filter((d) => d.kind === 'audioinput'),
      camera: this._videoStream?.getVideoTracks()[0]?.getSettings().deviceId,
      mic: this._audioStream?.getAudioTracks()[0]?.getSettings().deviceId,
    };
  },

  setSensitivity(v) {
    this.sensitivity = Math.min(20, Math.max(0.5, v));
    store.set('cc.sensitivity', this.sensitivity);
  },

  _tick() {
    const loop = () => {
      let rms = 0;
      if (this.analyser) {
        this.analyser.getFloatTimeDomainData(this._buf);
        for (let i = 0; i < this._buf.length; i++) rms += this._buf[i] * this._buf[i];
        rms = Math.sqrt(rms / this._buf.length);
        this.analyser.getByteFrequencyData(this._freq);
        const n = this._freq.length, bands = this.bands.length;
        for (let b = 0; b < bands; b++) {
          // log spaced bands
          const a = Math.floor(Math.pow(n, b / bands)), z = Math.max(a + 1, Math.floor(Math.pow(n, (b + 1) / bands)));
          let s = 0; for (let i = a; i < z; i++) s += this._freq[i];
          this.bands[b] = s / (z - a) / 255;
        }
      }
      let input = levelFromRms(rms, this.sensitivity);
      if (this.fakeMic) input = Math.max(input, 0.75 + Math.random() * 0.25);
      this.raw = input;
      this.level = smoothLevel(this.level, input);
      this._loop = requestAnimationFrame(loop);
    };
    loop();
  },
};

export function hasWebGPU() {
  return 'gpu' in navigator;
}
