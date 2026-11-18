export const COMPUTE_WGSL = /* wgsl */ `
struct Particle { pos: vec2f, vel: vec2f, hue: f32, seed: f32, pad: vec2f };
struct Params { count: u32, nAttr: u32, time: f32, level: f32, aspect: f32, swirl: f32, pull: f32, soft: f32, damp: f32, flow: f32, pad0: f32, pad1: f32 };

@group(0) @binding(0) var<storage, read_write> ps: array<Particle>;
@group(0) @binding(1) var<uniform> u: Params;
@group(0) @binding(2) var<storage, read> attrs: array<vec4f>; // x, y, strength, hue

fn hash(n: f32) -> f32 { return fract(sin(n) * 43758.5453); }

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= u.count) { return; }
  var p = ps[i];
  var acc = vec2f(0.0);
  var best = 1e9;
  var bestHue = p.hue;

  for (var a = 0u; a < u.nAttr; a++) {
    let A = attrs[a];
    var d = A.xy - p.pos;
    d.x *= u.aspect;
    let r2 = dot(d, d) + u.soft;
    let inv = A.z / r2;
    acc += d * inv * u.pull + vec2f(-d.y, d.x) * inv * u.swirl;
    if (r2 < best) { best = r2; bestHue = A.w; }
  }

  // flow field + audio turbulence
  let s = p.seed * 6.2831;
  let flow = vec2f(sin(p.pos.y * 3.0 + u.time * 0.6 + s), cos(p.pos.x * 2.6 - u.time * 0.4 + s));
  acc += flow * (u.flow + u.level * 0.003);

  p.vel = p.vel * u.damp + acc;
  let sp = length(p.vel);
  if (sp > 0.03) { p.vel *= 0.03 / sp; }
  p.pos += vec2f(p.vel.x / u.aspect, p.vel.y);

  if (abs(p.pos.x) > 1.05 || abs(p.pos.y) > 1.05) {
    let k = f32(i) + u.time * 13.0;
    p.pos = vec2f(hash(k) * 2.0 - 1.0, hash(k + 7.1) * 2.0 - 1.0);
    p.vel = vec2f(0.0);
  }

  let dh = fract(bestHue - p.hue + 0.5) - 0.5;
  p.hue = fract(p.hue + dh * 0.03);
  ps[i] = p;
}
`;

export const RENDER_WGSL = /* wgsl */ `
struct Particle { pos: vec2f, vel: vec2f, hue: f32, seed: f32, pad: vec2f };
@group(0) @binding(0) var<storage, read> ps: array<Particle>;

struct VOut { @builtin(position) pos: vec4f, @location(0) col: vec4f };

fn hsv(h: f32, s: f32, v: f32) -> vec3f {
  let k = vec3f(1.0, 2.0 / 3.0, 1.0 / 3.0);
  let p = abs(fract(vec3f(h) + k) * 6.0 - 3.0);
  return v * mix(vec3f(1.0), clamp(p - 1.0, vec3f(0.0), vec3f(1.0)), s);
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> VOut {
  let p = ps[i];
  var o: VOut;
  o.pos = vec4f(p.pos, 0.0, 1.0);
  let e = clamp(length(p.vel) * 60.0, 0.0, 1.0);
  o.col = vec4f(hsv(p.hue, 0.85 - e * 0.5, 0.25 + e), 1.0) * 0.2;
  return o;
}
@fragment fn fs(v: VOut) -> @location(0) vec4f { return v.col; }
`;

export const FADE_WGSL = /* wgsl */ `
@group(0) @binding(0) var<uniform> fade: vec4f;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(p * 2.0 - 1.0, 0.0, 1.0);
}
@fragment fn fs() -> @location(0) vec4f { return fade; }
`;

export const BLIT_WGSL = /* wgsl */ `
@group(0) @binding(0) var tex: texture_2d<f32>;
@group(0) @binding(1) var smp: sampler;
struct VOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VOut {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var o: VOut;
  o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
  o.uv = vec2f(p.x, 1.0 - p.y);
  return o;
}
@fragment fn fs(v: VOut) -> @location(0) vec4f {
  let c = textureSample(tex, smp, v.uv).rgb;
  return vec4f(1.0 - exp(-c * 1.6), 1.0); // soft tonemap: dense areas glow instead of clipping
}
`;
