import { SWARM_SLOTS } from '../shared/swarmSlots.js';

export const COMPUTE_WGSL = /* wgsl */ `
const SLOTS = ${SWARM_SLOTS}u;
struct Particle { pos: vec2f, vel: vec2f, hue: f32, seed: f32, pad: vec2f };
struct Params { count: u32, nAttr: u32, time: f32, level: f32, aspect: f32, swirl: f32, pull: f32, soft: f32, damp: f32, flow: f32, follow: f32, attract: f32, kick: f32, bx: f32, by: f32, vmax: f32, charge: f32, vpull: f32, vspin: f32, pad: f32 };

@group(0) @binding(0) var<storage, read_write> ps: array<Particle>;
@group(0) @binding(1) var<uniform> u: Params;
@group(0) @binding(2) var<storage, read> attrs: array<vec4f>; // x, y, strength, hue
@group(0) @binding(3) var<storage, read> owners: array<u32>; // slot -> attractor index

fn hash(n: f32) -> f32 { return fract(sin(n) * 43758.5453); }

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= u.count) { return; }
  var p = ps[i];
  var acc = vec2f(0.0);
  var targetHue = p.hue;

  // each particle follows only the attractor that owns its slot: one phone = one swarm
  let o = owners[i % SLOTS];
  if (o < u.nAttr) {
    let A = attrs[o];
    var d = A.xy - p.pos;
    d.x *= u.aspect;
    let r2 = dot(d, d) + u.soft;
    let inv = A.z / r2;
    acc += d * inv * u.pull + vec2f(-d.y, d.x) * inv * u.swirl;
    acc += d / sqrt(r2) * u.follow * A.z; // constant tug, however far: the swarm travels with its owner
    acc *= u.attract; // the blast switches attraction off for a moment
    targetHue = A.w;
  }

  // charging: everyone gathered at the centre feeds a spinning vortex that sucks in every swarm
  if (u.charge > 0.0) {
    var c = vec2f(u.bx, u.by) - p.pos;
    c.x *= u.aspect;
    let dist = length(c) + 0.01;
    let n = c / dist;
    let k = u.charge * u.charge;
    acc += n * k * u.vpull + vec2f(-n.y, n.x) * k * u.vspin / (0.15 + dist);
  }

  // flow field + audio turbulence
  let s = p.seed * 6.2831;
  let flow = vec2f(sin(p.pos.y * 3.0 + u.time * 0.6 + s), cos(p.pos.x * 2.6 - u.time * 0.4 + s));
  acc += flow * (u.flow + u.level * 0.003);

  // blast: one-frame outward kick from the centre, every particle painted by its direction
  if (u.kick > 0.0) {
    var r = p.pos - vec2f(u.bx, u.by);
    r.x *= u.aspect;
    let len = max(length(r), 0.001);
    p.vel += r / len * u.kick * (0.4 + p.seed);
    p.hue = fract(atan2(r.y, r.x) / 6.2831 + 0.5);
  }

  p.vel = p.vel * u.damp + acc;
  let sp = length(p.vel);
  if (sp > u.vmax) { p.vel *= u.vmax / sp; }
  p.pos += vec2f(p.vel.x / u.aspect, p.vel.y);

  // off screen: reborn next to its owner in its colour (or anywhere, if unowned); scattering
  // mixed colours uniformly over the screen would read as grey haze
  if (abs(p.pos.x) > 1.05 || abs(p.pos.y) > 1.05) {
    let k = f32(i) + u.time * 13.0;
    if (o < u.nAttr) {
      let A = attrs[o];
      let ang = hash(k) * 6.2831;
      let rad = sqrt(hash(k + 7.1)) * 0.08;
      p.pos = A.xy + vec2f(cos(ang) * rad / u.aspect, sin(ang) * rad);
      p.hue = A.w;
    } else {
      p.pos = vec2f(hash(k) * 2.0 - 1.0, hash(k + 7.1) * 2.0 - 1.0);
    }
    p.vel = vec2f(0.0);
  }

  let dh = fract(targetHue - p.hue + 0.5) - 0.5;
  p.hue = fract(p.hue + dh * 0.05 * u.attract); // keep the rainbow until the swarms come back
  ps[i] = p;
}
`;

export const RENDER_WGSL = /* wgsl */ `
struct Particle { pos: vec2f, vel: vec2f, hue: f32, seed: f32, pad: vec2f };
@group(0) @binding(0) var<storage, read> ps: array<Particle>;
@group(0) @binding(1) var<uniform> gain: vec4f; // x: brightness per particle (dimmed when they pile up in the vortex)

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
  o.col = vec4f(hsv(p.hue, 0.9 - e * 0.3, 0.25 + e), 1.0) * 0.2 * gain.x;
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
