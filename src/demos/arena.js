// Finale: every phone is a character in a shared 3D arena (Three.js). The deck runs the physics.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ARENA, createWorld, syncAvatar, removeMissing, stepArena } from '../shared/arena.js';
import { sanitizeName } from '../shared/sanitize.js';
import { qrBox } from '../fx/qr.js';
import { COMBO_START, comboStep } from '../shared/combo.js';
import { impactVolume, createVoiceGate } from '../shared/voices.js';
import { playHit, playWall } from '../fx/sfx.js';
import { ranking, scorePatch } from '../shared/ranking.js';

const BOT_NAMES = ['NEO', 'TRINITY', 'GLITCH', 'PIXEL', 'BYTE'];
const color = (h, l = 0.55) => new THREE.Color().setHSL((h % 360) / 360, 1, l);

// Name tag above each avatar, with that player's own crash count underneath once they have one.
function labelTexture(name, hue, hits = 0) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.font = '40px "Press Start 2P", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 10; g.strokeStyle = '#000'; g.strokeText(name, 256, 52);
  g.fillStyle = `hsl(${hue} 100% 70%)`; g.fillText(name, 256, 52);
  if (hits > 0) {
    const tag = `${hits} XOCS`;
    g.font = '30px "Press Start 2P", monospace';
    g.lineWidth = 8; g.strokeText(tag, 256, 118);
    g.fillStyle = '#fff'; g.fillText(tag, 256, 118);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Canvas gradients for the "vice" look (Miami sunset): a sky behind and a warm glow on the floor.
function gradientTexture(stops, radial) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = radial ? g.createRadialGradient(256, 256, 0, 256, 256, 256) : g.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([at, col]) => grad.addColorStop(at, col));
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Scene palettes. Players keep their own colours in both, so everyone can still find themselves.
const THEMES = {
  neon: {
    background: () => new THREE.Color(0x020604), fog: 0x020604, fogDensity: 0.028,
    sky: 0x88ffcc, ground: 0x110022, hemi: 0.7, sun: 0xffffff,
    floor: 0x05090a, floorGlow: null, grid: [0xff2bd6, 0x0b6b32], gridOpacity: 0.55,
    posts: [0x00ff6a, 0xff2bd6], edge: [0.5, 0.5], bloom: 0.55,
  },
  vice: {
    background: () => gradientTexture([[0, '#12021f'], [0.45, '#5a0f5e'], [0.75, '#ff2e88'], [1, '#ff9a3d']]),
    fog: 0x3a0d4a, fogDensity: 0.022,
    sky: 0xff9ad0, ground: 0x2a0a3d, hemi: 1.1, sun: 0xffb070,
    floor: 0x14031f, floorGlow: () => gradientTexture([[0, '#ff9a3d'], [0.35, '#ff2e88'], [0.7, '#5a0f5e'], [1, '#14031f']], true),
    grid: [0xff2e88, 0xff8a3d], gridOpacity: 0.4,
    posts: [0x19e3d6, 0xff2e88], edge: [0.92, 0.6], bloom: 0.85,
  },
};

function makeAvatar(name, hue) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: color(hue, 0.45), emissive: color(hue, 0.5), emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.1 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.45, 6, 16), bodyMat);
  body.position.y = 0.72;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.15, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  visor.position.set(0, 0.95, 0.36);
  const ringMat = new THREE.MeshBasicMaterial({ color: color(hue), transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.72, 40), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(name, hue), transparent: true, depthWrite: false }));
  label.scale.set(3.7, 1.16, 1); label.position.y = 2.05;
  const facing = new THREE.Group();
  facing.add(body, visor);
  group.add(facing, ring, label);
  group.scale.setScalar(ARENA.avatarRadius / 0.6); // visuals were modelled for a 0.6 radius
  return { group, facing, body, bodyMat, ringMat, label, name, hue, squash: 0, hits: 0, shownHits: 0 };
}

function relabel(v) {
  v.label.material.map.dispose();
  v.label.material.map = labelTexture(v.name, v.hue, v.hits);
  v.label.material.needsUpdate = true;
  v.shownHits = v.hits;
}

function updateLook(v, name, hue) {
  if (v.name === name && v.hue === hue) return;
  v.name = name; v.hue = hue;
  relabel(v);
  v.bodyMat.color.copy(color(hue, 0.45)); v.bodyMat.emissive.copy(color(hue, 0.5)); v.ringMat.color.copy(color(hue));
}

export default async function mount(host, { fb, controlUrl }) {
  await document.fonts.load('40px "Press Start 2P"').catch(() => {});
  const W = () => host.clientWidth, H = () => host.clientHeight;

  // ---------------------------------------------------------------- renderer + scene
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.setSize(W(), H());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020604);
  scene.fog = new THREE.FogExp2(0x020604, 0.028);
  const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 200);
  const camBase = new THREE.Vector3(0, 21, 17.5);
  camera.position.copy(camBase); camera.lookAt(0, 0, 1.2);

  const hemiLight = new THREE.HemisphereLight(0x88ffcc, 0x110022, 0.7); scene.add(hemiLight);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(5, 12, 8); scene.add(sun);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x05090a, roughness: 0.95, emissive: 0xffffff, emissiveIntensity: 0 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(ARENA.radius + 8, 64), floorMat);
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  let grid = null;
  const posts = [];
  const edge = new THREE.Mesh(new THREE.TorusGeometry(ARENA.radius, 0.07, 8, 160), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
  edge.rotation.x = -Math.PI / 2; edge.position.y = 0.05; scene.add(edge);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, h = 0.6 + (i % 2) * 0.9;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff2bd6 : 0x00ff6a }));
    post.position.set(Math.cos(a) * (ARENA.radius + 0.6), h / 2, Math.sin(a) * (ARENA.radius + 0.6));
    scene.add(post); posts.push(post);
  }

  // ---------------------------------------------------------------- sparks + shockwaves
  const MAX_SPARKS = 1200;
  const sparkPos = new Float32Array(MAX_SPARKS * 3), sparkCol = new Float32Array(MAX_SPARKS * 3);
  const sparkVel = new Float32Array(MAX_SPARKS * 3), sparkLife = new Float32Array(MAX_SPARKS);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(sparks);
  let sparkHead = 0;
  function burst(x, z, n, hues, power = 1) {
    for (let i = 0; i < n; i++) {
      const k = sparkHead++ % MAX_SPARKS;
      const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 6) * power;
      sparkPos.set([x, 0.8, z], k * 3);
      sparkVel.set([Math.cos(a) * v, 2 + Math.random() * 5 * power, Math.sin(a) * v], k * 3);
      const c = color(hues[i % hues.length], 0.6);
      sparkCol.set([c.r, c.g, c.b], k * 3);
      sparkLife[k] = 0.6 + Math.random() * 0.6;
    }
  }
  const waves = [];
  function shockwave(x, z, hue) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 48), new THREE.MeshBasicMaterial({ color: color(hue, 0.65), transparent: true, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z); scene.add(m);
    waves.push({ m, t: 0 });
  }

  // ---------------------------------------------------------------- post-processing (neon bloom)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.55, 0.4, 0.35);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------------------------------------------------------------- themes ("GTA" combo swaps neon <-> vice)
  let theme = THEMES.neon;
  function applyTheme(next) {
    theme = next;
    if (scene.background?.isTexture) scene.background.dispose();
    scene.background = theme.background();
    scene.fog.color.set(theme.fog); scene.fog.density = theme.fogDensity;
    hemiLight.color.set(theme.sky); hemiLight.groundColor.set(theme.ground); hemiLight.intensity = theme.hemi;
    sun.color.set(theme.sun);
    floorMat.color.set(theme.floor);
    floorMat.emissiveMap?.dispose();
    floorMat.emissiveMap = theme.floorGlow ? theme.floorGlow() : null;
    floorMat.emissiveIntensity = theme.floorGlow ? 0.55 : 0;
    floorMat.needsUpdate = true;
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.GridHelper(ARENA.radius * 2 + 16, 44, theme.grid[0], theme.grid[1]);
    grid.material.transparent = true; grid.material.opacity = theme.gridOpacity; grid.position.y = 0.01; scene.add(grid);
    posts.forEach((p, i) => p.material.color.set(theme.posts[i % 2]));
    bloom.strength = theme.bloom;
  }
  applyTheme(THEMES.neon);

  // The combo is typed live on stage: show it big in the centre, in capitals, so the room reads "GTA".
  const banner = document.createElement('div');
  banner.className = 'combo';
  banner.innerHTML = '<span></span>';
  host.append(banner);
  let combo = COMBO_START, bannerTimer = 0;
  function showCombo(text, done) {
    clearTimeout(bannerTimer);
    banner.firstChild.textContent = text;
    banner.classList.remove('done');
    if (done) { void banner.offsetWidth; banner.classList.add('done'); } // restart the pop animation
    banner.classList.add('on');
    bannerTimer = setTimeout(() => banner.classList.remove('on'), done ? 1800 : 3000);
  }
  function onCombo(e) {
    combo = comboStep(combo, e.key, performance.now(), 'gta');
    if (!combo.consumed) return false;
    showCombo(combo.shown, combo.done);
    if (combo.done) applyTheme(theme === THEMES.vice ? THEMES.neon : THEMES.vice);
    return true;
  }
  let pixel = false;
  function resize() {
    const ratio = pixel ? 0.3 : Math.min(2, devicePixelRatio);
    renderer.setPixelRatio(ratio); composer.setPixelRatio(ratio);
    renderer.setSize(W(), H()); composer.setSize(W(), H());
    renderer.domElement.style.imageRendering = pixel ? 'pixelated' : '';
    camera.aspect = W() / H(); camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  // ---------------------------------------------------------------- world: phones + bots
  const world = createWorld();
  const visuals = new Map();
  const real = new Set();
  let botsForced = false;

  function ensureVisual(id, name, hue) {
    let v = visuals.get(id);
    if (!v) { v = makeAvatar(name, hue); visuals.set(id, v); scene.add(v.group); }
    updateLook(v, name, hue);
    return v;
  }
  function dropVisual(id) {
    const v = visuals.get(id); if (!v) return;
    scene.remove(v.group); v.label.material.map.dispose(); visuals.delete(id);
  }

  const bots = BOT_NAMES.map((n, i) => ({ id: `bot-${i}`, n, h: (i * 72 + 150) % 360, s: 1.5 + (i % 3), jx: 0, jy: 0, d: 0, next: 0 }));
  function driveBots(t) {
    const wantBots = botsForced || real.size < 2;
    for (const b of bots) {
      if (!wantBots) { if (world.avatars.has(b.id)) { world.avatars.delete(b.id); dropVisual(b.id); } continue; }
      if (t > b.next) {
        const a = Math.random() * Math.PI * 2, m = 0.5 + Math.random() * 0.5;
        b.jx = Math.cos(a) * m; b.jy = Math.sin(a) * m;
        if (Math.random() < 0.3) b.d = (b.d + 1) % 100000;
        b.next = t + 1 + Math.random() * 1.5;
      }
      syncAvatar(world, b.id, b);
      ensureVisual(b.id, b.n, b.h);
    }
  }

  const unwatch = fb.watchAvatars((kind, id, val) => {
    if (kind === 'remove') { real.delete(id); world.avatars.delete(id); dropVisual(id); return; }
    real.add(id);
    const name = sanitizeName(val?.n) || 'ANÒNIM';
    syncAvatar(world, id, { ...val, n: name });
    ensureVisual(id, name, Number(val?.h) || 0);
  });

  // ---------------------------------------------------------------- HUD
  const esc = (t) => t.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const scores = () => [...visuals.entries()].map(([id, v]) => ({ id, name: v.name, hue: v.hue, hits: v.hits }));
  let sentScores = {}, scoresAt = 0;
  function sendScores(now) { // phones see their own crashes and position (bots have no phone)
    if (now - scoresAt < 400) return; scoresAt = now;
    const { patch, sent } = scorePatch(sentScores, ranking(scores()), (id) => real.has(id));
    sentScores = sent; fb.publishScores(patch);
  }
  const hud = document.createElement('div');
  hud.className = 'hud tl';
  const board = document.createElement('div');
  board.className = 'hud tr';
  board.style.lineHeight = '1.7';
  const qr = qrBox(controlUrl, Math.round(innerHeight * 0.16));
  qr.classList.add('hud', 'br');
  host.append(hud, board, qr);
  let hudAt = 0;
  function drawHud(now) {
    if (now - hudAt < 250) return; hudAt = now;
    hud.innerHTML = `ARENA // THREE.JS<span class="cursor"></span><br><br><span class="big-hud c-cyan">${real.size}</span>JUGADORS<br><br><span class="big-hud c-magenta">${world.collisions}</span>XOCS`;
    const top = ranking(scores().filter((p) => p.hits > 0), 3);
    board.innerHTML = top.length ? `TOP XOCS<br><br>${top.map((r) => `<span style="color:hsl(${r.hue} 100% 65%)">${r.rank}. ${esc(r.name)}</span> ${r.hits}`).join('<br>')}` : '';
  }

  // ---------------------------------------------------------------- loop
  // Tab: freeze the game and show the full crash ranking; Tab again to play on.
  const board2 = document.createElement('div');
  board2.className = 'ranking';
  host.append(board2);
  let paused = false;
  function showRanking() {
    const rows = ranking(scores(), 10);
    board2.innerHTML = `<div class="ranking-box">
      <p class="ranking-title">PAUSA</p>
      <p class="ranking-sub">${world.collisions} XOCS EN TOTAL</p>
      <ol>${rows.map((r) => `<li class="${r.rank <= 3 ? `top top${r.rank}` : ''}"><span class="pos">${r.rank}.</span><span class="who" style="color:hsl(${r.hue} 100% 65%)">${esc(r.name)}</span><span class="hits">${r.hits}</span></li>`).join('')}</ol>
      <p class="ranking-hint">TAB PER CONTINUAR</p></div>`;
  }
  function togglePause() {
    paused = !paused;
    if (paused) showRanking();
    board2.classList.toggle('on', paused);
    acc = 0; // no catch-up burst of physics on resume
  }

  const voices = createVoiceGate({ max: 6, window: 120 }); // a full room crashing at once stays readable
  let raf, last = performance.now(), acc = 0, shake = 0, orbit = false;
  const t0 = last;
  const STEP = 1 / 120;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    if (!paused) driveBots(t);
    removeMissing(world, new Set([...real, ...bots.filter((b) => world.avatars.has(b.id)).map((b) => b.id)]));

    if (!paused) acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      for (const e of stepArena(world, STEP)) {
        if (e.type === 'hit') {
          const va = visuals.get(e.a), vb = visuals.get(e.b);
          if (va) va.squash = 1;
          if (vb) vb.squash = 1;
          for (const id of e.by) { const v = visuals.get(id); if (v) v.hits++; } // only whoever rammed scores
          const hues = [va?.hue ?? 0, vb?.hue ?? 180, 60];
          burst(e.x, e.z, Math.min(60, 12 + e.strength * 6), hues, Math.min(2, 0.6 + e.strength / 6));
          shockwave(e.x, e.z, hues[0]);
          shake = Math.min(0.6, shake + e.strength * 0.04);
          if (voices.allow(now)) playHit(impactVolume(e.strength));
        } else if (e.type === 'wall') {
          burst(e.x, e.z, 8, [visuals.get(e.id)?.hue ?? 180], 0.6);
          if (voices.allow(now)) playWall(impactVolume(e.strength));
        } else if (e.type === 'dash') {
          const v = visuals.get(e.id); if (v) burst(e.x, e.z, 14, [v.hue], 0.7);
        }
      }
    }

    for (const [id, a] of world.avatars) {
      const v = visuals.get(id); if (!v) continue;
      const speed = Math.hypot(a.vx, a.vz);
      v.group.position.set(a.x, 0, a.z);
      v.facing.rotation.y = Math.PI / 2 - a.heading;
      v.squash = Math.max(0, v.squash - dt * 4);
      const bob = Math.abs(Math.sin(t * 9 * Math.min(2, speed / 2))) * 0.08 * Math.min(1, speed);
      v.body.position.y = 0.72 + bob;
      v.facing.scale.set(1 + v.squash * 0.35, 1 - v.squash * 0.3, 1 + v.squash * 0.35);
      v.bodyMat.emissiveIntensity = 0.55 + v.squash * 2;
      if (v.shownHits !== v.hits) relabel(v);
    }

    for (let k = 0; k < MAX_SPARKS; k++) {
      if (sparkLife[k] <= 0) { sparkPos[k * 3 + 1] = -100; continue; }
      sparkLife[k] -= dt;
      sparkVel[k * 3 + 1] -= 12 * dt;
      sparkPos[k * 3] += sparkVel[k * 3] * dt; sparkPos[k * 3 + 1] += sparkVel[k * 3 + 1] * dt; sparkPos[k * 3 + 2] += sparkVel[k * 3 + 2] * dt;
      if (sparkPos[k * 3 + 1] < 0.05) { sparkPos[k * 3 + 1] = 0.05; sparkVel[k * 3 + 1] *= -0.4; }
    }
    sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true;
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i]; w.t += dt;
      const s = 1 + w.t * 9; w.m.scale.set(s, s, s); w.m.material.opacity = Math.max(0, 1 - w.t * 2);
      if (w.t > 0.5) { scene.remove(w.m); w.m.geometry.dispose(); w.m.material.dispose(); waves.splice(i, 1); }
    }

    if (orbit) {
      const a = t * 0.12;
      camera.position.set(Math.sin(a) * 24, 21, Math.cos(a) * 24);
    } else camera.position.copy(camBase);
    shake *= 0.88;
    camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake;
    camera.lookAt(0, 0, orbit ? 0 : 1.2);
    edge.material.color.setHSL(theme.edge[0] + Math.sin(t * 0.5) * 0.05, 1, theme.edge[1]);

    composer.render();
    drawHud(now);
    sendScores(now);
  };
  raf = requestAnimationFrame(loop);

  return {
    onKey(e) {
      if (e.key === 'Tab') { togglePause(); return true; }
      if (onCombo(e)) return true;
      if (e.key === 'b') { botsForced = !botsForced; return true; }
      if (e.key === 'p') { pixel = !pixel; resize(); return true; }
      if (e.key === 'c') { orbit = !orbit; return true; }
      if (e.key === 'r') { world.collisions = 0; for (const v of visuals.values()) v.hits = 0; if (paused) showRanking(); return true; }
      return false;
    },
    destroy() {
      clearTimeout(bannerTimer);
      fb.publishScores(Object.fromEntries(Object.keys(sentScores).map((id) => [id, null])));
      if (scene.background?.isTexture) scene.background.dispose();
      cancelAnimationFrame(raf); removeEventListener('resize', resize); unwatch();
      composer.dispose?.(); renderer.dispose();
      scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose?.(); m.dispose(); }); });
    },
  };
}
