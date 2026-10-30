// CrewUp X reels: shared engine.
// HDR studio (three.js r128) -> bloom -> cinematic grade (ACES, vignette, grain, lens fringing) -> FXAA,
// realistic phones with layered screen overlays, mirror floor, volumetric light, dust, beat helpers,
// DOM kinetic type and the owner's favourite ending ("Free. No excuses. No skipping." + logo build).
(function () {
  const X = window.X = {};
  const SIZE = window.X_SIZE || [1080, 1920];   // pages can ask for another size (landscape: [1920, 1080])
  const W = X.W = SIZE[0], H = X.H = SIZE[1];
  const $ = X.$ = s => document.querySelector(s);

  // ---------- beat clock (song: owner's reference, ~129 BPM) ----------
  const BT = window.BEAT.beats, EN = window.BEAT.energy;
  const P0 = BT[0], PER = BT[1] - BT[0];
  X.PER = PER;
  X.B = i => P0 + i * PER;                       // fractional beats allowed
  X.energy = t => EN[Math.min(EN.length - 1, Math.max(0, Math.round(t * 30)))] || 0;
  X.tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  const tl = X.tl, B = X.B;
  X.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  X.smooth = x => { x = X.clamp(x); return x * x * (3 - 2 * x); };
  X.lerp = (a, b, k) => a + (b - a) * k;
  let sd = 7; X.rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;

  // ---------- DOM kinetic type ----------
  let lc = 0;
  X.line = (words, top, cls = '', size) => {
    const id = 'l' + (lc++), el = document.createElement('div');
    el.className = 'line ' + cls; el.id = id; el.style.top = top + 'px'; if (size) el.style.fontSize = size + 'px';
    el.innerHTML = words.map(([w, c], i) => `<span class="w ${c || ''}" id="${id}w${i}">${w}</span>`).join(' ');
    $('#lines').appendChild(el); return id;
  };
  X.wordsIn = (id, times) => times.forEach((t, i) => tl.fromTo(`#${id}w${i}`, { opacity: 0, y: 40, filter: 'blur(14px)', scale: 1.15 }, { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1, duration: .28 }, t));
  X.out = (id, t, d = .22) => tl.to('#' + id, { opacity: 0, y: -40, filter: 'blur(12px)', duration: d, ease: 'power2.in' }, t);
  X.flash = (t, o = .45) => tl.to('#flash', { opacity: o, duration: .05, yoyo: true, repeat: 1 }, t);

  // ---------- the owner's favourite ending (keep in every CrewUp edit) ----------
  X.ending = (b0 = 40) => {
    $('#endWrap').innerHTML = `<div id="rays" class="abs"></div><div id="dot" class="abs"></div><div id="ring" class="abs"></div>
      <div class="burst abs" id="bu1"></div><div class="burst abs" id="bu2"></div>
      <div id="logoWrap" class="abs"><img src="../img/crewup-logo.png"><div id="logoShine" class="abs" style="inset:0"></div></div>
      <div id="wm" class="abs"></div><div id="cs" class="abs">Gym with your crew, not alone.</div>
      <div id="cta" class="abs"><span style="position:relative">Join the waitlist · link in bio</span><div id="ctaShine" class="abs" style="inset:0"></div></div>
      <div id="handle" class="abs">@getcrewup · coming soon</div>`;
    const h1 = X.line([['Free.']], 760, '', 104), h2 = X.line([['No'], ['excuses.']], 880, '', 104), h3 = X.line([['No'], ['skipping.', 'hl']], 1000, '', 104);
    X.wordsIn(h1, [B(b0)]); X.wordsIn(h2, [B(b0 + 1), B(b0 + 1) + .12]); X.wordsIn(h3, [B(b0 + 2), B(b0 + 2) + .12]);
    tl.to(['#' + h1, '#' + h2], { color: '#4a5266', duration: .2 }, B(b0 + 2));
    [h1, h2, h3].forEach(id => X.out(id, B(b0 + 4) - .15));
    $('#wm').innerHTML = [...'CrewUp'].map(ch => `<span>${ch}</span>`).join('');
    tl.set(['#dot', '#ring', '#logoWrap', '#cs', '#cta', '#handle', '#rays', '#bu1', '#bu2'], { autoAlpha: 0 }, 0).set('#wm span', { autoAlpha: 0 }, 0)
      .fromTo('#dot', { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: .2 }, B(b0 + 4))
      .fromTo('#ring', { autoAlpha: 0, scale: .1 }, { autoAlpha: 1, scale: 1, duration: .35 }, B(b0 + 5)).to('#dot', { autoAlpha: 0, duration: .1 }, B(b0 + 5) + .2)
      .to('#ring', { borderRadius: '80px', scale: 1.07, duration: .3, ease: 'power3.inOut' }, B(b0 + 6) - .3)
      .fromTo('#logoWrap', { autoAlpha: 0, scale: .5, rotate: -25 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: .45, ease: 'back.out(2)' }, B(b0 + 6)).to('#ring', { autoAlpha: 0, duration: .15 }, B(b0 + 6))
      .fromTo('#bu1', { autoAlpha: .9, scale: 1 }, { autoAlpha: 0, scale: 2.4, duration: .8, ease: 'power2.out' }, B(b0 + 6))
      .fromTo('#bu2', { autoAlpha: .7, scale: 1 }, { autoAlpha: 0, scale: 3.4, duration: 1.1, ease: 'power2.out' }, B(b0 + 6) + .12)
      .fromTo('#rays', { autoAlpha: 0, scale: .6 }, { autoAlpha: 1, scale: 1, duration: .8 }, B(b0 + 6))
      .fromTo('#logoShine', { x: -360 }, { x: 360, duration: .7, ease: 'power2.inOut' }, B(b0 + 6) + .35);
    X.flash(B(b0 + 6), .6);
    tl.to(['#logoWrap', '#bu1', '#bu2', '#rays'], { y: -140, scale: .8, duration: .4, ease: 'power3.inOut' }, B(b0 + 7) - .2)
      .fromTo('#wm span', { autoAlpha: 0, y: 60, rotateX: -80, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, rotateX: 0, filter: 'blur(0px)', duration: .4, stagger: .05, ease: 'back.out(1.8)' }, B(b0 + 7))
      .fromTo('#cs', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: .35 }, B(b0 + 8))
      .fromTo('#cta', { autoAlpha: 0, y: 30, scale: .9 }, { autoAlpha: 1, y: 0, scale: 1, duration: .35, ease: 'back.out(2)' }, B(b0 + 9))
      .fromTo('#ctaShine', { x: -900 }, { x: 900, duration: .8, ease: 'power2.inOut' }, B(b0 + 9) + .4)
      .fromTo('#handle', { autoAlpha: 0 }, { autoAlpha: 1, duration: .3 }, B(b0 + 10))
      .fromTo('#logoShine', { x: -360 }, { x: 360, duration: .7, ease: 'power2.inOut', immediateRender: false }, B(b0 + 11));
  };
  // DOM glow behind the ending (pulses with the music)
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  X.glowAt = [[0, '#1F6BFF']];
  X.glowColor = t => { const g = X.glowAt; let i = 0; while (i + 1 < g.length && t >= g[i + 1][0]) i++; const nx = g[i + 1]; if (!nx) return hex(g[i][1]); const k = X.clamp((t - (nx[0] - .3)) / .3); const a = hex(g[i][1]), b = hex(nx[1]); return a.map((v, j) => Math.round(v + (b[j] - v) * k)); };
  X.domGlow = t => {
    const en = X.energy(t), [r, g, b] = X.glowColor(t);
    $('#glow').style.background = `radial-gradient(circle,rgba(${r},${g},${b},${.35 + .35 * en}),rgba(${r},${g},${b},0) 62%)`;
    $('#glow').style.transform = `scale(${.92 + .14 * en}) translate(${Math.sin(t * .4) * 60}px,${Math.cos(t * .3) * 80}px)`;
    $('#glow2').style.background = `radial-gradient(circle,rgba(${b},${r},${g},.4),rgba(0,0,0,0) 65%)`;
    $('#glow2').style.transform = `translate(${Math.cos(t * .5) * 200}px,${Math.sin(t * .35) * 150}px)`;
    const rays = $('#rays'); if (rays) rays.style.rotate = (t * 18) + 'deg';
  };

  // ---------- three.js studio with an HDR post pipeline ----------
  const GradeShader = {
    uniforms: {
      tDiffuse: { value: null }, exposure: { value: 1 }, time: { value: 0 }, vignette: { value: .5 }, fringe: { value: .0025 }, grain: { value: .03 },
      knee: { value: .72 }, sat: { value: 1.05 }, contrast: { value: 1.04 }, lift: { value: new THREE.Vector3(.003, .005, .012) },
      blurDir: { value: new THREE.Vector2() }, zoom: { value: 0 }, zc: { value: new THREE.Vector2(.5, .5) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float exposure, time, vignette, fringe, grain, knee, sat, contrast, zoom; uniform vec2 blurDir, zc; uniform vec3 lift; varying vec2 vUv;
      vec3 tap(vec2 uv, vec2 o){ return vec3(texture2D(tDiffuse, uv + o).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - o).b); }
      // identity below the knee (screens keep their real colours), soft shoulder above it, very bright light burns toward white
      vec3 tone(vec3 c){
        c *= exposure;
        float m = max(c.r, max(c.g, c.b));
        c = mix(c, vec3(m), clamp((m - 1.0) * 0.1, 0.0, 0.5));
        vec3 k = vec3(knee), hi = k + (1.0 - k) * (1.0 - exp(-(c - k) / (1.0 - k)));
        return mix(c, hi, step(k, c));
      }
      vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c,vec3(1.0/2.4))-0.055, step(0.0031308,c)); }
      void main(){
        vec2 d = vUv - 0.5; vec2 o = d * fringe * dot(d, d) * 4.0;
        vec3 c;
        if (dot(blurDir, blurDir) + zoom * zoom > 1e-9) {
          c = vec3(0.0);
          for (int i = 0; i < 16; i++) { float f = float(i) / 15.0 - 0.5; c += tap(vUv + blurDir * f + (vUv - zc) * zoom * f, o); }
          c /= 16.0;
        } else c = tap(vUv, o);
        c = tone(c);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = max(mix(vec3(l), c, sat), 0.0);
        c = toSRGB(c);
        c = (c - 0.5) * contrast + 0.5 + lift;
        c *= mix(1.0, smoothstep(0.95, 0.25, length(d * vec2(1.0, 0.62))), vignette);
        c += (fract(sin(dot(gl_FragCoord.xy + time * 61.7, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * grain;
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  };
  const DofShader = {
    uniforms: { tDiffuse: { value: null }, amt: { value: 0 }, w: { value: .12 }, c: { value: new THREE.Vector2(.5, .5) }, n: { value: new THREE.Vector2(0, 0) } },
    vertexShader: GradeShader.vertexShader,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float amt, w; uniform vec2 c, n; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - c) * vec2(1.0, 1.7778);
        float dist = dot(n, n) > 0.0 ? abs(dot(p, normalize(n))) : length(p);
        float r = amt * smoothstep(w, w + 0.45, dist);
        vec3 col = texture2D(tDiffuse, vUv).rgb; float tot = 1.0;
        if (r > 0.0004) {
          for (int i = 0; i < 28; i++) { float fi = float(i); float a = fi * 2.39996; float rr = sqrt((fi + 0.5) / 28.0) * r;
            vec3 s = texture2D(tDiffuse, vUv + vec2(cos(a), sin(a) * 0.5625) * rr).rgb; float wgt = 1.0 + max(0.0, dot(s, vec3(0.3, 0.5, 0.2)) - 1.0) * 2.0; col += s * wgt; tot += wgt; }
        }
        gl_FragColor = vec4(col / tot, 1.0);
      }`,
  };
  X.dof = { amt: 0, w: .12, cx: .5, cy: .5, nx: 0, ny: 0 };
  X.three = (o = {}) => {
    const canvas = $('#gl');
    const R = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    R.setPixelRatio(1); R.setSize(W, H, false);
    R.toneMapping = THREE.NoToneMapping; R.outputEncoding = THREE.LinearEncoding;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(o.fov || 32, W / H, .03, 300);
    cam.layers.enable(1); // layer 1 = seen by the camera but not by the mirror floor (labels)
    // backdrop: a small radial glow canvas, redrawn each frame (cheap) so it can pulse with the beat
    const bg = document.createElement('canvas'); bg.width = 108; bg.height = 192;
    const bgTex = new THREE.CanvasTexture(bg); bgTex.encoding = THREE.sRGBEncoding; scene.background = bgTex;
    // stencilBuffer gives a 24-bit depth buffer (r128 render targets are 16-bit otherwise, which z-fights on thin layers)
    const rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.HalfFloatType, stencilBuffer: true });
    const comp = new THREE.EffectComposer(R, rt);
    comp.addPass(new THREE.RenderPass(scene, cam));
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), o.bloom ?? .9, o.radius ?? .55, o.threshold ?? 1.15);
    comp.addPass(bloom);
    const dof = new THREE.ShaderPass(DofShader); comp.addPass(dof);
    const grade = new THREE.ShaderPass(GradeShader); comp.addPass(grade);
    const fxaa = new THREE.ShaderPass(THREE.FXAAShader); fxaa.uniforms.resolution.value.set(1 / W, 1 / H); comp.addPass(fxaa);
    const ctx = { R, scene, cam, comp, bloom, dof, grade, bg, bgTex, glow: { color: '#1F6BFF', amt: .5, x: .5, y: .45, c2: '#7b5cff' } };
    ctx.drawBg = t => {
      const g = bg.getContext('2d'), gl = ctx.glow, en = X.energy(t);
      g.fillStyle = '#020308'; g.fillRect(0, 0, 108, 192);
      const [r, gg, b] = hex(gl.color), [r2, g2, b2] = hex(gl.c2);
      let gr = g.createRadialGradient(108 * gl.x + Math.sin(t * .4) * 8, 192 * gl.y + Math.cos(t * .3) * 10, 0, 108 * gl.x, 192 * gl.y, 120);
      gr.addColorStop(0, `rgba(${r},${gg},${b},${gl.amt * (.55 + .35 * en)})`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 108, 192);
      gr = g.createRadialGradient(54 + Math.cos(t * .5) * 30, 150 + Math.sin(t * .35) * 20, 0, 54, 150, 80);
      gr.addColorStop(0, `rgba(${r2},${g2},${b2},${gl.amt * .35})`); gr.addColorStop(1, `rgba(${r2},${g2},${b2},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 108, 192);
      bgTex.needsUpdate = true;
    };
    ctx.render = t => {
      ctx.drawBg(t); grade.uniforms.time.value = t;
      const d = X.dof, u = dof.uniforms; dof.enabled = d.amt > .0004; u.amt.value = d.amt; u.w.value = d.w; u.c.value.set(d.cx, d.cy); u.n.value.set(d.nx, d.ny);
      comp.render();
    };
    X.ctx = ctx;
    return ctx;
  };
  // studio reflections (soft boxes) for metal and glass
  X.studioEnv = (ctx, panels) => {
    const pm = new THREE.PMREMGenerator(ctx.R), env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x04060c, side: THREE.BackSide })));
    (panels || [[0xffffff, [-5, 4, 6], [6, 3], 1.2], [0xffffff, [6, 1, 4], [1.2, 9], 1.7], [0xffffff, [-7, 1, -2], [1, 9], 1.5], [0x3f7bff, [4, 0, -6], [3, 8], 2.2], [0xbfd4ff, [0, 9, 0], [12, 2], 1], [0x7b5cff, [5, -5, -4], [5, 3], .8]]).forEach(([c, p, s, k]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s[0], s[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k * 2), side: THREE.DoubleSide }));
      m.position.set(...p); m.lookAt(0, 0, 0); env.add(m);
    });
    ctx.scene.environment = pm.fromScene(env, .02).texture;
  };

  // ---------- textures ----------
  X.canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
  X.radTex = stops => X.canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  X.dotTex = X.radTex([[0, 'rgba(255,255,255,1)'], [.2, 'rgba(255,255,255,.7)'], [.5, 'rgba(255,255,255,.15)'], [1, 'rgba(255,255,255,0)']]);
  const loader = new THREE.TextureLoader();
  X.T = {};
  X.loadTex = names => Promise.all(names.map(n => new Promise((res, rej) => loader.load(`tex/${n}.png`, t => { t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; X.T[n] = t; res(t); }, undefined, () => rej(new Error('missing texture ' + n))))));

  // ---------- realistic phone ----------
  const PW = .715, PH = 1.47, PD = .078, PR = .112, SW = PW - .034, SH = PH - .034, ZF = PD / 2 + .0006;
  X.PHONE = { PW, PH, PD, SW, SH, ZF };
  const rrect = X.rrect = (w, h, r) => {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  };
  const flat = X.flat = (w, h, r, seg = 24) => {
    const g = new THREE.ShapeGeometry(rrect(w, h, r), seg), uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5);
    return g;
  };
  const bev = .014;
  const bodyGeo = new THREE.ExtrudeGeometry(rrect(PW - 2 * bev, PH - 2 * bev, PR - bev), { depth: PD - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 8, curveSegments: 32 });
  bodyGeo.translate(0, 0, -(PD - 2 * bev) / 2);
  const frontGeo = flat(PW - .01, PH - .01, PR - .005), screenGeo = flat(SW, SH, PR - .02, 32), islandGeo = flat(.19, .056, .028);
  const bumpGeo = new THREE.ExtrudeGeometry(rrect(.29, .29, .07), { depth: .012, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 4, curveSegments: 16 });
  const ringGeo = new THREE.CylinderGeometry(.052, .052, .02, 40), lensGeo = new THREE.CylinderGeometry(.04, .04, .022, 40);
  const blackMat = new THREE.MeshPhysicalMaterial({ color: 0x030304, roughness: .05, metalness: 0, clearcoat: 1, envMapIntensity: 1 });
  const glassMat = X.glassMat = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: .06, metalness: 0, envMapIntensity: .55, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const lensRing = new THREE.MeshPhysicalMaterial({ color: 0x8a92a4, metalness: 1, roughness: .2 });
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: .02, clearcoat: 1, envMapIntensity: 2 });
  // finish: frame colour + back glass colour
  X.FINISH = { blue: [0x3d4c6b, 0x27324a], natural: [0x8d8a83, 0x6e6b66], black: [0x2b2e35, 0x15171c], white: [0xd9d6cf, 0xcfccc4], orange: [0xb5643a, 0x8a4a2a] };
  X.makePhone = (opts = {}) => {
    const [fc, bc] = X.FINISH[opts.finish || 'blue'];
    const g = new THREE.Group();
    const metal = new THREE.MeshPhysicalMaterial({ color: fc, metalness: 1, roughness: .3, envMapIntensity: 1.3, clearcoat: .25, clearcoatRoughness: .25 });
    g.add(new THREE.Mesh(bodyGeo, metal));
    const front = new THREE.Mesh(frontGeo, blackMat); front.position.z = ZF; g.add(front);
    const screenMat = new THREE.MeshBasicMaterial({ map: opts.tex || null, color: 0xffffff });
    const screen = new THREE.Mesh(screenGeo, screenMat); screen.position.z = ZF + .0004; g.add(screen);
    const island = new THREE.Mesh(islandGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true })); island.position.set(0, SH / 2 - .046, ZF + .0052); island.renderOrder = 55; g.add(island);
    const glass = new THREE.Mesh(frontGeo, glassMat); glass.position.z = ZF + .006; glass.renderOrder = 60; g.add(glass);
    const back = new THREE.Mesh(frontGeo, new THREE.MeshPhysicalMaterial({ color: bc, roughness: .42, metalness: .25, envMapIntensity: .9 })); back.rotation.y = Math.PI; back.position.z = -ZF; g.add(back);
    const bump = new THREE.Mesh(bumpGeo, new THREE.MeshPhysicalMaterial({ color: bc, roughness: .22, metalness: .4, clearcoat: 1 })); bump.rotation.y = Math.PI; bump.position.set(PW / 2 - .19, PH / 2 - .19, -ZF); g.add(bump);
    [[-.06, .06], [-.06, -.06], [.065, 0]].forEach(([dx, dy]) => {
      const l = new THREE.Group(); const r1 = new THREE.Mesh(ringGeo, lensRing); r1.rotation.x = Math.PI / 2; l.add(r1); const r2 = new THREE.Mesh(lensGeo, lensGlass); r2.rotation.x = Math.PI / 2; l.add(r2);
      l.position.set(PW / 2 - .19 - dx, PH / 2 - .19 + dy, -ZF - .024); g.add(l);
    });
    const btn = (x, y, h) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.012, h, .03), metal); m.position.set(x, y, 0); g.add(m); };
    btn(-PW / 2 - .004, .36, .07); btn(-PW / 2 - .004, .22, .12); btn(-PW / 2 - .004, .07, .12); btn(PW / 2 + .004, .2, .2);
    // overlays live in screen points (390 x 820 pt screen, like the UI designs)
    const ovRoot = new THREE.Group(); ovRoot.position.z = ZF + .0012; g.add(ovRoot);
    let oz = .0006, ro = 2;
    const P = {
      g, screen, screenMat, metal, ovRoot, glass,
      show(tex) { if (screenMat.map !== tex) screenMat.map = tex; },
      pt: (x, y) => [(x / 390 - .5) * SW, (.5 - y / 820) * SH],
      // banner/card overlay: tex sized by its own aspect, centred at (x,y) pt, width w pt
      overlay(tex, x, y, w) {
        const asp = tex.image.height / tex.image.width, ww = w / 390 * SW;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, ww * asp), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
        const [px, py] = P.pt(x, y); m.position.set(px, py, (oz += .0002)); m.renderOrder = ro++; ovRoot.add(m); m.userData.base = [px, py]; return m;
      },
      // black glass over the screen (screen off / wake)
      dim: (() => { const m = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false })); m.position.z = .0002; m.renderOrder = 1; ovRoot.add(m); return m; })(),
      // touch ripple
      tap: (() => { const m = new THREE.Mesh(new THREE.RingGeometry(.035, .05, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.position.z = .0042; m.renderOrder = 50; ovRoot.add(m); return m; })(),
      local: (x, y) => { const [px, py] = P.pt(x, y); return new THREE.Vector3(px, py, ZF + .002); },
      world: (x, y) => g.localToWorld(P.local(x, y)),
    };
    return P;
  };

  // ---------- light + atmosphere ----------
  // volumetric cone of light, narrow end at the top
  X.cone = (color, height, rTop, rBottom, intensity = 1) => {
    const geo = new THREE.CylinderGeometry(rTop, rBottom, height, 64, 1, true);
    const mat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, k: { value: intensity } },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 color; uniform float k; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN,vV)),1.6); float h = pow(vUv.y,1.3)*0.8+0.2*smoothstep(0.0,0.15,vUv.y); gl_FragColor = vec4(color*k*f*h*0.55, 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat); m.position.y = height / 2; return m;
  };
  // soft pool of light on the floor
  X.pool = (color, size, intensity = 1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: X.radTex([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]), color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.y = .003; return m;
  };
  // glowing ring on the floor (bloom picks it up)
  X.floorRing = (r, color, intensity = 3) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r * .94, r, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.y = .004; return m;
  };
  // glowing rounded-rect outline on the floor (status light around a phone)
  X.floorRect = (w, h, r, th, color = 0xffffff, intensity = 1) => {
    const sh = rrect(w, h, r); sh.holes.push(rrect(w - 2 * th, h - 2 * th, Math.max(.002, r - th)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.y = .004; return m;
  };
  X.noReflect = o => { o.traverse(c => c.layers.set(1)); return o; };
  // stable pseudo random for particles (same every frame)
  X.hash = i => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
  X.glowSprite = (color, size, intensity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: X.dotTex, color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); return s; };
  // drifting dust in the light
  X.dust = (n, box, color = 0xbcd2ff, size = .012, intensity = 1.4) => {
    const pos = new Float32Array(n * 3), seed = [];
    for (let i = 0; i < n; i++) seed.push([(X.rnd() - .5) * box[0], X.rnd() * box[1], (X.rnd() - .5) * box[2], X.rnd()]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: X.dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(color).multiplyScalar(intensity), sizeAttenuation: true }));
    pts.userData.update = t => { for (let i = 0; i < n; i++) { const [x, y, z, k] = seed[i]; pos[i * 3] = x + .15 * Math.sin(t * .3 + k * 20); pos[i * 3 + 1] = ((y + t * (.03 + .05 * k)) % box[1]); pos[i * 3 + 2] = z + .15 * Math.cos(t * .25 + k * 13); } geo.attributes.position.needsUpdate = true; };
    return pts;
  };
  // glossy mirror floor
  X.mirrorFloor = (ctx, size = 40, tint = 0x34373f) => {
    const f = new THREE.Reflector(new THREE.PlaneGeometry(size, size), { clipBias: .003, textureWidth: W * .5, textureHeight: H * .5, color: tint });
    f.rotation.x = -Math.PI / 2; ctx.scene.add(f); return f;
  };

  // dark radial fade over the far floor so the mirror melts into the night
  X.floorFade = (ctx, r0 = 3, r1 = 12) => {
    const t = X.radTex([[0, 'rgba(2,3,8,0)'], [r0 / r1, 'rgba(2,3,8,0)'], [1, 'rgba(2,3,8,1)']]);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r1 * 2, r1 * 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = .002; m.renderOrder = -1; ctx.scene.add(m);
    const out = new THREE.Mesh(new THREE.RingGeometry(r1 * .99, 200, 64), new THREE.MeshBasicMaterial({ color: 0x020308 }));
    out.rotation.x = -Math.PI / 2; out.position.y = .002; ctx.scene.add(out);
    return m;
  };
  // key + rim lights so metal and glass get real highlights
  X.lights = ctx => {
    const key = new THREE.DirectionalLight(0xffffff, .25); key.position.set(-3, 5, 5); ctx.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7aa6ff, .35); rim.position.set(4, 3, -5); ctx.scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0xffffff, .2); rim2.position.set(-5, 1, -3); ctx.scene.add(rim2);
    ctx.scene.add(new THREE.AmbientLight(0x1a2a55, .35));
    return { key, rim, rim2 };
  };
  // soft additive glow points with their own size + colour (sparks, trails, confetti glints)
  const gpMats = [];
  X.glowPoints = n => {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('tint', new THREE.BufferAttribute(col, 3)); geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 1000 } },
      vertexShader: 'attribute float size; attribute vec3 tint; varying vec3 vT; uniform float scale; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = min(800.0, size*scale/max(0.01,-mv.z)); gl_Position = projectionMatrix*mv; vT = tint * smoothstep(0.12, 0.55, -mv.z); }',
      fragmentShader: 'varying vec3 vT; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c) * 2.0; float a = exp(-d * d * 5.0) * (1.0 - smoothstep(0.85, 1.0, d)); gl_FragColor = vec4(vT * a, 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    gpMats.push(mat);
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 70;
    return { pts, pos, col, size, n, set(i, x, y, z, s, r, g, b) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; size[i] = s; col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b; }, commit() { for (const k of ['position', 'tint', 'size']) geo.attributes[k].needsUpdate = true; } };
  };
  // pick the last entry whose time has passed: [[t, value], ...]
  X.sched = list => t => { let v = list[0][1]; for (const [ti, vi] of list) if (t >= ti) v = vi; return v; };

  // ---------- camera rig (GSAP tweens it) + real camera motion blur ----------
  X.rig = { px: 0, py: 1.2, pz: 6, tx: 0, ty: .8, tz: 0, fov: 40, roll: 0, shake: 0, chase: 0 };
  X.camFn = null;          // optional t => {p:[x,y,z], q:[x,y,z], fov, roll}; blended in by rig.chase
  X.mb = 1;                // motion blur strength (1 = 180 degree shutter)
  X.fx = { bx: 0, by: 0 }; // extra hand-made blur (whips)
  const camState = t => {
    const r = X.rig, p = new THREE.Vector3(r.px, r.py, r.pz), q = new THREE.Vector3(r.tx, r.ty, r.tz);
    let fov = r.fov, roll = r.roll;
    if (X.camFn && r.chase > 0) { const o = X.camFn(t), k = r.chase; p.lerp(new THREE.Vector3(...o.p), k); q.lerp(new THREE.Vector3(...o.q), k); fov = X.lerp(fov, o.fov ?? fov, k); roll = X.lerp(roll, o.roll ?? roll, k); }
    if (r.shake > 0) { const s = r.shake; p.x += s * (.6 * Math.sin(t * 37) + .4 * Math.sin(t * 71)) * .02; p.y += s * (.6 * Math.sin(t * 43 + 1) + .4 * Math.sin(t * 89)) * .02; q.x += s * Math.sin(t * 53 + 2) * .012; }
    return { p, q, fov, roll };
  };
  const setCam = (c, st) => { c.position.copy(st.p); c.up.set(0, 1, 0); c.lookAt(st.q); if (st.roll) c.rotateZ(st.roll); if (c.fov !== st.fov) { c.fov = st.fov; c.updateProjectionMatrix(); } c.updateMatrixWorld(); };
  const prevCam = new THREE.PerspectiveCamera(40, W / H, .01, 300);

  // ---------- render loop glue ----------
  X.updaters = [];
  X.onFrame = fn => X.updaters.push(fn);
  X.start = async (preload = Promise.resolve()) => {
    await document.fonts.ready; await preload;
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    window.DUR = X.DUR;
    const sh = 1 / 60;
    window.renderAt = async t => {
      const ctx = X.ctx;
      let prev = null;
      if (ctx && X.mb > 0 && t > sh) { tl.seek(t - sh, false); prev = camState(t - sh); }
      tl.seek(t + 1e-4, false);  // a hair past t so sets placed at 0 also apply on the very first frame
      X.domGlow(t);
      if (ctx) {
        const cur = camState(t); setCam(ctx.cam, cur);
        const bd = ctx.grade.uniforms.blurDir.value.set(X.fx.bx, X.fx.by);
        if (prev) {
          setCam(prevCam, prev);
          const f = new THREE.Vector3(); ctx.cam.getWorldDirection(f);
          const P = cur.p.clone().addScaledVector(f, 3), a = P.clone().project(prevCam), b = P.clone().project(ctx.cam);
          const dx = (b.x - a.x) * .5 * X.mb, dy = (b.y - a.y) * .5 * X.mb, L = Math.hypot(dx, dy), k = L > .06 ? .06 / L : 1;
          if (L > .0015) bd.x += dx * k, bd.y += dy * k;
        }
        const sc = H / 2 / Math.tan(THREE.MathUtils.degToRad(ctx.cam.fov / 2));
        gpMats.forEach(m => m.uniforms.scale.value = sc);
      }
      for (const f of X.updaters) f(t);
      if (ctx) ctx.render(t);
    };
    await window.renderAt(0); window.ready = true;
    if (!/record/.test(location.search)) { const s = performance.now(); (function loop() { window.renderAt(((performance.now() - s) / 1000) % X.DUR); requestAnimationFrame(loop); })(); }
  };
})();
