import QRCode from 'qrcode';

// Pixel-art QR: dark modules on neon green so every phone camera reads it.
export function drawQR(canvas, text, { size = 320, fg = '#020604', bg = '#00ff6a' } = {}) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size, quiet = 2, cells = n + quiet * 2;
  const px = Math.max(1, Math.floor(size / cells));
  canvas.width = canvas.height = px * cells;
  canvas.style.width = canvas.style.height = `${px * cells}px`;
  const g = canvas.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = fg;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (qr.modules.get(x, y)) g.fillRect((x + quiet) * px, (y + quiet) * px, px, px);
  }
  return canvas;
}

export function qrBox(text, size, label = text.replace(/^https?:\/\//, '')) {
  const box = document.createElement('div');
  box.className = 'qr-box';
  const c = document.createElement('canvas');
  drawQR(c, text, { size });
  const u = document.createElement('div');
  u.className = 'url';
  u.textContent = label;
  box.append(c, u);
  return box;
}
