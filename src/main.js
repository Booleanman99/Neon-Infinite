const B = window.BABYLON;

// ═══════════════════ CONFIG ═══════════════════
const LW = 3.2, LN = 6, RW = LW * LN;
const CK = 80, NCK = 14, WL = CK * NCK;
const MSPD = 190, ACC = 46, BRK = 60, DRG = 8.5, STF = 4.5;
const MTRAF = 42;

// Neon palette
const NP = [
  new B.Color3(1, 0, 0.4),     // pink
  new B.Color3(0, 1, 1),       // cyan
  new B.Color3(0.73, 0.27, 1), // purple
  new B.Color3(0.13, 0.4, 1),  // blue
  new B.Color3(0, 1, 0.6),     // green
  new B.Color3(1, 0.93, 0),    // yellow
  new B.Color3(1, 0.47, 0),    // orange
  new B.Color3(1, 0.13, 0.2),  // red
  new B.Color3(1, 0, 0.73),    // magenta
];
const rn = () => NP[(Math.random() * NP.length) | 0];
const ri = (a, b) => a + Math.random() * (b - a);
const ri2 = (a, b) => (ri(a, b)) | 0;

// ═══════════════════ STATE ═══════════════════
const S = { spd: 0, px: 0, dist: 0, sc: 0, alive: true, started: false, shk: 0, str: 0, spT: 0 };
const cfg = { traffic: 0.55, weather: 'clear', tod: 'night', auto: false };
const keys = {};

// ═══════════════════ DOM ═══════════════════
const $ = id => document.getElementById(id);
const startScr = $('start-screen'), crashScr = $('crash-screen'), hud = $('hud');
const spdNum = $('spd-num'), scNum = $('sc-num'), fsEl = $('fs');
const spdFill = $('spd-fill'), autoBtn = $('abtn'), apBadge = $('ap-badge');

function mkChips(id, opts, key, cls) {
  const c = $(id); c.innerHTML = '';
  opts.forEach(o => {
    const b = document.createElement('button');
    b.className = 'chip' + (cfg[key] === o ? ' ' + cls : '');
    b.textContent = o;
    b.onclick = () => { cfg[key] = o; mkChips(id, opts, key, cls); updAuto(); };
    c.appendChild(b);
  });
}
function updAuto() {
  autoBtn.textContent = cfg.auto ? 'auto: on' : 'auto: off';
  autoBtn.classList.toggle('auto-on', cfg.auto);
  apBadge.classList.toggle('show', cfg.auto && S.alive && S.started);
}
function openSettings() {
  mkChips('wc', ['clear', 'rain', 'fog', 'storm'], 'weather', 'ac');
  mkChips('tc', ['night', 'dawn', 'sunset', 'day'], 'tod', 'ap');
  // auto chips (boolean special case)
  const ac = $('apc'); ac.innerHTML = '';
  ['off', 'on'].forEach(o => {
    const b = document.createElement('button');
    b.className = 'chip' + (cfg.auto === (o === 'on') ? ' ag' : '');
    b.textContent = o;
    b.onclick = () => { cfg.auto = o === 'on'; updAuto(); openSettings(); };
    ac.appendChild(b);
  });
  $('sov').classList.add('show');
}

$('go').onclick = startGame;
$('re').onclick = startGame;
autoBtn.onclick = () => { cfg.auto = !cfg.auto; updAuto(); };
$('hbtn').onclick = () => $('hov').classList.toggle('show');
$('sbtn').onclick = openSettings;
$('hov').onclick = e => { if (e.target === $('hov')) $('hov').classList.remove('show'); };
$('sov').onclick = e => { if (e.target === $('sov')) $('sov').classList.remove('show'); };
$('tsl').oninput = e => { cfg.traffic = +e.target.value; $('tv').textContent = Math.round(cfg.traffic * 100) + '%'; };
window.onkeydown = e => {
  keys[e.key.toLowerCase()] = true;
  if ('wasdarrowuparrowdownarrowleftarrowright '.includes(e.key.toLowerCase())) e.preventDefault();
};
window.onkeyup = e => { keys[e.key.toLowerCase()] = false; };

function startGame() {
  S.spd = 0; S.px = 0; S.dist = 0; S.sc = 0; S.alive = true; S.started = true;
  S.shk = 0; S.str = 0; S.spT = 0;
  trafficPool.forEach(t => { t.root.setEnabled(false); t.active = false; });
  startScr.classList.add('hidden');
  crashScr.classList.remove('show');
  hud.classList.add('show');
  updAuto();
}
function doCrash() {
  S.alive = false; S.shk = 1.0;
  fsEl.textContent = Math.floor(S.sc).toLocaleString();
  crashScr.classList.add('show');
  apBadge.classList.remove('show');
}

// ═══════════════════ BABYLON SETUP ═══════════════════
const canvas = $('c');
const engine = new B.Engine(canvas, true, { stencil: true });
engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio, 1.5));
const scene = new B.Scene(engine);
scene.clearColor = new B.Color4(0.016, 0.012, 0.03, 1);
scene.fogMode = B.Scene.FOGMODE_EXP2;
scene.fogDensity = 0.006;
scene.fogColor = new B.Color3(0.016, 0.012, 0.03);
scene.ambientColor = new B.Color3(0.08, 0.07, 0.12);

// Camera
const cam = new B.FreeCamera('cam', new B.Vector3(0, 4, 12), scene);
cam.minZ = 0.5; cam.maxZ = 600; cam.fov = 1.15;

// Lights
const hemi = new B.HemisphericLight('hemi', new B.Vector3(0, 1, -0.3), scene);
hemi.intensity = 0.35;
hemi.diffuse = new B.Color3(0.15, 0.13, 0.25);
hemi.groundColor = new B.Color3(0.05, 0.04, 0.1);

const dirL = new B.DirectionalLight('dir', new B.Vector3(-0.5, -1, -1), scene);
dirL.intensity = 0.2;
dirL.diffuse = new B.Color3(0.3, 0.3, 0.5);

// ═══════════════════ POST-PROCESSING ═══════════════════
const glow = new B.GlowLayer('glow', scene, { mainTextureSamples: 4, blurKernelSize: 48 });
glow.intensity = 0.9;

const pp = new B.DefaultRenderingPipeline('pp', true, scene, [cam]);
pp.bloomEnabled = true;
pp.bloomThreshold = 0.25;
pp.bloomWeight = 0.6;
pp.bloomKernel = 64;
pp.bloomScale = 0.5;
pp.chromaticAberrationEnabled = true;
pp.chromaticAberration.aberrationAmount = 15;
pp.chromaticAberration.radialIntensity = 0.8;
pp.fxaaEnabled = true;
pp.imageProcessing.toneMappingEnabled = true;
pp.imageProcessing.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
pp.imageProcessing.contrast = 1.3;
pp.imageProcessing.exposure = 1.0;
pp.imageProcessing.vignetteEnabled = true;
pp.imageProcessing.vignetteWeight = 2.5;
pp.imageProcessing.vignetteColor = new B.Color4(0.02, 0.01, 0.06, 0);

// ═══════════════════ MATERIALS ═══════════════════
function matPBR(name, color, metal, rough) {
  const m = new B.PBRMaterial(name, scene);
  m.albedoColor = new B.Color3(...color);
  m.metallic = metal; m.roughness = rough;
  m.environmentIntensity = 0.3;
  return m;
}
function matGlow(name, color, intensity) {
  const m = new B.StandardMaterial(name, scene);
  m.emissiveColor = color.clone();
  m.disableLighting = true;
  m.alpha = intensity !== undefined ? intensity : 1;
  return m;
}

const roadMat = matPBR('road', [0.06, 0.06, 0.1], 0.3, 0.5);
const roadWetMat = matPBR('roadWet', [0.07, 0.07, 0.12], 0.85, 0.05);
roadWetMat.alpha = 0.12; roadWetMat.transparencyMode = 2;
const groundMat = matPBR('ground', [0.025, 0.02, 0.06], 0.1, 0.95);

const edgeMat = matGlow('edge', new B.Color3(0, 1, 1), 0.9);
const edgeGlowMat = matGlow('edgeG', new B.Color3(0, 1, 1), 0.06);
const centerMat = matGlow('center', new B.Color3(1, 0.93, 0), 0.7);
const centerGlowMat = matGlow('centerG', new B.Color3(1, 0.93, 0), 0.04);
const dashMat = matGlow('dash', new B.Color3(0.33, 0.4, 0.47), 0.3);

// ═══════════════════ GROUND ═══════════════════
const gnd = B.MeshBuilder.CreatePlane('gnd', { width: 600, height: 4000 }, scene);
gnd.rotation.x = Math.PI / 2; gnd.position.y = -0.05; gnd.material = groundMat;

// ═══════════════════ CAR BUILDER ═══════════════════
function buildCar(isP) {
  const root = new B.TransformNode('car', scene);
  const neon = isP ? new B.Color3(0, 1, 1) : rn();
  const paintC = isP ? [0.03, 0.03, 0.06] : [[0.06, 0.06, 0.15], [0.1, 0.04, 0.15], [0.04, 0.1, 0.15], [0.09, 0.05, 0.1], [0.04, 0.1, 0.1]][ri2(0, 5)];
  const paintMat = matPBR('paint' + Math.random(), paintC, 0.88, 0.15);
  const darkMat = matPBR('dark' + Math.random(), [0.02, 0.02, 0.03], 0.9, 0.5);

  // chassis
  const ch = B.MeshBuilder.CreateBox('ch', { width: 2.05, height: 0.18, depth: 4.5 }, scene);
  ch.position.y = 0.12; ch.material = darkMat; ch.parent = root;

  // lower body
  const lb = B.MeshBuilder.CreateBox('lb', { width: 2.0, height: 0.52, depth: 4.4 }, scene);
  lb.position.y = 0.46; lb.material = paintMat; lb.parent = root;

  // upper body
  const ub = B.MeshBuilder.CreateBox('ub', { width: 1.88, height: 0.22, depth: 4.2 }, scene);
  ub.position.y = 0.83; ub.material = paintMat; ub.parent = root;

  // cabin glass
  const glassMat = matPBR('glass' + Math.random(), [0.04, 0.04, 0.12], 0.95, 0.02);
  glassMat.alpha = 0.4; glassMat.transparencyMode = 2;
  const cab = B.MeshBuilder.CreateBox('cab', { width: 1.56, height: 0.44, depth: 1.72 }, scene);
  cab.position.set(0, 1.15, 0.05); cab.material = glassMat; cab.parent = root;

  // windshields
  const wsf = B.MeshBuilder.CreatePlane('wsf', { width: 1.48, height: 0.52 }, scene);
  wsf.position.set(0, 1.12, -0.97); wsf.rotation.x = -0.52; wsf.material = glassMat; wsf.parent = root;
  const wsr = B.MeshBuilder.CreatePlane('wsr', { width: 1.48, height: 0.5 }, scene);
  wsr.position.set(0, 1.12, 0.95); wsr.rotation.x = 0.45; wsr.material = glassMat; wsr.parent = root;

  // body accent lines
  const lineMat = matGlow('ln' + Math.random(), neon, 0.5);
  [-0.62, 0.62].forEach(x => {
    const ln = B.MeshBuilder.CreateBox('ln', { width: 0.04, height: 0.04, depth: 3.8 }, scene);
    ln.position.set(x, 0.73, 0); ln.material = lineMat; ln.parent = root;
  });

  // hood scoop
  const sc = B.MeshBuilder.CreateBox('sc', { width: 0.42, height: 0.06, depth: 1.2 }, scene);
  sc.position.set(0, 0.75, -1.3); sc.material = darkMat; sc.parent = root;

  // wheels
  [[-0.98, 0.34, -1.35], [0.98, 0.34, -1.35], [-0.98, 0.34, 1.35], [0.98, 0.34, 1.35]].forEach(p => {
    const w = B.MeshBuilder.CreateCylinder('w', { diameter: 0.68, height: 0.22, tessellation: 16 }, scene);
    w.rotation.z = Math.PI / 2; w.position.set(p[0], p[1], p[2]);
    w.material = darkMat; w.parent = root;
    const rg = B.MeshBuilder.CreateTorus('rg', { diameter: 0.68, thickness: 0.04, tessellation: 20 }, scene);
    rg.rotation.z = Math.PI / 2;
    rg.position.set(p[0] > 0 ? p[0] + 0.12 : p[0] - 0.12, p[1], p[2]);
    rg.material = matGlow('rgm' + Math.random(), neon, 0.35); rg.parent = root;
  });

  // headlights
  const hlMat = matGlow('hl' + Math.random(), new B.Color3(1, 1, 1), 1);
  const drlMat = matGlow('drl' + Math.random(), neon, 1);
  [-0.7, 0.7].forEach(x => {
    const hl = B.MeshBuilder.CreateBox('hl', { width: 0.32, height: 0.1, depth: 0.05 }, scene);
    hl.position.set(x, 0.56, -2.23); hl.material = hlMat; hl.parent = root;
    const drl = B.MeshBuilder.CreateBox('drl', { width: 0.42, height: 0.035, depth: 0.04 }, scene);
    drl.position.set(x, 0.5, -2.23); drl.material = drlMat; drl.parent = root;
  });

  if (isP) {
    [-0.5, 0.5].forEach(x => {
      const sl = new B.SpotLight('sl', new B.Vector3(x, 0.6, -2.4), new B.Vector3(0, -0.1, -1), 0.8, 8, scene);
      sl.intensity = 3; sl.diffuse = new B.Color3(0.95, 0.95, 1);
      sl.range = 55; sl.parent = root;
    });
  }

  // taillights
  const tlMat = matGlow('tl' + Math.random(), new B.Color3(1, 0.1, 0.15), 1);
  [-0.65, 0.65].forEach(x => {
    const tl = B.MeshBuilder.CreateBox('tl', { width: 0.38, height: 0.09, depth: 0.05 }, scene);
    tl.position.set(x, 0.56, 2.23); tl.material = tlMat; tl.parent = root;
  });
  const tlbar = B.MeshBuilder.CreateBox('tlb', { width: 1.0, height: 0.03, depth: 0.04 }, scene);
  tlbar.position.set(0, 0.58, 2.23); tlbar.material = matGlow('tlb', new B.Color3(1, 0.1, 0.15), 0.6); tlbar.parent = root;

  // underglow
  const ugMat = matGlow('ug' + Math.random(), neon, 0.25);
  const ug = B.MeshBuilder.CreatePlane('ug', { width: 2.3, height: 4.6 }, scene);
  ug.rotation.x = Math.PI / 2; ug.position.y = 0.04; ug.material = ugMat; ug.parent = root;

  const ugl = new B.PointLight('ugl', new B.Vector3(0, 0.15, 0), scene);
  ugl.diffuse = neon.clone(); ugl.intensity = 0.5; ugl.range = 5; ugl.parent = root;

  // spoiler
  if (!isP && Math.random() > 0.5) {
    const sp = B.MeshBuilder.CreateBox('sp', { width: 1.6, height: 0.04, depth: 0.25 }, scene);
    sp.position.set(0, 1.0, 2.0); sp.material = paintMat; sp.parent = root;
    [-0.5, 0.5].forEach(x => {
      const lg = B.MeshBuilder.CreateBox('lg', { width: 0.06, height: 0.2, depth: 0.06 }, scene);
      lg.position.set(x, 0.88, 2.0); lg.material = paintMat; lg.parent = root;
    });
  }

  return root;
}

// ═══════════════════ BUILDING GENERATOR ═══════════════════
let buildingId = 0;
function genBuilding(lx, lz, mw, fh) {
  const root = new B.TransformNode('bld' + (buildingId++), scene);
  const w = mw || ri(6, 20), h = fh || ri(15, 85), d = ri(6, 13);
  const bc = [[0.04, 0.04, 0.09], [0.05, 0.04, 0.1], [0.04, 0.05, 0.1], [0.06, 0.04, 0.09], [0.04, 0.06, 0.09]][ri2(0, 5)];
  const bMat = matPBR('bm' + buildingId, bc, 0.5, 0.6);

  const main = B.MeshBuilder.CreateBox('bm', { width: w, height: h, depth: d }, scene);
  main.position.set(lx, h / 2, lz); main.material = bMat; main.parent = root;

  // upper setback
  if (h > 35 && Math.random() > 0.4) {
    const sw = w * ri(0.5, 0.8), sh = ri(10, 25);
    const u = B.MeshBuilder.CreateBox('bu', { width: sw, height: sh, depth: d * ri(0.5, 0.8) }, scene);
    u.position.set(lx, h + sh / 2, lz); u.material = bMat; u.parent = root;
  }

  // antenna
  if (Math.random() > 0.55) {
    const ah = ri(5, 15);
    const ant = B.MeshBuilder.CreateCylinder('ant', { diameter: 0.12, height: ah, tessellation: 5 }, scene);
    ant.position.set(lx, h + ah / 2, lz); ant.material = matPBR('antm', [0.1, 0.1, 0.15], 0.4, 0.5); ant.parent = root;
    const tip = B.MeshBuilder.CreateSphere('tip', { diameter: 0.3, segments: 6 }, scene);
    tip.position.set(lx, h + ah, lz); tip.material = matGlow('tipm', new B.Color3(1, 0.1, 0.15), 0.9); tip.parent = root;
  }

  // window grid
  const nc1 = rn(), nc2 = rn();
  const cols = Math.max(2, Math.floor(w / 2.5));
  const rows = Math.max(2, Math.floor(h / 3.8));
  const cw = w * 0.8 / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.3) {
        const lit = Math.random() > 0.25;
        const wc = lit ? (Math.random() > 0.5 ? nc1 : nc2) : new B.Color3(0.03, 0.03, 0.07);
        const wo = lit ? ri(0.2, 0.65) : 0.05;
        const wn = B.MeshBuilder.CreatePlane('wn', { width: cw * 0.62, height: 1.05 }, scene);
        wn.position.set(lx - w * 0.4 + (c + 0.5) * cw, 3.5 + r * 3.5, lz - d / 2 - 0.06);
        wn.material = matGlow('wnm' + buildingId + r + c, wc, wo);
        wn.parent = root;
      }
    }
  }

  // neon sign
  if (Math.random() > 0.3) {
    const sW = ri(w * 0.25, w * 0.6), sH = ri(1.2, 3.2);
    const sY = ri(h * 0.25, h * 0.8), sC = rn();
    const sx = lx + (Math.random() - 0.5) * w * 0.3;
    const sign = B.MeshBuilder.CreatePlane('sg', { width: sW, height: sH }, scene);
    sign.position.set(sx, sY, lz - d / 2 - 0.07);
    sign.material = matGlow('sgm' + buildingId, sC, ri(0.6, 1.0));
    sign.parent = root;
    // sign glow halo
    const halo = B.MeshBuilder.CreatePlane('sh', { width: sW + 1.5, height: sH + 1.0 }, scene);
    halo.position.set(sx, sY, lz - d / 2 - 0.06);
    halo.material = matGlow('shm' + buildingId, sC, 0.06);
    halo.parent = root;
    // sign point light
    if (Math.random() > 0.5) {
      const pl = new B.PointLight('spl' + buildingId, new B.Vector3(sx, sY, lz - d / 2 - 1.5), scene);
      pl.diffuse = sC.clone(); pl.intensity = 0.4; pl.range = 12; pl.parent = root;
    }
  }

  // vertical strips
  for (let i = 0, n = 1 + ri2(0, 3); i < n; i++) {
    const vh = ri(h * 0.1, h * 0.45);
    const vs = B.MeshBuilder.CreatePlane('vs', { width: ri(0.15, 0.35), height: vh }, scene);
    vs.position.set(lx + (Math.random() - 0.5) * w * 0.65, ri(4, h - vh / 2), lz - d / 2 - 0.07);
    vs.material = matGlow('vsm' + buildingId + i, Math.random() > 0.5 ? nc1 : nc2, ri(0.35, 0.75));
    vs.parent = root;
  }

  // horizontal bars
  for (let i = 0, n = 1 + ri2(0, 3); i < n; i++) {
    const hb = B.MeshBuilder.CreatePlane('hb', { width: ri(w * 0.3, w * 0.9), height: 0.12 }, scene);
    hb.position.set(lx, ri(3, h - 1), lz - d / 2 - 0.07);
    hb.material = matGlow('hbm' + buildingId + i, rn(), ri(0.25, 0.6));
    hb.parent = root;
  }

  // storefront
  const sf = B.MeshBuilder.CreatePlane('sf', { width: w * ri(0.4, 0.85), height: 2.8 }, scene);
  sf.position.set(lx, 1.6, lz - d / 2 - 0.08);
  sf.material = matGlow('sfm' + buildingId, rn(), ri(0.08, 0.2));
  sf.parent = root;

  // awning
  if (Math.random() > 0.55) {
    const awW = ri(3, w * 0.55);
    const aw = B.MeshBuilder.CreateBox('aw', { width: awW, height: 0.08, depth: 1.5 }, scene);
    aw.position.set(lx + (Math.random() - 0.5) * w * 0.3, 3.5, lz - d / 2 - 0.8);
    aw.material = matPBR('awm' + buildingId, [0.05, 0.05, 0.1], 0.4, 0.6); aw.parent = root;
    const ae = B.MeshBuilder.CreateBox('ae', { width: awW, height: 0.05, depth: 0.05 }, scene);
    ae.position.set(aw.position.x, 3.46, lz - d / 2 - 1.55);
    ae.material = matGlow('aem' + buildingId, rn(), 0.7); ae.parent = root;
  }

  return root;
}

// ═══════════════════ CITY CHUNK ═══════════════════
function genChunk() {
  const root = new B.TransformNode('chunk' + (buildingId++), scene);

  [-1, 1].forEach(side => {
    let z = 0;
    while (z < CK) {
      const bW = ri(7, 22);
      const x = (RW / 2 + ri(2, 5) + bW / 2) * side;
      const b = genBuilding(x, -z, bW);
      b.parent = root;
      if (Math.random() > 0.45) {
        const b2 = genBuilding((RW / 2 + ri(18, 35) + ri(5, 12)) * side, -z + ri(-3, 3), ri(8, 18), ri(25, 100));
        b2.parent = root;
      }
      z += bW + ri(0.5, 3);
    }
  });

  // street lights
  for (let lz = 0; lz < CK; lz += 14) {
    [-1, 1].forEach(side => {
      const x = (RW / 2 + 1.3) * side;
      const pole = B.MeshBuilder.CreateCylinder('pole', { diameter: 0.1, height: 7, tessellation: 5 }, scene);
      pole.position.set(x, 3.5, -lz); pole.material = matPBR('pm', [0.08, 0.08, 0.14], 0.4, 0.5); pole.parent = root;

      const arm = B.MeshBuilder.CreateBox('arm', { width: 1.8, height: 0.05, depth: 0.05 }, scene);
      arm.position.set(x - 0.9 * side, 7, -lz); arm.material = pole.material; arm.parent = root;

      const lc = lz % 28 === 0 ? new B.Color3(0, 1, 1) : new B.Color3(1, 0, 0.4);
      const bulb = B.MeshBuilder.CreateSphere('bulb', { diameter: 0.28, segments: 6 }, scene);
      bulb.position.set(x - 1.8 * side, 6.95, -lz);
      bulb.material = matGlow('blbm' + lz + side, lc, 1); bulb.parent = root;

      const pl = new B.PointLight('stl' + lz + side, new B.Vector3(x - 1.8 * side, 6.9, -lz), scene);
      pl.diffuse = lc.clone(); pl.intensity = 0.6; pl.range = 16; pl.parent = root;
    });
  }

  return root;
}

// ═══════════════════ ROAD CHUNK ═══════════════════
function makeRoad() {
  const root = new B.TransformNode('road' + (buildingId++), scene);

  const rd = B.MeshBuilder.CreatePlane('rd', { width: RW + 2, height: CK }, scene);
  rd.rotation.x = Math.PI / 2; rd.position.y = 0.01; rd.material = roadMat; rd.parent = root;

  const wt = B.MeshBuilder.CreatePlane('wt', { width: RW, height: CK }, scene);
  wt.rotation.x = Math.PI / 2; wt.position.y = 0.018; wt.material = roadWetMat; wt.parent = root;

  [-LN / 2, LN / 2].forEach(i => {
    const e = B.MeshBuilder.CreatePlane('e', { width: 0.16, height: CK }, scene);
    e.rotation.x = Math.PI / 2; e.position.set(i * LW, 0.025, 0); e.material = edgeMat; e.parent = root;
    const eg = B.MeshBuilder.CreatePlane('eg', { width: 0.7, height: CK }, scene);
    eg.rotation.x = Math.PI / 2; eg.position.set(i * LW, 0.022, 0); eg.material = edgeGlowMat; eg.parent = root;
  });

  [-0.12, 0.12].forEach(off => {
    const cl = B.MeshBuilder.CreatePlane('cl', { width: 0.07, height: CK }, scene);
    cl.rotation.x = Math.PI / 2; cl.position.set(off, 0.025, 0); cl.material = centerMat; cl.parent = root;
  });
  const cg = B.MeshBuilder.CreatePlane('cg', { width: 0.5, height: CK }, scene);
  cg.rotation.x = Math.PI / 2; cg.position.set(0, 0.019, 0); cg.material = centerGlowMat; cg.parent = root;

  for (let lane = -LN / 2 + 1; lane < LN / 2; lane++) {
    if (lane === 0) continue;
    for (let dz = -CK / 2; dz < CK / 2; dz += 7) {
      const d = B.MeshBuilder.CreatePlane('d', { width: 0.07, height: 3 }, scene);
      d.rotation.x = Math.PI / 2; d.position.set(lane * LW, 0.023, dz); d.material = dashMat; d.parent = root;
    }
  }

  return root;
}

// ═══════════════════ CREATE WORLD ═══════════════════
const player = buildCar(true);

const roadChunks = [];
const cityChunks = [];
for (let i = 0; i < NCK; i++) {
  const r = makeRoad(); r.position.z = -i * CK; roadChunks.push({ root: r, idx: i });
  const c = genChunk(); c.position.z = -i * CK; cityChunks.push({ root: c, idx: i });
}

const trafficPool = [];
for (let i = 0; i < MTRAF; i++) {
  const m = buildCar(false); m.setEnabled(false);
  trafficPool.push({ root: m, active: false, lane: 0, speed: 0, z: 0, x: 0, dir: 1 });
}

// ═══════════════════ RAIN PARTICLES ═══════════════════
// procedural particle texture
const pTex = new B.DynamicTexture('pTex', 16, scene, false);
const pCtx = pTex.getContext();
const grad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
grad.addColorStop(0, 'rgba(255,255,255,1)');
grad.addColorStop(1, 'rgba(255,255,255,0)');
pCtx.fillStyle = grad;
pCtx.fillRect(0, 0, 16, 16);
pTex.update();

const rainSys = new B.ParticleSystem('rain', 5000, scene);
rainSys.particleTexture = pTex;
rainSys.createBoxEmitter(
  new B.Vector3(-0.1, -1, -0.1), new B.Vector3(0.1, -1, 0.1),
  new B.Vector3(-80, 60, -150), new B.Vector3(80, 65, 50)
);
rainSys.minSize = 0.02; rainSys.maxSize = 0.05;
rainSys.minLifeTime = 0.5; rainSys.maxLifeTime = 1.2;
rainSys.emitRate = 4000;
rainSys.gravity = new B.Vector3(0, -90, 0);
rainSys.color1 = new B.Color4(0.5, 0.6, 0.8, 0.6);
rainSys.color2 = new B.Color4(0.4, 0.5, 0.7, 0.3);
rainSys.blendMode = B.ParticleSystem.BLENDMODE_ADD;
// create a tiny invisible emitter mesh
const rainEmitter = B.MeshBuilder.CreateBox('re', { size: 0.01 }, scene);
rainEmitter.isVisible = false;
rainSys.emitter = rainEmitter;
rainSys.stop();
let rainOn = false;

// ═══════════════════ TRAFFIC ═══════════════════
function spawnT() {
  let an = 0; trafficPool.forEach(t => { if (t.active) an++; });
  if (an >= Math.floor(MTRAF * cfg.traffic)) return;
  const car = trafficPool.find(t => !t.active); if (!car) return;
  const lI = ri2(0, LN) - LN / 2 + 0.5;
  car.lane = lI; car.x = lI * LW; car.dir = lI > 0 ? 1 : -1;
  car.speed = 35 + Math.random() * 40;
  car.z = player.position.z - (100 + Math.random() * 200);
  car.active = true; car.root.setEnabled(true);
  car.root.position.set(car.x, 0, car.z);
  car.root.rotation.y = car.dir > 0 ? Math.PI : 0;
}

function updTraf(dt) {
  const pz = player.position.z;
  trafficPool.forEach(car => {
    if (!car.active) return;
    const ms = S.spd * 0.27778, cs = car.speed * 0.27778;
    car.z += (car.dir > 0 ? -(ms + cs) : -(ms - cs)) * dt;
    car.root.position.z = car.z;
    car.root.position.x = car.x;
    const dz = car.z - pz;
    if (dz > 70 || dz < -350) { car.active = false; car.root.setEnabled(false); }
  });
}

function chkCol() {
  if (!S.alive) return;
  if (Math.abs(S.px) > RW / 2 - 0.8) { doCrash(); return; }
  const pz = player.position.z;
  for (let i = 0; i < trafficPool.length; i++) {
    const c = trafficPool[i];
    if (!c.active) continue;
    if (Math.abs(S.px - c.x) < 1.85 && Math.abs(pz - c.z) < 3.8) { doCrash(); return; }
  }
}

function autoD(dt) {
  let tx = 0, cD = 9999, cC = null;
  const pz = player.position.z;
  trafficPool.forEach(c => {
    if (!c.active) return;
    const dz = c.z - pz;
    if (dz < 8 && dz > -50 && Math.abs(S.px - c.x) < 5) {
      const d = Math.abs(dz); if (d < cD) { cD = d; cC = c; }
    }
  });
  if (cC) {
    const dodge = cC.x > S.px ? -1 : 1;
    tx = cC.x + dodge * LW * 1.8;
    tx = Math.max(-RW / 2 + 2, Math.min(RW / 2 - 2, tx));
  }
  const ss = Math.max(-1, Math.min(1, (tx - S.px) * 0.3));
  S.str += (ss * 0.45 - S.str) * dt * 4;
  S.px += S.str * STF * Math.min(S.spd / 60, 1) * dt * 15;
  S.spd = Math.min(S.spd + ACC * 0.7 * dt, MSPD * 0.65);
}

// ═══════════════════ ENVIRONMENT ═══════════════════
function applyEnv() {
  const isRain = cfg.weather === 'rain' || cfg.weather === 'storm';
  if (isRain && !rainOn) { rainSys.start(); rainOn = true; }
  else if (!isRain && rainOn) { rainSys.stop(); rainOn = false; }

  if (cfg.weather === 'rain') { scene.fogDensity = 0.012; rainSys.emitRate = 3000; }
  else if (cfg.weather === 'storm') { scene.fogDensity = 0.016; rainSys.emitRate = 5000; }
  else if (cfg.weather === 'fog') { scene.fogDensity = 0.025; }
  else { scene.fogDensity = 0.006; }

  if (cfg.tod === 'night') {
    hemi.intensity = 0.3; hemi.diffuse.set(0.12, 0.1, 0.22);
    dirL.intensity = 0.15; dirL.diffuse.set(0.3, 0.3, 0.5);
    pp.imageProcessing.exposure = 0.95;
    scene.clearColor.set(0.016, 0.012, 0.03, 1);
    scene.fogColor.set(0.016, 0.012, 0.03);
    glow.intensity = 0.9;
  } else if (cfg.tod === 'sunset') {
    hemi.intensity = 0.45; hemi.diffuse.set(0.35, 0.2, 0.15);
    dirL.intensity = 0.5; dirL.diffuse.set(1, 0.4, 0.2);
    pp.imageProcessing.exposure = 1.15;
    scene.clearColor.set(0.1, 0.06, 0.08, 1);
    scene.fogColor.set(0.1, 0.06, 0.08);
    glow.intensity = 0.6;
  } else if (cfg.tod === 'dawn') {
    hemi.intensity = 0.4; hemi.diffuse.set(0.2, 0.25, 0.35);
    dirL.intensity = 0.4; dirL.diffuse.set(0.4, 0.55, 0.7);
    pp.imageProcessing.exposure = 1.05;
    scene.clearColor.set(0.06, 0.08, 0.12, 1);
    scene.fogColor.set(0.06, 0.08, 0.12);
    glow.intensity = 0.7;
  } else {
    hemi.intensity = 0.6; hemi.diffuse.set(0.5, 0.5, 0.6);
    dirL.intensity = 0.6; dirL.diffuse.set(0.65, 0.65, 0.7);
    pp.imageProcessing.exposure = 1.35;
    scene.clearColor.set(0.1, 0.1, 0.17, 1);
    scene.fogColor.set(0.1, 0.1, 0.17);
    glow.intensity = 0.4;
  }
}

// ═══════════════════ GAME LOOP ═══════════════════
let prev = performance.now();

scene.registerBeforeRender(() => {
  const now = performance.now();
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;

  applyEnv();

  if (!S.started) {
    cam.position.set(0, 5, 14);
    cam.setTarget(new B.Vector3(0, 2, -30));
    return;
  }

  if (S.alive) {
    if (cfg.auto) {
      autoD(dt);
    } else {
      if (keys['w'] || keys['arrowup']) S.spd = Math.min(S.spd + ACC * dt, MSPD);
      else if (keys['s'] || keys['arrowdown']) S.spd = Math.max(S.spd - BRK * dt, -10);
      else { S.spd = S.spd > 0 ? Math.max(S.spd - DRG * dt, 0) : Math.min(S.spd + DRG * dt, 0); }
      if (keys['shift'] || keys[' ']) S.spd = Math.min(S.spd + ACC * 1.6 * dt, MSPD * 1.15);
      const si = (keys['a'] || keys['arrowleft']) ? 1 : (keys['d'] || keys['arrowright']) ? -1 : 0;
      S.str += (si * 0.5 - S.str) * dt * 5;
      S.px += S.str * STF * Math.min(S.spd / 60, 1) * dt * 15;
    }

    S.dist += S.spd * 0.27778 * dt;
    S.sc += S.spd * dt * 0.12;

    S.spT -= dt;
    if (S.spT <= 0) { spawnT(); S.spT = (0.25 + Math.random() * 0.95) / Math.max(cfg.traffic, 0.1); }

    updTraf(dt);
    chkCol();

    player.position.x = S.px;
    player.rotation.y = S.str * 0.12;

    const sv = Math.abs(Math.round(S.spd));
    spdNum.textContent = sv;
    scNum.textContent = Math.floor(S.sc).toLocaleString();
    spdFill.style.width = Math.min(sv / MSPD * 100, 100) + '%';
    spdFill.classList.toggle('hot', sv > MSPD * 0.85);
  } else {
    S.spd *= (1 - dt * 3);
    updTraf(dt);
  }

  // ── INFINITE SCROLL ──
  const cwz = -S.dist;

  roadChunks.forEach(ch => {
    let base = -ch.idx * CK;
    let cycle = Math.floor(S.dist / WL);
    let z = base + cycle * WL;
    if (z + S.dist > CK * 1.5) z -= WL;
    if (z + S.dist < -WL + CK) z += WL;
    ch.root.position.z = z;
  });

  cityChunks.forEach(ch => {
    let base = -ch.idx * CK;
    let cycle = Math.floor(S.dist / WL);
    let z = base + cycle * WL;
    let rel = z + S.dist;
    if (rel > CK * 1.5) {
      z -= WL;
      // dispose and regenerate
      ch.root.getChildren(undefined, false).forEach(child => {
        child.getChildMeshes().forEach(m => { m.material?.dispose(); m.dispose(); });
        if (child.dispose) child.dispose();
      });
      ch.root.dispose();
      const fresh = genChunk();
      ch.root = fresh;
      rel = z + S.dist;
    }
    if (rel < -WL + CK) z += WL;
    ch.root.position.z = z;
  });

  gnd.position.z = cwz - 800;

  // rain follows player
  if (rainOn) {
    rainEmitter.position.set(S.px, 40, cwz - 50);
  }

  // camera
  let sx = 0, sy = 0;
  if (S.shk > 0) {
    sx = (Math.random() - 0.5) * S.shk * 0.8;
    sy = (Math.random() - 0.5) * S.shk * 0.4;
    S.shk *= (1 - dt * 5);
  }

  const tgtX = S.px * 0.5 + sx;
  const tgtY = 3.6 + S.spd * 0.009 + sy;
  const tgtZ = cwz + 10 + Math.min(S.spd * 0.022, 3.5);
  cam.position.x += (tgtX - cam.position.x) * dt * 4.5;
  cam.position.y += (tgtY - cam.position.y) * dt * 4.5;
  cam.position.z += (tgtZ - cam.position.z) * dt * 4.5;
  cam.setTarget(new B.Vector3(S.px * 0.2, 1.2, cwz - 30 - S.spd * 0.3));

  const tgtFov = 1.15 + S.spd * 0.0015;
  cam.fov += (tgtFov - cam.fov) * dt * 3;
});

// resize
window.addEventListener('resize', () => engine.resize());

// run
engine.runRenderLoop(() => scene.render());
