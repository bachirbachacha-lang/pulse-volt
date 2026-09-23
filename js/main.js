import * as THREE from './vendor/three.min.js';
import { drawArcticLabel, drawSparklingLabel, drawDroplets } from './labels.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;

/* ---------------- Products ---------------- */

const FLAVORS = [
  { id: 'citrus', name: 'Citrus', note: 'Zesty & bright', seed: 11, light: '#ffe45c', base: '#ffc21a', deep: '#f0a000', swoosh: '#ff9d00' },
  { id: 'mango', name: 'Mango', note: 'Tropical & smooth', seed: 12, light: '#ffb44a', base: '#ff9224', deep: '#ee6f10', swoosh: '#ffd35a' },
  { id: 'berry', name: 'Berry', note: 'Juicy & fresh', seed: 13, light: '#f39ad7', base: '#e27bc6', deep: '#c85aad', swoosh: '#ffd1f0' },
  { id: 'watermelon', name: 'Watermelon', note: 'Crisp & cool', seed: 14, light: '#79d06a', base: '#58b84a', deep: '#3c9a35', swoosh: '#b8f09a', stripes: 'rgba(24,96,34,0.75)' },
];

const CAN_IDS = ['arctic', 'citrus', 'mango', 'berry', 'watermelon'];

/* ---------------- Stages ----------------
   Each scroll section with data-stage="n" maps to one keyframe below.
   p = position, r = rotation (radians), s = scale.
   Rotations keep increasing between stages so cans spin instead of unwinding. */

const OFF_DOWN = -13;
const OFF_UP = 13;

const STAGES = [
  // 0 hero
  {
    bg: ['#1b4f8f', '#050b16'], rim: '#6cc0ff', bubbles: 0, ice: 1, ink: 'light', glow: [0.5, 0.52],
    cans: {
      arctic: { p: [0, -0.1, 1.2], r: [0.06, -0.35, -0.05], s: 1.0 },
      citrus: { p: [-5.3, -0.7, -2.6], r: [0.12, 0.55, 0.2], s: 0.82 },
      mango: { p: [-2.8, 0.4, -1.3], r: [-0.06, 0.35, 0.1], s: 0.86 },
      berry: { p: [2.8, 0.4, -1.3], r: [-0.06, -0.35, -0.1], s: 0.86 },
      watermelon: { p: [5.3, -0.7, -2.6], r: [0.12, -0.55, -0.2], s: 0.82 },
    },
  },
  // 1 Arctic Rush intro
  {
    bg: ['#2a78c9', '#040a14'], rim: '#9ad9ff', bubbles: 0, ice: 1, ink: 'light', glow: [0.7, 0.5],
    cans: {
      arctic: { p: [2.7, 0, 0.6], r: [0.1, TAU - 0.4, -0.14], s: 1.3 },
      citrus: { p: [-5.3, OFF_DOWN, -2.6], r: [0.12, 0.55, 0.2], s: 0.82 },
      mango: { p: [-2.8, OFF_DOWN, -1.3], r: [-0.06, 0.35, 0.1], s: 0.86 },
      berry: { p: [2.8, OFF_DOWN, -1.3], r: [-0.06, -0.35, -0.1], s: 0.86 },
      watermelon: { p: [5.3, OFF_DOWN, -2.6], r: [0.12, -0.55, -0.2], s: 0.82 },
    },
  },
  // 2 Zero sugar / benefits
  {
    bg: ['#e8f4ff', '#8fb7de'], rim: '#ffffff', bubbles: 0, ice: 1, ink: 'dark', glow: [0.3, 0.5],
    cans: {
      arctic: { p: [-2.7, 0, 0.6], r: [-0.08, TAU * 2 - 0.25, 0.16], s: 1.3 },
    },
  },
  // 3 Sparkling intro
  {
    bg: ['#6fcbe0', '#0b3d55'], rim: '#dff8ff', bubbles: 1, ice: 0, ink: 'light', glow: [0.5, 0.62],
    cans: {
      arctic: { p: [-2.7, OFF_UP, -1], r: [-0.08, TAU * 2 - 0.25, 0.16], s: 1.3 },
      citrus: { p: [-3.3, -1.7, 0], r: [0.04, TAU + 0.18, 0.02], s: 0.74 },
      mango: { p: [-1.1, -1.7, 0.3], r: [0.04, TAU + 0.06, 0.0], s: 0.74 },
      berry: { p: [1.1, -1.7, 0.3], r: [0.04, TAU - 0.06, 0.0], s: 0.74 },
      watermelon: { p: [3.3, -1.7, 0], r: [0.04, TAU - 0.18, -0.02], s: 0.74 },
    },
  },
  // 4 Citrus
  {
    bg: ['#fff3a3', '#f5b400'], rim: '#fff6c8', bubbles: 1, ice: 0, ink: 'dark', glow: [0.7, 0.5],
    cans: {
      citrus: { p: [2.7, 0, 0.8], r: [0.1, TAU * 2 - 0.3, -0.14], s: 1.3 },
      mango: { p: [-1.1, OFF_DOWN, 0.3], r: [0.04, TAU * 2 + 0.3, 0], s: 0.86 },
      berry: { p: [1.1, OFF_DOWN, 0.3], r: [0.04, TAU * 2 - 0.3, 0], s: 0.86 },
      watermelon: { p: [3.3, OFF_DOWN, 0], r: [0.04, TAU * 3 + 0.3, 0], s: 0.86 },
    },
  },
  // 5 Mango
  {
    bg: ['#ffd08a', '#f07a1e'], rim: '#ffe2b8', bubbles: 1, ice: 0, ink: 'dark', glow: [0.3, 0.5],
    cans: {
      citrus: { p: [2.7, OFF_UP, -0.5], r: [0.1, TAU * 2 - 0.3, -0.14], s: 1.3 },
      mango: { p: [-2.7, 0, 0.8], r: [0.1, TAU * 3 + 0.3, 0.14], s: 1.3 },
    },
  },
  // 6 Berry
  {
    bg: ['#ffb0dc', '#e0409a'], rim: '#ffe0f2', bubbles: 1, ice: 0, ink: 'dark', glow: [0.7, 0.5],
    cans: {
      mango: { p: [-2.7, OFF_UP, -0.5], r: [0.1, TAU * 3 + 0.3, 0.14], s: 1.3 },
      berry: { p: [2.7, 0, 0.8], r: [0.1, TAU * 3 - 0.3, -0.14], s: 1.3 },
    },
  },
  // 7 Watermelon
  {
    bg: ['#b9f2a4', '#3fae4b'], rim: '#e6ffd9', bubbles: 1, ice: 0, ink: 'dark', glow: [0.3, 0.5],
    cans: {
      berry: { p: [2.7, OFF_UP, -0.5], r: [0.1, TAU * 3 - 0.3, -0.14], s: 1.3 },
      watermelon: { p: [-2.7, 0, 0.8], r: [0.1, TAU * 4 + 0.3, 0.14], s: 1.3 },
    },
  },
  // 8 Lineup
  {
    bg: ['#ffffff', '#d5e0ea'], rim: '#ffffff', bubbles: 0.35, ice: 0, ink: 'dark', glow: [0.5, 0.4],
    cans: {
      arctic: { p: [0, -0.1, 0.6], r: [0.02, TAU * 3, 0], s: 0.74 },
      citrus: { p: [-4.6, -0.1, 0], r: [0.02, TAU * 3 + 0.25, 0], s: 0.68 },
      mango: { p: [-2.3, -0.1, 0.3], r: [0.02, TAU * 4 + 0.12, 0], s: 0.68 },
      berry: { p: [2.3, -0.1, 0.3], r: [0.02, TAU * 4 - 0.12, 0], s: 0.68 },
      watermelon: { p: [4.6, -0.1, 0], r: [0.02, TAU * 5 - 0.25, 0], s: 0.68 },
    },
  },
  // 9 Campaign / FAQ / footer — cans exit
  {
    bg: ['#15345c', '#03070e'], rim: '#6cc0ff', bubbles: 0, ice: 0, ink: 'light', glow: [0.5, 0.2],
    cans: {
      arctic: { p: [0, OFF_UP + 2, 0.6], r: [0.02, TAU * 3 + 1, 0], s: 0.86 },
      citrus: { p: [-4.6, OFF_UP + 2, 0], r: [0.02, TAU * 3 + 1, 0], s: 0.78 },
      mango: { p: [-2.3, OFF_UP + 2, 0.3], r: [0.02, TAU * 4 + 1, 0], s: 0.78 },
      berry: { p: [2.3, OFF_UP + 2, 0.3], r: [0.02, TAU * 4 + 1, 0], s: 0.78 },
      watermelon: { p: [4.6, OFF_UP + 2, 0], r: [0.02, TAU * 5 + 1, 0], s: 0.78 },
    },
  },
];

// Cans a stage doesn't mention stay where the previous stage left them.
for (let i = 1; i < STAGES.length; i++) {
  for (const id of CAN_IDS) {
    if (!STAGES[i].cans[id]) STAGES[i].cans[id] = structuredClone(STAGES[i - 1].cans[id]);
  }
}

// Stages where a single can is the hero (text sits beside it on desktop).
const SOLO = { 1: 'arctic', 2: 'arctic', 4: 'citrus', 5: 'mango', 6: 'berry', 7: 'watermelon' };

/* ---------------- DOM wiring (works without WebGL) ---------------- */

const sections = [...document.querySelectorAll('[data-stage]')];
const bgEl = document.querySelector('.bg');
const dots = [...document.querySelectorAll('.progress a')];

function revealOnScroll() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((el) => {
    // The hero is on screen at load, so it animates in straight away.
    if (el.closest('.hero')) requestAnimationFrame(() => el.classList.add('in'));
    else io.observe(el);
  });
}
revealOnScroll();

// Continuous stage index from scroll: 0 at the first section's centre, 1 at the next, etc.
let sectionCentres = [];
function measure() {
  sectionCentres = sections.map((s) => {
    const r = s.getBoundingClientRect();
    return r.top + window.scrollY + r.height / 2;
  });
}
function stageFromScroll() {
  const y = window.scrollY + window.innerHeight / 2;
  if (y <= sectionCentres[0]) return 0;
  for (let i = 0; i < sectionCentres.length - 1; i++) {
    const a = sectionCentres[i];
    const b = sectionCentres[i + 1];
    if (y <= b) {
      const s0 = +sections[i].dataset.stage;
      const s1 = +sections[i + 1].dataset.stage;
      return s0 + ((y - a) / (b - a)) * (s1 - s0);
    }
  }
  return +sections[sections.length - 1].dataset.stage;
}

const col = (hex) => new THREE.Color(hex);
const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

// Hold each stage for a while, then ease into the next.
function ease(t) {
  const h = Math.min(1, Math.max(0, (t - 0.18) / 0.64));
  return h * h * h * (h * (h * 6 - 15) + 10);
}

let currentInk = '';
let activeDot = -1;
function updateChrome(stage) {
  const i = Math.floor(stage);
  const t = ease(stage - i);
  const a = STAGES[Math.min(i, STAGES.length - 1)];
  const b = STAGES[Math.min(i + 1, STAGES.length - 1)];
  tmpA.set(a.bg[0]).lerp(col(b.bg[0]), t);
  tmpB.set(a.bg[1]).lerp(col(b.bg[1]), t);
  const gx = a.glow[0] + (b.glow[0] - a.glow[0]) * t;
  const gy = a.glow[1] + (b.glow[1] - a.glow[1]) * t;
  bgEl.style.setProperty('--bg-inner', `#${tmpA.getHexString()}`);
  bgEl.style.setProperty('--bg-outer', `#${tmpB.getHexString()}`);
  bgEl.style.setProperty('--glow-x', `${(gx * 100).toFixed(1)}%`);
  bgEl.style.setProperty('--glow-y', `${(gy * 100).toFixed(1)}%`);

  const nearest = STAGES[Math.min(Math.round(stage), STAGES.length - 1)];
  if (nearest.ink !== currentInk) {
    currentInk = nearest.ink;
    document.documentElement.dataset.ink = currentInk;
  }
  const d = Math.min(Math.round(stage), dots.length - 1);
  if (d !== activeDot) {
    dots.forEach((el, k) => el.toggleAttribute('aria-current', k === d));
    activeDot = d;
  }
}

/* ---------------- 3D ---------------- */

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

async function start3D() {
  const host = document.querySelector('.stage3d');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute(
    'aria-label',
    'PULSE cans in 3D: Arctic Rush energy drink and the Citrus, Mango, Berry and Watermelon sparkling waters, moving as you scroll.'
  );

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rimL = new THREE.PointLight(0x6cc0ff, 60, 30);
  rimL.position.set(-6, 2, -3);
  const rimR = new THREE.PointLight(0x6cc0ff, 60, 30);
  rimR.position.set(6, -1, -3);
  scene.add(rimL, rimR);

  // Wait for fonts so labels print with the brand type.
  await Promise.all([
    document.fonts.load('330px Anton'),
    document.fonts.load('230px "Permanent Marker"'),
    document.fonts.load('800 40px Archivo'),
    document.fonts.load('italic 800 36px Archivo'),
  ]).catch(() => {});

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const toTexture = (canvas, srgb = true) => {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAniso);
    return t;
  };

  const drops = toTexture(drawDroplets(), false);
  drops.wrapS = drops.wrapT = THREE.RepeatWrapping;

  // Shared can geometry. Body height 3.9, radius 1.
  const H = 3.9;
  const bodyGeo = new THREE.CylinderGeometry(1, 1, H, 96, 1, true, Math.PI);
  const shoulder = [
    [1.0, 0], [0.995, 0.06], [0.97, 0.14], [0.92, 0.25], [0.87, 0.33], [0.855, 0.38],
    [0.86, 0.42], [0.875, 0.45], [0.86, 0.48], [0.82, 0.47], [0.815, 0.42],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const topGeo = new THREE.LatheGeometry(shoulder, 96);
  const lidGeo = new THREE.CircleGeometry(0.815, 64);
  const base = [
    [0.0, -0.12], [0.55, -0.16], [0.72, -0.24], [0.8, -0.26], [0.9, -0.22], [0.97, -0.12], [1.0, -0.03], [1.0, 0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const baseGeo = new THREE.LatheGeometry(base, 96);
  const tabShape = new THREE.Shape();
  tabShape.absarc(0, 0.12, 0.2, 0, Math.PI, false);
  tabShape.absarc(0, -0.2, 0.16, Math.PI, TAU, false);
  const tabHole = new THREE.Path();
  tabHole.absellipse(0, 0.14, 0.1, 0.06, 0, TAU, true);
  tabShape.holes.push(tabHole);
  const tabGeo = new THREE.ExtrudeGeometry(tabShape, { depth: 0.02, bevelEnabled: false });
  const openingGeo = new THREE.CircleGeometry(0.2, 32);

  const metal = new THREE.MeshStandardMaterial({ color: 0xd3d8de, metalness: 1, roughness: 0.26, side: THREE.DoubleSide });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x8a9098, metalness: 1, roughness: 0.4 });

  function buildCan(labelCanvas, opts) {
    const g = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({
      map: toTexture(labelCanvas),
      metalness: opts.metalness,
      roughness: opts.roughness,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      bumpMap: drops,
      bumpScale: 1.4,
    });
    const body = new THREE.Mesh(bodyGeo, mat);
    const top = new THREE.Mesh(topGeo, metal);
    top.position.y = H / 2;
    const lid = new THREE.Mesh(lidGeo, darkMetal);
    lid.rotation.x = -Math.PI / 2;
    lid.position.y = H / 2 + 0.425;
    const tab = new THREE.Mesh(tabGeo, metal);
    tab.rotation.x = -Math.PI / 2;
    tab.position.set(0, H / 2 + 0.43, 0.08);
    const opening = new THREE.Mesh(openingGeo, new THREE.MeshStandardMaterial({ color: 0x5b6068, metalness: 0.9, roughness: 0.5 }));
    opening.rotation.x = -Math.PI / 2;
    opening.position.set(0, H / 2 + 0.428, 0.46);
    opening.scale.set(1, 0.7, 1);
    const bottom = new THREE.Mesh(baseGeo, metal);
    bottom.position.y = -H / 2;
    g.add(body, top, lid, tab, opening, bottom);
    // Centre the whole can (it's a bit taller on top).
    g.children.forEach((m) => (m.position.y -= 0.1));
    const pivot = new THREE.Group();
    pivot.add(g);
    return pivot;
  }

  const cans = {};
  cans.arctic = buildCan(drawArcticLabel(), { metalness: 0.55, roughness: 0.32 });
  FLAVORS.forEach((f) => {
    cans[f.id] = buildCan(drawSparklingLabel(f), { metalness: 0.3, roughness: 0.3 });
  });
  CAN_IDS.forEach((id, i) => {
    cans[id].userData.phase = i * 1.7;
    scene.add(cans[id]);
  });

  /* Ice shards around the energy can. */
  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xe4f4ff,
    emissive: 0x1d5f9e,
    emissiveIntensity: 0.25,
    metalness: 0.1,
    roughness: 0.04,
    clearcoat: 1,
    iridescence: 0.6,
    iridescenceIOR: 1.3,
    envMapIntensity: 2.2,
    flatShading: true,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  const ice = new THREE.Group();
  const shardGeo = new THREE.OctahedronGeometry(1, 0);
  const rI = mulberry(9);
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(shardGeo, iceMat);
    const a = rI() * TAU;
    const rad = 3.2 + rI() * 3.5;
    m.position.set(Math.cos(a) * rad, (rI() - 0.5) * 7, -2 - rI() * 4);
    m.scale.set(0.16 + rI() * 0.24, 0.45 + rI() * 0.9, 0.16 + rI() * 0.24);
    m.rotation.set(rI() * TAU, rI() * TAU, rI() * TAU);
    m.userData.spin = (rI() - 0.5) * 0.4;
    ice.add(m);
  }
  scene.add(ice);

  /* Bubbles for the sparkling chapters. */
  const bubbleCount = 260;
  const bubblePos = new Float32Array(bubbleCount * 3);
  const bubbleSpeed = new Float32Array(bubbleCount);
  const rB = mulberry(21);
  for (let i = 0; i < bubbleCount; i++) {
    bubblePos[i * 3] = (rB() - 0.5) * 18;
    bubblePos[i * 3 + 1] = (rB() - 0.5) * 12;
    bubblePos[i * 3 + 2] = -4 + rB() * 7;
    bubbleSpeed[i] = 0.4 + rB() * 1.2;
  }
  const bubbleGeo = new THREE.BufferGeometry();
  bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
  const bubbleMat = new THREE.PointsMaterial({
    size: 0.16,
    map: toTexture(bubbleSprite()),
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });
  const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
  scene.add(bubbles);

  /* Layout */
  let aspect = 1;
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    aspect = w / h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, w < 700 ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    measure();
  }
  window.addEventListener('resize', resize);
  resize();

  // Adapt a desktop keyframe to the current screen shape.
  const portrait = () => aspect < 0.9 || window.innerWidth <= 640;
  function layoutFor(stageIdx, id, k) {
    const s = STAGES[stageIdx].cans[id];
    const p = [...s.p];
    let scale = s.s;
    if (portrait()) {
      if (SOLO[stageIdx] === id) {
        p[0] = 0;
        p[1] += 1.55;
        scale *= 0.78;
      } else {
        const squeeze = Math.max(0.34, aspect / 1.5);
        p[0] *= squeeze;
        scale *= Math.max(0.5, squeeze * 1.25);
        if (stageIdx === 0) p[1] += 0.2;
        if (stageIdx === 3) p[1] -= 0.2;
        if (stageIdx === 8) p[1] += 0.8;
      }
    } else if (aspect < 1.35) {
      const squeeze = aspect / 1.6;
      p[0] *= Math.max(0.7, squeeze);
      scale *= Math.max(0.8, squeeze);
    }
    return { p, r: s.r, s: scale, k };
  }

  const target = { p: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler() };
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const timer = new THREE.Timer();
  timer.connect(document);
  let smoothStage = stageFromScroll();
  let visible = true;
  document.addEventListener('visibilitychange', () => (visible = !document.hidden));

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    const time = timer.getElapsed();

    const raw = stageFromScroll();
    smoothStage = reduceMotion ? Math.round(raw) : THREE.MathUtils.damp(smoothStage, raw, 6, dt);
    updateChrome(reduceMotion ? Math.round(raw) : smoothStage);

    const i = Math.min(Math.floor(smoothStage), STAGES.length - 1);
    const j = Math.min(i + 1, STAGES.length - 1);
    const t = ease(smoothStage - i);

    for (const id of CAN_IDS) {
      const can = cans[id];
      const a = layoutFor(i, id);
      const b = layoutFor(j, id);
      pA.fromArray(a.p);
      pB.fromArray(b.p);
      target.p.lerpVectors(pA, pB, t);
      const rx = a.r[0] + (b.r[0] - a.r[0]) * t;
      let ry = a.r[1] + (b.r[1] - a.r[1]) * t;
      const rz = a.r[2] + (b.r[2] - a.r[2]) * t;
      const sc = a.s + (b.s - a.s) * t;

      if (!reduceMotion) {
        const ph = can.userData.phase;
        target.p.y += Math.sin(time * 0.9 + ph) * 0.12;
        ry += Math.sin(time * 0.45 + ph) * 0.12;
      }
      can.position.copy(target.p);
      can.rotation.set(rx + pointer.y * 0.08, ry + pointer.x * 0.2, rz);
      can.scale.setScalar(sc);
      can.visible = Math.abs(target.p.y) < 11;
    }

    // Atmosphere.
    const sA = STAGES[i];
    const sB = STAGES[j];
    const iceAmt = sA.ice + (sB.ice - sA.ice) * t;
    ice.visible = iceAmt > 0.01;
    ice.children.forEach((m) => {
      if (!reduceMotion) {
        m.rotation.y += m.userData.spin * dt;
        m.rotation.x += m.userData.spin * 0.5 * dt;
      }
    });
    ice.scale.setScalar(Math.max(0.001, iceAmt));
    ice.position.y = (1 - iceAmt) * -3;

    bubbleMat.opacity = (sA.bubbles + (sB.bubbles - sA.bubbles) * t) * 0.8;
    bubbles.visible = bubbleMat.opacity > 0.01;
    if (bubbles.visible && !reduceMotion) {
      for (let k = 0; k < bubbleCount; k++) {
        bubblePos[k * 3 + 1] += bubbleSpeed[k] * dt;
        bubblePos[k * 3] += Math.sin(time * 2 + k) * 0.002;
        if (bubblePos[k * 3 + 1] > 6) bubblePos[k * 3 + 1] = -6;
      }
      bubbleGeo.attributes.position.needsUpdate = true;
    }

    tmpA.set(sA.rim).lerp(col(sB.rim), t);
    rimL.color.copy(tmpA);
    rimR.color.copy(tmpA);

    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    camera.position.x = pointer.x * 0.35;
    camera.position.y = -pointer.y * 0.25;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  // Re-measure once images/fonts settle the layout.
  window.addEventListener('load', measure);
  document.fonts.ready.then(measure);
  new ResizeObserver(measure).observe(document.querySelector('main'));

  frame();
  document.documentElement.classList.add('is-3d');
}

function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bubbleSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 18, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.05)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(24, 22, 5, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/* ---------------- Boot ---------------- */

measure();
if (webglAvailable()) {
  start3D().catch((err) => {
    console.error(err);
    document.documentElement.classList.add('no-3d');
  });
} else {
  document.documentElement.classList.add('no-3d');
  const tick = () => {
    updateChrome(stageFromScroll());
    requestAnimationFrame(tick);
  };
  tick();
}

/* Notify form: no backend yet, so just confirm on the page. */
const form = document.querySelector('.notify-form');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = form.querySelector('input[type=email]');
  const msg = form.querySelector('.form-msg');
  if (!input.checkValidity()) {
    msg.textContent = 'Enter a valid email so we can reach you.';
    msg.dataset.state = 'error';
    input.focus();
    return;
  }
  msg.textContent = "You're on the list. We'll ping you at launch.";
  msg.dataset.state = 'ok';
  form.reset();
});
