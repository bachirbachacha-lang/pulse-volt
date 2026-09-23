// Draws the printed wrap for each can onto a 2D canvas.
// The label wraps a cylinder, so x = 0.5 of the canvas faces the camera and
// the left/right edges meet at the back seam.

export const LABEL_W = 2048;
export const LABEL_H = 1272;
const CX = LABEL_W / 2;

// Labels are drawn in a fixed 2048-wide coordinate space and rasterised at
// LABEL_SCALE, so small screens can use lighter textures.
let LABEL_SCALE = 1;
export function setLabelScale(k) {
  LABEL_SCALE = k;
}

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = Math.round(LABEL_W * LABEL_SCALE);
  c.height = Math.round(LABEL_H * LABEL_SCALE);
  const ctx = c.getContext('2d');
  ctx.scale(LABEL_SCALE, LABEL_SCALE);
  return { c, ctx };
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

/* ---------------- Energy ---------------- */

// Shared front layout: tagline, vertical PU⚡SE wordmark, flavor name, icons.
function energyFront(ctx, o) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = o.text;
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
  const x0 = -(pu + gap + se) / 2;
  if (o.logoGlow) {
    ctx.shadowColor = o.logoGlow;
    ctx.shadowBlur = 40;
  }
  if (o.logoStroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 22;
    ctx.strokeStyle = o.logoStroke;
    ctx.strokeText('PU', x0, 10);
    ctx.strokeText('SE', x0 + pu + gap, 10);
  }
  ctx.fillStyle = o.logo;
  ctx.fillText('PU', x0, 10);
  ctx.fillText('SE', x0 + pu + gap, 10);
  ctx.save();
  ctx.translate(x0 + pu + gap / 2, 0);
  ctx.rotate(Math.PI / 2);
  ctx.shadowColor = o.boltGlow;
  ctx.shadowBlur = 34;
  if (o.logoStroke) bolt(ctx, 0, 0, 360, o.logoStroke);
  bolt(ctx, 0, 0, 330, o.bolt);
  ctx.restore();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '84px Anton, Impact, sans-serif';
  if (o.nameStroke) {
    ctx.lineWidth = 12;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = o.nameStroke;
    ctx.save();
    ctx.fillStyle = o.nameStroke;
    spacedText(ctx, o.name.toUpperCase(), CX + 4, 962, 6);
    ctx.restore();
  }
  if (o.nameGlow) {
    ctx.shadowColor = o.nameGlow;
    ctx.shadowBlur = 24;
  }
  ctx.fillStyle = o.nameColor;
  spacedText(ctx, o.name.toUpperCase(), CX, 958, 6);
  ctx.shadowBlur = 0;

  const icons = [
    { x: CX - 190, label: 'ENERGY', draw: (x, y) => bolt(ctx, x, y, 78, o.text) },
    { x: CX, label: 'HYDRATION', draw: (x, y) => dropIcon(ctx, x, y, 34, o.text) },
    { x: CX + 190, label: 'FOCUS', draw: (x, y) => focusIcon(ctx, x, y, 34, o.text) },
  ];
  ctx.font = '700 24px Archivo, sans-serif';
  icons.forEach((ic) => {
    ic.draw(ic.x, 1036);
    ctx.fillStyle = o.text;
    spacedText(ctx, ic.label, ic.x, 1110, 2);
  });

  ctx.fillStyle = o.text;
  ctx.font = '800 40px Archivo, sans-serif';
  spacedText(ctx, 'ZERO SUGAR', CX, 1180, 4);
  ctx.font = '700 30px Archivo, sans-serif';
  spacedText(ctx, '500 mL', CX, 1226, 2);

  drawBack(ctx, (b, cx) => {
    b.fillStyle = o.text;
    b.textAlign = 'center';
    b.font = '110px Anton, Impact, sans-serif';
    spacedText(b, o.tag.toUpperCase(), cx, 250, 6);
    b.font = '800 40px Archivo, sans-serif';
    spacedText(b, o.notes.toUpperCase(), cx, 340, 3);
    b.font = '500 26px Archivo, sans-serif';
    ['Serve ice cold.', 'Crack it open. Stay moving.', 'Zero sugar energy drink.', 'Contains caffeine (160 mg).'].forEach((t, i) =>
      b.fillText(t, cx, 440 + i * 40)
    );
    bolt(b, cx, 720, 150, o.bolt);
    b.fillStyle = '#fff';
    b.fillRect(cx - 140, 860, 280, 200);
    barcode(b, cx - 120, 880, 240, 130, '#0d1117');
    b.fillStyle = '#0d1117';
    b.font = '600 22px Archivo, sans-serif';
    b.fillText('PULSE ENERGY', cx, 1040);
  });
}

function paintArctic(ctx, r) {
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
}

function paintSolar(ctx, r) {
  const g = ctx.createLinearGradient(0, 0, 0, LABEL_H);
  g.addColorStop(0, '#ffd43a');
  g.addColorStop(0.35, '#ff7a00');
  g.addColorStop(0.7, '#d81b4a');
  g.addColorStop(1, '#3b0a45');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);
  // Sunburst rays from a sun sitting behind the wordmark.
  const sx = CX;
  const sy = 520;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 36; i++) {
    const a0 = (i / 36) * Math.PI * 2;
    const a1 = a0 + Math.PI / 36;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.35)' : 'rgba(255,220,120,0.15)';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a0) * 2400, sy + Math.sin(a0) * 2400);
    ctx.lineTo(sx + Math.cos(a1) * 2400, sy + Math.sin(a1) * 2400);
    ctx.fill();
  }
  ctx.restore();
  const sun = ctx.createRadialGradient(sx, sy, 20, sx, sy, 420);
  sun.addColorStop(0, 'rgba(255,250,200,0.95)');
  sun.addColorStop(0.45, 'rgba(255,200,60,0.55)');
  sun.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);
  // Heat shimmer.
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  for (let y = 60; y < LABEL_H; y += 46) {
    ctx.beginPath();
    for (let x = 0; x <= LABEL_W; x += 24) ctx.lineTo(x, y + Math.sin(x / 70 + y) * 8 + (r() - 0.5) * 2);
    ctx.stroke();
  }
}

function paintVenom(ctx, r) {
  ctx.fillStyle = '#0a0f09';
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);
  // Scales.
  ctx.strokeStyle = 'rgba(182,255,0,0.08)';
  ctx.lineWidth = 2;
  for (let y = 0; y < LABEL_H + 60; y += 44) {
    for (let x = (y / 44) % 2 ? 0 : 36; x < LABEL_W + 72; x += 72) {
      ctx.beginPath();
      ctx.arc(x, y, 36, 0, Math.PI);
      ctx.stroke();
    }
  }
  const glow = ctx.createRadialGradient(CX, 560, 40, CX, 560, 700);
  glow.addColorStop(0, 'rgba(120,255,40,0.28)');
  glow.addColorStop(1, 'rgba(120,255,40,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);
  // Toxic drips from the top.
  ctx.fillStyle = '#b6ff00';
  ctx.fillRect(0, 0, LABEL_W, 40);
  for (let x = 10; x < LABEL_W; x += 34 + r() * 50) {
    const w = 16 + r() * 34;
    const len = 40 + Math.pow(r(), 2) * 320;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, 30);
    ctx.lineTo(x - w / 2.6, 30 + len);
    ctx.arc(x, 30 + len, w / 2.6, Math.PI, 0, true);
    ctx.lineTo(x + w / 2, 30);
    ctx.fill();
  }
  // Claw slashes.
  ctx.save();
  ctx.translate(CX + 250, 700);
  ctx.rotate(-0.5);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(182,255,0,0.55)';
    ctx.beginPath();
    ctx.moveTo(-260, i * 70);
    ctx.quadraticCurveTo(0, i * 70 - 22, 260, i * 70);
    ctx.quadraticCurveTo(0, i * 70 + 6, -260, i * 70);
    ctx.fill();
  }
  ctx.restore();
  // Hazard band.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, LABEL_H - 30, LABEL_W, 30);
  ctx.clip();
  ctx.fillStyle = '#b6ff00';
  ctx.fillRect(0, LABEL_H - 30, LABEL_W, 30);
  ctx.fillStyle = '#0a0f09';
  for (let x = -40; x < LABEL_W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, LABEL_H);
    ctx.lineTo(x + 30, LABEL_H - 30);
    ctx.lineTo(x + 60, LABEL_H - 30);
    ctx.lineTo(x + 30, LABEL_H);
    ctx.fill();
  }
  ctx.restore();
}

function paintCherry(ctx, r) {
  const g = ctx.createLinearGradient(0, 0, 0, LABEL_H);
  g.addColorStop(0, '#e8132f');
  g.addColorStop(1, '#6d0016');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);
  // Comic halftone, heavier towards the bottom.
  ctx.fillStyle = 'rgba(60,0,10,0.35)';
  for (let y = 0; y < LABEL_H; y += 26) {
    for (let x = (y / 26) % 2 ? 0 : 13; x < LABEL_W; x += 26) {
      const rad = 1 + (y / LABEL_H) * 10;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Explosion star behind the bolt.
  const star = (rad, inner, fill, rot) => {
    ctx.beginPath();
    const n = 14;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 + rot;
      const rr = i % 2 ? inner * (0.85 + r() * 0.3) : rad * (0.85 + r() * 0.3);
      ctx.lineTo(CX + Math.cos(a) * rr, 560 + Math.sin(a) * rr);
    }
    ctx.fillStyle = fill;
    ctx.fill();
  };
  star(430, 250, '#ffb400', 0);
  star(330, 190, '#ffe600', 0.2);
  // Speed lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 6;
  for (let i = 0; i < 18; i++) {
    const y = 120 + r() * 1000;
    const x = r() > 0.5 ? CX - 380 - r() * 200 : CX + 380 + r() * 200;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (x < CX ? -160 : 160), y);
    ctx.stroke();
  }
}

function paintNight(ctx, r) {
  const g = ctx.createLinearGradient(0, 0, 0, LABEL_H);
  g.addColorStop(0, '#12032e');
  g.addColorStop(0.55, '#3a0a6b');
  g.addColorStop(0.62, '#ff2975');
  g.addColorStop(0.64, '#1a0536');
  g.addColorStop(1, '#07011a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);
  // Stars.
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.7})`;
    ctx.fillRect(r() * LABEL_W, r() * 700, 2 + r() * 2, 2 + r() * 2);
  }
  // Striped synth sun on the horizon.
  const hy = 800;
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, hy, 300, Math.PI, 0);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, hy - 300, 0, hy);
  sun.addColorStop(0, '#ffd319');
  sun.addColorStop(1, '#ff2975');
  ctx.fillStyle = sun;
  ctx.fillRect(CX - 300, hy - 300, 600, 300);
  ctx.fillStyle = '#3a0a6b';
  for (let i = 0; i < 7; i++) ctx.fillRect(CX - 300, hy - 150 + i * 22, 600, 4 + i * 2);
  ctx.restore();
  // Perspective grid below the horizon.
  ctx.strokeStyle = 'rgba(255,41,117,0.8)';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#ff2975';
  ctx.shadowBlur = 12;
  for (let i = -24; i <= 24; i++) {
    ctx.beginPath();
    ctx.moveTo(CX + i * 20, hy);
    ctx.lineTo(CX + i * 220, LABEL_H);
    ctx.stroke();
  }
  for (let k = 1; k < 9; k++) {
    const y = hy + Math.pow(k / 8, 2) * (LABEL_H - hy);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(LABEL_W, y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

const ENERGY_ART = {
  arctic: { paint: paintArctic, seed: 42, text: '#0d1117', logo: '#0d1117', bolt: '#2b93f0', boltGlow: 'rgba(43,147,240,0.55)', nameColor: '#2b93f0' },
  solar: { paint: paintSolar, seed: 5, text: '#fff8ec', logo: '#fffdf5', logoGlow: 'rgba(120,20,0,0.55)', bolt: '#fff200', boltGlow: 'rgba(255,90,0,0.9)', nameColor: '#fff8ec', nameGlow: 'rgba(120,20,0,0.6)' },
  venom: { paint: paintVenom, seed: 6, text: '#eaffd0', logo: '#b6ff00', logoGlow: 'rgba(182,255,0,0.6)', bolt: '#ffffff', boltGlow: 'rgba(182,255,0,0.9)', nameColor: '#b6ff00', nameGlow: 'rgba(182,255,0,0.7)' },
  cherry: { paint: paintCherry, seed: 7, text: '#fff4f4', logo: '#ffffff', logoStroke: '#1a0006', bolt: '#ffe600', boltGlow: 'rgba(0,0,0,0)', nameColor: '#ffe600', nameStroke: '#1a0006' },
  night: { paint: paintNight, seed: 8, text: '#e9e4ff', logo: '#2de2e6', logoGlow: 'rgba(45,226,230,0.8)', bolt: '#ff2975', boltGlow: 'rgba(255,41,117,0.9)', nameColor: '#2de2e6', nameGlow: 'rgba(45,226,230,0.8)' },
};

export function drawEnergyLabel(product) {
  const { c, ctx } = makeCanvas();
  const art = ENERGY_ART[product.id];
  art.paint(ctx, rng(art.seed));
  energyFront(ctx, { ...art, name: product.name, tag: product.tag, notes: product.notes });
  return c;
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

/* ---------------- Sparkling (clear can, printed label) ---------------- */

function lemonSlice(ctx, x, y, rad, rind, flesh) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = rind;
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffbe0';
  ctx.beginPath();
  ctx.arc(0, 0, rad * 0.9, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 10; i++) {
    const a0 = (i / 10) * Math.PI * 2 + 0.05;
    const a1 = ((i + 1) / 10) * Math.PI * 2 - 0.05;
    const grad = ctx.createRadialGradient(0, 0, rad * 0.05, 0, 0, rad * 0.82);
    grad.addColorStop(0, '#fffbd0');
    grad.addColorStop(1, flesh);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(Math.cos((a0 + a1) / 2) * rad * 0.1, Math.sin((a0 + a1) / 2) * rad * 0.1);
    ctx.arc(0, 0, rad * 0.82, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  // juicy highlights
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * rad * 0.5, Math.sin(a) * rad * 0.5, rad * 0.05, rad * 0.14, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function leaf(ctx, x, y, len, rot, color = '#3f9b2f') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createLinearGradient(0, -len * 0.3, 0, len * 0.3);
  g.addColorStop(0, '#6cc24a');
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.38, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.38, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(len * 0.9, 0);
  ctx.stroke();
  ctx.restore();
}

function artCitrus(ctx) {
  // whole lemon
  const g = ctx.createRadialGradient(CX - 140, 230, 20, CX - 90, 300, 200);
  g.addColorStop(0, '#fff7a0');
  g.addColorStop(0.6, '#ffd21a');
  g.addColorStop(1, '#e8a600');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(CX - 90, 300, 190, 150, -0.3, 0, Math.PI * 2);
  ctx.fill();
  leaf(ctx, CX - 170, 170, 170, -2.4);
  leaf(ctx, CX - 140, 160, 140, -1.6, '#2e7d32');
  lemonSlice(ctx, CX + 150, 360, 170, '#f2c200', '#ffd83a');
  lemonSlice(ctx, CX - 250, 470, 110, '#7cc242', '#c8e86a');
}

function artMango(ctx) {
  const g = ctx.createRadialGradient(CX - 160, 240, 20, CX - 90, 320, 240);
  g.addColorStop(0, '#ffe066');
  g.addColorStop(0.5, '#ff9a1f');
  g.addColorStop(1, '#d9361a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(CX - 100, 320, 170, 220, -0.5, 0, Math.PI * 2);
  ctx.fill();
  leaf(ctx, CX - 60, 120, 200, -0.4);
  leaf(ctx, CX - 70, 118, 150, -1.1, '#2e7d32');
  // hedgehog cut
  ctx.save();
  ctx.translate(CX + 170, 400);
  ctx.rotate(0.2);
  ctx.fillStyle = '#ff9f00';
  ctx.beginPath();
  ctx.ellipse(0, 0, 170, 130, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = -4; i <= 4; i++) {
    for (let j = -3; j <= 3; j++) {
      const cx = i * 38;
      const cy = j * 36 - Math.abs(i) * 3;
      if ((cx * cx) / (150 * 150) + (cy * cy) / (112 * 112) < 1) {
        const cg = ctx.createLinearGradient(cx - 16, cy - 16, cx + 16, cy + 16);
        cg.addColorStop(0, '#ffe45c');
        cg.addColorStop(1, '#ffb300');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.roundRect(cx - 16, cy - 16, 32, 32, 7);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function artBerry(ctx) {
  strawberry(ctx, CX - 180, 300, 1.55, -0.35);
  strawberry(ctx, CX + 170, 250, 1.4, 0.35);
  strawberry(ctx, CX - 10, 420, 1.25, 0.05);
  // halved strawberry
  ctx.save();
  ctx.translate(CX + 230, 470);
  ctx.rotate(0.5);
  ctx.fillStyle = '#e0162b';
  ctx.beginPath();
  ctx.moveTo(0, 110);
  ctx.bezierCurveTo(-110, 40, -100, -80, 0, -70);
  ctx.bezierCurveTo(100, -80, 110, 40, 0, 110);
  ctx.fill();
  ctx.fillStyle = '#ffd6d6';
  ctx.beginPath();
  ctx.moveTo(0, 90);
  ctx.bezierCurveTo(-80, 30, -72, -58, 0, -50);
  ctx.bezierCurveTo(72, -58, 80, 30, 0, 90);
  ctx.fill();
  ctx.fillStyle = '#ff5a6a';
  ctx.beginPath();
  ctx.ellipse(0, 10, 26, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // blueberries
  [[-330, 440, 46], [-270, 500, 38], [330, 330, 40]].forEach(([dx, y, rr]) => {
    const g = ctx.createRadialGradient(CX + dx - rr * 0.3, y - rr * 0.3, 2, CX + dx, y, rr);
    g.addColorStop(0, '#8fa8ff');
    g.addColorStop(1, '#27306e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(CX + dx, y, rr, 0, Math.PI * 2);
    ctx.fill();
  });
}

function artWatermelon(ctx) {
  const wedge = (x, y, rad, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.moveTo(0, -rad * 1.1);
    ctx.arc(0, -rad * 1.1, rad, Math.PI * 0.25, Math.PI * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dff5c0';
    ctx.beginPath();
    ctx.moveTo(0, -rad * 1.1);
    ctx.arc(0, -rad * 1.1, rad * 0.93, Math.PI * 0.25, Math.PI * 0.75);
    ctx.closePath();
    ctx.fill();
    const g = ctx.createLinearGradient(0, -rad * 1.1, 0, -rad * 0.2);
    g.addColorStop(0, '#ff6b7a');
    g.addColorStop(1, '#f0263f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -rad * 1.1);
    ctx.arc(0, -rad * 1.1, rad * 0.86, Math.PI * 0.25, Math.PI * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    [[-0.18, 0.55], [0.18, 0.55], [0, 0.4], [-0.3, 0.7], [0.3, 0.7], [0, 0.72]].forEach(([fx, fy]) => {
      ctx.beginPath();
      ctx.ellipse(fx * rad, -rad * 1.1 + fy * rad, 8, 13, fx, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  };
  // whole melon behind
  ctx.save();
  ctx.translate(CX - 130, 290);
  const mg = ctx.createRadialGradient(-50, -50, 10, 0, 0, 200);
  mg.addColorStop(0, '#5fb548');
  mg.addColorStop(1, '#1f6b25');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.ellipse(0, 0, 200, 170, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#174f1c';
  ctx.lineWidth = 18;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.abs(i) * 58 + 8, 166, 0, -Math.PI / 2, Math.PI / 2, i < 0);
    ctx.stroke();
  }
  ctx.restore();
  wedge(CX + 150, 520, 260, 0.1);
  wedge(CX - 240, 560, 170, -0.35);
}

const CLEAR_ART = { citrus: artCitrus, mango: artMango, berry: artBerry, watermelon: artWatermelon };

// The sparkling label is printed on a clear can: everything not painted stays
// transparent so the drink shows through.
export function drawClearLabel(f) {
  const { c, ctx } = makeCanvas();
  ctx.clearRect(0, 0, LABEL_W, LABEL_H);

  CLEAR_ART[f.id](ctx);

  // White brand band that wraps all the way round.
  const bandTop = 610;
  const bandH = 190;
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.fillRect(0, bandTop, LABEL_W, bandH);
  ctx.fillStyle = f.deep;
  ctx.fillRect(0, bandTop, LABEL_W, 8);
  ctx.fillRect(0, bandTop + bandH - 8, LABEL_W, 8);

  ctx.save();
  ctx.translate(CX, bandTop + 148);
  ctx.rotate(-0.05);
  ctx.textAlign = 'center';
  ctx.font = '170px "Permanent Marker", "Brush Script MT", cursive';
  ctx.fillStyle = f.ink;
  ctx.fillText('PULSE', 0, 0);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = f.ink;
  ctx.font = '112px Anton, Impact, sans-serif';
  spacedText(ctx, f.name.toUpperCase(), CX, 930, 8);
  ctx.font = '800 30px Archivo, sans-serif';
  spacedText(ctx, 'SPARKLING WATER · REAL FRUIT', CX, 985, 4);

  const icons = [
    { label: ['NO ADDED', 'SUGAR'], draw: slashIcon },
    { label: ['NATURAL', 'FLAVORS'], draw: leafIcon },
    { label: ['CAFFEINE', 'FREE'], draw: (c2, x, y, rr, s) => dropIcon(c2, x, y, rr * 0.9, s) },
  ];
  ctx.font = '700 20px Archivo, sans-serif';
  icons.forEach((ic, i) => {
    const x = CX + (i - 1) * 170;
    ic.draw(ctx, x, 1060, 30, f.ink);
    ctx.fillStyle = f.ink;
    ic.label.forEach((t, li) => spacedText(ctx, t, x, 1122 + li * 24, 2));
  });
  ctx.font = '800 34px Archivo, sans-serif';
  spacedText(ctx, '330 mL', CX, 1230, 3);

  // Back: everything sits inside the white band, so nothing shows through
  // the clear front mirrored.
  drawBack(ctx, (b, cx) => {
    b.textAlign = 'left';
    b.fillStyle = f.ink;
    b.font = '40px "Permanent Marker", cursive';
    b.fillText('Feel the beat', cx - 10, bandTop + 112);
    b.font = '600 18px Archivo, sans-serif';
    b.fillText('Real fruit · No added sugar · Caffeine free', cx - 10, bandTop + 146);
    barcode(b, cx - 250, bandTop + 80, 200, 64, '#141414');
    b.fillStyle = '#141414';
    b.font = '600 16px Archivo, sans-serif';
    b.fillText('PULSE SPARKLING', cx - 250, bandTop + 166);
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
