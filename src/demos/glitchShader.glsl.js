export const GLITCH_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uCam;
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform vec2 uCamRes;
uniform float uTime, uLevel, uMirror;
uniform float uPixel, uRGB, uScan, uBlock, uMosh, uPal, uThermal;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// cover-fit the camera into the canvas
vec3 cam(vec2 uv) {
  float ca = uCamRes.x / uCamRes.y, sa = uRes.x / uRes.y;
  vec2 s = sa > ca ? vec2(1.0, ca / sa) : vec2(sa / ca, 1.0);
  uv = (uv - 0.5) * s + 0.5;
  uv.x = mix(uv.x, 1.0 - uv.x, uMirror);
  return texture(uCam, uv).rgb;
}

float bayer4(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return float(m[i.y * 4 + i.x]) / 16.0;
}

void main() {
  vec2 uv = vUv;
  float g = clamp(uLevel * 1.4, 0.0, 1.0);
  float t = floor(uTime * 14.0);

  // 1. block glitch: horizontal tears + displaced macroblocks
  if (uBlock > 0.0) {
    float band = floor(uv.y * 28.0);
    if (hash(vec2(band, t)) < 0.06 + g * 0.5) uv.x += (hash(vec2(t, band)) - 0.5) * (0.05 + g * 0.35);
    vec2 blk = floor(uv * vec2(20.0, 12.0));
    if (hash(blk + t) < 0.02 + g * 0.2) uv += (vec2(hash(blk * 1.7 + t), hash(blk * 2.3 - t)) - 0.5) * 0.15;
  }

  // 2. pixelate
  vec2 px = uv;
  if (uPixel > 0.0) {
    float cells = mix(140.0, 36.0, g);
    vec2 grid = vec2(cells, cells * uRes.y / uRes.x);
    px = (floor(uv * grid) + 0.5) / grid;
  }

  // 3. chromatic aberration
  vec3 col;
  if (uRGB > 0.0) {
    float s = 0.004 + g * 0.04;
    col = vec3(cam(px + vec2(s, 0.0)).r, cam(px).g, cam(px - vec2(s, 0.0)).b);
  } else {
    col = cam(px);
  }

  // 4. pixel-art palette with ordered dithering
  if (uPal > 0.0) {
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    vec2 cell = uPixel > 0.0 ? floor(px * uRes / 6.0) : floor(gl_FragCoord.xy / 3.0);
    float q = floor(l * 4.0 + bayer4(cell) - 0.25);
    vec3 pal[5] = vec3[5](vec3(0.02, 0.0, 0.08), vec3(0.35, 0.0, 0.55), vec3(1.0, 0.17, 0.84), vec3(0.0, 0.94, 1.0), vec3(0.99, 0.93, 0.04));
    col = pal[int(clamp(q, 0.0, 4.0))];
  }

  // 5. thermal vision
  if (uThermal > 0.0) {
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(vec3(l * 3.0 - 1.5, sin(l * 3.14159), 1.0 - l * 2.0), 0.0, 1.0);
  }

  // 6. datamosh-ish feedback: where the image barely changes, keep smearing the previous frame
  if (uMosh > 0.0) {
    vec2 b = floor(vUv * vec2(48.0, 27.0));
    vec2 drift = (vec2(hash(b + floor(uTime * 3.0)), hash(b + 7.7)) - 0.5) * (0.006 + g * 0.02);
    vec3 prev = texture(uPrev, vUv + drift).rgb;
    float keep = smoothstep(0.35, 0.05, length(col - prev)) * 0.93;
    col = mix(col, prev, keep);
  }

  // 7. CRT: scanlines, vignette, noise
  if (uScan > 0.0) {
    col *= 0.78 + 0.22 * sin(gl_FragCoord.y * 3.14159 * 0.66);
    col *= 1.0 - 0.45 * pow(length(vUv - 0.5) * 1.3, 2.0);
    col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.09;
    col.g *= 1.06;
  }

  fragColor = vec4(col, 1.0);
}`;

export const COPY_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 fragColor;
uniform sampler2D uTex;
void main() { fragColor = texture(uTex, vUv); }`;
