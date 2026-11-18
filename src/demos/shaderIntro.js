// The exact shader shown on the slide, running live.
import { FULLSCREEN_VS, program } from '../fx/gl.js';

export const INTRO_SHADER = `
uniform vec2 uRes;
uniform float uTime;

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float d = length(uv - 0.5);
  float w = sin(d * 40.0 - uTime * 4.0);
  fragColor = vec4(uv.x, w, uv.y, 1.0);
}`;

export default async function mount(host) {
  const canvas = document.createElement('canvas');
  host.append(canvas);
  const gl = canvas.getContext('webgl2');
  const prog = program(gl, FULLSCREEN_VS, `#version 300 es\nprecision highp float;\nout vec4 fragColor;\n${INTRO_SHADER}`);
  const size = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; };
  size();
  let raf; const t0 = performance.now();
  const loop = () => {
    raf = requestAnimationFrame(loop);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog.p);
    gl.uniform2f(prog.u.uRes, canvas.width, canvas.height);
    gl.uniform1f(prog.u.uTime, (performance.now() - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  raf = requestAnimationFrame(loop);
  return { destroy() { cancelAnimationFrame(raf); gl.getExtension('WEBGL_lose_context')?.loseContext(); } };
}
