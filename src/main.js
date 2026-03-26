import * as THREE from 'three';

// ═══════════════════════ CONFIG ═══════════════════════
const LANE_W = 3.2;
const LANES = 6;
const ROAD_W = LANE_W * LANES;
const CHUNK = 80;
const NCHUNKS = 14;
const WLEN = CHUNK * NCHUNKS;
const MSPD = 185;
const ACC = 44;
const BRK = 58;
const DRG = 8;
const STR = 4.5;
const MTRAF = 44;
const RC = 4500; // rain particle count

const NC = {
  pk: 0xff0066, cy: 0x00ffff, pu: 0xbb44ff, bl: 0x2266ff,
  gn: 0x00ff99, yl: 0xffee00, or: 0xff7700, rd: 0xff2233,
  mg: 0xff00bb, tl: 0x00ddaa
};
const NCS = Object.values(NC);
const rn = () => NCS[(Math.random() * NCS.length) | 0];
const ri = (a, b) => a + Math.random() * (b - a);

// ═══════════════════════ HELPERS ═══════════════════════
function mat(c) {
  return new THREE.MeshStandardMaterial({ color: c, metalness: 0.85, roughness: 0.2 });
}
function glow(c, o) {
  return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o !== undefined ? o : 0.85 });
}
function addAt(parent, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// ═══════════════════════ CAR BUILDER ═══════════════════════
function buildCar(isPlayer) {
  const g = new THREE.Group();
  const neon = isPlayer ? NC.cy : rn();
  const paint = isPlayer ? 0x08080f : [0x10102a, 0x1a0a28, 0x0a1a28, 0x18101a, 0x0a1818][(Math.random() * 5) | 0];

  // chassis layers
  addAt(g, new THREE.BoxGeometry(2.05, 0.18, 4.5), mat(0x050508), 0, 0.12, 0);
  addAt(g, new THREE.BoxGeometry(2.0, 0.5, 4.4), mat(paint), 0, 0.45, 0);
  addAt(g, new THREE.BoxGeometry(1.88, 0.22, 4.2), mat(paint), 0, 0.82, 0);

  // cabin
  const cabMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a20, metalness: 0.7, roughness: 0.05, transparent: true, opacity: 0.45
  });
  addAt(g, new THREE.BoxGeometry(1.58, 0.42, 1.7), cabMat, 0, 1.14, -0.05);

  // windshields
  const wsMat = new THREE.MeshStandardMaterial({
    color: 0x1122aa, metalness: 0.9, roughness: 0.02,
    transparent: true, opacity: 0.35, side: THREE.DoubleSide
  });
  const wf = addAt(g, new THREE.PlaneGeometry(1.5, 0.5), wsMat, 0, 1.12, -0.95);
  wf.rotation.x = 0.5;
  const wr = addAt(g, new THREE.PlaneGeometry(1.5, 0.5), wsMat.clone(), 0, 1.12, 0.8);
  wr.rotation.x = -0.45;

  // body lines
  [-0.6, 0.6].forEach(x => {
    addAt(g, new THREE.BoxGeometry(0.04, 0.04, 3.8), glow(neon, 0.35), x, 0.72, 0);
  });

  // hood scoop
  addAt(g, new THREE.BoxGeometry(0.4, 0.06, 1.2), mat(0x111118), 0, 0.74, -1.4);

  // wheels
  const wGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12);
  const wMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.5, roughness: 0.7 });
  const tGeo = new THREE.TorusGeometry(0.34, 0.02, 6, 16);
  [[-0.98, 0.34, -1.35], [0.98, 0.34, -1.35], [-0.98, 0.34, 1.35], [0.98, 0.34, 1.35]].forEach(p => {
    const w = addAt(g, wGeo, wMat, p[0], p[1], p[2]);
    w.rotation.z = Math.PI / 2;
    const t = addAt(g, tGeo, glow(neon, 0.22), p[0] > 0 ? p[0] + 0.12 : p[0] - 0.12, p[1], p[2]);
    t.rotation.y = Math.PI / 2;
  });

  // headlights + DRL
  [-0.7, 0.7].forEach(x => {
    addAt(g, new THREE.BoxGeometry(0.32, 0.1, 0.05), glow(0xffffff), x, 0.55, -2.23);
    addAt(g, new THREE.BoxGeometry(0.4, 0.03, 0.04), glow(neon, 0.9), x, 0.5, -2.23);
  });

  // player spotlights
  if (isPlayer) {
    [-0.5, 0.5].forEach(x => {
      const sl = new THREE.SpotLight(0xeeeeff, 3, 55, 0.5, 0.6);
      sl.position.set(x, 0.6, -2.3);
      sl.target.position.set(x, 0, -20);
      g.add(sl);
      g.add(sl.target);
    });
  }

  // taillights
  [-0.65, 0.65].forEach(x => {
    addAt(g, new THREE.BoxGeometry(0.38, 0.08, 0.05), glow(NC.rd), x, 0.55, 2.23);
    addAt(g, new THREE.BoxGeometry(0.38, 0.03, 0.04), glow(NC.rd, 0.4), x, 0.62, 2.23);
  });
  addAt(g, new THREE.BoxGeometry(1.0, 0.025, 0.04), glow(NC.rd, 0.5), 0, 0.58, 2.23);

  // underglow
  const ugp = addAt(g, new THREE.PlaneGeometry(2.2, 4.6), glow(neon, 0.18), 0, 0.04, 0);
  ugp.rotation.x = -Math.PI / 2;
  const ugl = new THREE.PointLight(neon, 0.5, 5);
  ugl.position.set(0, 0.2, 0);
  g.add(ugl);

  // spoiler (random on traffic)
  if (!isPlayer && Math.random() > 0.5) {
    addAt(g, new THREE.BoxGeometry(1.6, 0.04, 0.25), mat(paint), 0, 1.0, 2.0);
    [-0.5, 0.5].forEach(x => addAt(g, new THREE.BoxGeometry(0.06, 0.2, 0.06), mat(paint), x, 0.88, 2.0));
  }

  return g;
}

// ═══════════════════════ BUILDING GENERATOR ═══════════════════════
function genBuilding(lx, lz, mw, fh) {
  const g = new THREE.Group();
  const w = mw || ri(6, 20);
  const h = fh || ri(15, 85);
  const d = ri(6, 13);
  const bc = [0x0b0b18, 0x0d0a1a, 0x0a0d1a, 0x0f0b18, 0x0b0f18][(Math.random() * 5) | 0];

  // main block
  addAt(g, new THREE.BoxGeometry(w, h, d), mat(bc), lx, h / 2, lz);

  // setback upper
  if (h > 35 && Math.random() > 0.4) {
    const sw = w * ri(0.5, 0.8), sh = ri(10, 25);
    addAt(g, new THREE.BoxGeometry(sw, sh, d * ri(0.5, 0.8)), mat(bc), lx, h + sh / 2, lz);
  }

  // antenna
  if (Math.random() > 0.55) {
    const ah = ri(5, 15);
    addAt(g, new THREE.CylinderGeometry(0.06, 0.06, ah, 5), mat(0x222233), lx, h + ah / 2, lz);
    addAt(g, new THREE.SphereGeometry(0.16, 5, 5), glow(NC.rd, 0.8), lx, h + ah, lz);
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
        const wc = lit ? (Math.random() > 0.5 ? nc1 : nc2) : 0x080818;
        const wo = lit ? ri(0.15, 0.55) : 0.04;
        addAt(g, new THREE.PlaneGeometry(cw * 0.65, 1.1), glow(wc, wo),
          lx - w * 0.4 + (c + 0.5) * cw, 3.5 + r * 3.5, lz - d / 2 - 0.06);
      }
    }
  }

  // large neon sign
  if (Math.random() > 0.3) {
    const sW = ri(w * 0.25, w * 0.65), sH = ri(1.2, 3.5);
    const sY = ri(h * 0.25, h * 0.85), sC = rn();
    const sx = lx + (Math.random() - 0.5) * w * 0.3;
    addAt(g, new THREE.PlaneGeometry(sW, sH), glow(sC, ri(0.5, 0.9)), sx, sY, lz - d / 2 - 0.07);
    addAt(g, new THREE.PlaneGeometry(sW + 1.5, sH + 1.0), glow(sC, 0.04), sx, sY, lz - d / 2 - 0.06);
    if (Math.random() > 0.5) {
      const pl = new THREE.PointLight(sC, 0.35, 10);
      pl.position.set(sx, sY, lz - d / 2 - 1);
      g.add(pl);
    }
  }

  // secondary billboard
  if (Math.random() > 0.5) {
    const bW = ri(w * 0.3, w * 0.5), bH = ri(2, 5);
    addAt(g, new THREE.PlaneGeometry(bW, bH), glow(rn(), ri(0.3, 0.7)),
      lx + (Math.random() - 0.5) * w * 0.4, ri(5, h * 0.5), lz - d / 2 - 0.08);
  }

  // vertical neon strips
  for (let i = 0, n = 1 + ((Math.random() * 3) | 0); i < n; i++) {
    const vh = ri(h * 0.1, h * 0.5);
    addAt(g, new THREE.PlaneGeometry(ri(0.15, 0.35), vh), glow(Math.random() > 0.5 ? nc1 : nc2, ri(0.3, 0.7)),
      lx + (Math.random() - 0.5) * w * 0.7, ri(4, h - vh / 2), lz - d / 2 - 0.07);
  }

  // horizontal accent bars
  for (let i = 0, n = 1 + ((Math.random() * 3) | 0); i < n; i++) {
    addAt(g, new THREE.PlaneGeometry(ri(w * 0.3, w * 0.95), 0.12), glow(rn(), ri(0.2, 0.55)),
      lx, ri(3, h - 1), lz - d / 2 - 0.07);
  }

  // storefront glow
  addAt(g, new THREE.PlaneGeometry(w * ri(0.4, 0.9), 2.8), glow(rn(), ri(0.06, 0.18)),
    lx, 1.6, lz - d / 2 - 0.08);

  // awning
  if (Math.random() > 0.55) {
    const awW = ri(3, w * 0.6);
    const awX = lx + (Math.random() - 0.5) * w * 0.3;
    addAt(g, new THREE.BoxGeometry(awW, 0.08, 1.5), mat(0x111122), awX, 3.5, lz - d / 2 - 0.8);
    addAt(g, new THREE.BoxGeometry(awW, 0.05, 0.05), glow(rn(), 0.6), awX, 3.46, lz - d / 2 - 1.55);
  }

  return g;
}

// ═══════════════════════ CITY CHUNK ═══════════════════════
function genChunk() {
  const grp = new THREE.Group();

  // buildings both sides
  [-1, 1].forEach(side => {
    let z = 0;
    while (z < CHUNK) {
      const bW = ri(7, 22);
      const x = (ROAD_W / 2 + ri(2, 5) + bW / 2) * side;
      grp.add(genBuilding(x, -z, bW));
      // back-row building for depth
      if (Math.random() > 0.45) {
        grp.add(genBuilding(
          (ROAD_W / 2 + ri(18, 35) + ri(5, 12)) * side,
          -z + ri(-3, 3), ri(8, 18), ri(25, 100)
        ));
      }
      z += bW + ri(0.5, 3);
    }
  });

  // street lights
  for (let lz = 0; lz < CHUNK; lz += 12) {
    [-1, 1].forEach(side => {
      const x = (ROAD_W / 2 + 1.3) * side;
      addAt(grp, new THREE.CylinderGeometry(0.05, 0.05, 7, 5), mat(0x1a1a2a), x, 3.5, -lz);
      addAt(grp, new THREE.BoxGeometry(1.8, 0.05, 0.05), mat(0x1a1a2a), x - 0.9 * side, 7, -lz);
      const lc = lz % 24 === 0 ? NC.cy : NC.pk;
      addAt(grp, new THREE.SphereGeometry(0.14, 6, 6), glow(lc), x - 1.8 * side, 6.95, -lz);
      const pl = new THREE.PointLight(lc, 0.5, 14);
      pl.position.set(x - 1.8 * side, 6.9, -lz);
      grp.add(pl);
    });
  }

  return grp;
}

// ═══════════════════════ ROAD CHUNK ═══════════════════════
function makeRoad() {
  const sg = new THREE.Group();

  // asphalt
  const rd = addAt(sg, new THREE.PlaneGeometry(ROAD_W + 2, CHUNK),
    new THREE.MeshStandardMaterial({ color: 0x0e0e1a, roughness: 0.6, metalness: 0.15 }), 0, 0.01, 0);
  rd.rotation.x = -Math.PI / 2;

  // wet reflection
  const wt = addAt(sg, new THREE.PlaneGeometry(ROAD_W, CHUNK),
    new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.08, metalness: 0.85, transparent: true, opacity: 0.07 }), 0, 0.015, 0);
  wt.rotation.x = -Math.PI / 2;

  // edge lines
  [-LANES / 2, LANES / 2].forEach(i => {
    const e = addAt(sg, new THREE.PlaneGeometry(0.16, CHUNK), glow(NC.cy, 0.85), i * LANE_W, 0.025, 0);
    e.rotation.x = -Math.PI / 2;
    const eg = addAt(sg, new THREE.PlaneGeometry(0.7, CHUNK), glow(NC.cy, 0.05), i * LANE_W, 0.02, 0);
    eg.rotation.x = -Math.PI / 2;
  });

  // double yellow center
  [-0.12, 0.12].forEach(off => {
    const cl = addAt(sg, new THREE.PlaneGeometry(0.07, CHUNK), glow(NC.yl, 0.65), off, 0.025, 0);
    cl.rotation.x = -Math.PI / 2;
  });
  const cg = addAt(sg, new THREE.PlaneGeometry(0.5, CHUNK), glow(NC.yl, 0.03), 0, 0.018, 0);
  cg.rotation.x = -Math.PI / 2;

  // lane dashes
  for (let lane = -LANES / 2 + 1; lane < LANES / 2; lane++) {
    if (lane === 0) continue;
    for (let dz = -CHUNK / 2; dz < CHUNK / 2; dz += 7) {
      const dash = addAt(sg, new THREE.PlaneGeometry(0.07, 3), glow(0x556677, 0.3), lane * LANE_W, 0.022, dz);
      dash.rotation.x = -Math.PI / 2;
    }
  }

  return sg;
}

// ═══════════════════════ GAME STATE ═══════════════════════
const state = {
  spd: 0, px: 0, dist: 0, sc: 0,
  alive: true, started: false,
  shk: 0, str: 0, spawnT: 0,
};

const settings = {
  traffic: 0.55,
  weather: 'clear',
  tod: 'night',
  auto: false,
};

const keys = {};

// ═══════════════════════ DOM REFS ═══════════════════════
const $ = id => document.getElementById(id);
const startScreen = $('start-screen');
const crashScreen = $('crash-screen');
const hud = $('hud');
const speedVal = $('speed-val');
const scoreVal = $('score-val');
const finalScore = $('final-score');
const speedBarFill = $('speed-bar-fill');
const autoBtn = $('auto-btn');
const autoBadge = $('autopilot-badge');
const helpOverlay = $('help-overlay');
const settingsOverlay = $('settings-overlay');
const trafficSlider = $('traffic-slider');
const trafficVal = $('traffic-val');

// chip builders
function buildChips(containerId, options, settingKey, colorClass) {
  const container = $(containerId);
  container.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (settings[settingKey] === opt ? (' ' + colorClass) : '');
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      settings[settingKey] = opt;
      buildChips(containerId, options, settingKey, colorClass);
    });
    container.appendChild(btn);
  });
}

buildChips('weather-chips', ['clear', 'rain', 'fog', 'storm'], 'weather', 'active-cyan');
buildChips('tod-chips', ['night', 'dawn', 'sunset', 'day'], 'tod', 'active-pink');
buildChips('auto-chips', ['off', 'on'], 'auto', 'active-green');
// fix auto chips to use boolean
$('auto-chips').addEventListener('click', e => {
  if (e.target.classList.contains('chip')) {
    settings.auto = e.target.textContent === 'on';
    updateAutoUI();
    buildChips('auto-chips', ['off', 'on'], 'auto', 'active-green');
    // fix: settings.auto is boolean but chip checks string
  }
});

function updateAutoUI() {
  autoBtn.textContent = settings.auto ? 'auto: on' : 'auto: off';
  autoBtn.classList.toggle('on', settings.auto);
  autoBadge.classList.toggle('show', settings.auto && state.alive);
}

// events
$('start-btn').addEventListener('click', startGame);
$('retry-btn').addEventListener('click', startGame);
autoBtn.addEventListener('click', () => {
  settings.auto = !settings.auto;
  updateAutoUI();
  // rebuild auto chips
  const autoChips = $('auto-chips');
  autoChips.querySelectorAll('.chip').forEach(c => {
    c.classList.remove('active-green');
    if ((c.textContent === 'on') === settings.auto) c.classList.add('active-green');
  });
});
$('help-btn').addEventListener('click', () => helpOverlay.classList.toggle('show'));
$('settings-btn').addEventListener('click', () => {
  settingsOverlay.classList.toggle('show');
  buildChips('weather-chips', ['clear', 'rain', 'fog', 'storm'], 'weather', 'active-cyan');
  buildChips('tod-chips', ['night', 'dawn', 'sunset', 'day'], 'tod', 'active-pink');
  // handle auto chips manually since it's boolean
  const autoChips = $('auto-chips');
  autoChips.innerHTML = '';
  ['off', 'on'].forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'chip' + ((settings.auto === (opt === 'on')) ? ' active-green' : '');
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      settings.auto = opt === 'on';
      updateAutoUI();
      // refresh
      $('settings-btn').click();
    });
    autoChips.appendChild(btn);
  });
});
helpOverlay.addEventListener('click', e => { if (e.target === helpOverlay) helpOverlay.classList.remove('show'); });
settingsOverlay.addEventListener('click', e => { if (e.target === settingsOverlay) settingsOverlay.classList.remove('show'); });

trafficSlider.addEventListener('input', e => {
  settings.traffic = parseFloat(e.target.value);
  trafficVal.textContent = Math.round(settings.traffic * 100) + '%';
});

window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// ═══════════════════════ THREE.JS SETUP ═══════════════════════
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040410);
scene.fog = new THREE.FogExp2(0x040410, 0.006);

const camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.5, 600);

const amb = new THREE.AmbientLight(0x222244, 0.35);
scene.add(amb);
const dirLight = new THREE.DirectionalLight(0x6666aa, 0.25);
dirLight.position.set(20, 50, -30);
scene.add(dirLight);

// ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 4000),
  new THREE.MeshStandardMaterial({ color: 0x060610, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
scene.add(ground);

// road chunks
const roads = [];
for (let i = 0; i < NCHUNKS; i++) {
  const road = makeRoad();
  road.position.z = -i * CHUNK;
  scene.add(road);
  roads.push({ mesh: road, idx: i });
}

// city chunks
const cities = [];
for (let i = 0; i < NCHUNKS; i++) {
  const city = genChunk();
  city.position.z = -i * CHUNK;
  scene.add(city);
  cities.push({ mesh: city, idx: i });
}

// player car
const pcar = buildCar(true);
scene.add(pcar);

// traffic pool
const traffic = [];
for (let i = 0; i < MTRAF; i++) {
  const m = buildCar(false);
  m.visible = false;
  scene.add(m);
  traffic.push({ mesh: m, active: false, lane: 0, speed: 0, z: 0, x: 0, dir: 1 });
}

// rain
const rainGeo = new THREE.BufferGeometry();
const rainArr = new Float32Array(RC * 3);
for (let i = 0; i < RC; i++) {
  rainArr[i * 3] = (Math.random() - 0.5) * 160;
  rainArr[i * 3 + 1] = Math.random() * 70;
  rainArr[i * 3 + 2] = (Math.random() - 0.5) * 300;
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainArr, 3));
const rainMat = new THREE.PointsMaterial({ color: 0x8899cc, size: 0.06, transparent: true, opacity: 0.5 });
const rain = new THREE.Points(rainGeo, rainMat);
rain.visible = false;
scene.add(rain);

// resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ═══════════════════════ GAME FUNCTIONS ═══════════════════════
function startGame() {
  state.spd = 0; state.px = 0; state.dist = 0; state.sc = 0;
  state.alive = true; state.started = true;
  state.shk = 0; state.str = 0; state.spawnT = 0;
  traffic.forEach(t => { t.mesh.visible = false; t.active = false; });
  startScreen.classList.add('hidden');
  crashScreen.classList.remove('show');
  hud.classList.add('show');
  updateAutoUI();
}

function doCrash() {
  state.alive = false;
  state.shk = 1.2;
  finalScore.textContent = Math.floor(state.sc).toLocaleString();
  crashScreen.classList.add('show');
  autoBadge.classList.remove('show');
}

function spawnTraffic() {
  let actN = 0;
  traffic.forEach(t => { if (t.active) actN++; });
  if (actN >= Math.floor(MTRAF * settings.traffic)) return;
  const car = traffic.find(t => !t.active);
  if (!car) return;
  const lI = ((Math.random() * LANES) | 0) - LANES / 2 + 0.5;
  car.lane = lI;
  car.x = lI * LANE_W;
  car.dir = lI > 0 ? 1 : -1;
  car.speed = 35 + Math.random() * 40;
  car.z = pcar.position.z - (100 + Math.random() * 200);
  car.active = true;
  car.mesh.visible = true;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.dir > 0 ? Math.PI : 0;
}

function updateTraffic(dt) {
  const pz = pcar.position.z;
  traffic.forEach(car => {
    if (!car.active) return;
    const ms = state.spd * 0.27778;
    const cs = car.speed * 0.27778;
    car.z += (car.dir > 0 ? -(ms + cs) : -(ms - cs)) * dt;
    car.mesh.position.z = car.z;
    car.mesh.position.x = car.x;
    const dz = car.z - pz;
    if (dz > 70 || dz < -350) { car.active = false; car.mesh.visible = false; }
  });
}

function checkCollisions() {
  if (!state.alive) return;
  if (Math.abs(state.px) > ROAD_W / 2 - 0.8) { doCrash(); return; }
  const pz = pcar.position.z;
  for (let i = 0; i < traffic.length; i++) {
    const car = traffic[i];
    if (!car.active) continue;
    if (Math.abs(state.px - car.x) < 1.85 && Math.abs(pz - car.z) < 3.8) { doCrash(); return; }
  }
}

function autoDrive(dt) {
  let tx = 0, cD = 9999, cC = null;
  const pz = pcar.position.z;
  traffic.forEach(car => {
    if (!car.active) return;
    const dz = car.z - pz;
    if (dz < 8 && dz > -50 && Math.abs(state.px - car.x) < 5) {
      const d = Math.abs(dz);
      if (d < cD) { cD = d; cC = car; }
    }
  });
  if (cC) {
    const dodge = cC.x > state.px ? -1 : 1;
    tx = cC.x + dodge * LANE_W * 1.8;
    tx = Math.max(-ROAD_W / 2 + 2, Math.min(ROAD_W / 2 - 2, tx));
  }
  const ss = Math.max(-1, Math.min(1, (tx - state.px) * 0.3));
  state.str += (ss * 0.45 - state.str) * dt * 4;
  state.px += state.str * STR * Math.min(state.spd / 60, 1) * dt * 15;
  state.spd = Math.min(state.spd + ACC * 0.7 * dt, MSPD * 0.65);
}

function applyEnv() {
  rain.visible = settings.weather === 'rain' || settings.weather === 'storm';
  if (settings.weather === 'rain') { scene.fog = new THREE.FogExp2(0x030308, 0.012); rainMat.opacity = 0.5; }
  else if (settings.weather === 'storm') { scene.fog = new THREE.FogExp2(0x020206, 0.016); rainMat.opacity = 0.75; }
  else if (settings.weather === 'fog') { scene.fog = new THREE.FogExp2(0x12122a, 0.022); }
  else { scene.fog = new THREE.FogExp2(0x040410, 0.006); }

  if (settings.tod === 'night') {
    amb.intensity = 0.35; amb.color.set(0x222244);
    dirLight.intensity = 0.15; dirLight.color.set(0x6666aa);
    renderer.toneMappingExposure = 0.9; scene.background.set(0x040410);
  } else if (settings.tod === 'sunset') {
    amb.intensity = 0.48; amb.color.set(0x553322);
    dirLight.intensity = 0.5; dirLight.color.set(0xff6633);
    renderer.toneMappingExposure = 1.1; scene.background.set(0x1a0f15);
  } else if (settings.tod === 'dawn') {
    amb.intensity = 0.42; amb.color.set(0x334455);
    dirLight.intensity = 0.4; dirLight.color.set(0x6688bb);
    renderer.toneMappingExposure = 1.0; scene.background.set(0x0f1520);
  } else {
    amb.intensity = 0.6; amb.color.set(0x8899aa);
    dirLight.intensity = 0.65; dirLight.color.set(0xaabbcc);
    renderer.toneMappingExposure = 1.3; scene.background.set(0x1a1a2e);
  }
}

// ═══════════════════════ GAME LOOP ═══════════════════════
let prev = performance.now();

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;

  applyEnv();

  if (!state.started) {
    // idle camera
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 2, -30);
    renderer.render(scene, camera);
    return;
  }

  if (state.alive) {
    if (settings.auto) {
      autoDrive(dt);
    } else {
      if (keys['w'] || keys['arrowup']) state.spd = Math.min(state.spd + ACC * dt, MSPD);
      else if (keys['s'] || keys['arrowdown']) state.spd = Math.max(state.spd - BRK * dt, -10);
      else { state.spd = state.spd > 0 ? Math.max(state.spd - DRG * dt, 0) : Math.min(state.spd + DRG * dt, 0); }
      if (keys['shift'] || keys[' ']) state.spd = Math.min(state.spd + ACC * 1.6 * dt, MSPD * 1.15);

      const si = (keys['a'] || keys['arrowleft']) ? 1 : (keys['d'] || keys['arrowright']) ? -1 : 0;
      state.str += (si * 0.5 - state.str) * dt * 5;
      state.px += state.str * STR * Math.min(state.spd / 60, 1) * dt * 15;
    }

    state.dist += state.spd * 0.27778 * dt;
    state.sc += state.spd * dt * 0.12;

    state.spawnT -= dt;
    if (state.spawnT <= 0) {
      spawnTraffic();
      state.spawnT = (0.25 + Math.random() * 0.95) / Math.max(settings.traffic, 0.1);
    }

    updateTraffic(dt);
    checkCollisions();

    pcar.position.x = state.px;
    pcar.rotation.y = state.str * 0.12;

    // update HUD
    const spdDisplay = Math.abs(Math.round(state.spd));
    speedVal.textContent = spdDisplay;
    scoreVal.textContent = Math.floor(state.sc).toLocaleString();
    const pct = Math.min(spdDisplay / MSPD * 100, 100);
    speedBarFill.style.width = pct + '%';
    speedBarFill.classList.toggle('hot', spdDisplay > MSPD * 0.85);
  } else {
    state.spd *= (1 - dt * 3);
    updateTraffic(dt);
  }

  // ── INFINITE SCROLL ──
  const cwz = -state.dist;

  roads.forEach(ch => {
    let base = -ch.idx * CHUNK;
    let cycle = Math.floor(state.dist / WLEN);
    let z = base + cycle * WLEN;
    let rel = z + state.dist;
    if (rel > CHUNK * 1.5) z -= WLEN;
    if (rel < -WLEN + CHUNK) z += WLEN;
    ch.mesh.position.z = z;
  });

  cities.forEach(ch => {
    let base = -ch.idx * CHUNK;
    let cycle = Math.floor(state.dist / WLEN);
    let z = base + cycle * WLEN;
    let rel = z + state.dist;
    if (rel > CHUNK * 1.5) {
      z -= WLEN;
      // recycle chunk
      scene.remove(ch.mesh);
      ch.mesh.traverse(c => {
        if (c.isMesh) {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
            else c.material.dispose();
          }
        }
      });
      const fresh = genChunk();
      scene.add(fresh);
      ch.mesh = fresh;
      rel = z + state.dist;
    }
    if (rel < -WLEN + CHUNK) z += WLEN;
    ch.mesh.position.z = z;
  });

  ground.position.z = cwz - 800;

  // rain update
  if (rain.visible) {
    const p = rain.geometry.attributes.position.array;
    for (let i = 0; i < RC; i++) {
      p[i * 3 + 1] -= dt * (95 + Math.random() * 55);
      if (p[i * 3 + 1] < -1) {
        p[i * 3 + 1] = 65 + Math.random() * 10;
        p[i * 3] = state.px + (Math.random() - 0.5) * 160;
        p[i * 3 + 2] = cwz + (Math.random() - 0.5) * 300;
      }
    }
    rain.geometry.attributes.position.needsUpdate = true;
  }

  // camera
  let sx = 0, sy = 0;
  if (state.shk > 0) {
    sx = (Math.random() - 0.5) * state.shk;
    sy = (Math.random() - 0.5) * state.shk * 0.5;
    state.shk *= (1 - dt * 5);
  }

  const tgtPos = new THREE.Vector3(
    state.px * 0.5 + sx,
    3.6 + state.spd * 0.009 + sy,
    cwz + 10 + Math.min(state.spd * 0.022, 3.5)
  );
  camera.position.lerp(tgtPos, dt * 4.5);
  camera.lookAt(new THREE.Vector3(state.px * 0.2, 1.2, cwz - 30 - state.spd * 0.3));
  camera.fov += (66 + state.spd * 0.09 - camera.fov) * dt * 3;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}

requestAnimationFrame(tick);
