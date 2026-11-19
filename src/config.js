export const CONFIG = {
  event: 'La Girotrònica',
  speaker: 'Joan León',
  handle: '@nucliweb',
  repoUrl: 'https://github.com/nucliweb/creative-coding',
  resourcesUrl: 'https://github.com/nucliweb/creative-coding#resources',
  firebaseUrl: import.meta.env.VITE_FIREBASE_URL || 'https://creative-coding-8c968-default-rtdb.europe-west1.firebasedatabase.app',
};

// Shown on the closing slide and listed in the README (a test keeps both in sync).
export const RESOURCES = [
  { name: 'Processing', url: 'https://processing.org', note: 'Java, 2001' },
  { name: 'p5.js', url: 'https://p5js.org', note: 'Processing al navegador' },
  { name: 'OpenProcessing', url: 'https://openprocessing.org', note: 'comunitat de sketches' },
  { name: 'The Book of Shaders', url: 'https://thebookofshaders.com', note: 'shaders pas a pas' },
  { name: 'Shadertoy', url: 'https://www.shadertoy.com', note: 'xarxa social de shaders' },
  { name: 'The Coding Train', url: 'https://thecodingtrain.com', note: 'vídeos de Daniel Shiffman' },
  { name: 'Genuary', url: 'https://genuary.art', note: 'un sketch cada dia de gener' },
  { name: 'Awesome Creative Coding', url: 'https://github.com/terkelg/awesome-creative-coding', note: 'la llista de tot' },
];

// A curated pick from awesome-creative-coding for the "I molt més" slide (README lists the same links).
export const ALTERNATIVES = [
  { group: 'Codi', items: [
    { name: 'openFrameworks', url: 'https://openframeworks.cc/', tag: 'C++' },
    { name: 'Cinder', url: 'https://libcinder.org/', tag: 'C++' },
    { name: 'nannou', url: 'https://nannou.cc/', tag: 'Rust' },
    { name: 'py5', url: 'https://py5coding.org', tag: 'Python' },
  ] },
  { group: 'Web', items: [
    { name: 'three.js', url: 'https://github.com/mrdoob/three.js/', tag: '3D' },
    { name: 'Pixi.js', url: 'https://pixijs.com/', tag: '2D' },
    { name: 'Paper.js', url: 'https://paperjs.org/', tag: 'vectors' },
    { name: 'canvas-sketch', url: 'https://github.com/mattdesl/canvas-sketch', tag: 'generatiu' },
  ] },
  { group: 'Nodes', items: [
    { name: 'TouchDesigner', url: 'https://derivative.ca/', tag: 'temps real' },
    { name: 'vvvv', url: 'https://vvvv.org/', tag: 'live' },
    { name: 'Max', url: 'https://cycling74.com/products/max', tag: 'àudio + vídeo' },
    { name: 'Pure Data', url: 'https://puredata.info/', tag: 'open source' },
  ] },
  { group: 'So', items: [
    { name: 'Sonic Pi', url: 'https://sonic-pi.net/', tag: 'live coding' },
    { name: 'TidalCycles', url: 'https://tidalcycles.org/', tag: 'patrons' },
    { name: 'SuperCollider', url: 'https://supercollider.github.io/', tag: 'síntesi' },
    { name: 'Glicol', url: 'https://glicol.org', tag: 'navegador' },
  ] },
];

// URL the audience opens on their phones. Override with ?control=https://... or VITE_CONTROL_URL.
export function controlUrl() {
  const q = new URLSearchParams(location.search).get('control');
  if (q) return q;
  if (import.meta.env.VITE_CONTROL_URL) return import.meta.env.VITE_CONTROL_URL;
  return new URL('control.html', location.href).href.replace(/[?#].*$/, '');
}
