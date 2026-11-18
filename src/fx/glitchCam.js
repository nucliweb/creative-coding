import { FULLSCREEN_VS, program, texture, target } from './gl.js';
import { GLITCH_FS, COPY_FS } from '../demos/glitchShader.glsl.js';

export const EFFECTS = [
  { key: '1', id: 'uBlock', label: 'BLOCK GLITCH' },
  { key: '2', id: 'uPixel', label: 'PIXELAT' },
  { key: '3', id: 'uRGB', label: 'ABERRACIÓ RGB' },
  { key: '4', id: 'uPal', label: 'PALETA 8-BIT' },
  { key: '5', id: 'uThermal', label: 'TÈRMICA' },
  { key: '6', id: 'uMosh', label: 'DATAMOSH' },
  { key: '7', id: 'uScan', label: 'CRT' },
];

export class GlitchCam {
  constructor(canvas, media, fx = {}) {
    this.canvas = canvas;
    this.media = media;
    this.fx = Object.fromEntries(EFFECTS.map((e) => [e.id, fx[e.id] ?? 0]));
    this.mirror = 1;
    const gl = (this.gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: false }));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.main = program(gl, FULLSCREEN_VS, GLITCH_FS);
    this.copy = program(gl, FULLSCREEN_VS, COPY_FS);
    this.camTex = texture(gl, 2, 2);
    this.resize();
    this._onResize = () => this.resize();
    addEventListener('resize', this._onResize);
    this.frame = 0;
  }

  resize() {
    const { gl } = this;
    const scale = 0.75; // render a bit under native: faster and more "video"
    this.canvas.width = Math.round(this.canvas.clientWidth * scale);
    this.canvas.height = Math.round(this.canvas.clientHeight * scale);
    this.targets = [target(gl, this.canvas.width, this.canvas.height), target(gl, this.canvas.width, this.canvas.height)];
  }

  toggle(id) { this.fx[id] = this.fx[id] ? 0 : 1; }

  render(time, level) {
    const { gl, media } = this;
    const v = media.video;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.camTex);
    if (media.videoReady && v.readyState >= 2) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
    const src = this.targets[this.frame % 2], dst = this.targets[(this.frame + 1) % 2];
    this.frame++;

    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.main.p);
    const u = this.main.u;
    gl.uniform1i(u.uCam, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(u.uPrev, 1);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uCamRes, v?.videoWidth || 16, v?.videoHeight || 9);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uLevel, level);
    gl.uniform1f(u.uMirror, this.mirror);
    for (const e of EFFECTS) gl.uniform1f(u[e.id], this.fx[e.id]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(this.copy.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dst.tex);
    gl.uniform1i(this.copy.u.uTex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destroy() { removeEventListener('resize', this._onResize); this.gl.getExtension('WEBGL_lose_context')?.loseContext(); }
}
