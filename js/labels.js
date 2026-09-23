// Draws the printed wrap for each can onto a 2D canvas.
// The label wraps a cylinder, so x = 0.5 of the canvas faces the camera and
// the left/right edges meet at the back seam.

export const LABEL_W = 2048;
export const LABEL_H = 1272;
const CX = LABEL_W / 2;

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = LABEL_W;
  c.height = LABEL_H;
  return c;
}

// Small deterministic RNG so every page load prints the same can.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function spacedText(ctx, text, x, y, spacing) {
  // Canvas letterSpacing isn't available everywhere yet, so lay it out by hand.
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = align;
}

function bolt(ctx, x, y, h, fill) {
  // Lightning bolt centred on (x, y), h tall.
  const s = h / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(12, -50);
  ctx.lineTo(-26, 6);
  ctx.lineTo(-2, 6);
  ctx.lineTo(-14, 50);
  ctx.lineTo(28, -8);
  ctx.lineTo(4, -8);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function dropIcon(ctx, x, y, r, stroke) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 0.1, x + r * 0.75, y + r, x, y + r);
  ctx.bezierCurveTo(x - r * 0.75, y + r, x - r * 0.9, y - r * 0.1, x, y - r);
  ctx.stroke();
  ctx.restore();
}

function focusIcon(ctx, x, y, r, stroke) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = stroke;
  ctx.fill();
  ctx.restore();
}

function leafIcon(ctx, x, y, r, stroke) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y + r * 0.45);
  ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.5, x + r * 0.45, y - r * 0.45);
  ctx.quadraticCurveTo(x + r * 0.4, y + r * 0.4, x - r * 0.45, y + r * 0.45);
  ctx.lineTo(x + r * 0.2, y - r * 0.2);
  ctx.stroke();
  ctx.restore();
}

function slashIcon(ctx, x, y, r, stroke) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y + r * 0.6);
  ctx.lineTo(x + r * 0.6, y - r * 0.6);
  ctx.stroke();
  ctx.font = `700 ${r * 0.7}px Archivo, sans-serif`;
  ctx.fillStyle = stroke;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', x - r * 0.05, y + r * 0.05);
  ctx.restore();
}

function barcode(ctx, x, y, w, h, color) {
  const r = rng(7);
  ctx.fillStyle = color;
  let cx = x;
  while (cx < x + w) {
    const bw = 2 + Math.floor(r() * 7);
    if (r() > 0.4) ctx.fillRect(cx, y, bw, h);
    cx += bw + 2;
  }
}

// Back panel content is drawn on its own canvas, centred, then split across
// the seam so it sits directly opposite the front.
const BACK_W = 820;
function drawBack(ctx, paint) {
  const b = document.createElement('canvas');
  b.width = BACK_W;
  b.height = LABEL_H;
  paint(b.getContext('2d'), BACK_W / 2);
  const half = BACK_W / 2;
  ctx.drawImage(b, 0, 0, half, LABEL_H, LABEL_W - half, 0, half, LABEL_H);
  ctx.drawImage(b, half, 0, half, LABEL_H, 0, 0, half, LABEL_H);
}

/* ---------------- Energy: Arctic Rush ---------------- */

export function drawArcticLabel() {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  const r = rng(42);

  // Brushed, frosted aluminium.
  const g = ctx.createLinearGradient(0, 0, 0, LABEL_H);
  g.addColorStop(0, '#f6f9fc');
  g.addColorStop(0.5, '#e4ebf2');
  g.addColorStop(1, '#f3f6fa');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);

  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '150,175,200'},${0.05 + r() * 0.1})`;
    ctx.fillRect(r() * LABEL_W, r() * LABEL_H, 1 + r() * 3, 1 + r() * 3);
  }

  // Ice cracks.
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    let x = r() * LABEL_W;
    let y = r() * LABEL_H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 3 + Math.floor(r() * 6);
    for (let s = 0; s < segs; s++) {
      x += (r() - 0.5) * 140;
      y += (r() - 0.5) * 140;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${r() > 0.5 ? '120,150,180' : '255,255,255'},${0.18 + r() * 0.3})`;
    ctx.lineWidth = 0.8 + r() * 2.2;
    ctx.stroke();
  }

  const ink = '#0d1117';
  const blue = '#2b93f0';

  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'italic 800 36px Archivo, sans-serif';
  spacedText(ctx, 'BUILT TO KEEP YOU MOVING', CX, 88, 4);

  // Vertical wordmark, reading bottom-to-top, with the L swapped for a bolt.
  ctx.save();
  ctx.translate(CX + 10, 520);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '330px Anton, Impact, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const pu = ctx.measureText('PU').width;
  const se = ctx.measureText('SE').width;
  const gap = 150;
  const total = pu + gap + se;
  const x0 = -total / 2;
  ctx.fillStyle = ink;
  ctx.fillText('PU', x0, 10);
  ctx.fillText('SE', x0 + pu + gap, 10);
  ctx.save();
  ctx.translate(x0 + pu + gap / 2, 0);
  ctx.rotate(Math.PI / 2);
  ctx.shadowColor = 'rgba(43,147,240,0.55)';
  ctx.shadowBlur = 30;
  bolt(ctx, 0, 0, 330, blue);
  ctx.restore();
  ctx.restore();

  ctx.fillStyle = blue;
  ctx.font = '84px Anton, Impact, sans-serif';
  spacedText(ctx, 'ARCTIC RUSH', CX, 958, 6);

  const icons = [
    { x: CX - 190, label: 'ENERGY', draw: (x, y) => bolt(ctx, x, y, 78, ink) },
    { x: CX, label: 'HYDRATION', draw: (x, y) => dropIcon(ctx, x, y, 34, ink) },
    { x: CX + 190, label: 'FOCUS', draw: (x, y) => focusIcon(ctx, x, y, 34, ink) },
  ];
  ctx.font = '700 24px Archivo, sans-serif';
  icons.forEach((ic) => {
    ic.draw(ic.x, 1036);
    ctx.fillStyle = ink;
    spacedText(ctx, ic.label, ic.x, 1110, 2);
  });

  ctx.font = '800 40px Archivo, sans-serif';
  spacedText(ctx, 'ZERO SUGAR', CX, 1180, 4);
  ctx.font = '700 30px Archivo, sans-serif';
  spacedText(ctx, '500 mL', CX, 1226, 2);

  // Back panel.
  drawBack(ctx, (b, cx) => {
    b.fillStyle = ink;
    b.textAlign = 'center';
    b.font = '110px Anton, Impact, sans-serif';
    spacedText(b, 'ICE / EXTREME', cx, 250, 6);
    b.font = '800 40px Archivo, sans-serif';
    spacedText(b, 'COLD ENERGY', cx, 340, 4);
    spacedText(b, 'SHARP FOCUS', cx, 392, 4);
    b.fillStyle = 'rgba(13,17,23,0.8)';
    b.font = '500 26px Archivo, sans-serif';
    ['Serve ice cold.', 'Crack it open. Stay moving.', 'Zero sugar energy drink.'].forEach((t, i) => b.fillText(t, cx, 480 + i * 40));
    bolt(b, cx, 700, 150, blue);
    barcode(b, cx - 120, 880, 240, 120, ink);
    b.fillStyle = ink;
    b.font = '600 22px Archivo, sans-serif';
    b.fillText('PULSE ENERGY', cx, 1036);
  });

  return c;
}

/* ---------------- Sparkling ---------------- */

function drawCitrus(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // leaf
  ctx.fillStyle = '#3f9b2f';
  ctx.beginPath();
  ctx.ellipse(-70, -118, 70, 26, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // rind
  ctx.fillStyle = '#8cc63f';
  ctx.beginPath();
  ctx.arc(0, 0, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7c2';
  ctx.beginPath();
  ctx.arc(0, 0, 134, 0, Math.PI * 2);
  ctx.fill();
  // segments
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI * 2 + 0.05;
    const a1 = ((i + 1) / 10) * Math.PI * 2 - 0.05;
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 124);
    grad.addColorStop(0, '#fff3a0');
    grad.addColorStop(1, '#f7d63a');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(Math.cos((a0 + a1) / 2) * 14, Math.sin((a0 + a1) / 2) * 14);
    ctx.arc(0, 0, 122, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawMango(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // whole mango
  const g = ctx.createRadialGradient(-80, -40, 10, -40, 0, 170);
  g.addColorStop(0, '#ffd23f');
  g.addColorStop(0.55, '#ff8a1f');
  g.addColorStop(1, '#d6331a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(-50, 0, 120, 150, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f8a2a';
  ctx.beginPath();
  ctx.ellipse(-20, -150, 70, 24, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // hedgehog-cut half
  ctx.save();
  ctx.translate(80, 60);
  ctx.rotate(0.15);
  ctx.fillStyle = '#ffb000';
  ctx.beginPath();
  ctx.ellipse(0, 0, 110, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffcf2e';
  for (let i = -3; i <= 3; i++) {
    for (let j = -2; j <= 2; j++) {
      const cx = i * 30 + (j % 2) * 8;
      const cy = j * 30;
      if ((cx * cx) / (100 * 100) + (cy * cy) / (82 * 82) < 1) {
        ctx.fillRect(cx - 12, cy - 12, 24, 24);
      }
    }
  }
  ctx.restore();
  ctx.restore();
}

function strawberry(ctx, x, y, s, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  const g = ctx.createRadialGradient(-30, -20, 10, 0, 0, 120);
  g.addColorStop(0, '#ff5a5a');
  g.addColorStop(1, '#c4121f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 110);
  ctx.bezierCurveTo(-110, 40, -100, -80, 0, -70);
  ctx.bezierCurveTo(100, -80, 110, 40, 0, 110);
  ctx.fill();
  ctx.fillStyle = '#ffe28a';
  for (let i = 0; i < 22; i++) {
    const a = i * 2.4;
    const rr = 20 + (i % 5) * 16;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * rr * 0.9, Math.sin(a) * rr * 0.8 + 10, 4, 7, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#2f8a2a';
  for (let i = 0; i < 5; i++) {
    ctx.save();
    ctx.translate(0, -70);
    ctx.rotate(-1.2 + i * 0.6);
    ctx.beginPath();
    ctx.ellipse(0, -18, 12, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBerry(ctx, x, y, s) {
  strawberry(ctx, x - 90, y + 20, s * 1.0, -0.25);
  strawberry(ctx, x + 100, y - 10, s * 0.95, 0.3);
  strawberry(ctx, x + 10, y + 90, s * 0.8, 0.05);
}

function drawWatermelon(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // whole melon behind
  ctx.save();
  ctx.translate(-80, -10);
  ctx.fillStyle = '#2e7d32';
  ctx.beginPath();
  ctx.arc(0, 0, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1b5e20';
  ctx.lineWidth = 16;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.abs(i) * 36 + 6, 118, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // slice
  ctx.save();
  ctx.translate(70, 40);
  ctx.rotate(-0.25);
  ctx.fillStyle = '#2e7d32';
  ctx.beginPath();
  ctx.arc(0, -40, 160, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#e8f5c8';
  ctx.beginPath();
  ctx.arc(0, -40, 146, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#f0344a';
  ctx.beginPath();
  ctx.arc(0, -40, 134, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#1b1b1b';
  [[-70, 0], [-20, 30], [30, 10], [80, -5], [0, -10], [-40, 50], [50, 50]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 7, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
  ctx.restore();
}

const FRUIT = { citrus: drawCitrus, mango: drawMango, berry: drawBerry, watermelon: drawWatermelon };

export function drawSparklingLabel(f) {
  const c = makeCanvas();
  const ctx = c.getContext('2d');
  const r = rng(f.seed);

  const g = ctx.createLinearGradient(0, 0, 0, LABEL_H);
  g.addColorStop(0, f.light);
  g.addColorStop(0.55, f.base);
  g.addColorStop(1, f.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);

  if (f.stripes) {
    // Watermelon rind stripes.
    ctx.fillStyle = f.stripes;
    for (let x = 20; x < LABEL_W; x += 150) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= LABEL_H; y += 40) {
        ctx.lineTo(x + Math.sin(y / 60 + x) * 18 + (r() - 0.5) * 10, y);
      }
      for (let y = LABEL_H; y >= 0; y -= 40) {
        ctx.lineTo(x + 46 + Math.sin(y / 60 + x) * 18 + (r() - 0.5) * 10, y);
      }
      ctx.fill();
    }
  }

  // Diagonal brush swooshes.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = f.swoosh;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const ox = CX - 520 + i * 120;
    ctx.moveTo(ox, LABEL_H);
    ctx.bezierCurveTo(ox + 200, 700, ox + 500, 300, ox + 900, 0);
    ctx.lineTo(ox + 900 + 90 - i * 20, 0);
    ctx.bezierCurveTo(ox + 560, 320, ox + 280, 720, ox + 120, LABEL_H);
    ctx.fill();
  }
  ctx.restore();

  const ink = '#141414';
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '800 32px Archivo, sans-serif';
  spacedText(ctx, 'SPARKLING WATER', CX, 92, 5);
  spacedText(ctx, 'WITH REAL FRUIT', CX, 134, 5);

  ctx.save();
  ctx.translate(CX, 390);
  ctx.rotate(-0.1);
  ctx.font = '230px "Permanent Marker", "Brush Script MT", cursive';
  ctx.lineWidth = 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeText('PULSE', 0, 0);
  ctx.fillText('PULSE', 0, 0);
  ctx.restore();

  ctx.font = '96px Anton, Impact, sans-serif';
  spacedText(ctx, f.name.toUpperCase(), CX, 548, 8);
  ctx.font = '800 30px Archivo, sans-serif';
  spacedText(ctx, f.note.toUpperCase(), CX, 598, 5);

  FRUIT[f.id](ctx, CX, 800, 1.0);

  const icons = [
    { label: ['NO ADDED', 'SUGAR'], draw: slashIcon },
    { label: ['NATURAL', 'FLAVORS'], draw: leafIcon },
    { label: ['CAFFEINE', 'FREE'], draw: (c2, x, y, rr, s) => dropIcon(c2, x, y, rr * 0.9, s) },
  ];
  ctx.font = '700 20px Archivo, sans-serif';
  icons.forEach((ic, i) => {
    const x = CX + (i - 1) * 170;
    ic.draw(ctx, x, 1040, 34, ink);
    ctx.fillStyle = ink;
    ic.label.forEach((t, li) => spacedText(ctx, t, x, 1110 + li * 26, 2));
    if (i < 2) ctx.fillRect(x + 84, 1010, 3, 120);
  });

  ctx.font = '800 32px Archivo, sans-serif';
  spacedText(ctx, '330 mL', CX, 1210, 3);

  // Back panel.
  drawBack(ctx, (b, cx) => {
    b.fillStyle = ink;
    b.textAlign = 'center';
    b.font = '76px "Permanent Marker", cursive';
    b.fillText('Feel the beat', cx, 300);
    b.font = '600 26px Archivo, sans-serif';
    ['Sparkling water with real fruit.', 'No added sugar. Natural flavors.', 'Caffeine free. Serve chilled.'].forEach((t, i) =>
      b.fillText(t, cx, 390 + i * 40)
    );
    barcode(b, cx - 120, 880, 240, 120, ink);
    b.font = '600 22px Archivo, sans-serif';
    b.fillText('PULSE SPARKLING', cx, 1036);
  });

  return c;
}

/* Condensation: a grey-scale bump map of little droplets. */
export function drawDroplets(seed = 3) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 636;
  const ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 1400; i++) {
    const x = r() * c.width;
    const y = r() * c.height;
    const rad = 1 + Math.pow(r(), 3) * 9;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}
