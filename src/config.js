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
];

// URL the audience opens on their phones. Override with ?control=https://... or VITE_CONTROL_URL.
export function controlUrl() {
  const q = new URLSearchParams(location.search).get('control');
  if (q) return q;
  if (import.meta.env.VITE_CONTROL_URL) return import.meta.env.VITE_CONTROL_URL;
  return new URL('control.html', location.href).href.replace(/[?#].*$/, '');
}
