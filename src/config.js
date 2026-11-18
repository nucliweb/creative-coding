export const CONFIG = {
  event: 'La Girotrònica',
  speaker: 'Joan León',
  handle: '@nucliweb',
  repoUrl: 'https://github.com/nucliweb/creative-coding',
  firebaseUrl: import.meta.env.VITE_FIREBASE_URL || 'https://creative-coding-8c968-default-rtdb.europe-west1.firebasedatabase.app',
};

// URL the audience opens on their phones. Override with ?control=https://... or VITE_CONTROL_URL.
export function controlUrl() {
  const q = new URLSearchParams(location.search).get('control');
  if (q) return q;
  if (import.meta.env.VITE_CONTROL_URL) return import.meta.env.VITE_CONTROL_URL;
  return new URL('control.html', location.href).href.replace(/[?#].*$/, '');
}
