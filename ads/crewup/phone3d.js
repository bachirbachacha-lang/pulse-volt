// Real 3D phone for the CrewUp trailer (three.js r128): metal frame with bevels, black glass front,
// home-screen texture, Dynamic Island, glass reflections, buttons, camera bump on the back.
// t.html tweens Phone3D.rig with GSAP and calls Phone3D.render(t) every frame.
(function () {
  const W = 1080, H = 1920;
  const canvas = document.getElementById('gl');
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1); R.setSize(W, H, false);
  R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, W / H, .01, 100);

  // studio reflections: big soft boxes + a blue rim so the metal and glass catch light
  (function () {
    const pm = new THREE.PMREMGenerator(R), env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x05070d, side: THREE.BackSide })));
    [[0xffffff, [-5, 4, 6], [6, 3], 1], [0xffffff, [6, 1, 4], [2, 9], .8], [0x3f7bff, [-6, -2, -3], [3, 8], 1], [0xbfd4ff, [0, 9, 0], [12, 2], .9], [0x7b5cff, [5, -5, -4], [5, 3], .7]].forEach(([c, p, s, k]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s[0], s[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k * 2), side: THREE.DoubleSide }));
      m.position.set(...p); m.lookAt(0, 0, 0); env.add(m);
    });
    scene.environment = pm.fromScene(env, .02).texture;
  })();
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-3, 4, 5); scene.add(key);
  scene.add(new THREE.AmbientLight(0x3050a0, .25));

  const PW = .715, PH = 1.47, PD = .078, PR = .112;
  function rrect(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  // ShapeGeometry with 0..1 UVs across the shape's box
  function flat(w, h, r, seg = 24) {
    const g = new THREE.ShapeGeometry(rrect(w, h, r), seg), uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
    return g;
  }
  const phone = new THREE.Group(); scene.add(phone);
  // frame
  const bev = .014;
  const body = new THREE.ExtrudeGeometry(rrect(PW - 2 * bev, PH - 2 * bev, PR - bev), { depth: PD - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 8, curveSegments: 32 });
  body.translate(0, 0, -(PD - 2 * bev) / 2);
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x5a6070, metalness: 1, roughness: .22, envMapIntensity: 1.4, clearcoat: .4, clearcoatRoughness: .2 });
  phone.add(new THREE.Mesh(body, metal));
  // front: black glass, screen, glass sheen
  const zf = PD / 2 + .0006;
  const black = new THREE.Mesh(flat(PW - .01, PH - .01, PR - .005), new THREE.MeshPhysicalMaterial({ color: 0x030304, roughness: .05, metalness: 0, clearcoat: 1, envMapIntensity: 1 }));
  black.position.z = zf; phone.add(black);
  const img = new Image(); img.src = window.HOME_DATA;
  const tex = new THREE.Texture(img); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
  const SW = PW - .034, SH = PH - .034;
  const screen = new THREE.Mesh(flat(SW, SH, PR - .02, 32), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.z = zf + .0004; phone.add(screen);
  const island = new THREE.Mesh(flat(.19, .056, .028), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  island.position.set(0, SH / 2 - .046, zf + .0008); phone.add(island);
  const glass = new THREE.Mesh(flat(PW - .01, PH - .01, PR - .005), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .1, roughness: .04, metalness: 0, envMapIntensity: 3, depthWrite: false }));
  glass.position.z = zf + .0012; phone.add(glass);
  // back glass + camera bump
  const back = new THREE.Mesh(flat(PW - .01, PH - .01, PR - .005), new THREE.MeshPhysicalMaterial({ color: 0x1c2232, roughness: .45, metalness: .2, envMapIntensity: .8 }));
  back.rotation.y = Math.PI; back.position.z = -zf; phone.add(back);
  const bump = new THREE.Mesh(new THREE.ExtrudeGeometry(rrect(.29, .29, .07), { depth: .012, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 4, curveSegments: 16 }),
    new THREE.MeshPhysicalMaterial({ color: 0x2a3142, roughness: .25, metalness: .4, clearcoat: 1 }));
  bump.rotation.y = Math.PI; bump.position.set(PW / 2 - .19, PH / 2 - .19, -zf); phone.add(bump);
  const lensRing = new THREE.MeshPhysicalMaterial({ color: 0x8a92a4, metalness: 1, roughness: .2 });
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: .02, clearcoat: 1, envMapIntensity: 2 });
  [[-.06, .06], [-.06, -.06], [.065, 0]].forEach(([dx, dy]) => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, .02, 40), lensRing); ring.rotation.x = Math.PI / 2; g.add(ring);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .022, 40), lensGlass); lens.rotation.x = Math.PI / 2; g.add(lens);
    g.position.set(PW / 2 - .19 - dx, PH / 2 - .19 + dy, -zf - .024); phone.add(g);
  });
  // side buttons
  const btn = (x, y, h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.012, h, .03), metal); m.position.set(x, y, 0); phone.add(m); };
  btn(-PW / 2 - .004, .36, .07); btn(-PW / 2 - .004, .22, .12); btn(-PW / 2 - .004, .07, .12); btn(PW / 2 + .004, .2, .2);

  // rig values GSAP animates (phone pose + camera)
  const rig = { py: -3.4, px: 0, rx: -.55, ry: Math.PI, rz: .15, cx: 0, cy: 0, cz: 5.2, lx: 0, ly: 0, lz: 0, on: 0 };
  // where things sit on the screen, in phone space
  const onScreen = (u, v) => [(u - .5) * SW, (.5 - v) * SH, zf];
  const ICON = onScreen((88 + 270 + 106) / 1170, (1300 + 106) / 2460);
  const WIDGET = onScreen(.5, 750 / 2460);
  window.Phone3D = {
    rig, ICON, WIDGET, iconSize: 212 / 1170 * SW,
    ready: () => img.decode().then(() => { tex.needsUpdate = true; }),
    render(t) {
      canvas.style.opacity = rig.on;
      if (rig.on <= 0.001) return;
      phone.position.set(rig.px, rig.py + Math.sin(t * 1.4) * .012 * (rig.fl ?? 1), 0);
      phone.rotation.set(rig.rx, rig.ry, rig.rz);
      cam.position.set(rig.cx, rig.cy, rig.cz); cam.lookAt(rig.lx, rig.ly, rig.lz);
      R.render(scene, cam);
    },
  };
})();
