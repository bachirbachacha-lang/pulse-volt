import * as THREE from './vendor/three.min.js';
import { drawEnergyLabel, drawClearLabel, drawDroplets, setLabelScale } from './labels.js';
import { ENERGY, SPARKLING } from './products.js';
import { initUI, getSelectedEnergy } from './ui.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;

/* ---------------- Products ---------------- */

// Look of each sparkling can: label ink and the tint of the drink inside.
const SPARKLING_LOOK = {
  citrus: { ink: '#8a5600', deep: '#f2b600', liquid: '#fff1a0' },
  mango: { ink: '#a33d00', deep: '#ff8a1f', liquid: '#ffc56e' },
  berry: { ink: '#9c0f55', deep: '#e0409a', liquid: '#ffaad0' },
  watermelon: { ink: '#16651f', deep: '#3fae4b', liquid: '#ff9fae' },
};

const ENERGY_IDS = new Set(ENERGY.map((f) => f.id));
const SPARKLING_IDS = SPARKLING.map((f) => f.id);
const CAN_IDS = [...ENERGY_IDS, ...SPARKLING_IDS];
const energyById = Object.fromEntries(ENERGY.map((f) => [f.id, f]));

/* ---------------- Stages ----------------
   Each scroll section with data-stage="n" maps to one keyframe below.
   p = position, r = rotation (radians), s = scale.
   `energy` is the pose of whichever energy flavor is selected in the switcher;
   the other energy cans wait below the screen.
   Rotations keep increasing between stages so cans spin instead of unwinding. */

const OFF_DOWN = -13;
const OFF_UP = 13;
const hide = (x, z = 0) => ({ p: [x, OFF_DOWN, z], r: [0, 0, 0], s: 0.8 });

const STAGES = [
  // 0 hero
  {
    bg: ['#1b4f8f', '#050b16'], rim: '#6cc0ff', bubbles: 0, ice: 1, ink: 'light', glow: [0.5, 0.52], crystal: '#d8efff',
    cans: {
      watermelon: { p: [-6.1, -1.0, -3.2], r: [0.12, 0.6, 0.22], s: 0.66 },
      citrus: { p: [-4.1, -0.3, -1.9], r: [0.1, 0.45, 0.16], s: 0.74 },
      solar: { p: [-2.25, 0.35, -0.7], r: [-0.06, 0.3, 0.1], s: 0.84 },
      arctic: { p: [0, -0.1, 1.2], r: [0.06, -0.35, -0.05], s: 1.0 },
      night: { p: [2.25, 0.35, -0.7], r: [-0.06, -0.3, -0.1], s: 0.84 },
      berry: { p: [4.1, -0.3, -1.9], r: [0.1, -0.45, -0.16], s: 0.74 },
      mango: { p: [6.1, -1.0, -3.2], r: [0.12, -0.6, -0.22], s: 0.66 },
      venom: hide(-2.25),
      cherry: hide(2.25),
    },
  },
  // 1 Energy flavor
  {
    bg: 'energy1', bubbles: 0, ice: 1, glow: [0.7, 0.5],
    energy: { p: [2.7, 0, 0.6], r: [0.1, TAU - 0.4, -0.14], s: 1.3 },
    cans: {
      watermelon: hide(-6.1, -3.2), citrus: hide(-4.1, -1.9), berry: hide(4.1, -1.9), mango: hide(6.1, -3.2),
    },
  },
  // 2 What's inside
  {
    bg: 'energy2', bubbles: 0, ice: 1, glow: [0.28, 0.5],
    energy: { p: [-3.1, 0, 0.6], r: [-0.08, TAU * 2 - 0.25, 0.16], s: 1.22 },
    cans: {},
  },
  // 3 Sparkling intro
  {
    bg: ['#6fcbe0', '#0b3d55'], rim: '#dff8ff', bubbles: 1, ice: 0, ink: 'light', glow: [0.5, 0.62],
    energy: { p: [-3.1, OFF_UP, -1], r: [-0.08, TAU * 2 - 0.25, 0.16], s: 1.22 },
    cans: {
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
      mango: { p: [-1.1, OFF_DOWN, 0.3], r: [0.04, TAU * 2 + 0.3, 0], s: 0.74 },
      berry: { p: [1.1, OFF_DOWN, 0.3], r: [0.04, TAU * 2 - 0.3, 0], s: 0.74 },
      watermelon: { p: [3.3, OFF_DOWN, 0], r: [0.04, TAU * 3 + 0.3, 0], s: 0.74 },
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
  // 8 Lineup: energy row on top, sparkling row in front
  {
    bg: ['#ffffff', '#d5e0ea'], rim: '#ffffff', bubbles: 0.35, ice: 0, ink: 'dark', glow: [0.5, 0.45],
    cans: {
      arctic: { p: [-4.4, 1.0, -0.4], r: [0.02, TAU * 3, 0], s: 0.53 },
      solar: { p: [-2.2, 1.0, -0.4], r: [0.02, TAU * 3, 0], s: 0.53 },
      venom: { p: [0, 1.0, -0.4], r: [0.02, TAU * 3, 0], s: 0.53 },
      cherry: { p: [2.2, 1.0, -0.4], r: [0.02, TAU * 3, 0], s: 0.53 },
      night: { p: [4.4, 1.0, -0.4], r: [0.02, TAU * 3, 0], s: 0.53 },
      citrus: { p: [-3.3, -2.0, 0.6], r: [0.02, TAU * 3 + 0.2, 0], s: 0.53 },
      mango: { p: [-1.1, -2.0, 0.6], r: [0.02, TAU * 4 + 0.1, 0], s: 0.53 },
      berry: { p: [1.1, -2.0, 0.6], r: [0.02, TAU * 4 - 0.1, 0], s: 0.53 },
      watermelon: { p: [3.3, -2.0, 0.6], r: [0.02, TAU * 5 - 0.2, 0], s: 0.53 },
    },
  },
  // 9 Shop and beyond: cans exit upwards
  {
    bg: ['#15345c', '#03070e'], rim: '#6cc0ff', bubbles: 0, ice: 0, ink: 'light', glow: [0.5, 0.2],
    cans: {},
  },
];
for (const id of CAN_IDS) {
  const l = STAGES[8].cans[id];
  STAGES[9].cans[id] = { p: [l.p[0], OFF_UP + 2, l.p[2]], r: [0.02, l.r[1] + 1, 0], s: l.s };
}

// Anything a stage doesn't mention stays where the previous stage left it.
for (let i = 1; i < STAGES.length; i++) {
  if (!STAGES[i].energy && STAGES[i - 1].energy && i < 8) STAGES[i].energy = structuredClone(STAGES[i - 1].energy);
  for (const id of CAN_IDS) {
    if (STAGES[i].cans[id]) continue;
    if (ENERGY_IDS.has(id) && STAGES[i].energy) continue;
    const prev = STAGES[i - 1].cans[id] || hide(STAGES[i - 1].energy.p[0], STAGES[i - 1].energy.p[2]);
    STAGES[i].cans[id] = structuredClone(prev);
  }
}

// Stages where one can is the hero (text sits beside it on desktop).
const SOLO = { 1: 'energy', 2: 'energy', 4: 'citrus', 5: 'mango', 6: 'berry', 7: 'watermelon' };

// Colours for the energy chapters follow the selected flavor.
function stageLook(i) {
  const s = STAGES[i];
  if (s.bg === 'energy1' || s.bg === 'energy2') {
    const f = energyById[getSelectedEnergy()];
    const two = s.bg === 'energy2';
    return { ...s, bg: two ? f.bg2 : f.bg1, rim: f.rim, ink: two ? f.ink2 : 'light', crystal: f.crystal };
  }
  if (!s.crystal) return { ...s, crystal: energyById[getSelectedEnergy()].crystal };
  return s;
}

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

// Hold each stage for a while, then ease into the next.
function ease(t) {
  const h = Math.min(1, Math.max(0, (t - 0.18) / 0.64));
  return h * h * h * (h * (h * 6 - 15) + 10);
}

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
const bgInner = new THREE.Color('#1b4f8f');
const bgOuter = new THREE.Color('#050b16');
const glow = { x: 0.5, y: 0.52 };
let currentInk = '';
let activeDot = -1;

// Blend the page colours for a stage position. `k` smooths changes (1 = snap).
function updateChrome(stage, k = 1) {
  const i = Math.min(Math.floor(stage), STAGES.length - 1);
  const t = ease(stage - i);
  const a = stageLook(i);
  const b = stageLook(Math.min(i + 1, STAGES.length - 1));
  tmpA.set(a.bg[0]).lerp(tmpB.set(b.bg[0]), t);
  bgInner.lerp(tmpA, k);
  tmpA.set(a.bg[1]).lerp(tmpB.set(b.bg[1]), t);
  bgOuter.lerp(tmpA, k);
  glow.x += (a.glow[0] + (b.glow[0] - a.glow[0]) * t - glow.x) * k;
  glow.y += (a.glow[1] + (b.glow[1] - a.glow[1]) * t - glow.y) * k;
  bgEl.style.setProperty('--bg-inner', `#${bgInner.getHexString()}`);
  bgEl.style.setProperty('--bg-outer', `#${bgOuter.getHexString()}`);
  bgEl.style.setProperty('--glow-x', `${(glow.x * 100).toFixed(1)}%`);
  bgEl.style.setProperty('--glow-y', `${(glow.y * 100).toFixed(1)}%`);

  const nearest = stageLook(Math.min(Math.round(stage), STAGES.length - 1));
  if (nearest.ink !== currentInk) {
    currentInk = nearest.ink;
    document.documentElement.dataset.ink = currentInk;
  }
  const d = Math.min(Math.round(stage), dots.length - 1);
  if (d !== activeDot) {
    dots.forEach((el, n) => el.toggleAttribute('aria-current', n === d));
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
    'PULSE cans in 3D: five energy drinks and four sparkling waters, moving as you scroll.'
  );

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;

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

  const w = window.innerWidth;
  setLabelScale(w < 700 ? 0.5 : w < 1300 ? 0.75 : 1);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const toTexture = (canvas, srgb = true) => {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAniso);
    return t;
  };

  const drops = toTexture(drawDroplets(), false);
  drops.wrapS = drops.wrapT = THREE.RepeatWrapping;
  const bubbleTex = toTexture(bubbleSprite());

  // Shared can geometry. Body height 3.9, radius 1.
  const H = 3.9;
  const bodyGeo = new THREE.CylinderGeometry(1, 1, H, 96, 1, true, Math.PI);
  const labelGeo = new THREE.CylinderGeometry(1.004, 1.004, H * 0.98, 96, 1, true, Math.PI);
  const liquidGeo = new THREE.CylinderGeometry(0.955, 0.955, H * 0.84, 64);
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
  const openingMat = new THREE.MeshStandardMaterial({ color: 0x5b6068, metalness: 0.9, roughness: 0.5 });

  function addLid(g, shoulderMat) {
    const top = new THREE.Mesh(topGeo, shoulderMat);
    top.position.y = H / 2;
    const lid = new THREE.Mesh(lidGeo, darkMetal);
    lid.rotation.x = -Math.PI / 2;
    lid.position.y = H / 2 + 0.425;
    const tab = new THREE.Mesh(tabGeo, metal);
    tab.rotation.x = -Math.PI / 2;
    tab.position.set(0, H / 2 + 0.43, 0.08);
    const opening = new THREE.Mesh(openingGeo, openingMat);
    opening.rotation.x = -Math.PI / 2;
    opening.position.set(0, H / 2 + 0.428, 0.46);
    opening.scale.set(1, 0.7, 1);
    g.add(top, lid, tab, opening);
  }

  function wrap(g) {
    // Centre the whole can (it's a bit taller on top).
    g.children.forEach((m) => (m.position.y -= 0.1));
    const pivot = new THREE.Group();
    pivot.add(g);
    return pivot;
  }

  // Aluminium energy can with a printed wrap.
  function buildEnergyCan(labelCanvas, id) {
    const g = new THREE.Group();
    const dark = id === 'venom' || id === 'night';
    const mat = new THREE.MeshPhysicalMaterial({
      map: toTexture(labelCanvas),
      metalness: id === 'arctic' ? 0.55 : 0.45,
      roughness: dark ? 0.38 : 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      bumpMap: drops,
      bumpScale: 1.4,
    });
    g.add(new THREE.Mesh(bodyGeo, mat));
    addLid(g, metal);
    const bottom = new THREE.Mesh(baseGeo, metal);
    bottom.position.y = -H / 2;
    g.add(bottom);
    return wrap(g);
  }

  // Clear can: see-through shell, tinted drink with bubbles, printed label.
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.09,
    envMapIntensity: 2.4,
    depthWrite: false,
    side: THREE.DoubleSide,
    bumpMap: drops,
    bumpScale: 0.8,
  });
  const fizz = [];
  function buildClearCan(labelCanvas, look, seed) {
    const g = new THREE.Group();
    const tint = new THREE.Color(look.liquid);
    const liquid = new THREE.Mesh(
      liquidGeo,
      new THREE.MeshPhysicalMaterial({
        color: tint,
        emissive: tint,
        emissiveIntensity: 0.18,
        roughness: 0.1,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );
    liquid.position.y = -H * 0.07;
    liquid.renderOrder = 1;

    const count = 70;
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    const rB = mulberry(seed);
    const low = -H * 0.49;
    const high = H * 0.35;
    for (let i = 0; i < count; i++) {
      const a = rB() * TAU;
      const rr = Math.sqrt(rB()) * 0.85;
      pos[i * 3] = Math.cos(a) * rr;
      pos[i * 3 + 1] = low + rB() * (high - low);
      pos[i * 3 + 2] = Math.sin(a) * rr;
      speed[i] = 0.3 + rB() * 0.9;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const fizzPoints = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 0.06, map: bubbleTex, transparent: true, depthWrite: false, opacity: 0.9 })
    );
    fizzPoints.renderOrder = 1.5;

    const shell = new THREE.Mesh(bodyGeo, shellMat);
    shell.renderOrder = 2;
    const label = new THREE.Mesh(
      labelGeo,
      new THREE.MeshStandardMaterial({
        map: toTexture(labelCanvas),
        roughness: 0.32,
        metalness: 0.05,
        alphaTest: 0.35,
        side: THREE.DoubleSide,
      })
    );
    const bottom = new THREE.Mesh(baseGeo, shellMat);
    bottom.position.y = -H / 2;
    bottom.renderOrder = 2;
    g.add(liquid, fizzPoints, label, shell, bottom);
    addLid(g, metal);
    const pivot = wrap(g);
    fizz.push({ pos, speed, geo, low, high, count, pivot });
    return pivot;
  }

  const cans = {};
  ENERGY.forEach((f) => (cans[f.id] = buildEnergyCan(drawEnergyLabel(f), f.id)));
  SPARKLING.forEach((f, i) => {
    const look = SPARKLING_LOOK[f.id];
    cans[f.id] = buildClearCan(drawClearLabel({ ...f, ...look }), look, 31 + i);
  });
  CAN_IDS.forEach((id, i) => {
    cans[id].userData.phase = i * 1.7;
    cans[id].userData.sel = id === getSelectedEnergy() ? 1 : 0;
    scene.add(cans[id]);
  });

  /* Crystals around the energy cans, tinted to the selected flavor. */
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
    const rad = 2.3 + rI() * 2.6;
    m.position.set(Math.cos(a) * rad, (rI() - 0.5) * 6.5, -1.6 - rI() * 3);
    m.scale.set(0.16 + rI() * 0.24, 0.45 + rI() * 0.9, 0.16 + rI() * 0.24);
    m.rotation.set(rI() * TAU, rI() * TAU, rI() * TAU);
    m.userData.spin = (rI() - 0.5) * 0.4;
    ice.add(m);
  }
  scene.add(ice);
  const crystal = new THREE.Color('#d8efff');

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
  const bubbleMat = new THREE.PointsMaterial({ size: 0.16, map: bubbleTex, transparent: true, depthWrite: false, opacity: 0 });
  const bubbles = new THREE.Points(bubbleGeo, bubbleMat);
  scene.add(bubbles);

  /* Product shots for the shop, rendered from the same 3D cans. */
  renderThumbnails(renderer, envMap, cans);

  /* Layout */
  let aspect = 1;
  function resize() {
    const ww = window.innerWidth;
    const hh = window.innerHeight;
    aspect = ww / hh;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, ww < 700 ? 1.5 : 2));
    renderer.setSize(ww, hh, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    measure();
  }
  window.addEventListener('resize', resize);
  resize();

  const portrait = () => aspect < 0.9 || window.innerWidth <= 640;
  const mix = (a, b, k) => a + (b - a) * k;

  function poseFor(stageIdx, id) {
    const st = STAGES[stageIdx];
    if (ENERGY_IDS.has(id) && st.energy) {
      const e = st.energy;
      const k = cans[id].userData.sel;
      return {
        p: [e.p[0], mix(OFF_DOWN, e.p[1], k), e.p[2]],
        r: [e.r[0], e.r[1] - (1 - k) * 2.4, e.r[2]],
        s: e.s,
      };
    }
    return st.cans[id];
  }

  // Adapt a desktop keyframe to the current screen shape.
  function layoutFor(stageIdx, id) {
    const s = poseFor(stageIdx, id);
    const p = [...s.p];
    let scale = s.s;
    const solo = SOLO[stageIdx];
    const isSolo = solo === id || (solo === 'energy' && ENERGY_IDS.has(id));
    if (portrait()) {
      if (isSolo) {
        p[0] = 0;
        p[1] += 1.55;
        scale *= 0.78;
      } else {
        const squeeze = Math.max(0.34, aspect / 1.5);
        p[0] *= squeeze;
        scale *= Math.max(0.5, squeeze * 1.25);
        if (stageIdx === 0) {
          p[1] += 0.2;
          if (id === 'mango' || id === 'watermelon') p[1] = OFF_DOWN;
        }
        if (stageIdx === 3) p[1] -= 0.2;
        if (stageIdx === 8) p[1] = p[1] * 0.75 + 0.6;
      }
    } else if (aspect < 1.35) {
      const squeeze = aspect / 1.6;
      p[0] *= Math.max(0.7, squeeze);
      scale *= Math.max(0.8, squeeze);
    }
    return { p, r: s.r, s: scale };
  }

  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pos = new THREE.Vector3();
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
    const colourK = reduceMotion ? 1 : 1 - Math.exp(-8 * dt);
    updateChrome(reduceMotion ? Math.round(raw) : smoothStage, colourK);

    const i = Math.min(Math.floor(smoothStage), STAGES.length - 1);
    const j = Math.min(i + 1, STAGES.length - 1);
    const t = ease(smoothStage - i);
    const selected = getSelectedEnergy();

    for (const id of CAN_IDS) {
      const can = cans[id];
      if (ENERGY_IDS.has(id)) {
        const goal = id === selected ? 1 : 0;
        can.userData.sel = reduceMotion ? goal : THREE.MathUtils.damp(can.userData.sel, goal, 5, dt);
      }
      const a = layoutFor(i, id);
      const b = layoutFor(j, id);
      pA.fromArray(a.p);
      pB.fromArray(b.p);
      pos.lerpVectors(pA, pB, t);
      const rx = mix(a.r[0], b.r[0], t);
      let ry = mix(a.r[1], b.r[1], t);
      const rz = mix(a.r[2], b.r[2], t);
      const sc = mix(a.s, b.s, t);

      if (!reduceMotion) {
        const ph = can.userData.phase;
        pos.y += Math.sin(time * 0.9 + ph) * 0.12;
        ry += Math.sin(time * 0.45 + ph) * 0.12;
      }
      can.position.copy(pos);
      can.rotation.set(rx + pointer.y * 0.08, ry + pointer.x * 0.2, rz);
      can.scale.setScalar(sc);
      can.visible = Math.abs(pos.y) < 11;
    }

    // Fizz inside the clear cans.
    if (!reduceMotion) {
      for (const f of fizz) {
        if (!f.pivot.visible) continue;
        for (let k = 0; k < f.count; k++) {
          f.pos[k * 3 + 1] += f.speed[k] * dt * 0.8;
          if (f.pos[k * 3 + 1] > f.high) f.pos[k * 3 + 1] = f.low;
        }
        f.geo.attributes.position.needsUpdate = true;
      }
    }

    // Atmosphere.
    const sA = stageLook(i);
    const sB = stageLook(j);
    const iceAmt = mix(sA.ice, sB.ice, t);
    ice.visible = iceAmt > 0.01;
    if (!reduceMotion) {
      ice.children.forEach((m) => {
        m.rotation.y += m.userData.spin * dt;
        m.rotation.x += m.userData.spin * 0.5 * dt;
      });
    }
    ice.scale.setScalar(Math.max(0.001, iceAmt));
    ice.position.y = (1 - iceAmt) * -3;
    // Crystals huddle around whichever energy can is on show.
    ice.position.x += (cans[selected].position.x * 0.85 - ice.position.x) * colourK;
    tmpA.set(sA.crystal).lerp(tmpB.set(sB.crystal), t);
    crystal.lerp(tmpA, colourK);
    iceMat.color.copy(crystal);
    iceMat.emissive.copy(crystal).multiplyScalar(0.35);

    bubbleMat.opacity = mix(sA.bubbles, sB.bubbles, t) * 0.8;
    bubbles.visible = bubbleMat.opacity > 0.01;
    if (bubbles.visible && !reduceMotion) {
      for (let k = 0; k < bubbleCount; k++) {
        bubblePos[k * 3 + 1] += bubbleSpeed[k] * dt;
        bubblePos[k * 3] += Math.sin(time * 2 + k) * 0.002;
        if (bubblePos[k * 3 + 1] > 6) bubblePos[k * 3 + 1] = -6;
      }
      bubbleGeo.attributes.position.needsUpdate = true;
    }

    tmpA.set(sA.rim).lerp(tmpB.set(sB.rim), t);
    rimL.color.lerp(tmpA, colourK);
    rimR.color.copy(rimL.color);

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

// Render each can once, straight into an image for the shop cards.
function renderThumbnails(renderer, envMap, cans) {
  const W = 300;
  const Hh = 420;
  const shots = {};
  const thumbScene = new THREE.Scene();
  thumbScene.environment = envMap;
  const light = new THREE.DirectionalLight(0xffffff, 1.8);
  light.position.set(4, 6, 8);
  thumbScene.add(light);
  const cam = new THREE.PerspectiveCamera(30, W / Hh, 0.1, 50);
  cam.position.set(0, 0.2, 11.2);
  cam.lookAt(0, 0, 0);

  const prevSize = renderer.getSize(new THREE.Vector2());
  const prevRatio = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(W, Hh, false);
  for (const [id, can] of Object.entries(cans)) {
    const parent = can.parent;
    const saved = { p: can.position.clone(), r: can.rotation.clone(), s: can.scale.clone() };
    thumbScene.add(can);
    can.position.set(0, 0, 0);
    can.rotation.set(0.08, -0.32, 0.04);
    can.scale.setScalar(1);
    renderer.render(thumbScene, cam);
    shots[id] = renderer.domElement.toDataURL('image/png');
    parent.add(can);
    can.position.copy(saved.p);
    can.rotation.copy(saved.r);
    can.scale.copy(saved.s);
  }
  renderer.setPixelRatio(prevRatio);
  renderer.setSize(prevSize.x, prevSize.y, false);
  document.dispatchEvent(new CustomEvent('pulse:thumbs', { detail: shots }));
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

initUI();
revealOnScroll();
measure();
if (webglAvailable()) {
  start3D().catch((err) => {
    console.error(err);
    document.documentElement.classList.add('no-3d');
  });
} else {
  document.documentElement.classList.add('no-3d');
  const tick = () => {
    updateChrome(stageFromScroll(), 0.15);
    requestAnimationFrame(tick);
  };
  tick();
}
