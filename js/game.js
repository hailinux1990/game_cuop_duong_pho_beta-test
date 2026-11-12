/* ============================================================
   PIXEL VICE CITY — open-world THIRD-PERSON 3D (GTA Vice City style)
   Three.js r128, no external assets, all procedural.
   Sunset sky, neon pastel city, orbit chase-camera behind the hero.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- Config ---------------- */
  const PIXEL_SCALE = 1;          // native res for a crisp third-person 3D look
  const MAG_SIZE = 100;           // pistol rounds per full magazine (R to reload)
  const AK_MAG = 500;             // AK-47 rounds per full magazine

  /* ---- third-person camera tuning ---- */
  const CAM_PIVOT_H = 1.55;       // orbit pivot at the hero's shoulders
  const CAM_CAR_PIVOT_H = 1.45;   // car camera pivot
  const CAM_DIST = 5.4;           // default chase distance
  const CAM_AIM_DIST = 2.5;       // right-mouse aim: tighten over the shoulder
  const CAM_MIN_DIST = 2.2;
  const CAM_MAX_DIST = 10;
  const CAM_SENS = 0.0030;        // rad per mouse pixel (horizontal)
  const CAM_SENS_Y = 0.0027;      // rad per mouse pixel (vertical)
  const CAM_PITCH_MIN = -1.1, CAM_PITCH_MAX = 0.8;   // full up/down look
  const CAM_SHOULDER = 0.55;      // right-shoulder offset while aiming
  const CAM_LOOK_UP = 1.1;        // aim above the pivot → hero sits low in frame
  const PLAYER_RADIUS = 0.32;     // on-foot body radius used for wall / car collisions

  /* ---- Weapon table ----
     auto: hold LMB to keep firing (AK-47); piston fires once per click.
     reload: timed magazine swap (R or auto when empty).
     recoil: camera kick (rad per shot) + recoilYaw: random horizontal kick.
     bloom: extra spread added per shot while spraying. */
  const WEAPONS = [
    { name: 'TAY',   icon: '✊', kind: 'melee', dmg: 12, cd: 0.4, range: 1.6, melee: true },
    { name: 'DAO',   icon: '🔪', kind: 'melee', dmg: 34, cd: 0.4, range: 1.9, melee: true },
    {
      name: 'SÚNG', icon: '🔫', kind: 'gun', dmg: 26, headDmg: 60, cd: 0.26, mag: MAG_SIZE, range: 220,
      spread: 0.03, carHits: 6, snd: 'shoot', tracer: 0xffe08a, auto: false,
      reload: 0.9, recoil: 0.010, recoilYaw: 0.006, bloom: 0.3
    },
    {
      name: 'AK-47', icon: '🔫', kind: 'gun', dmg: 30, headDmg: 75, cd: 0.10, mag: AK_MAG, range: 340,
      spread: 0.012, carHits: 3, snd: 'ak', tracer: 0xffc46a, auto: true,
      reload: 1.4, recoil: 0.0045, recoilYaw: 0.004, bloom: 0.14
    }
  ];
  const ASSIST_ANGLE = 0.22;        // rad (~12.6°) GTA-style hip-fire auto-aim cone
  const ASSIST_ANGLE_AIM = 0.14;    // tighter snap while right-mouse aiming
  const ASSIST_HEAD_ANGLE = 0.05;   // crosshair dead-centre → headshot
  const ASSIST_HEAD_AIM = 0.04;
  const ASSIST_RANGE = 120;         // max distance for aim-assist
  const SWITCH_TIME = 0.2;          // weapon draw time
  const BLOOM_DECAY = 2.4;          // spread recovers per second
  const CELL = 35;                // block + road pitch
  const ROAD = 9;                 // road width
  const BLOCK = CELL - ROAD;      // buildable block width (26)
  const N = 11;                   // blocks per side -> roads 0..N  (multi-city mega map)
  const CITY = N * CELL;          // 385
  const CENTER = CITY / 2;        // 192.5
  const GROUND_HALF = CENTER + 22;

  /* Vice City sunset palette: warm asphalt, pastel art-deco facades, neon accents */
  const COLORS = {
    ground: 0x3a3138, road: 0x2b2630, sidewalk: 0xb59a9c, grass: 0x3c6b46,
    line: 0xffe9c4, water: 0x17607a, bridge: 0x8a7478, railing: 0xf0a8c8,
    sand: 0xd9b98c, shallow: 0x2f8fa0, foam: 0xfff2df, ocean: 0x0e3f5a,
    building: [0x7a6a5a, 0x9a8571, 0x6f7f8f, 0x8a7f8a, 0x5f6a5f, 0x8a7266, 0x75838a, 0x7f6a7a]
  };
  // Vice City districts: pastel beachfront, coral condos, lavender old town, neon downtown
  const DISTRICT_PALS = {
    nw: [0x63c7c7, 0x86d6d2, 0x53adb8, 0xa0dcd6],            // teal dockside
    ne: [0xf79a7e, 0xf7b391, 0xe88d84, 0xffc7a1],            // coral condos
    sw: [0xe6d7bc, 0xd6c8b4, 0xc9b6d9, 0xe9cfba],            // lavender old town
    se: [0xf68fc0, 0xc98af0, 0xb18cff, 0x8bc6ff]             // neon downtown glass
  };
  const NEON_COLS = [0xff3fa4, 0x3fe0ff, 0xb45cff, 0xffd23f, 0xff6a3f, 0x64ff9a];
  // multi-city map (Đông Anh style): each core spawns a dense cluster of
  // high-rise towers — the deeper inside the core, the taller the towers
  const CITY_CORES = [
    { x: -70, z: -75, r: 58 },     // trung tâm phía bắc sông
    { x: 118, z: -125, r: 62 },    // khu đô thị mới đông bắc
    { x: -128, z: 105, r: 52 },    // phố cổ tây nam
    { x: 112, z: 112, r: 60 }      // thành phố phía nam sông
  ];

  /* ---------------- Seeded RNG ---------------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(20240824);

  const cx = (i) => i * CELL - CENTER;   // x of vertical road i
  const cz = (j) => j * CELL - CENTER;   // z of horizontal road j

  /* ---- River + bridges (GTA 1 style districts split by water) ---- */
  const RIVER_ROAD = 6;                       // horizontal road row replaced by the river
  const RIVER_HALF = 14;                      // water half-width
  const RIVER_Z = cz(RIVER_ROAD);             // river centre line
  function isInsideWater(x, z) { return Math.abs(z - RIVER_Z) < RIVER_HALF; }
  const SPAWN = new THREE.Vector3(cx(4), 0, cz(4));   // safe road intersection

  /* ---------------- Audio (procedural) ---------------- */
  const Sfx = {
    ctx: null, master: null, enabled: true,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        this.master.connect(this.ctx.destination);
        // outdoor echo bus (urban canyon reverb for gunshots)
        this.echo = this.ctx.createDelay(0.6);
        this.echo.delayTime.value = 0.17;
        const fb = this.ctx.createGain(); fb.gain.value = 0.3;
        const wet = this.ctx.createGain(); wet.gain.value = 0.16;
        this.echo.connect(fb); fb.connect(this.echo);
        this.echo.connect(wet); wet.connect(this.master);
      } catch (e) { this.ctx = null; }
    },
    tone(freq, dur, type, vol, slideTo) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, vol, freq, echo) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 2000;
      const g = this.ctx.createGain(); g.gain.value = vol || 0.3;
      src.connect(f); f.connect(g); g.connect(this.master);
      if (echo && this.echo) g.connect(this.echo);
      src.start(t);
    },
    shoot() { this.noise(0.12, 0.5, 2600, true); this.tone(140, 0.09, 'square', 0.25, 50); },
    ak() { this.noise(0.1, 0.55, 2100, true); this.tone(110, 0.08, 'square', 0.24, 45); this.noise(0.04, 0.2, 4200); },
    metalHit() { this.tone(1600 + Math.random() * 800, 0.05, 'square', 0.12, 600); this.noise(0.04, 0.16, 5200); },
    boom() { this.noise(0.5, 0.85, 900, true); this.tone(60, 0.5, 'sawtooth', 0.35, 24); this.noise(0.22, 0.4, 2400, true); },
    siren() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'triangle';
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.085, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      o.connect(g); g.connect(this.master);
      for (let k = 0; k < 6; k++) o.frequency.setValueAtTime(k % 2 ? 760 : 590, t + k * 0.21);
      o.start(t); o.stop(t + 1.35);
    },
    punch() { this.tone(200, 0.07, 'square', 0.22, 90); this.noise(0.05, 0.15, 700); },
    knife() { this.noise(0.08, 0.2, 5200); this.tone(900, 0.06, 'sawtooth', 0.1, 300); },
    hit() { this.tone(90, 0.09, 'square', 0.28, 40); this.noise(0.06, 0.2, 500); },
    blood() { this.noise(0.06, 0.12, 400); },
    die() { this.tone(220, 0.5, 'sawtooth', 0.25, 40); },
    click() { this.tone(700, 0.04, 'square', 0.12, 900); },
    car() { this.tone(80, 0.2, 'sawtooth', 0.2, 140); },
    empty() { this.tone(180, 0.05, 'square', 0.14, 120); this.noise(0.03, 0.1, 900); },
    reload() { this.tone(520, 0.06, 'square', 0.1, 700); setTimeout(() => this.tone(620, 0.05, 'square', 0.1, 900), 90); setTimeout(() => this.click(), 260); },
    thud() { this.noise(0.05, 0.16, 650); this.tone(130, 0.05, 'square', 0.12, 70); },
    step() { this.noise(0.045, 0.07, 420); },
    thunder() { this.noise(1.2, 0.5, 380, true); this.tone(46, 1.4, 'sawtooth', 0.16, 18); this.tone(92, 0.5, 'sine', 0.08, 28); },
    rainNode: null, _rainLevel: 0,
    setRain(level) {
      if (!this.ctx) return;
      const lv = Math.max(0, Math.min(1, level || 0));
      if (!this.rainNode) {
        if (lv < 0.02) return;
        const ctx = this.ctx;
        const len = Math.floor(ctx.sampleRate * 2);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
        const g = ctx.createGain(); g.gain.value = 0;
        src.connect(lp); lp.connect(g); g.connect(this.master);
        src.start();
        this.rainNode = g;
      }
      if (Math.abs(lv - this._rainLevel) < 0.02) return;
      this._rainLevel = lv;
      this.rainNode.gain.setTargetAtTime(lv * 0.12, this.ctx.currentTime, 0.5);
    },
    warn() { this.tone(880, 0.12, 'square', 0.18); setTimeout(() => this.tone(660, 0.14, 'square', 0.18), 140); },

    /* ---- ambient city soundscape ---- */
    ambientOn: false,
    startAmbient() {
      if (!this.ctx || this.ambientOn) return;
      this.ambientOn = true;
      try {
        const ctx = this.ctx;
        // low city rumble: looping brown-ish noise + slow wind swell
        const len = Math.floor(ctx.sampleRate * 3);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3;
          const edge = Math.min(i, len - i) / (ctx.sampleRate * 0.5); // fade ends -> seamless loop
          d[i] *= Math.min(1, edge);
        }
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340;
        const g = ctx.createGain(); g.gain.value = 0.05;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
        const lg = ctx.createGain(); lg.gain.value = 0.022;
        lfo.connect(lg); lg.connect(g.gain);
        src.connect(lp); lp.connect(g); g.connect(this.master);
        src.start(); lfo.start();
        this.scheduleTraffic();
        this.scheduleBirds();
        this.scheduleSiren();
      } catch (e) {}
    },
    scheduleTraffic() {
      const loop = () => { setTimeout(() => { this.passBy(); loop(); }, 3500 + Math.random() * 6500); };
      loop();
    },
    passBy() {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime, dur = 1.4;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.linearRampToValueAtTime(900, t + dur / 2);
      bp.frequency.linearRampToValueAtTime(250, t + dur);
      const g = ctx.createGain(); g.gain.value = 0.09;
      let out = g;
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        const dirL = Math.random() < 0.5 ? -1 : 1;
        p.pan.setValueAtTime(-dirL, t);
        p.pan.linearRampToValueAtTime(dirL, t + dur);
        g.connect(p); out = p;
      }
      s.connect(bp); bp.connect(g); out.connect(this.master);
      s.start(t);
    },
    scheduleBirds() {
      const loop = () => { setTimeout(() => { this.birdChirps(); loop(); }, 4000 + Math.random() * 9000); };
      loop();
    },
    birdChirps() {
      if (!this.ctx) return;
      const n = 2 + ((Math.random() * 3) | 0);
      for (let i = 0; i < n; i++) setTimeout(() => this.chirp(), i * (90 + Math.random() * 120));
    },
    chirp() {
      if (!this.ctx) return;
      const f = 2100 + Math.random() * 1600;
      this.tone(f, 0.07, 'sine', 0.035, f * (0.55 + Math.random() * 0.3));
    },
    scheduleSiren() {
      const loop = () => { setTimeout(() => { this.distantSiren(); loop(); }, 24000 + Math.random() * 30000); };
      loop();
    },
    distantSiren() {
      if (!this.ctx) return;
      const ctx = this.ctx, t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'triangle'; lp.type = 'lowpass'; lp.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 2.5);
      g.gain.linearRampToValueAtTime(0.0001, t + 7);
      o.connect(lp); lp.connect(g); g.connect(this.master);
      for (let k = 0; k < 7; k++) o.frequency.setValueAtTime(k % 2 ? 720 : 560, t + k);
      o.start(t); o.stop(t + 7.2);
    }
  };

  /* ---------------- Renderer / Scene ---------------- */
  const canvas = document.getElementById('game');
  let renderer, scene, camera;
  let W = window.innerWidth, H = window.innerHeight;
  let skyMesh = null, sunSprite = null;
  let ambientLight = null, hemiLight = null, keyLight = null, rimLight = null;
  let cloudGroup = null, cloudMat = null;
  let rainLines = null;

  const _c = (hex) => new THREE.Color(hex);

  function makeSkyTexture() {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0.00, '#0b0b26');
    grd.addColorStop(0.30, '#26164a');
    grd.addColorStop(0.42, '#6a2a6a');
    grd.addColorStop(0.47, '#c93f6e');
    grd.addColorStop(0.50, '#ff8a5a');
    grd.addColorStop(0.55, '#ffb078');
    grd.addColorStop(0.72, '#a04a72');
    grd.addColorStop(1.00, '#241a2e');
    g.fillStyle = grd;
    g.fillRect(0, 0, 32, 256);
    return new THREE.CanvasTexture(c);
  }

  function makeSunTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0.00, 'rgba(255,255,240,1)');
    grd.addColorStop(0.18, 'rgba(255,230,170,1)');
    grd.addColorStop(0.45, 'rgba(255,150,90,0.55)');
    grd.addColorStop(0.75, 'rgba(255,90,120,0.18)');
    grd.addColorStop(1.00, 'rgba(255,60,120,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function fatalWebGL() {
    const ov = document.getElementById('startOverlay');
    if (!ov) return;
    ov.innerHTML = '<h1 style="color:#ff4f6a">THIẾU WEBGL</h1>' +
      '<div class="sub" style="max-width:640px;line-height:1.9">Trình duyệt chưa bật WebGL.<br>' +
      'Hãy dùng Chrome / Edge / Firefox bản mới và bật tăng tốc phần cứng, rồi tải lại trang.</div>';
  }

  function initThree() {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: PIXEL_SCALE <= 1, powerPreference: 'high-performance' });
    } catch (e) {
      fatalWebGL();
      throw e;
    }
    renderer.setPixelRatio(PIXEL_SCALE > 1 ? 1 / PIXEL_SCALE : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    scene = new THREE.Scene();
    scene.background = _c(0xff9a80);
    scene.fog = new THREE.Fog(0xff9a80, 80, 620);

    camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 3000);

    /* sunset sky dome + glowing sun on the horizon */
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 24, 16),
      new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide, fog: false, depthWrite: false })
    );
    sky.renderOrder = -1000;
    scene.add(sky);
    skyMesh = sky;
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeSunTexture(), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending
    }));
    sun.scale.set(240, 240, 1);
    sun.position.set(180, 52, 760);
    scene.add(sun);
    sunSprite = sun;

    /* warm sunset key light, violet sky bounce, cool rim */
    ambientLight = new THREE.AmbientLight(0xffd0c8, 0.4);
    scene.add(ambientLight);
    hemiLight = new THREE.HemisphereLight(0x9a7cff, 0x5a3a2a, 0.45);
    scene.add(hemiLight);
    keyLight = new THREE.DirectionalLight(0xffb070, 0.85);
    keyLight.position.set(120, 130, 260);
    scene.add(keyLight);
    rimLight = new THREE.DirectionalLight(0x4a3a8a, 0.3);
    rimLight.position.set(-160, 60, -220);
    scene.add(rimLight);

    buildClouds();
    buildRain();
  }

  /* ================================================================
     WEATHER — sunny sunset, drifting clouds and random rain storms.
     The HUD also shows the live clock in the GMT+7 timezone.
     ================================================================ */
  function buildClouds() {
    const puffGeo = new THREE.SphereGeometry(1, 7, 5);
    cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false });
    cloudGroup = new THREE.Group();
    for (let i = 0; i < 34; i++) {
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      const r = Math.random();
      puff.scale.set(8 + r * 14, 3 + Math.random() * 4, 8 + Math.random() * 10);
      puff.position.set((Math.random() - 0.5) * 900, 62 + Math.random() * 55, (Math.random() - 0.5) * 900);
      cloudGroup.add(puff);
    }
    scene.add(cloudGroup);
  }

  const RAIN_N = 950;
  let rainPositions = null, rainX = null, rainY = null, rainZ = null, rainLen = null;
  function buildRain() {
    rainX = new Float32Array(RAIN_N);
    rainY = new Float32Array(RAIN_N);
    rainZ = new Float32Array(RAIN_N);
    rainLen = new Float32Array(RAIN_N);
    rainPositions = new Float32Array(RAIN_N * 6);
    for (let i = 0; i < RAIN_N; i++) {
      rainX[i] = (Math.random() * 2 - 1) * 24;
      rainZ[i] = (Math.random() * 2 - 1) * 24;
      rainY[i] = Math.random() * 26;
      rainLen[i] = 0.5 + Math.random() * 0.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    rainLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0xbfd8e8, transparent: true, opacity: 0.45, depthWrite: false
    }));
    rainLines.frustumCulled = false;
    rainLines.visible = false;
    scene.add(rainLines);
  }

  const WEATHER_STATES = {
    clear:  { rain: 0,    dark: 0,    hold: [45, 90], label: '☀ NẮNG' },
    cloudy: { rain: 0.04, dark: 0.55, hold: [18, 35], label: '☁ MÂY KÉO VỀ' },
    rain:   { rain: 0.8,  dark: 0.8,  hold: [25, 50], label: '🌧 MƯA RƠI' },
    storm:  { rain: 1,    dark: 1,    hold: [12, 25], label: '⛈ GIÔNG BÃO' }
  };
  const WEATHER_TRANS = {
    clear:  [['clear', 0.15], ['cloudy', 0.55], ['rain', 0.30]],
    cloudy: [['clear', 0.30], ['cloudy', 0.15], ['rain', 0.55]],
    rain:   [['cloudy', 0.45], ['rain', 0.30], ['storm', 0.25]],
    storm:  [['rain', 0.60], ['cloudy', 0.40]]
  };
  let weatherState = 'clear';
  let weatherRain = 0, weatherDark = 0;
  let weatherTimer = 25 + Math.random() * 30;
  let lightningTimer = 9, lightningFlash = 0, _lastFlashOp = -1;

  function setWeatherState(next, silent) {
    const st = WEATHER_STATES[next];
    if (!st) return;
    weatherState = next;
    weatherTimer = st.hold[0] + Math.random() * (st.hold[1] - st.hold[0]);
    if (!silent) {
      toast(next === 'clear' ? 'TRỜI NẮNG LÊN ☀'
        : next === 'cloudy' ? 'MÂY ĐEN KÉO VỀ ☁'
        : next === 'rain' ? 'MƯA BẮT ĐẦU RƠI 🌧'
        : 'GIÔNG BÃO ẬP TỚI ⛈');
    }
  }
  function rollWeather() {
    const opts = WEATHER_TRANS[weatherState] || WEATHER_TRANS.clear;
    const r = Math.random();
    let acc = 0, next = 'clear';
    for (let i = 0; i < opts.length; i++) {
      acc += opts[i][1];
      if (r <= acc) { next = opts[i][0]; break; }
    }
    setWeatherState(next);
  }

  const _wFogClear = new THREE.Color(0xff9a80);
  const _wFogRain = new THREE.Color(0x55616e);
  const _wTmp = new THREE.Color();
  function applyWeather() {
    if (!scene || !scene.fog) return;
    const t = Math.max(weatherDark, weatherRain * 0.6);
    _wTmp.copy(_wFogClear).lerp(_wFogRain, t);
    scene.fog.color.copy(_wTmp);
    if (scene.background && scene.background.isColor) scene.background.copy(_wTmp);
    scene.fog.near = 80 - 46 * t;
    scene.fog.far = 620 - 330 * t;
    if (ambientLight) ambientLight.intensity = 0.42 + 0.05 * t;
    if (hemiLight) hemiLight.intensity = 0.45 - 0.14 * t;
    if (keyLight) keyLight.intensity = 0.85 - 0.62 * t + lightningFlash * 1.1;
    if (rimLight) rimLight.intensity = 0.3 - 0.24 * t;
    if (skyMesh) skyMesh.material.color.setRGB(1 - 0.45 * t, 1 - 0.38 * t, 1 - 0.26 * t);
    if (sunSprite) {
      const so = Math.max(0, 1 - t * 1.55);
      sunSprite.material.opacity = so;
      sunSprite.visible = so > 0.02;
    }
    if (cloudMat) {
      const c = 1 - 0.55 * t;
      cloudMat.color.setRGB(c, c, c * 1.02);
      cloudMat.opacity = 0.22 + 0.66 * t;
    }
  }

  function updateClouds(dt) {
    if (!cloudGroup) return;
    const wind = (0.8 + weatherRain * 1.6) * dt;
    for (let i = 0; i < cloudGroup.children.length; i++) {
      const p = cloudGroup.children[i];
      p.position.x += wind;
      p.position.z += wind * 0.12;
      if (p.position.x > 540) p.position.x = -540;
      if (p.position.z > 540) p.position.z = -540;
    }
  }

  function updateRain(dt) {
    if (!rainLines) return;
    const rain = weatherRain;
    if (rain < 0.02) {
      if (rainLines.visible) rainLines.visible = false;
      return;
    }
    rainLines.visible = true;
    rainLines.material.opacity = 0.16 + 0.4 * rain;
    const count = Math.max(2, Math.floor(RAIN_N * Math.min(1, rain * 1.25)));
    const px = player ? player.pos.x : 0;
    const pz = player ? player.pos.z : 0;
    const fall = (weatherRain > 0.6 ? 34 : 28) * dt;
    for (let i = 0; i < count; i++) {
      rainY[i] -= fall;
      let x = rainX[i], z = rainZ[i];
      if (Math.abs(x - px) > 24 || Math.abs(z - pz) > 24 || rainY[i] < 0.15) {
        x = px + (Math.random() * 2 - 1) * 24;
        z = pz + (Math.random() * 2 - 1) * 24;
        rainY[i] = 19 + Math.random() * 8;
      }
      rainX[i] = x; rainZ[i] = z;
      const j = i * 6;
      rainPositions[j] = x;
      rainPositions[j + 1] = rainY[i];
      rainPositions[j + 2] = z;
      rainPositions[j + 3] = x - 0.24;
      rainPositions[j + 4] = rainY[i] - rainLen[i];
      rainPositions[j + 5] = z - 0.1;
    }
    rainLines.geometry.setDrawRange(0, count * 2);
    rainLines.geometry.attributes.position.needsUpdate = true;
  }

  function triggerLightning() {
    lightningFlash = 1;
    Sfx.thunder();
  }

  function updateWeather(dt) {
    if (!scene) return;
    weatherTimer -= dt;
    if (weatherTimer <= 0) rollWeather();
    const target = WEATHER_STATES[weatherState] || WEATHER_STATES.clear;
    const k = 1 - Math.exp(-dt * 0.55);       // clouds gather / clear over a few seconds
    weatherRain += (target.rain - weatherRain) * k;
    weatherDark += (target.dark - weatherDark) * k;
    if (Math.abs(target.rain - weatherRain) < 0.004) weatherRain = target.rain;
    if (Math.abs(target.dark - weatherDark) < 0.004) weatherDark = target.dark;
    if (weatherRain > 0.6) {
      lightningTimer -= dt;
      if (lightningTimer <= 0) {
        lightningTimer = 6 + Math.random() * 11;
        triggerLightning();
      }
    } else {
      lightningTimer = Math.max(lightningTimer, 4);
    }
    if (lightningFlash > 0) lightningFlash = Math.max(0, lightningFlash - dt * 4.5);
    applyWeather();
    updateClouds(dt);
    updateRain(dt);
    Sfx.setRain(weatherRain);
    updateWeatherHUD();
    // lightning white-out overlay
    if (lightningEl) {
      const op = Math.round(lightningFlash * 0.85 * 100) / 100;
      if (op !== _lastFlashOp) { _lastFlashOp = op; lightningEl.style.opacity = op; }
    }
  }

  // test / debug hook: force a weather state immediately
  function setWeather(name) {
    if (!WEATHER_STATES[name]) return;
    setWeatherState(name, true);
    const st = WEATHER_STATES[name];
    weatherRain = st.rain;
    weatherDark = st.dark;
    applyWeather();
    updateClouds(0);
    updateRain(0);
    updateWeatherHUD();
  }


  /* ---------------- World ---------------- */
  let built = false, spawned = false;
  let worldGroup = new THREE.Group();
  const buildingBoxes = [];   // AABB footprints {minX,maxX,minZ,maxZ}
  const buildingMeshes = [];  // for raycast LOS

  function box(w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y, z);
    m.castShadow = false; m.receiveShadow = false;
    return m;
  }
  function neonBox(w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    return m;
  }
  function plane(w, d, color, x, y, z, rx, po) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color }));
    if (po) {                       // depth bias: painted surfaces win at any distance
      m.material.polygonOffset = true;
      m.material.polygonOffsetFactor = -po;
      m.material.polygonOffsetUnits = -po;
    }
    m.rotation.x = rx === undefined ? -Math.PI / 2 : rx;
    m.position.set(x, y, z);
    return m;
  }

  // window facade texture (pixelated art-deco glass + neon lit rooms)
  function makeFacade(baseColor, variant) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    const b = new THREE.Color(baseColor);
    g.fillStyle = '#' + b.getHexString();
    g.fillRect(0, 0, 64, 64);
    const win = ['#1b2f4c', '#25405f', '#1a2a44', '#2b4a6e'];
    const lit = ['#ff7ac8', '#7af0ff', '#ffd76a', '#ffa6e0', '#9ad8ff'];
    const cols = 6, rows = 6, gap = 4, ww = (64 - gap * (cols + 1)) / cols, hh = (64 - gap * (rows + 1)) / rows;
    const lrng = mulberry32(baseColor + variant * 97);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = gap + i * (ww + gap), y = gap + j * (hh + gap);
      if (lrng() < 0.3) g.fillStyle = lit[(lrng() * lit.length) | 0];
      else g.fillStyle = win[(lrng() * 4) | 0];
      g.fillRect(x, y, ww, hh);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  function addBuilding(minX, minZ, maxX, maxZ) {
    const w = maxX - minX, d = maxZ - minZ;
    if (w < 4 || d < 4) return;
    const mx = (minX + maxX) / 2, mz = (minZ + maxZ) / 2;

    // district palette (GTA 1 style quarters)...
    let pal = DISTRICT_PALS[mz < RIVER_Z ? (mx < 0 ? 'nw' : 'ne') : (mx < 0 ? 'sw' : 'se')];
    let h = 4 + Math.pow(rng(), 1.6) * 26;

    // ...plus CITY CORES: dense high-rise clusters (Đông Anh style towers).
    // The deeper inside a core, the taller the tower — up to ~64 units.
    let coreBoost = 0;
    for (const c of CITY_CORES) {
      const dist = Math.hypot(mx - c.x, mz - c.z);
      if (dist < c.r) coreBoost = Math.max(coreBoost, 1 - dist / c.r);
    }
    if (coreBoost > 0) {
      h = 20 + coreBoost * 36 + rng() * 8;                 // tower zone
      if (h > 30) pal = DISTRICT_PALS.se;                  // glassy facades for skyscrapers
    }

    const tex = makeFacade(pal[(rng() * pal.length) | 0], (minX * 13 + minZ * 7) | 0);
    // keep materials OPAQUE by default (huge draw-order win); the occlusion
    // fader flips them to transparent only for the split seconds they fade
    const sideMat = new THREE.MeshLambertMaterial({ map: tex });
    const topMat = new THREE.MeshLambertMaterial({ color: 0x4a4d55 });
    const mats = [sideMat, sideMat, topMat, topMat, sideMat, sideMat];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    m.position.set((minX + maxX) / 2, 0.02 + h / 2, (minZ + maxZ) / 2);
    worldGroup.add(m);
    buildingMeshes.push(m);

    // rooftop detail for tall towers
    if (h > 30) {
      worldGroup.add(box(Math.min(4, w * 0.35), 1.6, Math.min(4, d * 0.35), 0x3c4046, mx, 0.02 + h + 0.8, mz));
      worldGroup.add(box(0.3, 3.5 + rng() * 2.5, 0.3, 0x2b2e33, mx + w * 0.25, 0.02 + h + 2, mz - d * 0.2));
    }

    /* ---- Vice City neon: glowing storefronts + skyline edge lights ---- */
    if (w > 5 && d > 4 && rng() < 0.45) {
      const nc = NEON_COLS[(rng() * NEON_COLS.length) | 0];
      worldGroup.add(neonBox(Math.min(w * 0.6, 6.5), 0.34, 0.1, nc, mx, 1.15, maxZ + 0.07));
    }
    if (h > 30) {
      const nc2 = NEON_COLS[(rng() * NEON_COLS.length) | 0];
      worldGroup.add(neonBox(0.22, h * 0.62, 0.22, nc2, maxX - 0.15, 0.02 + h * 0.52, minZ + 0.15));
      worldGroup.add(neonBox(0.22, h * 0.62, 0.22, nc2, minX + 0.15, 0.02 + h * 0.52, maxZ - 0.15));
      if (w > 8) {
        const nc3 = NEON_COLS[(rng() * NEON_COLS.length) | 0];
        worldGroup.add(neonBox(Math.min(w * 0.6, 9), 0.55, 0.35, nc3, mx, 0.02 + h + 0.9, maxZ - 0.4));
      }
    }

    buildingBoxes.push({
      minX, maxX, minZ, maxZ, h,
      cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2,
      mats: [sideMat, topMat], fade: 1, lastOp: 1
    });
  }

  /* Palm trees for the Vice City beachfront */
  function addTree(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 3.4, 5), mat(0x7a5a38));
    trunk.position.y = 1.7;
    trunk.rotation.z = (rng() - 0.5) * 0.16;
    g.add(trunk);
    const frondMat = mat(0x2f8a4f);
    const fronds = 5;
    for (let i = 0; i < fronds; i++) {
      const a = (i / fronds) * Math.PI * 2 + rng() * 0.4;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 1.9), frondMat);
      frond.position.set(Math.cos(a) * 0.7, 3.3 + rng() * 0.15, Math.sin(a) * 0.7);
      frond.rotation.y = -a;
      frond.rotation.x = 0.45 + rng() * 0.22;      // drooping canopy
      g.add(frond);
    }
    g.position.set(x, 0.02, z);
    g.rotation.y = rng() * Math.PI * 2;
    worldGroup.add(g);
  }

  function buildCity() {
    if (built) return;
    /* sand island frame around the city base (edge-to-edge, no coplanar overlap) */
    const ISLE = (CITY + ROAD + 8) / 2;                 // 201
    const FRAME = GROUND_HALF - ISLE;                    // 13.5 m of beach
    const sandY = -0.5;
    worldGroup.add(box(GROUND_HALF * 2, 1, FRAME, COLORS.sand, 0, sandY, ISLE + FRAME / 2));
    worldGroup.add(box(GROUND_HALF * 2, 1, FRAME, COLORS.sand, 0, sandY, -ISLE - FRAME / 2));
    worldGroup.add(box(FRAME, 1, ISLE * 2, COLORS.sand, ISLE + FRAME / 2, sandY, 0));
    worldGroup.add(box(FRAME, 1, ISLE * 2, COLORS.sand, -ISLE - FRAME / 2, sandY, 0));
    // city base slab (asphalt) — top face just under the painted road surfaces
    worldGroup.add(box(ISLE * 2, 0.6, ISLE * 2, COLORS.ground, 0, -0.3, 0));

    /* ---- Vice City bay: shallow lagoon ring + open ocean out to the horizon ---- */
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshLambertMaterial({ color: COLORS.ocean }));
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -0.6, 0);
    worldGroup.add(ocean);
    const BAND = 28;
    const shallowMat = new THREE.MeshLambertMaterial({ color: COLORS.shallow });
    const bands = [
      [0, -GROUND_HALF - BAND / 2, GROUND_HALF * 2 + BAND * 2, BAND],
      [0, GROUND_HALF + BAND / 2, GROUND_HALF * 2 + BAND * 2, BAND],
      [GROUND_HALF + BAND / 2, 0, BAND, GROUND_HALF * 2],
      [-GROUND_HALF - BAND / 2, 0, BAND, GROUND_HALF * 2]
    ];
    for (const [px, pz, pw, pd] of bands) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), shallowMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(px, -0.04, pz);
      worldGroup.add(m);
    }
    // white surf line where the sand meets the water
    const F = 1.8;
    worldGroup.add(plane(GROUND_HALF * 2 + F * 2, F, COLORS.foam, 0, 0.01, GROUND_HALF + F / 2));
    worldGroup.add(plane(GROUND_HALF * 2 + F * 2, F, COLORS.foam, 0, 0.01, -GROUND_HALF - F / 2));
    worldGroup.add(plane(F, GROUND_HALF * 2 + F * 2, COLORS.foam, GROUND_HALF + F / 2, 0.01, 0));
    worldGroup.add(plane(F, GROUND_HALF * 2 + F * 2, COLORS.foam, -GROUND_HALF - F / 2, 0.01, 0));

    // roads (darker)
    for (let i = 0; i <= N; i++) {
      worldGroup.add(plane(ROAD, CITY, COLORS.road, cx(i), 0.02, 0, undefined, 2));
      worldGroup.add(plane(CITY, ROAD, COLORS.road, 0, 0.02, cz(i), undefined, 2));
    }

    // lane markings (dashed center line)
    for (let i = 0; i <= N; i++) {
      // along x road (horizontal), z = cz(i)
      for (let s = -CENTER; s < CENTER; s += 8) {
        worldGroup.add(plane(3.2, 0.28, COLORS.line, s + 2, 0.03, cz(i), undefined, 3));
      }
      // along z road (vertical), x = cx(i)
      for (let s = -CENTER; s < CENTER; s += 8) {
        worldGroup.add(plane(0.28, 3.2, COLORS.line, cx(i), 0.03, s + 2, undefined, 3));
      }
    }

    // ---- river splitting the city (GTA 1 style), crossed by bridges on every avenue ----
    worldGroup.add(box(ISLE * 2, 0.12, RIVER_HALF * 2, COLORS.water, 0, 0.3, RIVER_Z));
    // river banks: sandy promenade along the water edge
    worldGroup.add(box(ISLE * 2, 0.14, 2.5, COLORS.sand, 0, 0.31, RIVER_Z - RIVER_HALF - 1));
    worldGroup.add(box(ISLE * 2, 0.14, 2.5, COLORS.sand, 0, 0.31, RIVER_Z + RIVER_HALF + 1));

    // blocks: sidewalk slab + buildings
    for (let bi = 0; bi < N; bi++) for (let bj = 0; bj < N; bj++) {
      const minX = cx(bi) + ROAD / 2, maxX = cx(bi + 1) - ROAD / 2;
      const minZ = cz(bj) + ROAD / 2, maxZ = cz(bj + 1) - ROAD / 2;
      // no buildings inside the river
      if (!(maxZ < RIVER_Z - RIVER_HALF || minZ > RIVER_Z + RIVER_HALF)) continue;
      worldGroup.add(plane(BLOCK, BLOCK, COLORS.sidewalk, (minX + maxX) / 2, 0.02, (minZ + maxZ) / 2, undefined, 2));

      // simple lot layout
      const gap = 1.2;
      const inner = { minX: minX + gap, maxX: maxX - gap, minZ: minZ + gap, maxZ: maxZ - gap };
      const r = rng();
      if (r < 0.3) {
        // one big building + a tree
        addBuilding(inner.minX + 1, inner.minZ + 1, inner.maxX - 1, inner.maxZ - 1);
      } else if (r < 0.62) {
        // two buildings
        const midX = (inner.minX + inner.maxX) / 2;
        addBuilding(inner.minX, inner.minZ, midX - gap / 2, inner.maxZ);
        addBuilding(midX + gap / 2, inner.minZ, inner.maxX, inner.maxZ);
      } else if (r < 0.9) {
        // 2x2 lots, one may be a courtyard
        const midX = (inner.minX + inner.maxX) / 2;
        const midZ = (inner.minZ + inner.maxZ) / 2;
        addBuilding(inner.minX, inner.minZ, midX - gap / 2, midZ - gap / 2);
        addBuilding(midX + gap / 2, inner.minZ, inner.maxX, midZ - gap / 2);
        addBuilding(inner.minX, midZ + gap / 2, midX - gap / 2, inner.maxZ);
        if (rng() < 0.6) addBuilding(midX + gap / 2, midZ + gap / 2, inner.maxX, inner.maxZ);
        else addTree(midX + 4, midZ + 4);
      } else {
        // park block with trees
        for (let t = 0; t < 4; t++) {
          const tx = inner.minX + 2 + rng() * (inner.maxX - inner.minX - 4);
          const tz = inner.minZ + 2 + rng() * (inner.maxZ - inner.minZ - 4);
          addTree(tx, tz);
        }
      }
    }

    // ---- palm-lined Vice City beachfront around the island rim ----
    const rim = GROUND_HALF - 5.5;
    for (let k = 0; k < 28; k++) {
      const side = k % 4;
      const t = -rim + 8 + rng() * (rim * 2 - 16);
      let x, z;
      if (side === 0) { x = t; z = rim; }
      else if (side === 1) { x = t; z = -rim; }
      else if (side === 2) { x = rim; z = t; }
      else { x = -rim; z = t; }
      if (Math.abs(z - RIVER_Z) < RIVER_HALF + 7) continue;   // keep the river channel clear
      if (isInsideBuilding(x, z)) continue;
      addTree(x, z);
    }

    // ---- bridges: every avenue crosses the river on a RAISED concrete arch ----
    // deck sits 1.5 units above the water so the river boats can glide underneath.
    // NOTE: .add() returns the PARENT, so each ramp gets its own mesh reference
    // to tilt — rotating the returned value would tilt the entire world group!
    const rampAngle = Math.atan2(DECK_Y, RAMP_LEN);
    for (let i = 0; i <= N; i++) {
      worldGroup.add(box(ROAD, 0.14, RIVER_HALF * 2 + 4, COLORS.bridge, cx(i), DECK_Y - 0.07, RIVER_Z));
      const rampN = box(ROAD, 0.12, RAMP_LEN, COLORS.bridge, cx(i), DECK_Y / 2, RIVER_Z - RIVER_HALF - 2 - RAMP_LEN / 2);
      rampN.rotation.x = -rampAngle;                       // north ramp: dips AWAY from deck
      worldGroup.add(rampN);
      const rampS = box(ROAD, 0.12, RAMP_LEN, COLORS.bridge, cx(i), DECK_Y / 2, RIVER_Z + RIVER_HALF + 2 + RAMP_LEN / 2);
      rampS.rotation.x = rampAngle;                        // south ramp mirrored
      worldGroup.add(rampS);
      worldGroup.add(box(0.35, 0.8, RIVER_HALF * 2 + 4, COLORS.railing, cx(i) - ROAD / 2 + 0.25, DECK_Y + 0.36, RIVER_Z));
      worldGroup.add(box(0.35, 0.8, RIVER_HALF * 2 + 4, COLORS.railing, cx(i) + ROAD / 2 - 0.25, DECK_Y + 0.36, RIVER_Z));
      // lane markings across the deck
      for (let s = RIVER_Z - RIVER_HALF + 3; s < RIVER_Z + RIVER_HALF - 3; s += 8) {
        worldGroup.add(plane(0.28, 3.2, COLORS.line, cx(i), DECK_Y + 0.02, s));
      }
    }

    scene.add(worldGroup);
    built = true;
  }

  function isInsideBuilding(x, z) {
    for (let i = 0; i < buildingBoxes.length; i++) {
      const b = buildingBoxes[i];
      if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
    }
    return false;
  }
  function clampToWorld(v) {
    const L = CENTER + 6;
    v.x = Math.max(-L, Math.min(L, v.x));
    v.z = Math.max(-L, Math.min(L, v.z));
    return v;
  }

  /* ---- bridge height for rendering: characters/cars glide up the ramps ---- */
  const DECK_Y = 1.5, RAMP_LEN = 8;
  function groundY(x, z) {
    const dz = Math.abs(z - RIVER_Z);
    if (dz > RIVER_HALF + 2 + RAMP_LEN) return 0;
    for (let i = 0; i <= N; i++) {
      if (Math.abs(x - cx(i)) <= ROAD / 2 + 0.6) {
        if (dz <= RIVER_HALF + 2) return DECK_Y;              // on the arch
        return Math.max(0, DECK_Y * (1 - (dz - RIVER_HALF - 2) / RAMP_LEN)); // ramp slope
      }
    }
    return 0;
  }

  /* ---------------- Road routes for AI cars ---------------- */
  const routes = [];
  function buildRoutes() {
    function ring(a, b) {
      return [[cx(a), cz(a)], [cx(b), cz(a)], [cx(b), cz(b)], [cx(a), cz(b)]];
    }
    // outer + inner rings, crossing the river over the bridges
    routes.push(ring(0, N));
    routes.push(ring(1, N - 1));
    routes.push(ring(2, N - 2));
    routes.push(ring(3, N - 3));
    // straight patrol loops (back & forth) spread across the multi-city map
    routes.push([[cx(1), cz(0)], [cx(1), cz(N)]]);
    routes.push([[cx(4), cz(0)], [cx(4), cz(N)]]);
    routes.push([[cx(7), cz(0)], [cx(7), cz(N)]]);
    routes.push([[cx(9), cz(0)], [cx(9), cz(N)]]);
    routes.push([[cx(0), cz(2)], [cx(N), cz(2)]]);
    routes.push([[cx(0), cz(4)], [cx(N), cz(4)]]);
    routes.push([[cx(0), cz(8)], [cx(N), cz(8)]]);
    routes.push([[cx(0), cz(10)], [cx(N), cz(10)]]);
  }

  /* ---------------- Models ---------------- */
  function mat(c) { return new THREE.MeshLambertMaterial({ color: c }); }
  function blobShadow(r) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.045;
    return m;
  }

  /* ---------------- Low-poly Vice City humans ----------------
     A proper 3D human silhouette built from rounded low-poly shapes:
     tapered chest, hips + belt, neck, rounded head with jaw/face, hair
     styles, sunglasses/caps and hands/shoes.  All pieces share a small
     geometry cache so 100+ pedestrians stay cheap. */
  const _sgeo = {};
  function sg(key, factory) {
    if (_sgeo[key]) return _sgeo[key];
    const g = factory();
    _sgeo[key] = g;
    return g;
  }
  const G_HEAD = () => sg('head', () => { const g = new THREE.SphereGeometry(0.19, 8, 6); g.scale(0.95, 1.05, 0.95); return g; });
  const G_JAW = () => sg('jaw', () => new THREE.BoxGeometry(0.24, 0.12, 0.2));
  const G_NECK = () => sg('neck', () => new THREE.CylinderGeometry(0.06, 0.07, 0.14, 6));
  const G_TORSO = () => sg('torso', () => { const g = new THREE.CylinderGeometry(0.225, 0.185, 0.56, 8); g.scale(1, 1, 0.78); return g; });
  const G_PELVIS = () => sg('pelvis', () => new THREE.BoxGeometry(0.34, 0.2, 0.26));
  const G_BELT = () => sg('belt', () => new THREE.BoxGeometry(0.35, 0.05, 0.27));
  const G_SKIRT = () => sg('skirt', () => new THREE.CylinderGeometry(0.3, 0.42, 0.42, 8));
  const G_ARM = () => sg('arm', () => { const g = new THREE.CylinderGeometry(0.06, 0.072, 0.56, 6); g.translate(0, -0.28, 0); return g; });
  const G_HAND = () => sg('hand', () => new THREE.BoxGeometry(0.13, 0.14, 0.14));
  const G_LEG = () => sg('leg', () => { const g = new THREE.CylinderGeometry(0.078, 0.09, 0.8, 7); g.translate(0, -0.4, 0); return g; });
  const G_SHOE = () => sg('shoe', () => new THREE.BoxGeometry(0.2, 0.13, 0.32));
  const G_HAIR = () => sg('hair', () => new THREE.SphereGeometry(0.212, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.42));
  const G_HAIRBACK = () => sg('hairback', () => new THREE.BoxGeometry(0.32, 0.34, 0.12));
  const G_EYE = () => sg('eye', () => new THREE.BoxGeometry(0.055, 0.035, 0.02));
  const G_EYEWHITE = () => sg('eyewhite', () => new THREE.BoxGeometry(0.07, 0.045, 0.012));
  const G_PUPIL = () => sg('pupil', () => new THREE.BoxGeometry(0.03, 0.03, 0.012));
  const G_BROW = () => sg('brow', () => new THREE.BoxGeometry(0.08, 0.02, 0.02));
  const G_NOSE = () => sg('nose', () => new THREE.BoxGeometry(0.05, 0.07, 0.05));
  const G_MOUTH = () => sg('mouth', () => new THREE.BoxGeometry(0.1, 0.018, 0.02));
  const G_SUNGLASSES = () => sg('sunglasses', () => new THREE.BoxGeometry(0.3, 0.08, 0.04));
  const G_CAP = () => sg('cap', () => new THREE.CylinderGeometry(0.2, 0.21, 0.12, 8));
  const G_CAPBRIM = () => sg('capbrim', () => new THREE.BoxGeometry(0.28, 0.035, 0.16));
  const G_BADGE = () => sg('badge', () => new THREE.BoxGeometry(0.05, 0.07, 0.02));
  const G_CHAIN = () => sg('chain', () => new THREE.BoxGeometry(0.16, 0.02, 0.02));

  // procedural tropical-print shirt fabric (cached per colour pair)
  const _shirtTex = {};
  function shirtTexture(base, accent, variant) {
    const key = base + ':' + accent + ':' + variant;
    if (_shirtTex[key]) return _shirtTex[key];
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#' + new THREE.Color(base).getHexString();
    g.fillRect(0, 0, 64, 64);
    const ac = '#' + new THREE.Color(accent).getHexString();
    g.fillStyle = ac;
    for (let k = 0; k < 5; k++) {
      const x = (k * 27 + variant * 13) % 64;
      const y = (k * 19 + variant * 9) % 64;
      for (let p = 0; p < 4; p++) {
        const a = p * Math.PI / 2 + 0.45;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 3.4, 1.9, a, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffe9a8';
      g.fillRect(x - 1, y - 1, 2, 2);
      g.fillStyle = ac;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    _shirtTex[key] = tex;
    return tex;
  }
  const PRINT_ACCENTS = [0xff3fa4, 0x2fa8a0, 0xffcf4f, 0x7a4a22, 0xff6f91, 0xf7f0e0, 0x2f6fbf];

  function makeHuman(opt) {
    const g = new THREE.Group();
    const female = !!opt.female;
    const skin = opt.skin || 0xe8b88a, shirt = opt.shirt || 0x3366ff, pants = opt.pants || 0x2c2c34;
    const skinM = mat(skin), pantsM = mat(pants), hairM = mat(opt.hair || 0x241c14);
    const shirtM = opt.shirtTex ? new THREE.MeshLambertMaterial({ map: opt.shirtTex }) : mat(shirt);
    const shoeM = mat(opt.shoe || 0x18171c), eyeM = mat(0x141416), whiteM = mat(0xf2efe6), detailM = mat(0x2a1c14);
    const shoulderX = female ? 0.26 : 0.29;
    const skirt = !!opt.skirt;
    const legsMat = skirt ? skinM : pantsM;
    const parts = [];
    const add = (m) => { g.add(m); parts.push(m); return m; };
    const M = (geo, material) => new THREE.Mesh(geo, material);

    // hips, belt and tapered chest
    const pelvis = M(G_PELVIS(), pantsM); pelvis.position.set(0, 0.92, 0); pelvis.scale.x = female ? 0.94 : 1;
    const belt = M(G_BELT(), mat(opt.belt || 0x24242a)); belt.position.set(0, 1.03, 0);
    const torso = M(G_TORSO(), shirtM); torso.position.set(0, 1.28, 0); torso.scale.x = female ? 0.92 : 1;
    add(pelvis); add(belt); add(torso);
    let skirtMesh = null;
    if (skirt) {
      skirtMesh = M(G_SKIRT(), mat(opt.skirtColor || pants)); skirtMesh.position.set(0, 0.78, 0);
      add(skirtMesh);
    }

    // neck + head + jaw
    const neck = M(G_NECK(), skinM); neck.position.set(0, 1.585, 0); add(neck);
    const head = M(G_HEAD(), skinM); head.position.set(0, 1.75, 0); add(head);
    const jaw = M(G_JAW(), skinM); jaw.position.set(0, 1.6, 0.03); add(jaw);

    // face (front is +Z)
    const faceZ = 0.17;
    if (opt.face) {
      const eWL = M(G_EYEWHITE(), whiteM); eWL.position.set(-0.062, 1.79, faceZ - 0.006);
      const eWR = eWL.clone(); eWR.position.x = 0.062;
      const pL = M(G_PUPIL(), eyeM); pL.position.set(-0.062, 1.79, faceZ + 0.012);
      const pR = pL.clone(); pR.position.x = 0.062;
      const bL = M(G_BROW(), hairM); bL.position.set(-0.062, 1.83, faceZ);
      const bR = bL.clone(); bR.position.x = 0.062;
      add(eWL); add(eWR); add(pL); add(pR); add(bL); add(bR);
      [eWL, eWR, pL, pR, bL, bR].forEach(m => { m.userData.head = true; });
    } else if (opt.sunglasses) {
      const glasses = M(G_SUNGLASSES(), eyeM); glasses.position.set(0, 1.79, faceZ);
      add(glasses); glasses.userData.head = true;
    } else {
      const eL = M(G_EYE(), eyeM); eL.position.set(-0.062, 1.79, faceZ);
      const eR = eL.clone(); eR.position.x = 0.062;
      add(eL); add(eR); eL.userData.head = true; eR.userData.head = true;
    }
    const nose = M(G_NOSE(), skinM); nose.position.set(0, 1.73, faceZ + 0.02); add(nose); nose.userData.head = true;
    const mouth = M(G_MOUTH(), detailM); mouth.position.set(0, 1.65, faceZ); add(mouth); mouth.userData.head = true;

    // hair styles / cap
    let hair = null;
    if (opt.hat) {
      const hatMat = mat(opt.capColor || 0x1f3a6f);
      const cap = M(G_CAP(), hatMat); cap.position.set(0, 1.92, 0); add(cap); cap.userData.head = true;
      const brim = M(G_CAPBRIM(), hatMat); brim.position.set(0, 1.87, 0.16); add(brim); brim.userData.head = true;
      hair = cap;
    } else if (opt.hairStyle !== 'bald') {
      hair = M(G_HAIR(), hairM); hair.position.set(0, 1.76, 0); add(hair); hair.userData.head = true;
      if (opt.hairStyle === 'long') {
        const back = M(G_HAIRBACK(), hairM); back.position.set(0, 1.62, -0.12); add(back); back.userData.head = true;
      }
    }

    // arms + hands (shoulder pivots keep the old animation contract)
    const armR = M(G_ARM(), shirtM); armR.position.set(-shoulderX, 1.45, 0);   // right hand = local -X
    const armL = M(G_ARM(), shirtM); armL.position.set(shoulderX, 1.45, 0);    // left hand  = local +X
    const handR = M(G_HAND(), skinM); handR.position.set(0, -0.56, 0.02);
    const handL = M(G_HAND(), skinM); handL.position.set(0, -0.56, 0.02);
    armR.add(handR); armL.add(handL);
    add(armL); add(armR); parts.push(handL, handR);

    // legs + shoes
    const legL = M(G_LEG(), legsMat); legL.position.set(-0.105, 0.81, 0);
    const legR = M(G_LEG(), legsMat); legR.position.set(0.105, 0.81, 0);
    const shoeL = M(G_SHOE(), shoeM); shoeL.position.set(0, -0.745, 0.04);
    const shoeR = M(G_SHOE(), shoeM); shoeR.position.set(0, -0.745, 0.04);
    legL.add(shoeL); legR.add(shoeR);
    add(legL); add(legR); parts.push(shoeL, shoeR);

    // accessories
    if (opt.badge) {
      const badge = M(G_BADGE(), mat(0xffcf4f)); badge.position.set(0.1, 1.4, 0.16); add(badge);
    }
    if (opt.necklace) {
      const chain = M(G_CHAIN(), mat(0xffd24f)); chain.position.set(0, 1.36, 0.155); add(chain);
    }

    add(blobShadow(0.42));
    parts.pop();                       // the shadow is not a hit target / fade part
    if (opt.scale) g.scale.setScalar(opt.scale);

    g.userData = {
      body: torso, head, hair, legL, legR, armL, armR, shoeL, shoeR, handL, handR,
      pelvis, belt, neck, jaw, skirt: skirtMesh, parts
    };
    return g;
  }

  function makeCar(opt) {
    const g = new THREE.Group();
    const bodyC = opt.color || 0xc23a2e;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 3.3), mat(bodyC));
    body.position.y = 0.62;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.7), mat(opt.isPolice ? 0x14181f : 0x25303c));
    cabin.position.set(0, 1.18, -0.15);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.9), mat(bodyC));
    hood.position.set(0, 0.88, 1.35);
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.8), mat(bodyC));
    trunk.position.set(0, 0.88, -1.5);

    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheels = [];
    [[-0.9, 1.05], [0.9, 1.05], [-0.9, -1.15], [0.9, -1.15]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(wheelGeo, mat(0x141414));
      w.position.set(wx, 0.34, wz);
      wheels.push(w); g.add(w);
    });
    g.add(body, cabin, hood, trunk);

    if (opt.isPolice) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.9), mat(0x222));
      bar.position.set(0, 1.56, -0.15);
      const lr = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.32), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
      lr.position.set(0, 1.64, -0.15);
      const lb = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.32), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
      lb.position.set(0, 1.64, -0.15);
      g.add(bar, lr, lb);
      g.userData.lightRed = lr; g.userData.lightBlue = lb;
    }
    // animated side doors (hinged at the front edge)
    const doorGeo = new THREE.BoxGeometry(0.06, 0.5, 1.1);
    const doorL = new THREE.Mesh(doorGeo, mat(bodyC));
    const doorR = new THREE.Mesh(doorGeo, mat(bodyC));
    const hingeL = new THREE.Group(); hingeL.position.set(-0.86, 0.62, 0.6); doorL.position.set(0, 0, -0.55); hingeL.add(doorL);
    const hingeR = new THREE.Group(); hingeR.position.set(0.86, 0.62, 0.6); doorR.position.set(0, 0, -0.55); hingeR.add(doorR);
    g.add(hingeL, hingeR);
    g.add(blobShadow(1.1));
    g.userData.wheels = wheels;
    g.userData.body = body;
    g.userData.cabin = cabin; g.userData.hood = hood; g.userData.trunk = trunk;
    g.userData.doorL = hingeL; g.userData.doorR = hingeR;
    g.userData.doorMeshes = [doorL, doorR];
    return g;
  }

  // swing the driver/passenger door open then shut after a car entry/exit
  function openCarDoor(car, side) {
    car.doorT = 0.0001;
    car.doorSide = side === 1 ? 1 : -1;
  }
  function updateCarDoor(car, dt) {
    if (!car.doorT) return;
    car.doorT += dt;
    const t = car.doorT;
    let a = 0;
    if (t < 0.22) a = t / 0.22;
    else if (t < 0.5) a = 1;
    else if (t < 0.8) a = 1 - (t - 0.5) / 0.3;
    else { car.doorT = 0; }
    const ang = a * 1.05;
    const u = car.group.userData;
    if (u.doorL) u.doorL.rotation.y = car.doorSide === 1 ? 0 : ang;
    if (u.doorR) u.doorR.rotation.y = car.doorSide === 1 ? -ang : 0;
  }

  // small driver figure seated inside the cabin (visible through the cabin)
  function makeDriver(isPolice) {
    const g = new THREE.Group();
    const shirt = isPolice ? 0x1f3a6f : CIV_SHIRTS[(rng() * CIV_SHIRTS.length) | 0];
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.26), mat(shirt));
    torso.position.set(-0.34, 0.96, -0.2);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat(0xe8b88a));
    head.position.set(-0.34, 1.3, -0.2);
    g.add(torso, head);
    if (isPolice) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), mat(0x1f3a6f));
      cap.position.set(-0.34, 1.5, -0.2);
      g.add(cap);
    }
    return g;
  }

  /* ---------------- Entities ---------------- */
  const NPCs = [];
  const cars = [];
  const bloodParticles = [];
  const splats = [];
  const tracers = [];
  const smokes = [];      // rising explosion/damage smoke puffs
  const corpses = [];
  const hittables = [];   // meshes raycast can hit (NPC bodies + cars)

  let player = null;

  /* ---------------- Player ---------------- */
  function createPlayer() {
    // Tommy-Vercetti-ish look: pale tropical shirt, dark slacks, tan skin
    const g = makeHuman({
      shirt: 0xf3efe2, pants: 0x2b3140, hair: 0x2a1c12, face: true, shoe: 0x1a181e,
      shirtTex: shirtTexture(0xf3efe2, 0x2fa8a0, 1)
    });
    scene.add(g);

    // ---- held weapon models, all built along +Z then mounted on the RIGHT HAND ----
    function handMount(model, name) {
      const mount = new THREE.Group();
      mount.rotation.x = Math.PI / 2;            // model +Z -> points along the forearm
      mount.add(model);
      mount.position.set(0.09, -0.56, 0.02);     // at the hand, right side of the body
      mount.name = name;
      return mount;
    }

    // FISTS: skin-coloured knuckles so bare-hand punching is visible too
    const fist = new THREE.Group();
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.18), mat(0xe8b88a));
    knuckle.position.z = 0.1;
    const wrist = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.1), mat(0xd9a87a));
    wrist.position.z = 0.02;
    fist.add(knuckle, wrist);

    // KNIFE: blade + guard + handle
    const knife = new THREE.Group();
    const kBlade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.42), mat(0xd9d9d9));
    kBlade.position.z = 0.24;
    const kGuard = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.03), mat(0x3a2a1a));
    kGuard.position.z = 0.03;
    const kHandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.15), mat(0x241c14));
    kHandle.position.z = -0.06;
    knife.add(kBlade, kGuard, kHandle);

    // PISTOL: slide + barrel + grip
    const gun = new THREE.Group();
    const gBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.26), mat(0x1c1c1c));
    gBody.position.z = 0.1;
    const gBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.16), mat(0x101010));
    gBarrel.position.set(0, 0.035, 0.29);
    const gGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.17, 0.09), mat(0x2a2a30));
    gGrip.position.set(0, -0.12, -0.01);
    gGrip.rotation.x = -0.25;
    gun.add(gBody, gBarrel, gGrip);

    // AK-47: receiver + barrel + wooden foregrip & stock + curved magazine
    const ak = new THREE.Group();
    const akReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.74), mat(0x2a2a2e));
    const akBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.34), mat(0x161616));
    akBarrel.position.set(0, 0.03, 0.52);
    const akForegrip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.26), mat(0x7a4a22));
    akForegrip.position.set(0, -0.02, 0.3);
    const akStock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.36), mat(0x7a4a22));
    akStock.position.set(0, -0.03, -0.52);
    const akMag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.11), mat(0x1c1c1c));
    akMag.position.set(0, -0.16, 0.08);
    akMag.rotation.x = -0.45;
    ak.add(akReceiver, akBarrel, akForegrip, akStock, akMag);

    g.userData.fist = handMount(fist, 'wp-fist');
    g.userData.knife = handMount(knife, 'wp-knife');
    g.userData.gun = handMount(gun, 'wp-gun');
    g.userData.ak = handMount(ak, 'wp-ak');
    g.userData.armR.add(g.userData.fist);        // default: bare fists on show

    const muzzle = new THREE.Group();
    muzzle.position.set(0, 1.45, 0.42);

    return {
      group: g, pos: SPAWN.clone(), prevPos: SPAWN.clone(), vel: new THREE.Vector3(),
      hp: 100, maxHp: 100, weapon: 0,
      ammoStore: { 2: MAG_SIZE, 3: AK_MAG },   // per-weapon reserve
      shotsFired: 0,
      wanted: 0, crimeTimer: 0, speed: 6.4, sprint: 1.65,
      inCar: null, muzzle,
      facing: 0, anim: 0, idleT: 0, meleeT: 0, meleeTotal: 0.32,
      isMoving: false, targetSeen: false,
      switchT: 0, reloadT: 0, reloadTotal: 0, recoil: 0, bloom: 0,
      attackCd: 0, shotCd: 0, dead: false, lastFire: 0
    };
  }

  function getAmmo(w) { return player.ammoStore[w] || 0; }
  function setAmmo(w, v) { player.ammoStore[w] = Math.max(0, v); }

  function setPlayerWeapon(w) {
    if (!player) return;
    if (w === player.weapon) { Sfx.click(); return; }
    player.weapon = w;
    player.switchT = SWITCH_TIME;            // brief draw animation blocks firing
    player.reloadT = 0;                      // switching cancels a reload
    player.bloom = 0;
    const u = player.group.userData, armR = u.armR;
    [u.knife, u.gun, u.ak, u.fist].forEach(m => armR.remove(m));
    if (w === 1) armR.add(u.knife);          // 🔪 in the right hand
    else if (w === 2) armR.add(u.gun);       // pistol in the right hand
    else if (w === 3) armR.add(u.ak);        // rifle in the right hand
    else armR.add(u.fist);                   // bare knuckles on show
    Sfx.click();
    updateWeaponHUD();                       // also refreshes the held-item icon
    updateReloadHUD();
  }

  /* ---------------- NPC creation ---------------- */
  function randomWalkablePoint() {
    for (let t = 0; t < 40; t++) {
      const bi = (rng() * N) | 0, bj = (rng() * N) | 0;
      const minX = cx(bi) + ROAD / 2 + 1, maxX = cx(bi + 1) - ROAD / 2 - 1;
      const minZ = cz(bj) + ROAD / 2 + 1, maxZ = cz(bj + 1) - ROAD / 2 - 1;
      const x = minX + rng() * (maxX - minX), z = minZ + rng() * (maxZ - minZ);
      if (!isInsideBuilding(x, z) && !isInsideWater(x, z)) return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3((rng() * 2 - 1) * CENTER, 0, (rng() * 2 - 1) * CENTER);
  }
  function randomRoadNode() {
    const i = (rng() * (N + 1)) | 0, j = (rng() * (N + 1)) | 0;
    return new THREE.Vector3(cx(i), 0, cz(j));
  }
  function randomLocalPoint(pos, r) {
    for (let t = 0; t < 20; t++) {
      const a = rng() * Math.PI * 2, d = 2 + rng() * r;
      const x = pos.x + Math.cos(a) * d, z = pos.z + Math.sin(a) * d;
      if (!isInsideBuilding(x, z) && !isInsideWater(x, z)) return new THREE.Vector3(x, 0, z);
    }
    return pos.clone();
  }

  /* Vice City street palette: pastel shirts, tan/brown skins, loud caps */
  const CIV_SHIRTS = [0xff6f91, 0x40e0d0, 0xffd166, 0x9b7bff, 0xff9f68, 0x6ad1ff, 0xf3f0e4, 0xff4fd8, 0xa0e061, 0xf7e9d0];
  const CIV_PANTS = [0x2b3140, 0x3a3a48, 0x5a4a3a, 0x555a66, 0x1f2a3a, 0x4a3f55, 0x6b6b78];
  const SKINS = [0xf1c8a0, 0xe0ac7a, 0xc98d5a, 0xa86f45, 0x8a5a3a, 0x6b4024, 0xf5d6b8];
  const HAIRS = [0x120d09, 0x24180f, 0x3a2414, 0x5a3a1c, 0x8a6a3a, 0xd8c08a, 0x2a2a2e];
  const CAPS = [0xff4f6a, 0x3f8f5f, 0x2f6fbf, 0xffd25e, 0x9b6bff];
  function makeNPC(type) {
    const isPolice = type === 'police';
    let opt;
    if (isPolice) {
      opt = {
        shirt: 0x1f3a6f, pants: 0x15151c, skin: SKINS[(rng() * SKINS.length) | 0], hair: 0x140f0a,
        hat: 'police', capColor: 0x142850, sunglasses: rng() < 0.5, badge: true,
        belt: 0x0c0c10, shoe: 0x0d0d10, scale: 0.97 + rng() * 0.06
      };
    } else {
      const female = rng() < 0.42;
      const hairStyle = female ? (rng() < 0.7 ? 'long' : 'short')
        : (rng() < 0.1 ? 'bald' : (rng() < 0.25 ? 'long' : 'short'));
      opt = {
        female: female,
        shirt: CIV_SHIRTS[(rng() * CIV_SHIRTS.length) | 0],
        pants: CIV_PANTS[(rng() * CIV_PANTS.length) | 0],
        skin: SKINS[(rng() * SKINS.length) | 0],
        hair: HAIRS[(rng() * HAIRS.length) | 0],
        hairStyle: hairStyle,
        sunglasses: rng() < 0.38,
        hat: rng() < 0.1 ? 'baseball' : undefined,
        capColor: CAPS[(rng() * CAPS.length) | 0],
        necklace: rng() < 0.18,
        shirtTex: null,
        shoe: [0x1b1a20, 0x2a2a30, 0x3a2a1c][(rng() * 3) | 0],
        belt: 0x24242a,
        scale: 0.94 + rng() * 0.1
      };
      if (rng() < 0.45) {
        opt.shirtTex = shirtTexture(opt.shirt, PRINT_ACCENTS[(rng() * PRINT_ACCENTS.length) | 0], (rng() * 4) | 0);
      }
      if (female && rng() < 0.55) {
        opt.skirt = true;
        opt.skirtColor = [0xff6f91, 0x40e0d0, 0xffd166, 0x9b7bff, 0xf3f0e4, 0x2b3140][(rng() * 6) | 0];
      }
    }
    const g = makeHuman(opt);
    const start = isPolice ? randomRoadNode() : randomWalkablePoint();
    g.position.copy(start);
    scene.add(g);

    const npc = {
      type, group: g, pos: start.clone(),
      hp: isPolice ? 70 : 40, maxHp: isPolice ? 70 : 40,
      state: isPolice ? 'patrol' : 'walk',
      target: null, wanderTimer: 0, speed: isPolice ? 3.4 : 1.9,
      dead: false, deathT: 0, fleeDir: new THREE.Vector3(),
      path: [], pathI: 0, shootCd: rng() * 1.2, losTimer: 0, los: true,
      anim: 0, facing: 0, runSpeed: 5.2
    };
    g.userData.owner = npc;
    g.userData.parts.forEach(p => p.userData.owner = npc);
    g.userData.head.userData.head = true;
    NPCs.push(npc);
    npc.group.userData.parts.forEach(p => hittables.push(p));
    return npc;
  }

  function makeCarEntity(opt) {
    const g = makeCar(opt);
    scene.add(g);
    const route = routes[(rng() * routes.length) | 0];
    const wp = (rng() * route.length) | 0;
    const start = new THREE.Vector3(route[wp][0], 0, route[wp][1]);
    g.position.copy(start);
    const car = {
      group: g, route, wpIndex: wp, pos: start.clone(), heading: 0, speed: opt.speed || 7.5,
      isPolice: !!opt.isPolice, color: opt.color, maxSpeed: opt.speed || 7.5,
      curSpeed: opt.speed || 7.5,
      laneOffset: (rng() < 0.5 ? 1 : -1) * (ROAD / 4), honkT: 0, dead: false,
      stolen: false, driverMesh: null,
      mode: 'traffic', deployed: false, deploySide: 2.2,   // police pursuit state
      prevPos: start.clone(), prevHeading: 0               // render-interpolation state
    };
    // every AI car starts with a visible driver inside
    const drv = makeDriver(car.isPolice);
    g.add(drv);
    car.driverMesh = drv;
    g.userData.owner = car;
    [g.userData.body, g.userData.cabin, g.userData.hood, g.userData.trunk].forEach(m => {
      m.userData.owner = car;
      hittables.push(m);
    });
    cars.push(car);
    return car;
  }

  /* ---------------- River traffic: boats cruising under the bridges ---------------- */
  const boats = [];
  function makeBoat(dirX, startX) {
    const g = new THREE.Group();
    const hullC = [0xb03a2e, 0x2e6fb0, 0xd9c27a, 0x4a8f5f, 0xe8e4da][(rng() * 5) | 0];
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 4.8), mat(hullC));
    hull.position.y = 0.3;
    const bow = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.45, 1.5), mat(hullC));
    bow.position.set(0, 0.27, 2.9);                       // tapered nose (same tone)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.48, 1.7), mat(0xe9e4d4));
    cabin.position.set(0, 0.82, -0.5);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.2, 1.74), mat(0x223649));
    glass.position.set(0, 1.02, -0.5);
    g.add(hull, bow, cabin, glass);
    scene.add(g);

    const boat = {
      group: g,
      pos: new THREE.Vector3(startX, 0, RIVER_Z + (rng() * 2 - 1) * (RIVER_HALF - 8)),
      dirX: dirX >= 0 ? 1 : -1,
      speed: 2 + rng() * 2.2,
      baseZ: RIVER_Z + (rng() * 2 - 1) * (RIVER_HALF - 8),
      phase: rng() * Math.PI * 2,
      wobT: rng() * 10, wakeT: 0.5, prevZ: 0
    };
    boat.prevZ = boat.pos.z;
    g.rotation.y = boat.dirX === 1 ? Math.PI / 2 : -Math.PI / 2;
    boats.push(boat);
    return boat;
  }

  function updateBoat(b, dt) {
    b.wobT += dt;
    // steady cruise along the river + lazy weave between the banks
    b.pos.x += b.dirX * b.speed * dt;
    b.pos.z = b.baseZ + Math.sin(b.wobT * 0.35 + b.phase) * (RIVER_HALF - 8);
    // wrap around the map edges -> endless traffic in both directions
    if (b.pos.x > CENTER + 16) b.pos.x = -CENTER - 16;
    if (b.pos.x < -CENTER - 16) b.pos.x = CENTER + 16;

    const vz = (b.pos.z - b.prevZ) / Math.max(dt, 1e-4);
    b.prevZ = b.pos.z;
    const targetH = Math.atan2(b.dirX * b.speed, vz);
    let dh = targetH - b.group.rotation.y;                 // shortest-path yaw glide
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    b.group.rotation.y += dh * Math.min(1, dt * 2.5);
    b.group.position.set(b.pos.x, Math.sin(b.wobT * 2.1 + b.phase) * 0.05, b.pos.z);
    b.group.rotation.z = Math.sin(b.wobT * 1.6 + b.phase) * 0.05;   // gentle roll

    // foam wake behind the stern
    b.wakeT -= dt;
    if (b.wakeT <= 0) {
      b.wakeT = 0.17;
      spawnSmoke(new THREE.Vector3(
        b.pos.x - Math.sin(b.group.rotation.y) * 2.6,
        0.45,
        b.pos.z - Math.cos(b.group.rotation.y) * 2.6), 0.75);
    }
  }

  function spawnWorld() {
    if (spawned) return;
    buildRoutes();
    // CROWDED streets: 80 civilians walking around
    for (let i = 0; i < 80; i++) makeNPC('civilian');
    // and a heavy police PRESENCE on foot (24 beat cops)
    for (let i = 0; i < 24; i++) makeNPC('police');
    // busy traffic across all cities
    const CAR_COLORS = [0xc23a2e, 0x2e6fc2, 0x2e8f4a, 0xc2a02e, 0x7a3ac2];
    for (let i = 0; i < 12; i++) makeCarEntity({ color: CAR_COLORS[(rng() * CAR_COLORS.length) | 0] });
    // police cruisers get a response rank used by the wanted-level escalation
    let beatIdx = 0;
    for (let i = 0; i < 8; i++) {
      const c = makeCarEntity({ isPolice: true, color: 0xe8e8e8, speed: 9.5 });
      c.beatIdx = beatIdx++;
    }
    for (let i = 0; i < 14; i++) makeCarEntity({ color: [0x2e6fc2, 0x2e8f4a, 0xc2a02e, 0x4a4a52, 0x8a5a2e][(rng() * 5) | 0], speed: 6 + rng() * 3 });
    // river life: cruisers & fishing boats running BOTH directions under the bridges
    for (let k = 0; k < 11; k++) {
      const x = -CENTER + 10 + k * ((CENTER * 2 - 20) / 10);
      makeBoat(k % 2 === 0 ? 1 : -1, x);
    }

    spawned = true;
  }

  /* ---------------- Blood FX ---------------- */
  function spawnBlood(pos, dir, amount, color) {
    const n = Math.min(amount || 8, 26);
    for (let i = 0; i < n; i++) {
      const size = 0.06 + rng() * 0.12;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color: color || 0xb00a0a, transparent: true, opacity: 1, depthWrite: false }));
      p.position.set(pos.x + (rng() - 0.5) * 0.3, pos.y + 0.2 + rng() * 0.5, pos.z + (rng() - 0.5) * 0.3);
      const dirH = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      const side = new THREE.Vector3(-dirH.z, 0, dirH.x);
      const v = dirH.clone().multiplyScalar(1 + rng() * 2.5).add(side.multiplyScalar((rng() - 0.5) * 2.5));
      v.y = 1.5 + rng() * 2.5;
      bloodParticles.push({ mesh: p, vel: v, life: 0.7 + rng() * 0.5, t: 0 });
      scene.add(p);
    }
  }
  function spawnSplat(pos) {
    if (splats.length > 80) { const old = splats.shift(); scene.remove(old.mesh); }
    const r = 0.3 + rng() * 0.4;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 10), new THREE.MeshBasicMaterial({ color: 0x7a0505, transparent: true, opacity: 0.85, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.05 + rng() * 0.02, pos.z);
    scene.add(m);
    splats.push({ mesh: m, life: 18 + rng() * 12, t: 0 });
  }
  function spawnScorch(pos) {
    if (splats.length > 80) { const old = splats.shift(); scene.remove(old.mesh); }
    const r = 1.6 + rng() * 0.8;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 12), new THREE.MeshBasicMaterial({ color: 0x0b0b0b, transparent: true, opacity: 0.8, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, 0.06, pos.z);
    scene.add(m);
    splats.push({ mesh: m, life: 30, t: 0 });
  }
  // grey dust where a bullet digs into a building facade
  function spawnDust(pos, dir) {
    for (let i = 0; i < 6; i++) {
      const size = 0.06 + rng() * 0.1;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xd8cfc8 : 0xb8aeb0, transparent: true, opacity: 0.9, depthWrite: false }));
      p.position.copy(pos);
      const v = new THREE.Vector3((rng() - 0.5) * 2.2, 0.6 + rng() * 1.8, (rng() - 0.5) * 2.2).addScaledVector(dir, -1.2);
      bloodParticles.push({ mesh: p, vel: v, life: 0.3 + rng() * 0.2, t: 0 });
      scene.add(p);
    }
  }
  // yellow sparks when bullets ricochet off metal
  function spawnSparks(pos, dir) {
    for (let i = 0; i < 6; i++) {
      const size = 0.05 + rng() * 0.07;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd66a : 0xfff2c8, transparent: true, opacity: 1, depthWrite: false }));
      p.position.copy(pos);
      const v = new THREE.Vector3((rng() - 0.5) * 5, 1 + rng() * 4, (rng() - 0.5) * 5).addScaledVector(dir, -2);
      bloodParticles.push({ mesh: p, vel: v, life: 0.22 + rng() * 0.18, t: 0 });
      scene.add(p);
    }
  }
  // rising smoke puffs (explosions & damaged engines)
  function spawnSmoke(pos, scale) {
    if (smokes.length > 90) { const old = smokes.shift(); scene.remove(old.mesh); }
    const s = scale || 1;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 6, 6), new THREE.MeshBasicMaterial({ color: rng() < 0.3 ? 0x3a3a3a : 0x242424, transparent: true, opacity: 0.55, depthWrite: false }));
    m.position.copy(pos);
    scene.add(m);
    smokes.push({
      mesh: m,
      vel: new THREE.Vector3((rng() - 0.5) * 0.7, 1.4 + rng() * 1.6, (rng() - 0.5) * 0.7),
      grow: 1.1 + rng() * 1.2, life: 1.4 + rng() * 1.2, t: 0
    });
  }
  function ejectShell(pos, dir) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.12), new THREE.MeshBasicMaterial({ color: 0xd8a63a, transparent: true }));
    m.position.copy(pos);
    const side = new THREE.Vector3(dir.z, 0, -dir.x);   // perpendicular to aim
    if (side.lengthSq() < 0.001) side.set(1, 0, 0);
    side.normalize().multiplyScalar(1.2 + rng() * 1.6);
    side.y = 2 + rng() * 1.5;
    bloodParticles.push({ mesh: m, vel: side, life: 1.1, t: 0 });
    scene.add(m);
  }
  function spawnTracer(from, to, color) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.01) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, len), new THREE.MeshBasicMaterial({ color: color || 0xffe08a }));
    m.position.copy(from).addScaledVector(dir, 0.5);
    m.lookAt(to);
    scene.add(m);
    tracers.push({ mesh: m, life: 0.06, t: 0 });
  }
  function spawnMuzzle(pos) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd66a }));
    m.position.copy(pos);
    scene.add(m);
    tracers.push({ mesh: m, life: 0.05, t: 0 });
  }

  /* ---------------- Damage ---------------- */
  const raycaster = new THREE.Raycaster();

  // NPC communication system
  const NPC_SOUNDS = {
    civilianPain: () => {
      const freq = 220 + Math.random() * 220; // panic scream pitch
      Sfx.tone(freq, 0.4, 'sawtooth', 0.3, 80);
      Sfx.noise(0.3, 0.4, freq * 0.8, true);
    },
    civilianPanic: () => {
      // high-pitched panic when police nearby
      Sfx.tone(880 + Math.random() * 440, 0.3, 'square', 0.25, 100);
      Sfx.noise(0.4, 0.3, 1200, true);
    },
    policeWarning: () => {
      // police yelling "Stop! Police!"
      const freq = 150 + Math.random() * 50;
      Sfx.tone(freq, 0.25, 'square', 0.35, 60);
      Sfx.siren(); // use existing siren sound for backup call
    },
    policeBackup: () => {
      // police calling backup
      Sfx.tone(110, 0.4, 'square', 0.3, 50);
      for (let i = 0; i < 3; i++) {
        setTimeout(() => Sfx.tone(110 + i * 30, 0.15, 'square', 0.25), i * 80);
      }
    },
    civilianWarning: () => {
      // civilian warning when police approach
      Sfx.tone(660, 0.2, 'square', 0.2, 400);
    },
    highWantedWarning: () => {
      // increased police response
      Sfx.warn(); // existing warning sound
      for (let i = 0; i < 2; i++) {
        setTimeout(() => Sfx.tone(110 + i * 40, 0.2, 'square', 0.25), i * 100);
      }
    }
  };

  function triggerNPCSpeech(npc, cause) {
    if (!Sfx.enabled) return;
    
    if (npc.type === 'civilian') {
      if (npc.hp <= 0) {
        // death scream
        NPC_SOUNDS.civilianPain();
        floatTextWorld('Agh!', npc.group.position.x, 2.0, npc.group.position.z, '#ff6');
      } else {
        // pain scream
        NPC_SOUNDS.civilianPain();
        floatTextWorld('Whoa!', npc.group.position.x, 2.0, npc.group.position.z, '#ff6');
      }
      
      // check if police nearby
      const nearbyPolice = NPCs.some(p => p.type === 'police' && !p.dead && p.pos.distanceTo(npc.pos) < 15);
      if (nearbyPolice) {
        NPC_SOUNDS.civilianWarning();
      }
      
    } else if (npc.type === 'police') {
      if (cause === 'playerShot') {
        NPC_SOUNDS.policeWarning();
        floatTextWorld('Hey! What are you doing?!', npc.group.position.x, 2.0, npc.group.position.z, '#66f');
      }
    }
  }

  function updateNPCSpeech() {
    // dynamic police backup calls based on wanted level
    if (player.wanted >= 3) {
      // police call backup when player has high wanted level
      NPCs.forEach(npc => {
        if (npc.type === 'police' && !npc.dead && npc.state === 'patrol' && 
            npc.pos.distanceTo(player.pos) < 30) {
          if (!npc.backupCalled && Math.random() < 0.02) {
            NPC_SOUNDS.policeBackup();
            npc.backupCalled = true;
            setTimeout(() => { npc.backupCalled = false; }, 5000);
          }
        }
      });
    }
    
    // police coordinate when multiple officers see crime
    if (player.wanted >= 2) {
      const policeNearPlayer = NPCs.filter(n => n.type === 'police' && !n.dead && n.state === 'patrol' &&
                                               n.pos.distanceTo(player.pos) < 25);
      if (policeNearPlayer.length >= 2 && !policeNearPlayer[0].coordinated) {
        // police coordinate approach
        policeNearPlayer.forEach(p => p.coordinated = true);
        Sfx.tone(100, 0.3, 'square', 0.25, 60);
        floatTextWorld('Police coordinated!', player.pos.x, 2.4, player.pos.z, '#66f');
        setTimeout(() => {
          policeNearPlayer.forEach(p => p.coordinated = false);
        }, 2000);
      }
    }
  }

  function damageNPC(npc, dmg, hitPoint, dir) {
    if (npc.dead) return;
    npc.hp -= dmg;
    npc.meshFlash = 0.12;
    spawnBlood(hitPoint || npc.pos.clone().setY(1.1), dir, dmg > 30 ? 14 : 8);
    Sfx.blood();
    
    // trigger NPC speech based on who got hit
    if (npc.type === 'civilian') {
      triggerNPCSpeech(npc, 'shot');
    } else if (npc.type === 'police') {
      triggerNPCSpeech(npc, 'playerShot');
    }
    
    if (npc.hp <= 0) killNPC(npc, dir);
    else if (npc.type === 'civilian') { npc.state = 'flee'; npc.fleeDir.copy(dir).setY(0).normalize(); npc.fleeT = 4; }
  }

  function killNPC(npc, dir) {
    npc.dead = true;
    npc.deathT = 0;
    Sfx.die();
    spawnBlood(npc.pos.clone().setY(1.0), dir, 20);
    spawnSplat(npc.pos.clone());
    // mark meshes non-hittable
    npc.group.userData.parts.forEach(p => { const i = hittables.indexOf(p); if (i >= 0) hittables.splice(i, 1); });
    corpses.push(npc);
  }

  function playerTakeDamage(dmg, from) {
    if (player.dead) return;
    player.hp -= dmg;
    flash();
    spawnBlood(player.pos.clone().setY(1.1), from ? player.pos.clone().sub(from).normalize() : new THREE.Vector3(1, 0, 0), 6);
    if (player.hp <= 0) {
      player.hp = 0;
      player.dead = true;
      showWasted();
    }
    updateHealthHUD();
  }

  /* ---------------- Combat ---------------- */
  const _aim = new THREE.Vector3();
  const _aimDir = new THREE.Vector3();
  const _ray = new THREE.Raycaster();
  const _ndc = new THREE.Vector2();
  const _shotTargets = [];
  const _muzzleW = new THREE.Vector3();

  function aimInfo() {
    // The third-person crosshair sits at the exact centre of the screen: the
    // aim point is where the centre camera ray meets the ground plane.
    _ndc.set(0, 0);
    _ray.setFromCamera(_ndc, camera);
    const o = _ray.ray.origin, d = _ray.ray.direction;
    if (d.y < -0.02) {
      const t = -o.y / d.y;
      _aim.copy(o).addScaledVector(d, Math.max(t, 0));
    } else {
      _aim.copy(o).addScaledVector(d, 80);
      _aim.y = 0;
    }
    _aimDir.copy(_aim).sub(player.pos).setY(0);
    if (_aimDir.lengthSq() < 0.0001) _aimDir.set(Math.sin(camYaw), 0, Math.cos(camYaw));
    _aimDir.normalize();
    return { point: _aim, dir: _aimDir };
  }

  // ---- Aim assist ("chỉnh tâm"): snap shots toward civilians/police near the crosshair ----
  const _assistPt = new THREE.Vector3();
  function findAssistTarget(origin, aimDirXZ, maxDist, angle, headAngle) {
    let best = null, bestAng = angle || ASSIST_ANGLE;
    for (let i = 0; i < NPCs.length; i++) {
      const n = NPCs[i];
      if (n.dead) continue;
      const dx = n.pos.x - origin.x, dz = n.pos.z - origin.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.8 || dist > maxDist) continue;
      const dot = (dx * aimDirXZ.x + dz * aimDirXZ.z) / dist;
      const ang = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (ang >= bestAng) continue;
      if (!hasLOS(origin, n.pos)) continue;   // no assist through walls
      bestAng = ang; best = n;
    }
    if (!best) return null;
    const head = bestAng < (headAngle || ASSIST_HEAD_ANGLE);   // crosshair dead-centre -> headshot
    _assistPt.set(best.pos.x, head ? 1.72 : 1.08, best.pos.z);
    return _assistPt;
  }

  /* ---- Weapon handling: draw time, timed reload, recoil & bloom ---- */
  function canFire() { return player && player.switchT <= 0 && player.reloadT <= 0; }

  function startReload(silent) {
    const w = WEAPONS[player.weapon];
    if (!w || w.kind !== 'gun' || player.reloadT > 0) return;
    if (getAmmo(player.weapon) >= w.mag) {
      if (!silent) toast('BĂNG ĐẠN ĐÃ ĐẦY');
      return;
    }
    player.reloadT = player.reloadTotal = w.reload;
    Sfx.reload();
    updateReloadHUD();
    if (!silent) toast('ĐANG NẠP ĐẠN ' + w.name + '…');
  }

  function finishReload() {
    const w = WEAPONS[player.weapon];
    if (!w || w.kind !== 'gun') return;
    setAmmo(player.weapon, w.mag);
    updateAmmoHUD();
    updateReloadHUD();
    toast('Đã nạp đầy ' + w.name + ' · ' + w.mag + ' viên');
    Sfx.click();
  }

  // Crosshair feedback: light up when an enemy sits inside the assist cone.
  let _lockTimer = 0;
  function updateTargetHint(dt) {
    _lockTimer -= dt;
    if (_lockTimer > 0) return;
    _lockTimer = 0.12;
    const w = WEAPONS[player.weapon];
    let seen = false;
    if (!player.dead && !player.inCar && w && w.kind === 'gun') {
      const a = aimInfo();
      const cone = aimHeld ? ASSIST_ANGLE_AIM : ASSIST_ANGLE;
      for (let i = 0; i < NPCs.length; i++) {
        const n = NPCs[i];
        if (n.dead) continue;
        const dx = n.pos.x - player.pos.x, dz = n.pos.z - player.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.8 || dist > 70) continue;
        const dot = (dx * a.dir.x + dz * a.dir.z) / dist;
        if (Math.acos(Math.max(-1, Math.min(1, dot))) < cone) { seen = true; break; }
      }
    }
    if (seen !== player.targetSeen) {
      player.targetSeen = seen;
      if (typeof crosshair !== 'undefined' && crosshair) crosshair.classList.toggle('target', seen);
    }
  }

  function fireGun() {
    if (!player || player.dead || !canFire()) return;
    const w = WEAPONS[player.weapon];
    if (!w || w.kind !== 'gun') return;
    if (player.shotCd > 0) return;
    if (getAmmo(player.weapon) <= 0) {
      Sfx.empty();
      startReload(true);
      player.shotCd = 0.3;
      return;
    }
    player.shotCd = w.cd;
    setAmmo(player.weapon, getAmmo(player.weapon) - 1);
    player.shotsFired = (player.shotsFired || 0) + 1;
    player.recoil = 1;
    player.bloom = Math.min(1.8, player.bloom + (w.bloom || 0.2));
    addCameraRecoil(w);
    Sfx[w.snd]();
    const a = aimInfo();
    player.group.localToWorld(_muzzleW.copy(player.muzzle.position));
    spawnMuzzle(_muzzleW);
    ejectShell(_muzzleW, a.dir);
    pulseAmmo();
    updateAmmoHUD();
    updateShotsHUD();
    floatText(String(getAmmo(player.weapon)), W / 2 + 18, H / 2 - 26, '#7df');

    // direction: aim-assist onto NPCs first, otherwise shoot toward the exact
    // ground point under the crosshair — bullets strike cars/walls standing
    // between muzzle and target instead of sailing over them
    const dir = new THREE.Vector3();
    const assist = findAssistTarget(
      _muzzleW, a.dir, Math.min(w.range, ASSIST_RANGE),
      aimHeld ? ASSIST_ANGLE_AIM : ASSIST_ANGLE,
      aimHeld ? ASSIST_HEAD_AIM : ASSIST_HEAD_ANGLE
    );
    if (assist) dir.copy(assist).sub(_muzzleW).normalize();
    else {
      dir.copy(a.point).sub(_muzzleW);
      if (dir.lengthSq() < 0.02) dir.copy(a.dir).setY(-0.03);
      dir.normalize();
    }
    // spread: aim/tighter when standing still and holding right-mouse;
    // spraying the AK blooms the cone until you let go
    const spread = w.spread * (1 + player.bloom) * (aimHeld ? 0.5 : 1) * (player.isMoving ? 1.3 : 1);
    dir.x += (rng() - 0.5) * spread;
    dir.y += (rng() - 0.5) * spread * 0.6;
    dir.z += (rng() - 0.5) * spread;
    dir.normalize();

    _ray.set(_muzzleW, dir);
    _ray.far = w.range;                       // bullets fly much farther now
    _shotTargets.length = 0;
    for (let i = 0; i < buildingMeshes.length; i++) _shotTargets.push(buildingMeshes[i]);
    for (let i = 0; i < hittables.length; i++) _shotTargets.push(hittables[i]);
    const hits = _ray.intersectObjects(_shotTargets, false);
    let hitOwner = null, hitPoint = null, hitHead = false, hitBuilding = false;
    if (hits.length) {
      const h = hits[0];
      hitOwner = h.object.userData.owner || null;
      hitHead = !!h.object.userData.head;
      hitPoint = h.point;
      hitBuilding = !hitOwner;
    } else {
      // fall back: extend to ground
      const tg = -_muzzleW.y / dir.y;
      hitPoint = _muzzleW.clone().addScaledVector(dir, Math.max(tg, 0));
    }
    spawnTracer(_muzzleW, hitPoint, w.tracer);

    if (hitOwner) {
      if (hitOwner.type === 'civilian' || hitOwner.type === 'police') {
        const dmg = hitHead ? w.headDmg : w.dmg;
        damageNPC(hitOwner, dmg, hitPoint, dir);
        triggerCrime(hitOwner.type === 'police' ? 1.6 : 0.9);
        floatText(hitHead ? 'HEADSHOT!' : 'TRÚNG!', W / 2 + 18, H / 2 - 48, '#f66');
        hitMark();
      } else if (hitOwner.group && !hitOwner.dead) {
        // metal: sparks fly, the wreck smoulders and finally BLOWS UP
        spawnSparks(hitPoint, dir);
        Sfx.metalHit();
        hitOwner.shot = (hitOwner.shot || 0) + 1;
        const left = w.carHits - hitOwner.shot;
        floatText(left > 0 ? 'XE HỎNG · còn ' + left : '💥 NỔ TUNG!', W / 2 + 18, H / 2 - 48, left > 0 ? '#fc6' : '#f80');
        if (left <= 0) explodeCar(hitOwner);
      }
    } else if (hitBuilding) {
      spawnDust(hitPoint, dir);
      Sfx.thud();
    } else {
      spawnSplat(hitPoint.clone().setY(0));
    }

    if (getAmmo(player.weapon) <= 0) startReload(true);   // auto-reload, no click
  }

  function meleeAttack() {
    if (player.attackCd > 0) return;
    player.attackCd = 0.4;
    player.meleeT = player.meleeTotal;     // play the punch / knife-swing animation
    const a = aimInfo();
    const isKnife = player.weapon === 1;
    Sfx[isKnife ? 'knife' : 'punch']();
    const range = isKnife ? 1.9 : 1.6;
    const ang = isKnife ? 0.5 : 0.55;
    let hitAny = false;
    NPCs.forEach(npc => {
      if (npc.dead) return;
      const d = npc.pos.clone().sub(player.pos).setY(0);
      const dist = d.length();
      if (dist > range + 0.4) return;
      const cos = d.normalize().dot(a.dir);
      if (cos < Math.cos(ang)) return;
      const dmg = isKnife ? 34 : 12;
      hitAny = true;
      damageNPC(npc, dmg, npc.pos.clone().setY(1.1), a.dir);
      if (npc.dead) {
        triggerCrime(npc.type === 'police' ? 1.6 : 0.9);
      } else if (npc.type === 'civilian') {
        triggerCrime(0.7);
      } else if (npc.type === 'police') {
        triggerCrime(1.2);
      }
    });
    if (!hitAny) {
      // swing whoosh visual: brief arm anim handled by cooldown
      if (isKnife) Sfx.click();
    } else {
      hitMark();
    }
  }

  function triggerCrime(amount) {
    if (player.dead) return;
    player.wanted = Math.min(5, player.wanted + amount);
    player.crimeTimer = 0;
    if (amount >= 1.2) Sfx.warn();
    updateWantedHUD();
    // aggro police in radius
    NPCs.forEach(n => {
      if (n.type === 'police' && !n.dead && n.state !== 'chase' && n.pos.distanceTo(player.pos) < 60) {
        n.state = 'chase'; n.path = [];
      }
    });
  }

  function explodeCar(car) {
    if (car.dead) return;
    car.dead = true;
    car.curSpeed = 0;
    Sfx.boom();
    const p = car.pos.clone().setY(1);

    // fireball (outer orange + inner yellow core)
    const boom = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.95 }));
    boom.position.copy(p);
    scene.add(boom);
    tracers.push({ mesh: boom, life: 0.5, t: 0, grow: true });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 1 }));
    core.position.copy(p);
    scene.add(core);
    tracers.push({ mesh: core, life: 0.32, t: 0, grow: true });

    // debris + sparks flying out
    for (let i = 0; i < 14; i++) spawnBlood(p, new THREE.Vector3(rng() - 0.5, 0, rng() - 0.5), 2, 0x333330);
    for (let i = 0; i < 10; i++) spawnSparks(p, new THREE.Vector3(rng() - 0.5, 0, rng() - 0.5));
    // smoke column
    for (let i = 0; i < 9; i++) spawnSmoke(p.clone().add(new THREE.Vector3((rng() - 0.5) * 1.6, rng() * 1.2, (rng() - 0.5) * 1.6)), 0.9 + rng());
    // scorched asphalt + charred wreck stays on the map
    spawnScorch(car.pos);
    const u = car.group.userData;
    const wreckParts = [u.body, u.cabin, u.hood, u.trunk].concat(u.doorMeshes || []);
    wreckParts.forEach(m => { if (m && m.material && m.material.color) m.material.color.setHex(0x181818); });
    if (u.lightRed) { u.lightRed.visible = false; u.lightBlue.visible = false; }
    if (car.driverMesh) { car.group.remove(car.driverMesh); car.driverMesh = null; }
    car.group.rotation.z += (rng() - 0.5) * 0.22;
    [u.body, u.cabin, u.hood, u.trunk].forEach(m => {
      const hi = hittables.indexOf(m); if (hi >= 0) hittables.splice(hi, 1);
    });

    // blast damages pedestrians around the wreck
    NPCs.forEach(n => {
      if (n.dead) return;
      const d = n.pos.distanceTo(car.pos);
      if (d < 6) damageNPC(n, Math.max(20, 90 - d * 12), n.pos.clone().setY(1.1), n.pos.clone().sub(car.pos).normalize());
    });

    // hero caught in the blast
    if (player.inCar === car || car.driver === player) {
      // thrown clear of the exploding car
      const c = car;
      c.driver = null;
      const side = new THREE.Vector3(Math.cos(c.heading), 0, -Math.sin(c.heading)).multiplyScalar(-2.4);
      const ep = c.group.position.clone().add(side);
      clampToWorld(ep);
      player.pos.copy(ep);
      player.group.position.copy(ep);
      scene.add(player.group);
      player.inCar = null;
      updateHealthHUD();
      playerTakeDamage(55, car.pos);
      toast('XE NỔ TUNG! Bạn bắn ra ngoài kịp lúc...');
    } else if (!player.inCar && !player.dead) {
      const pd = player.pos.distanceTo(car.pos);
      if (pd < 5.5) playerTakeDamage(Math.max(15, 60 - pd * 9), car.pos);
    }

    // CHAIN REACTION: nearby cars catch fire and pop shortly after
    cars.forEach(o => {
      if (o !== car && !o.dead && !o.driver && o.fuseT === undefined && o.group.position.distanceTo(car.group.position) < 5.5) {
        o.fuseT = 0.35 + rng() * 0.65;
      }
    });

    triggerCrime(1.5);
  }

  /* ---------------- AI: civilians ---------------- */
  function updateNPC(npc, dt) {
    if (npc.dead) {
      npc.deathT += dt;
      // fall over
      const g = npc.group;
      if (npc.deathT < 0.5) g.rotation.x = Math.min(Math.PI / 2, npc.deathT * Math.PI * 2);
      g.position.y = Math.max(0, 0.1 * Math.sin(npc.deathT * 2));
      if (npc.deathT > 0.6 && npc.deathT < 4) {
        g.userData.parts.forEach(p => { if (p.material && p.material.opacity === undefined) p.material.transparent = true; });
      }
      if (npc.deathT > 4.5) {
        g.userData.parts.forEach(p => { if (p.material) { p.material.transparent = true; p.material.opacity = Math.max(0, 1 - (npc.deathT - 4.5) * 0.8); } });
      }
      if (npc.deathT > 6) { scene.remove(g); npc.gone = true; }
      return;
    }

    if (npc.meshFlash > 0) {
      npc.meshFlash -= dt;
      const c = new THREE.Color(0x881111);
      npc.group.userData.parts.forEach(p => { if (p.material && p.material.emissive) p.material.emissive.copy(c); });
      if (npc.meshFlash <= 0) {
        npc.group.userData.parts.forEach(p => { if (p.material && p.material.emissive) p.material.emissive.setHex(0x000000); });
      }
    }

    let moveDir = new THREE.Vector3();
    let moving = false;

    if (npc.type === 'police') {
      if (player.wanted > 0 && !player.dead && npc.state === 'patrol') {
        if (npc.pos.distanceTo(player.pos) < 55) npc.state = 'chase';
      }
      if (npc.state === 'patrol') {
        if (npc.path.length === 0) npc.path = findPath(npc.pos, randomRoadNode());
        const wp = npc.path[0];
        moveDir.set(wp.x - npc.pos.x, 0, wp.z - npc.pos.z);
        if (moveDir.length() < 1.2) npc.path.shift();
        moving = true;
      } else if (npc.state === 'chase') {
        // pathfind along road grid
        npc.losTimer -= dt;
        if (npc.losTimer <= 0) { npc.losTimer = 0.25; npc.los = hasLOS(npc.pos, player.pos); }
        if (npc.path.length === 0) npc.path = findPath(npc.pos, player.pos);
        if (npc.path.length) {
          const wp = npc.path[0];
          moveDir.set(wp.x - npc.pos.x, 0, wp.z - npc.pos.z);
          if (moveDir.length() < 1.4) npc.path.shift();
        } else {
          moveDir.copy(player.pos).sub(npc.pos).setY(0);
        }
        const dist = npc.pos.distanceTo(player.pos);
        if (dist > 30 && npc.path.length === 0) npc.path = findPath(npc.pos, player.pos);
        moving = true;
        if (npc.los && dist < 16) {
          // stop and shoot
          moving = dist > 9;
          moveDir.set(0, 0, 0);
          npc.shootCd -= dt;
          if (npc.shootCd <= 0) {
            npc.shootCd = 1.1 + rng() * 0.8;
            policeShoot(npc);
          }
        }
        if (player.dead || player.wanted <= 0) { npc.state = 'patrol'; npc.path = []; }
      }
      npc.speed = npc.state === 'chase' ? 4.6 : 3.0;
    } else {
      // civilian
      if (npc.state === 'flee') {
        npc.fleeT = (npc.fleeT || 0) - dt;
        moveDir.copy(npc.fleeDir);
        npc.speed = npc.runSpeed;
        if (npc.fleeT <= 0) npc.state = 'walk';
      } else {
        npc.speed = 1.9;
        if (player.wanted > 0 && !player.dead) {
          const d = npc.pos.distanceTo(player.pos);
          if (d < 9) { npc.state = 'flee'; npc.fleeDir = npc.pos.clone().sub(player.pos).setY(0).normalize(); npc.fleeT = 5; }
        } else {
          if (!npc.target || npc.wanderTimer <= 0 || npc.pos.distanceTo(npc.target) < 1) {
            npc.target = randomLocalPoint(npc.pos, 6);
            npc.wanderTimer = 2 + rng() * 6;
          }
          npc.wanderTimer -= dt;
          moveDir.copy(npc.target).sub(npc.pos).setY(0);
        }
      }
      moving = true;
    }

    if (moving && moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
      npc.pos.addScaledVector(moveDir, npc.speed * dt);
      // keep on walkable ground (block sidewalks / roads), avoid buildings
      if (isInsideBuilding(npc.pos.x, npc.pos.z)) {
        npc.pos.sub(moveDir.clone().multiplyScalar(npc.speed * dt * 2));
        if (npc.type !== 'police') { npc.target = null; }
      }
      clampToWorld(npc.pos);
      npc.facing = Math.atan2(moveDir.x, moveDir.z);
      npc.anim += dt * (npc.speed * 2.2);
    }
    npc.group.position.set(npc.pos.x, npc.pos.y, npc.pos.z);
    npc.group.rotation.y = npc.facing;
    // limb animation: stride grows with walking / fleeing speed
    const spdK = Math.min(1, npc.speed / 4.6);
    const swing = moving ? Math.sin(npc.anim) * (0.28 + spdK * 0.42) : 0;
    npc.group.userData.legL.rotation.x = swing;
    npc.group.userData.legR.rotation.x = -swing;
    let armSwing = moving ? Math.sin(npc.anim + Math.PI) * (0.24 + spdK * 0.4) : 0;
    npc.group.userData.armR.rotation.x = armSwing;
    npc.group.userData.armL.rotation.x = -armSwing;
    npc.group.userData.armL.rotation.z = 0;
    if (npc.shootT > 0) {
      npc.shootT -= dt;
      npc.group.userData.armR.rotation.x = -1.55;      // right gun arm raised to fire
      npc.group.userData.armL.rotation.x = -1.05;
      npc.group.userData.armL.rotation.z = -0.3;
      npc.group.rotation.z = 0;
    } else if (!moving) {
      npc.idleT = (npc.idleT || 0) + dt;
      const sway = Math.sin(npc.idleT * 1.5 + (npc.pathI || 0)) * 0.03;
      npc.group.rotation.z = sway;
      npc.group.userData.armR.rotation.x = sway * 0.5;
      npc.group.userData.armL.rotation.x = -sway * 0.5;
    } else {
      npc.group.rotation.z = 0;
    }
  }

  function policeShoot(npc) {
    npc.shootT = 0.35;                    // raise the gun arm briefly
    const from = npc.pos.clone().setY(1.35);
    const to = player.pos.clone().setY(1.0);
    const dir = to.clone().sub(from).normalize();
    // inaccuracy
    dir.x += (rng() - 0.5) * 0.12; dir.z += (rng() - 0.5) * 0.12; dir.normalize();
    Sfx.shoot();
    spawnMuzzle(from);
    spawnTracer(from, player.pos.clone().setY(1.0), 0xffb0a0);
    // hit chance based on distance
    const dist = npc.pos.distanceTo(player.pos);
    const hitChance = Math.max(0.25, 1 - dist / 30);
    if (rng() < hitChance) playerTakeDamage(7 + rng() * 6, npc.pos);
  }

  /* ---------------- Pathfinding (road grid BFS) ---------------- */
  function nearestNode(p) {
    let bi = Math.round((p.x + CENTER) / CELL), bj = Math.round((p.z + CENTER) / CELL);
    bi = Math.max(0, Math.min(N, bi)); bj = Math.max(0, Math.min(N, bj));
    return { i: bi, j: bj };
  }
  function nodePos(node) { return new THREE.Vector3(cx(node.i), 0, cz(node.j)); }
  function findPath(from, to) {
    const s = nearestNode(from), e = nearestNode(to);
    if (s.i === e.i && s.j === e.j) return [to.clone()];
    const key = (i, j) => i + ',' + j;
    const q = [{ i: s.i, j: s.j, path: [] }];
    const seen = new Set([key(s.i, s.j)]);
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (q.length) {
      const cur = q.shift();
      for (const [di, dj] of dirs) {
        const ni = cur.i + di, nj = cur.j + dj;
        if (ni < 0 || ni > N || nj < 0 || nj > N) continue;
        const k = key(ni, nj);
        if (seen.has(k)) continue;
        seen.add(k);
        const np = cur.path.concat([nodePos({ i: ni, j: nj })]);
        if (ni === e.i && nj === e.j) { np.push(to.clone()); return np; }
        q.push({ i: ni, j: nj, path: np });
      }
    }
    return [to.clone()];
  }
  function hasLOS(a, b) {
    const dir = new THREE.Vector3().subVectors(b, a).setY(0);
    const len = dir.length();
    if (len < 0.01) return true;
    dir.normalize();
    const r = new THREE.Raycaster(a.clone().setY(0.6), dir, 0, len);
    const hits = r.intersectObjects(buildingMeshes, false);
    return hits.length === 0;
  }

  /* ---------------- AI: cars ---------------- */
  let lastSirenAt = 0;
  const _rpos = new THREE.Vector3();   // scratch: rendered run-over position

  /* ---- wanted-level escalation tables ---- */
  const CRUISERS_FOR_STARS = [0, 1, 2, 3, 5, 99];   // index = star level
  const FOOT_COPS_FOR_STARS = [0, 0, 0, 2, 4, 6];   // walking cops hunting the hero
  function cruisersForWanted() {
    return CRUISERS_FOR_STARS[Math.min(5, Math.max(1, Math.round(player.wanted)))];
  }
  // response rank is DYNAMIC: dead cruisers don't hold a slot,
  // survivors are re-ranked every simulation tick
  let beatRankCache = null;
  function beatRank(car) {
    if (!beatRankCache) {
      beatRankCache = cars.filter(c => c.isPolice && !c.dead)
        .sort((a, b) => (a.beatIdx === undefined ? 999 : a.beatIdx) -
                        (b.beatIdx === undefined ? 999 : b.beatIdx));
    }
    return beatRankCache.indexOf(car);
  }
  // higher stars: precinct radio ORDERS beat cops to join the chase citywide;
  // if nobody's close, a fresh squad materialises near the hero (level 3+)
  let escalT = 0;
  function updateEscalation(dt) {
    if (player.dead || player.wanted <= 0) { escalT = 0; return; }
    const quota = FOOT_COPS_FOR_STARS[Math.min(5, Math.max(1, Math.round(player.wanted)))];
    if (!quota) return;
    escalT -= dt;
    if (escalT > 0) return;
    escalT = 5;
    let chasing = 0, best = null, bd = Infinity;
    NPCs.forEach(n => {
      if (n.dead || n.type !== 'police') return;
      if (n.state === 'chase') { chasing++; return; }
      const d = n.pos.distanceToSquared(player.pos);
      if (d < bd) { bd = d; best = n; }
    });
    if (chasing >= quota) return;
    if (!best || bd > 100 * 100) {
      // reinforcements roll in: new officer appears nearby
      const cop = makeNPC('police');
      for (let t = 0; t < 24; t++) {
        const p = randomLocalPoint(player.pos, 70);
        if (!isInsideBuilding(p.x, p.z) && !isInsideWater(p.x, p.z)) { cop.pos.copy(p); break; }
      }
      cop.group.position.copy(cop.pos);
      best = cop;
    }
    best.state = 'chase';                // dispatch order received
    best.path = [];
    Sfx.warn();
  }

  function updateCar(car, dt) {
    if (car.dead) return;
    if (car.driver) return;   // player-driven

    // burning fuse after a chain-reaction ignition
    if (car.fuseT !== undefined) {
      car.fuseT -= dt;
      car.smokeT = (car.smokeT || 0) - dt;
      if (car.smokeT <= 0) { car.smokeT = 0.09; spawnSmoke(car.pos.clone().setY(1.15), 0.9); }
      if (car.fuseT <= 0) { explodeCar(car); return; }
    } else if ((car.shot || 0) > 0) {
      // damaged engine smoulders, warning the player it can blow
      car.smokeT = (car.smokeT || 0) - dt;
      if (car.smokeT <= 0) {
        car.smokeT = 0.26;
        spawnSmoke(new THREE.Vector3(
          car.group.position.x + Math.sin(car.heading) * 1.4,
          1.05,
          car.group.position.z + Math.cos(car.heading) * 1.4), 0.55);
      }
    }

    // A stolen car the hero left behind stays parked where he left it
    // (it still smoulders/burns above, but no AI driver reclaims it).
    if (car.stolen) { car.curSpeed = 0; return; }

    // ---- police PURSUIT mode: WANTED-LEVEL ESCALATION ----
    // how many cruisers join the hunt depends on the star level:
    // 1 sao -> 1 xe, 2 -> 2, 3 -> 3, 4 -> 5, 5 -> TẤT CẢ
    const wanted = !player.dead && player.wanted > 0;
    if (car.isPolice && wanted && car.mode !== 'pursuit' &&
        (car.beatIdx === undefined || beatRank(car) < cruisersForWanted())) {
      car.mode = 'pursuit';
      car.deployed = false;              // fresh hunt -> fresh officer
    } else if (car.mode === 'pursuit' && (!wanted || !car.isPolice)) {
      car.mode = 'traffic';              // stars gone -> back to patrol
    }

    if (car.mode === 'pursuit') drivePursuit(car, dt);
    else driveTraffic(car, dt);

    // siren wail while hunting (visual flicker lives in the interpolated render pass)
    if (car.mode === 'pursuit' && car.group.userData.lightRed &&
        performance.now() - lastSirenAt > 4200 &&
        car.pos.distanceTo(player.pos) < 50) {
      lastSirenAt = performance.now();
      Sfx.siren();
    }

    // run over pedestrians — NPCs only, never the player.
    // The blame goes to the player ONLY when he is the one driving.
    if (car.curSpeed > 2) {
      _rpos.set(
        car.pos.x + Math.cos(car.heading) * car.laneOffset, 0,
        car.pos.z - Math.sin(car.heading) * car.laneOffset);
      const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
      NPCs.forEach(n => {
        if (n.dead) return;
        const d = n.pos.distanceTo(_rpos);
        if (d < 1.1) {
          damageNPC(n, 40, n.pos.clone().setY(1.0), fwd);
          if (car.driver) {
            if (n.type === 'police') triggerCrime(1.5);
            else triggerCrime(0.8);
          }
        }
      });
    }
    // player takes NO damage from cars (chạm xe không chết)
    // NOTE: group transforms are applied in animate() via interpolation
  }

  // normal route traffic: gentle throttle, firm-smooth braking for the hero,
  // lifts off for sharp corners and steers with a capped turn rate
  function driveTraffic(car, dt) {
    const route = car.route;
    let wx = route[car.wpIndex][0], wz = route[car.wpIndex][1];
    let dxT = wx - car.pos.x, dzT = wz - car.pos.z;
    if (dxT * dxT + dzT * dzT < 12.25) {                    // waypoint reached (3.5 m)
      car.wpIndex = (car.wpIndex + 1) % route.length;
      wx = route[car.wpIndex][0]; wz = route[car.wpIndex][1];
      dxT = wx - car.pos.x; dzT = wz - car.pos.z;
    }

    const desired = Math.atan2(dxT, dzT);
    let dh = desired - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;

    const playerNear = !player.inCar && !player.dead && car.pos.distanceTo(player.pos) < 4.5;

    // real-car pacing: ease onto the throttle, lift off for sharp turns,
    // and brake to a FULL but silky stop whenever the hero stands ahead
    let target = car.maxSpeed * Math.max(0.35, 1 - Math.abs(dh) * 0.55);
    let rate = 1.9;
    if (playerNear) { target = 0; rate = 6; }
    car.curSpeed += (target - car.curSpeed) * Math.min(1, dt * rate);
    if (playerNear && car.curSpeed < 0.02) car.curSpeed = 0;

    if (car.curSpeed > 0.01) {
      steerToward(car, wx, wz, dt, false, 2.4);
      const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
      car.pos.addScaledVector(fwd, car.curSpeed * dt);
      clampToWorld(car.pos);
    }
  }

  // WANTED pursuit: race at the hero, glide to a halt close by,
  // officer jumps out shooting
  function drivePursuit(car, dt) {
    const dist = car.pos.distanceTo(player.pos);
    let target, rate;
    if (dist < 11) {
      target = 0; rate = 5;                                  // smooth skid to the kerb
      if (car.curSpeed < 0.8 && !car.deployed) {
        deployOfficer(car);
        car.deployed = true;
      }
    } else {
      target = 13; rate = 2.2;                               // flat-out pursuit
      if (car.deployed && dist > 16) car.deployed = false;   // lost him again? re-arm
    }
    car.curSpeed += (target - car.curSpeed) * Math.min(1, dt * rate);
    if (target === 0 && car.curSpeed < 0.03) car.curSpeed = 0;

    if (car.curSpeed > 0.01) {
      steerToward(car, player.pos.x, player.pos.z, dt, true, 3.2);
      const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
      const step = fwd.clone().multiplyScalar(car.curSpeed * dt);
      car.pos.add(step);
      if (isInsideBuilding(car.pos.x, car.pos.z)) car.pos.sub(step);   // never clip walls
      clampToWorld(car.pos);
    }
  }

  // shared steering with a CAPPED TURN RATE — no snapping, always fluid arcs
  function steerToward(car, tx, tz, dt, avoid, turnRate) {
    const desired = Math.atan2(tx - car.pos.x, tz - car.pos.z);
    let dh = desired - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    if (avoid) {
      const ahead = 3.4;
      const fx = car.pos.x + Math.sin(car.heading) * ahead;
      const fz = car.pos.z + Math.cos(car.heading) * ahead;
      if (isInsideBuilding(fx, fz)) {
        const lx = car.pos.x + Math.sin(car.heading + 0.9) * ahead;
        const lz = car.pos.z + Math.cos(car.heading + 0.9) * ahead;
        dh = (isInsideBuilding(lx, lz) ? -1 : 1) * 1.1;   // swing to the free side
      }
    }
    const maxTurn = (turnRate || 2.4) * dt;                  // rad/s ceiling
    car.heading += Math.max(-maxTurn, Math.min(maxTurn, dh));
  }

  // a police officer jumps out of the stopped cruiser and hunts the hero on foot
  function deployOfficer(c) {
    const ped = makeNPC('police');
    c.deploySide = -(c.deploySide || 2.2);            // alternate doors
    const side = new THREE.Vector3(Math.cos(c.heading), 0, -Math.sin(c.heading))
      .multiplyScalar(c.deploySide);
    const p = c.group.position.clone().add(side);
    p.y = 0;
    if (isInsideBuilding(p.x, p.z) || isInsideWater(p.x, p.z)) {
      // on a bridge / tight spot: step out along the road instead
      p.copy(c.group.position).add(new THREE.Vector3(0, 0, c.deploySide * 2.2));
    }
    clampToWorld(p);
    ped.pos.copy(p);
    ped.group.position.copy(p);
    ped.state = 'chase';
    ped.path = [];
    Sfx.warn();
    return ped;
  }

  /* ---------------- Vehicle enter/exit (carjacking) ---------------- */
  function nearestCarInfo() {
    let best = null, bd = 3.4;
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      if (c.dead) continue;
      const d = c.group.position.distanceTo(player.pos);
      if (d < bd) { bd = d; best = c; }
    }
    // never "enter" a car through a wall
    if (best && !hasLOS(player.pos, best.pos)) return null;
    return best ? { car: best, dist: bd } : null;
  }
  function nearestCar() {
    const info = nearestCarInfo();
    return info ? info.car : null;
  }

  // Pick a safe spot beside the car to step out: driver door first, then the
  // passenger door, then front/back — never inside a wall, water or traffic.
  function findExitSpot(car) {
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    const rx = Math.cos(car.heading), rz = -Math.sin(car.heading);
    const cands = [
      [-rx * 1.75, -rz * 1.75],   // driver door (left side)
      [rx * 1.75, rz * 1.75],     // passenger door
      [-fx * 2.6, -fz * 2.6],     // behind the car
      [fx * 2.6, fz * 2.6]        // in front of the car
    ];
    const L = CENTER + 4;
    for (let i = 0; i < cands.length; i++) {
      const x = car.pos.x + cands[i][0], z = car.pos.z + cands[i][1];
      if (Math.abs(x) > L || Math.abs(z) > L) continue;
      if (buildingBlocked(x, z, PLAYER_RADIUS)) continue;
      if (isInsideWater(x, z) && groundY(x, z) < 0.5) continue;
      if (carBlocked(x, z, PLAYER_RADIUS)) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(car.pos.x + 2, 0, car.pos.z + 2);
  }

  // kick the AI driver out of the car: he spawns beside the door and runs away
  function ejectDriver(c) {
    if (c.driverMesh) { c.group.remove(c.driverMesh); c.driverMesh = null; }
    const type = c.isPolice ? 'police' : 'civilian';
    const ped = makeNPC(type);
    const side = new THREE.Vector3(Math.cos(c.heading), 0, -Math.sin(c.heading));
    const p = c.group.position.clone().addScaledVector(side, -2.2);
    p.y = 0;
    if (isInsideBuilding(p.x, p.z)) p.copy(c.group.position).addScaledVector(side, 2.2);
    if (isInsideWater(p.x, p.z)) {   // on a bridge: shove him along the deck instead
      p.copy(c.group.position).add(new THREE.Vector3(0, 0, c.heading > 0 ? -2.4 : 2.4));
      if (isInsideWater(p.x, p.z)) p.z = RIVER_Z + (p.z >= RIVER_Z ? 1 : -1) * (RIVER_HALF + 1.5);
    }
    clampToWorld(p);
    ped.pos.copy(p);
    ped.group.position.copy(p);
    const away = ped.pos.clone().sub(player.pos).setY(0);
    if (type === 'police') {
      ped.state = 'chase'; ped.path = [];   // jacked cop is angry
    } else {
      ped.state = 'flee';
      ped.fleeDir.copy(away.lengthSq() > 0.001 ? away.normalize() : new THREE.Vector3(1, 0, 0));
      ped.fleeT = 7;
    }
    Sfx.warn();
    return ped;
  }

  function enterCar() {
    if (!player || player.dead || player.inCar) return;
    const c = nearestCar();
    if (!c) { toast('Không có xe nào gần đây'); return; }
    player.inCar = c;
    c.driver = player;
    c.laneOffset = 0;                      // the hero's car drives on its real centre
    openCarDoor(c, -1);                    // driver door swings open then shut
    player.vel.set(0, 0, 0);
    player.isMoving = false;
    player.stepT = 0;
    player.group.rotation.x = 0;
    scene.remove(player.group);
    // Point the chase-camera down the car so driving reads immediately.
    camYaw = c.heading;
    camPitch = -0.17;
    freeLookT = 99;
    if (!c.stolen) {
      // TRỘM XE: this car still has its AI driver inside
      c.stolen = true;
      ejectDriver(c);
      triggerCrime(c.isPolice ? 2.2 : 1.2);   // stealing raises the wanted stars
      toast(c.isPolice
        ? 'Trộm xe CẢNH SÁT! Cảnh sát đang truy đuổi!'
        : 'Đã trộm xe — tài xế bị đẩy ra và bỏ chạy!');
    } else {
      toast('Đã lên xe — WASD lái, E xuống xe');
    }
    Sfx.car();
  }
  function exitCar() {
    if (!player || !player.inCar) return;
    const c = player.inCar;
    c.driver = null;
    c.curSpeed = 0;                    // the car stays parked where you leave it
    const spot = findExitSpot(c);
    const rx = Math.cos(c.heading), rz = -Math.sin(c.heading);
    const side = ((spot.x - c.pos.x) * rx + (spot.z - c.pos.z) * rz) > 0 ? 1 : -1;
    openCarDoor(c, side);                  // door swings on the side the hero steps out
    player.pos.set(spot.x, 0, spot.z);
    player.group.position.set(spot.x, groundY(spot.x, spot.z), spot.z);
    player.vel.set(0, 0, 0);
    player.isMoving = false;
    player.stepT = 0;
    camYaw = c.heading;
    camPitch = -0.17;
    freeLookT = 99;
    player.facing = camYaw;
    player.group.rotation.set(0, camYaw, 0);
    scene.add(player.group);
    player.inCar = null;
    Sfx.click();
  }

  /* ---------------- Input ---------------- */
  const keys = {};
  const mouse = { x: W / 2, y: H / 2, down: false, pressed: false };
  let aimHeld = false;     // right mouse button held still: tight aim zoom
  let rightDown = false, rightTravel = 0;
  let suppressShot = false; // the click that grabs the pointer must not shoot
  let freeLookT = 99;      // seconds since the player last steered the camera
  let dragLook = false, lastMX = 0, lastMY = 0;
  let sensScale = 1;       // [ / ] adjust mouse sensitivity
  let invertY = false;     // Y toggles vertical look inversion

  function onKey(e, down) { keys[e.code] = down; if (down) handleKeyPress(e.code); }
  function handleKeyPress(code) {
    if (!player || player.dead) return;
    if (code === 'Digit1' || code === 'Numpad1') setPlayerWeapon(0);
    else if (code === 'Digit2' || code === 'Numpad2') setPlayerWeapon(1);
    else if (code === 'Digit3' || code === 'Numpad3') setPlayerWeapon(2);
    else if (code === 'Digit4' || code === 'Numpad4') setPlayerWeapon(3);
    else if (code === 'KeyR') {
      const w = WEAPONS[player.weapon];
      if (w && w.kind === 'melee') toast('Vũ khí cận chiến không cần nạp đạn');
      else { startReload(false); Sfx.click(); }
    }
    else if (code === 'KeyC') recenterCamera();
    else if (code === 'BracketRight') { sensScale = Math.min(3, sensScale * 1.15); toast('Độ nhạy chuột: ' + Math.round(sensScale * 100) + '%'); Sfx.click(); }
    else if (code === 'BracketLeft') { sensScale = Math.max(0.4, sensScale / 1.15); toast('Độ nhạy chuột: ' + Math.round(sensScale * 100) + '%'); Sfx.click(); }
    else if (code === 'KeyY') { invertY = !invertY; toast(invertY ? 'Đảo trục dọc: BẬT' : 'Đảo trục dọc: TẮT'); Sfx.click(); }
    else if (code === 'KeyT') {
      const order = ['clear', 'cloudy', 'rain', 'storm'];
      const next = order[(order.indexOf(weatherState) + 1) % order.length];
      setWeather(next);
      toast('Thời tiết: ' + WEATHER_STATES[next].label);
      Sfx.click();
    }
    else if (code === 'KeyE') { if (player.inCar) exitCar(); else enterCar(); }
  }

  // classic third-person mouse look: drag (or pointer-lock) steers the chase-cam
  function look(dx, dy) {
    if (!dx && !dy) return;
    camYaw -= dx * CAM_SENS * sensScale;
    camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX,
      camPitch - dy * CAM_SENS_Y * sensScale * (invertY ? -1 : 1)));
    while (camYaw > Math.PI) camYaw -= Math.PI * 2;
    while (camYaw < -Math.PI) camYaw += Math.PI * 2;
    freeLookT = 0;
  }

  // snap the view behind the hero (or behind the car when driving)
  function recenterCamera() {
    const targetYaw = player && player.inCar ? player.inCar.heading : (player ? player.facing : 0);
    camYaw = targetYaw;
    camPitch = -0.17;
    recoilPitch = 0; recoilYaw = 0;
    freeLookT = 99;
    if (aimHeld) { aimHeld = false; if (crosshair) crosshair.classList.remove('aim'); }
    Sfx.click();
  }

  function tryPointerLock() {
    if (typeof canvas.requestPointerLock === 'function' && document.pointerLockElement !== canvas) {
      try {
        const p = canvas.requestPointerLock();
        if (p && typeof p.catch === 'function') p.catch(() => { /* refused: drag-look still works */ });
      } catch (e) { /* browser refused: drag-look still works */ }
    }
  }

  function attackPulse() {
    mouse.down = true;
    setTimeout(() => { mouse.down = false; }, 140);
  }

  function bindInput() {
    window.addEventListener('keydown', e => { if (e.code === 'Space') e.preventDefault(); onKey(e, true); });
    window.addEventListener('keyup', e => onKey(e, false));
    window.addEventListener('mousemove', e => {
      const locked = document.pointerLockElement === canvas;
      const dx = e.movementX !== undefined ? e.movementX : (e.clientX - lastMX);
      const dy = e.movementY !== undefined ? e.movementY : (e.clientY - lastMY);
      lastMX = e.clientX; lastMY = e.clientY;
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (locked) {
        look(dx, dy);                       // pointer lock: free 360° look
      } else if (rightDown) {
        // without pointer lock the right button does double duty: hold still
        // = aim zoom, drag = orbit the camera
        rightTravel += Math.abs(dx) + Math.abs(dy);
        if (rightTravel > 6) {
          if (aimHeld) { aimHeld = false; if (crosshair) crosshair.classList.remove('aim'); }
          dragLook = true;
          look(dx, dy);
        }
      } else if (dragLook && (dx || dy)) {
        look(dx, dy);
      }
    });
    window.addEventListener('mousedown', e => {
      lastMX = e.clientX; lastMY = e.clientY;
      if (e.button === 0) {
        if (suppressShot) { suppressShot = false; return; }   // click grabbed the pointer
        mouse.down = true; mouse.pressed = true;
      }
      else if (e.button === 2) {
        rightDown = true; rightTravel = 0;
        aimHeld = true; freeLookT = 0;
        if (crosshair) crosshair.classList.add('aim');
      }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) mouse.down = false;
      else if (e.button === 2) {
        rightDown = false; aimHeld = false; dragLook = false;
        if (crosshair) crosshair.classList.remove('aim');
      }
    });
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; aimHeld = false; dragLook = false; });
    window.addEventListener('wheel', e => {
      camDist = Math.max(CAM_MIN_DIST, Math.min(CAM_MAX_DIST, camDist + (e.deltaY || 0) * 0.0035));
      freeLookT = 0;
    }, { passive: false });

    if (canvas.addEventListener) {
      canvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        if (document.pointerLockElement === canvas) return;
        if (typeof canvas.requestPointerLock !== 'function') return; // no lock support: click fires
        suppressShot = true;             // this click only captures the mouse
        tryPointerLock();
      });
    }
    if (document.addEventListener) {
      document.addEventListener('pointerlockchange', () => {
        dragLook = false;
        if (document.pointerLockElement === canvas) toast('CHUỘT khoá — ESC để mở khoá');
        else toast('Đã mở khoá chuột — click để khoá lại');
      });
    }

    // touch: left thumb = movement joystick, right thumb = drag look / tap fire
    setupTouch();
  }

  function setupTouch() {
    const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    let lookId = null, lookLX = 0, lookLY = 0, lookMoved = 0, lookT0 = 0;
    canvas.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        if (joy.id === null && t.clientX < W * 0.45) {
          joy.id = t.identifier; joy.ox = t.clientX; joy.oy = t.clientY; joy.x = t.clientX; joy.y = t.clientY;
        } else if (lookId === null) {
          lookId = t.identifier; lookLX = t.clientX; lookLY = t.clientY;
          lookMoved = 0; lookT0 = performance.now();
        }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === joy.id) { joy.x = t.clientX; joy.y = t.clientY; }
        else if (t.identifier === lookId) {
          const dx = t.clientX - lookLX, dy = t.clientY - lookLY;
          lookLX = t.clientX; lookLY = t.clientY;
          lookMoved += Math.abs(dx) + Math.abs(dy);
          look(dx * 2.2, dy * 2.2);
        }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === joy.id) { joy.id = null; joy.x = joy.ox; joy.y = joy.oy; touchMove = { fwd: 0, right: 0 }; }
        else if (t.identifier === lookId) {
          const rapid = performance.now() - lookT0 < 280 && lookMoved < 16;
          lookId = null;
          if (rapid) attackPulse();          // quick tap = fire / attack
        }
      }
    });
    window.touchJoy = joy;
  }

  let touchMove = { fwd: 0, right: 0 };
  function readMoveInput() {
    let fwd = 0, right = 0;
    if (keys['KeyW'] || keys['ArrowUp']) fwd += 1;
    if (keys['KeyS'] || keys['ArrowDown']) fwd -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) right += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) right -= 1;
    const joy = window.touchJoy;
    if (joy && joy.id !== null) {
      const dx = (joy.x - joy.ox) / 40, dy = (joy.y - joy.oy) / 40;
      const m = Math.hypot(dx, dy);
      if (m > 0.2) {
        right = Math.max(-1, Math.min(1, dx));
        fwd = Math.max(-1, Math.min(1, -dy));
        touchMove = { fwd, right };
      }
    }
    const sprint = keys['ShiftLeft'] || keys['ShiftRight'];
    return { fwd, right, sprint };
  }

  /* ---------------- Player update (camera-relative movement) ---------------- */
  // AABB checks padded by the hero's body radius, so shoulders do not clip walls
  function buildingBlocked(x, z, r) {
    for (let i = 0; i < buildingBoxes.length; i++) {
      const b = buildingBoxes[i];
      if (x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r) return true;
    }
    return false;
  }
  // Parked / slow cars are solid (two overlapping circles along the body so
  // the front/rear are covered too); fast traffic never traps the player.
  function carBlocked(x, z, r) {
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      if (c.dead || Math.abs(c.curSpeed) > 1.2) continue;
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
      const rr = r + 0.95, rr2 = rr * rr;
      for (let k = -1; k <= 1; k += 2) {
        const dx = c.pos.x + fx * 0.85 * k - x;
        const dz = c.pos.z + fz * 0.85 * k - z;
        if (dx * dx + dz * dz < rr2) return true;
      }
    }
    return false;
  }
  function moveWithCollision(pos, dx, dz) {
    const r = PLAYER_RADIUS;
    if (dx !== 0) {
      const nx = pos.x + dx;
      if (!buildingBlocked(nx, pos.z, r) && !carBlocked(nx, pos.z, r)) pos.x = nx;
      else player.vel.x = 0;                       // slide along the wall
    }
    if (dz !== 0) {
      const nz = pos.z + dz;
      if (!buildingBlocked(pos.x, nz, r) && !carBlocked(pos.x, nz, r)) pos.z = nz;
      else player.vel.z = 0;
    }
  }

  function updatePlayer(dt) {
    if (player.dead) return;
    player.attackCd = Math.max(0, player.attackCd - dt);
    player.shotCd = Math.max(0, player.shotCd - dt);
    player.switchT = Math.max(0, player.switchT - dt);
    player.meleeT = Math.max(0, player.meleeT - dt);
    player.bloom = Math.max(0, player.bloom - dt * BLOOM_DECAY);
    player.recoil = Math.max(0, player.recoil - dt * 6);
    if (player.reloadT > 0) {
      player.reloadT -= dt;
      if (player.reloadT <= 0) { player.reloadT = 0; finishReload(); }
    }

    // wanted decay
    if (player.wanted > 0) {
      player.crimeTimer += dt;
      if (player.crimeTimer > 12) {
        player.wanted = Math.max(0, player.wanted - 1);
        player.crimeTimer = 0;
        updateWantedHUD();
        if (player.wanted === 0) toast('Đã thoát truy nã');
      }
    }
    // regen
    if (player.hp < player.maxHp && player.crimeTimer > 4) {
      player.hp = Math.min(player.maxHp, player.hp + 2.5 * dt);
      updateHealthHUD();
    }

    if (player.inCar) {
      player.isMoving = false;
      updateTargetHint(dt);
      driveCar(dt);
      return;
    }

    const mi = readMoveInput();
    let ix = mi.right, iz = mi.fwd;
    const im = Math.hypot(ix, iz);
    if (im > 1) { ix /= im; iz /= im; }
    const moving = im > 0.001;
    const aim = aimInfo();

    // camera-relative: W walks away from the camera, A/D strafe
    const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
    const wx = -cy * ix + sy * iz;      // screen-right × strafe + forward × walk
    const wz = sy * ix + cy * iz;

    const sprinting = mi.sprint && moving;
    const maxSpd = player.speed * (sprinting ? player.sprint : 1) * (aimHeld ? 0.65 : 1);
    // Weighty locomotion: ease toward the target velocity and brake smoothly
    // instead of snapping to full speed the instant a key goes down.
    const tvx = moving ? wx * maxSpd : 0;
    const tvz = moving ? wz * maxSpd : 0;
    const vel = player.vel;
    const accel = moving ? (sprinting ? 26 : 40) : 46;
    const dvx = tvx - vel.x, dvz = tvz - vel.z;
    const dv = Math.hypot(dvx, dvz);
    const maxDv = accel * dt;
    if (dv > maxDv && dv > 1e-6) {
      vel.x += (dvx / dv) * maxDv;
      vel.z += (dvz / dv) * maxDv;
    } else {
      vel.x = tvx; vel.z = tvz;
    }
    const speed = Math.hypot(vel.x, vel.z);
    player.isMoving = moving || speed > 0.25;
    if (speed > 0.001) {
      moveWithCollision(player.pos, vel.x * dt, vel.z * dt);
      clampToWorld(player.pos);
    }

    // stride-synced body bob while moving; a soft breathing sway while idle
    if (speed < 0.25) player.idleT = (player.idleT || 0) + dt;
    else player.idleT = 0;
    const bob = speed > 0.6 ? Math.abs(Math.sin(player.anim || 0)) * 0.03 : 0;
    const breathe = speed < 0.25 ? Math.sin((player.idleT || 0) * 2.0) * 0.006 : 0;
    player.group.position.set(player.pos.x, groundY(player.pos.x, player.pos.z) + bob + breathe, player.pos.z);

    // facing: run toward the actual velocity, otherwise face the crosshair
    const aimFacing = Math.atan2(aim.dir.x, aim.dir.z);
    const aimingNow = aimHeld || (mouse.down && player.weapon !== 0);
    let targetFacing = aimFacing;
    if (!aimingNow && speed > 0.4) targetFacing = Math.atan2(vel.x, vel.z);
    player.facing = angLerp(player.facing, targetFacing, Math.min(1, dt * 14));
    player.group.rotation.y = player.facing;

    // lean slightly into a sprint
    player.group.rotation.x = sprinting && speed > 2 ? 0.07 : 0;

    // walk / run animation driven by real ground speed (walk → sprint)
    const movingNow = speed > 0.15;
    player.anim = (player.anim || 0) + dt * (movingNow ? speed * 1.55 : 0);
    const swingAmt = movingNow ? 0.28 + Math.min(1, speed / 6.4) * 0.42 : 0;
    const swing = Math.sin(player.anim) * swingAmt;
    player.group.userData.legL.rotation.x = movingNow ? swing : 0;
    player.group.userData.legR.rotation.x = movingNow ? -swing : 0;

    // soft footstep taps in time with the stride
    player.stepT = (player.stepT || 0) + (movingNow ? dt * speed : 0);
    if (player.stepT > 2.2) {
      player.stepT = 0;
      if (speed > 1.6) Sfx.step();
    }

    // ---- GTA-style action poses ----
    // gun relaxed at the hip while walking; raised two-handed when aiming or
    // firing; punch / knife swing on melee; recoil kick; draw & reload dip.
    const hasWeapon = player.weapon !== 0;
    const aiming = aimHeld || (mouse.down && hasWeapon);
    const speedK = Math.min(1, speed / 6.4);
    const armSwing = movingNow ? Math.sin(player.anim + Math.PI) * (0.25 + speedK * 0.35) : 0;
    const idleSway = speed < 0.25 ? Math.sin((player.idleT || 0) * 1.7) * 0.045 : 0;
    const kick = player.recoil * 0.35;
    let pose = 0;
    if (player.switchT > 0) pose += (player.switchT / SWITCH_TIME) * 0.25;
    if (player.reloadT > 0) {
      const prog = Math.min(1, 1 - player.reloadT / Math.max(0.001, player.reloadTotal));
      pose += Math.sin(prog * Math.PI) * 0.45;
    }
    let meleePunch = 0;
    if (player.meleeT > 0) {
      const p = 1 - player.meleeT / Math.max(0.001, player.meleeTotal);
      meleePunch = Math.sin(p * Math.PI) * (player.weapon === 1 ? 0.75 : 1.15);
    }
    let armRX, armLX;
    if (hasWeapon) {
      armRX = (aiming ? -1.32 : -0.55) + (aiming ? 0 : armSwing * 0.35) + idleSway;
      armLX = (aiming ? -1.12 : -0.55) - (aiming ? 0 : armSwing * 0.35) - idleSway;
    } else {
      armRX = armSwing + idleSway;
      armLX = -armSwing - idleSway;
    }
    armRX += pose - kick - meleePunch;
    armLX += pose * 0.7 - kick * 0.6 - meleePunch * 0.3;
    player.group.userData.armR.rotation.x = armRX;
    player.group.userData.armL.rotation.x = armLX;
    // support hand swings inward for a two-handed aim stance
    player.group.userData.armL.rotation.z = (hasWeapon && aiming) ? -0.5 : 0;

    // attacks: AK-47 holds full-auto, the pistol fires once per click,
    // melee keeps swinging while the button is held
    const w = WEAPONS[player.weapon];
    if (w && w.kind === 'gun') {
      if (w.auto ? mouse.down : mouse.pressed) fireGun();
    } else if (mouse.down || mouse.pressed) {
      meleeAttack();
    }
    mouse.pressed = false;                 // press edges are consumed once
    updateTargetHint(dt);
  }

  function driveCar(dt) {
    const car = player.inCar;
    const mi = readMoveInput();
    const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    let target = 0;
    if (mi.fwd > 0) target = 13;          // W = forward
    else if (mi.fwd < 0) target = -7;     // S = reverse
    if (mi.right !== 0) car.heading -= mi.right * dt * 1.6;   // A/D steer (D = screen-right)
    // eased throttle: the car has real weight instead of teleporting to speed
    car.curSpeed += (target - car.curSpeed) * Math.min(1, dt * 7);
    if (target === 0 && Math.abs(car.curSpeed) < 0.03) car.curSpeed = 0;

    if (car.curSpeed !== 0) {
      car.pos.addScaledVector(fwd, car.curSpeed * dt);
      clampToWorld(car.pos);
      if (isInsideBuilding(car.pos.x, car.pos.z)) car.pos.addScaledVector(fwd, -car.curSpeed * dt);
    }
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    car.group.userData.wheels.forEach(w => w.rotation.x += car.curSpeed * dt * 4);

    // running over people while driving
    NPCs.forEach(n => {
      if (n.dead) return;
      if (n.pos.distanceTo(car.pos) < 1.1 && Math.abs(car.curSpeed) > 4) {
        damageNPC(n, 45, n.pos.clone().setY(1.0), fwd);
        triggerCrime(n.type === 'police' ? 1.5 : 0.8);
      }
    });
    player.pos.copy(car.pos);
  }

  /* ---------------- Camera: third-person chase / orbit ----------------
     The camera orbits a pivot at the hero's shoulders driven by mouse look
     (pointer lock or right-drag), wheel zoom, and an over-the-shoulder aim
     mode on the right mouse button. While driving it eases back behind the
     car once the player stops steering the view. */
  let camYaw = 0;
  let camPitch = -0.17;
  let camDist = CAM_DIST;
  let camInit = false;
  let recoilPitch = 0, recoilYaw = 0;      // weapon kick, decaying back to zero
  const camActual = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const _pivot = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  const _desired = new THREE.Vector3();
  const _lookTgt = new THREE.Vector3();
  const _la = { yaw: 0, pitch: 0 };

  // effective orbit angles include the recoil kick (clamped so it never flips)
  function lookAngles() {
    _la.yaw = camYaw + recoilYaw;
    _la.pitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch + recoilPitch));
    return _la;
  }

  function addCameraRecoil(w) {
    const steady = aimHeld ? 0.6 : 1;    // holding right-mouse steadies the aim
    recoilPitch += (w.recoil || 0.006) * steady;
    recoilYaw += (rng() - 0.5) * (w.recoilYaw || 0.005) * steady;
  }

  function camPivot(out) {
    if (player && player.inCar) {
      const cg = player.inCar.group;
      out.set(cg.position.x, cg.position.y + CAM_CAR_PIVOT_H, cg.position.z);
    } else if (player) {
      out.set(player.group.position.x, player.group.position.y + CAM_PIVOT_H, player.group.position.z);
    } else {
      out.set(SPAWN.x, SPAWN.y + CAM_PIVOT_H, SPAWN.z);
    }
    return out;
  }

  function cameraForward(out) {
    const la = lookAngles();
    const cp = Math.cos(la.pitch);
    out.set(Math.sin(la.yaw) * cp, Math.sin(la.pitch), Math.cos(la.yaw) * cp);
    return out;
  }

  function desiredCameraPos(out) {
    camPivot(_pivot);
    cameraForward(_fwd);
    const la = lookAngles();
    const aiming = aimHeld && !(player && player.inCar);
    const d = aiming ? Math.min(camDist, CAM_AIM_DIST) : camDist;
    out.copy(_pivot).addScaledVector(_fwd, -d);
    if (aiming) {                       // over-the-right-shoulder framing
      out.x += -Math.cos(la.yaw) * CAM_SHOULDER;
      out.z += Math.sin(la.yaw) * CAM_SHOULDER;
      out.y += 0.1;
    }
    const gy = groundY(out.x, out.z);
    if (out.y < gy + 0.35) out.y = gy + 0.35;
    return out;
  }

  function snapCamera() {
    recoilPitch = 0; recoilYaw = 0;
    desiredCameraPos(_desired);
    camActual.copy(_desired);
    camPivot(_pivot);
    cameraForward(_fwd);
    _lookTgt.copy(_pivot).addScaledVector(_fwd, 10);
    _lookTgt.y += CAM_LOOK_UP;              // keeps the hero below the crosshair
    camLook.copy(_lookTgt);
    camera.position.copy(camActual);
    camera.lookAt(camLook);
    camera.updateMatrixWorld();
    camInit = true;
  }

  function updateCamera(dt) {
    freeLookT += dt;
    // weapon kick settles back toward the base aim
    const rk = 1 - Math.exp(-dt * 9);
    recoilPitch -= recoilPitch * rk;
    recoilYaw -= recoilYaw * rk;
    if (Math.abs(recoilPitch) < 1e-4) recoilPitch = 0;
    if (Math.abs(recoilYaw) < 1e-4) recoilYaw = 0;
    // while driving, swing back behind the car shortly after the mouse rests
    if (player && player.inCar && freeLookT > 0.9) {
      camYaw = angLerp(camYaw, player.inCar.heading, Math.min(1, dt * 2.4));
      camPitch += (-0.13 - camPitch) * Math.min(1, dt * 1.5);
    }
    desiredCameraPos(_desired);
    if (!camInit) { camActual.copy(_desired); camInit = true; }
    else camActual.lerp(_desired, 1 - Math.exp(-dt * 16));
    camPivot(_pivot);
    cameraForward(_fwd);
    _lookTgt.copy(_pivot).addScaledVector(_fwd, 10);
    _lookTgt.y += CAM_LOOK_UP;              // keeps the hero below the crosshair
    camLook.lerp(_lookTgt, 1 - Math.exp(-dt * 22));
    camera.position.copy(camActual);
    camera.lookAt(camLook);
    camera.updateMatrixWorld();
  }

  /* ---------------- See-through occlusion (third-person) ----------------
     Any building standing between the hero and the chase camera — the
     pivot -> camera segment crosses its volume — fades to glass so the
     hero and the street stay readable; it snaps back solid once the line
     is clear. */
  function segHitsBox(ax, ay, az, bx, by, bz, b, pad) {
    const minX = b.minX - pad, maxX = b.maxX + pad;
    const minZ = b.minZ - pad, maxZ = b.maxZ + pad;
    const minY = -0.5, maxY = b.h + pad;
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    let t0 = 0, t1 = 1, ta, tb, tmp;
    if (Math.abs(dx) < 1e-6) { if (ax < minX || ax > maxX) return false; }
    else {
      ta = (minX - ax) / dx; tb = (maxX - ax) / dx;
      if (ta > tb) { tmp = ta; ta = tb; tb = tmp; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) return false;
    }
    if (Math.abs(dy) < 1e-6) { if (ay < minY || ay > maxY) return false; }
    else {
      ta = (minY - ay) / dy; tb = (maxY - ay) / dy;
      if (ta > tb) { tmp = ta; ta = tb; tb = tmp; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) return false;
    }
    if (Math.abs(dz) < 1e-6) { if (az < minZ || az > maxZ) return false; }
    else {
      ta = (minZ - az) / dz; tb = (maxZ - az) / dz;
      if (ta > tb) { tmp = ta; ta = tb; tb = tmp; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
      if (t0 > t1) return false;
    }
    return true;
  }

  const OCCL_TARGET = 0.3;
  function updateOcclusion(dt) {
    camPivot(_pivot);
    const ax = _pivot.x, ay = _pivot.y, az = _pivot.z;
    const bx = camera.position.x, by = camera.position.y, bz = camera.position.z;
    for (let i = 0; i < buildingBoxes.length; i++) {
      const b = buildingBoxes[i];
      // the camera never strays far from the pivot: cheap pre-filter. Buildings
      // outside the window are simply "clear" and fade back to solid.
      const near = !(b.maxX < ax - 12 || b.minX > ax + 12 || b.maxZ < az - 12 || b.minZ > az + 12);
      const blocked = near && segHitsBox(ax, ay, az, bx, by, bz, b, 0.12);
      const target = blocked ? OCCL_TARGET : 1;
      if (target !== b.lastOp) {
        b.fade += (target - b.fade) * Math.min(1, dt * 9);
        const op = Math.abs(b.fade - target) < 0.012 ? target : b.fade;
        if (op !== b.lastOp) {
          const fading = op < 0.999;
          b.mats[0].transparent = fading;
          b.mats[1].transparent = fading;
          b.mats[0].depthWrite = !fading;
          b.mats[1].depthWrite = !fading;
          b.mats[0].opacity = op;
          b.mats[1].opacity = op;
          b.lastOp = op;
        }
      }
    }
  }

  /* ---------------- FX update ---------------- */
  function updateFX(dt) {
    for (let i = bloodParticles.length - 1; i >= 0; i--) {
      const b = bloodParticles[i];
      b.t += dt;
      b.vel.y -= 12 * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      if (b.mesh.position.y < 0.02) { b.mesh.position.y = 0.02; b.vel.set(0, 0, 0); }
      b.mesh.material.opacity = Math.max(0, 1 - b.t / b.life);
      if (b.t >= b.life) { scene.remove(b.mesh); bloodParticles.splice(i, 1); }
    }
    for (let i = splats.length - 1; i >= 0; i--) {
      const s = splats[i];
      s.t += dt;
      if (s.t > s.life) { scene.remove(s.mesh); splats.splice(i, 1); }
    }
    for (let i = smokes.length - 1; i >= 0; i--) {
      const s = smokes[i];
      s.t += dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      const sc = 1 + s.grow * dt;
      s.mesh.scale.multiplyScalar(sc);
      s.mesh.material.opacity = Math.max(0, 0.55 * (1 - s.t / s.life));
      if (s.t >= s.life) { scene.remove(s.mesh); smokes.splice(i, 1); }
    }
    for (let i = tracers.length - 1; i >= 0; i--) {
      const tr = tracers[i];
      tr.t += dt;
      if (tr.grow) tr.mesh.scale.multiplyScalar(1 + dt * 8);
      tr.mesh.material.opacity = Math.max(0, 1 - tr.t / tr.life);
      if (tr.t >= tr.life) { scene.remove(tr.mesh); tracers.splice(i, 1); }
    }
  }

  /* ---------------- HUD ---------------- */
  const healthFill = document.getElementById('healthFill');
  const wantedBox = document.getElementById('wantedBox');
  const ammoN = document.getElementById('ammoN');
  const shotsEl = document.getElementById('shotsN');
  const heldIcon = document.getElementById('heldIcon');
  const heldName = document.getElementById('heldName');
  const msgEl = document.getElementById('msg');
  const flashEl = document.getElementById('flash');
  const crosshair = document.getElementById('crosshair');
  const speedBox = document.getElementById('speedBox');
  const speedN = document.getElementById('speedN');
  const reloadN = document.getElementById('reloadN');
  const carPrompt = document.getElementById('carPrompt');
  const clockTime = document.getElementById('clockTime');
  const clockZone = document.getElementById('clockZone');
  const weatherLabel = document.getElementById('weatherLabel');
  const lightningEl = document.getElementById('lightning');
  let msgTimer = null, flashT = 0;

  function buildStars() {
    wantedBox.innerHTML = '';
    for (let i = 0; i < 5; i++) { const s = document.createElement('span'); s.className = 'star'; s.textContent = '★'; wantedBox.appendChild(s); }
  }
  function updateHealthHUD() { healthFill.style.width = Math.max(0, player.hp) + '%'; }
  function updateWantedHUD() {
    const stars = wantedBox.children;
    const w = Math.round(player.wanted);
    for (let i = 0; i < stars.length; i++) stars[i].className = 'star' + (i < w ? ' on' : '');
  }
  function updateWeaponHUD() {
    document.querySelectorAll('.wslot').forEach(el => el.classList.toggle('active', +el.dataset.w === player.weapon));
    const w = WEAPONS[player.weapon];
    if (w && heldIcon) {
      heldIcon.textContent = w.icon;       // big glyph of the item in hand
      heldName.textContent = w.name;
    }
    updateAmmoHUD();
  }
  function updateAmmoHUD() {
    const w = WEAPONS[player.weapon];
    if (w && w.kind === 'gun') ammoN.textContent = getAmmo(player.weapon);
    else ammoN.textContent = '—';
  }
  function updateShotsHUD() { if (shotsEl) shotsEl.textContent = player.shotsFired || 0; }
  function pulseAmmo() {
    ammoN.classList.remove('pulse');
    void ammoN.offsetWidth;           // restart CSS animation
    ammoN.classList.add('pulse');
  }
  let hitT = null;
  function hitMark() {
    if (!crosshair) return;                // the reticle icon was removed from the HUD
    crosshair.classList.add('hit');
    clearTimeout(hitT);
    hitT = setTimeout(() => crosshair.classList.remove('hit'), 140);
  }
  function floatText(txt, x, y, color) {
    const old = document.querySelectorAll('.floater');
    if (old.length > 12) old[0].remove();
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = txt;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (color) el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 750);
  }
  // world position -> screen pixels (NPC barks follow the person who spoke)
  const _proj = new THREE.Vector3();
  function floatTextWorld(txt, x, y, z, color) {
    _proj.set(x, y, z).project(camera);
    if (_proj.z > 1) return;                       // behind the camera
    floatText(txt, (_proj.x * 0.5 + 0.5) * W, (-_proj.y * 0.5 + 0.5) * H, color);
  }
  function toast(text) {
    msgEl.textContent = text;
    msgEl.style.opacity = 1;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => msgEl.style.opacity = 0, 2600);
  }
  function flash() {
    flashEl.style.opacity = 0.5;
    flashT = 0.25;
  }
  function updateVehicleHUD() {
    if (!speedBox) return;
    if (!player || !player.inCar) { speedBox.classList.add('hidden'); return; }
    speedBox.classList.remove('hidden');
    if (speedN) speedN.textContent = Math.round(Math.abs(player.inCar.curSpeed) * 7.5);
  }
  // Live clock in the GMT+7 timezone (Vietnam) — independent of the PC clock zone
  let _lastClockTxt = '';
  function updateClock() {
    if (clockZone && clockZone.textContent !== 'GMT+7') clockZone.textContent = 'GMT+7';
    if (!clockTime) return;
    const d = new Date(Date.now() + 7 * 3600 * 1000);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    const txt = hh + ':' + mm + ':' + ss;
    if (txt !== _lastClockTxt) { _lastClockTxt = txt; clockTime.textContent = txt; }
  }
  let _lastWeatherLabel = '';
  function updateWeatherHUD() {
    if (!weatherLabel) return;
    const st = WEATHER_STATES[weatherState];
    const txt = st ? st.label : '';
    if (txt !== _lastWeatherLabel) { _lastWeatherLabel = txt; weatherLabel.textContent = txt; }
  }

  // "Press E" interaction prompt when standing next to a car
  let _carPromptTxt = '';
  function updateCarPrompt() {
    if (!carPrompt) return;
    let txt = '';
    if (player && !player.dead && !player.inCar) {
      const info = nearestCarInfo();
      if (info) {
        const c = info.car;
        if (c.isPolice) txt = 'E — TRỘM XE CẢNH SÁT';
        else if (c.stolen || !c.driverMesh) txt = 'E — LÊN XE';
        else txt = 'E — TRỘM XE';
      }
    }
    if (txt !== _carPromptTxt) { _carPromptTxt = txt; carPrompt.textContent = txt; }
    carPrompt.classList.toggle('hidden', !txt);
  }
  let _reloadTxt = '';
  function updateReloadHUD() {
    if (!reloadN) return;
    let txt = '';
    if (player && player.reloadT > 0) {
      const w = WEAPONS[player.weapon];
      if (w && w.kind === 'gun') {
        const pct = Math.min(99, Math.max(0, Math.round((1 - player.reloadT / Math.max(0.001, player.reloadTotal)) * 100)));
        txt = 'NẠP ĐẠN… ' + pct + '%';
      }
    }
    if (txt !== _reloadTxt) { _reloadTxt = txt; reloadN.textContent = txt; }
  }
  function showWasted() {
    if (document.exitPointerLock) { try { document.exitPointerLock(); } catch (e) {} }
    document.getElementById('wasted').classList.remove('hidden');
  }
  function respawn() {
    player.hp = player.maxHp; player.dead = false; player.wanted = 0; player.crimeTimer = 0;
    if (player.inCar) { player.inCar.driver = null; player.inCar = null; }
    player.pos.copy(SPAWN); player.group.position.copy(player.pos);
    player.vel.set(0, 0, 0);
    player.isMoving = false;
    player.stepT = 0;
    player.facing = 0; player.group.rotation.set(0, 0, 0);
    player.switchT = 0; player.reloadT = 0; player.bloom = 0; player.recoil = 0;
    player.targetSeen = false;
    if (crosshair) crosshair.classList.remove('aim', 'target');
    scene.add(player.group);
    camYaw = 0; camPitch = -0.17; camDist = CAM_DIST; camInit = false;
    snapCamera();
    document.getElementById('wasted').classList.add('hidden');
    updateHealthHUD(); updateWantedHUD(); updateVehicleHUD();
    updateReloadHUD();
    tryPointerLock();                     // click "HỒI SINH" re-captures the mouse
  }

  /* ---------------- Minimap ---------------- */
  const minimap = document.getElementById('minimap');
  const mctx = minimap.getContext('2d');
  const mScale = minimap.width / (GROUND_HALF * 2);
  const mmapStatic = document.createElement('canvas');
  mmapStatic.width = minimap.width; mmapStatic.height = minimap.height;
  function buildMinimapStatic() {
    const g = mmapStatic.getContext('2d');
    g.fillStyle = '#141420'; g.fillRect(0, 0, mmapStatic.width, mmapStatic.height);
    const W2 = (x) => (x + GROUND_HALF) * mScale;
    g.fillStyle = '#3a3138'; g.fillRect(W2(-GROUND_HALF), W2(-GROUND_HALF), CITY * mScale, CITY * mScale);
    g.fillStyle = '#2b2630';
    for (let i = 0; i <= N; i++) {
      g.fillRect(W2(cx(i) - ROAD / 2), W2(-CITY / 2), ROAD * mScale, CITY * mScale);
      g.fillRect(W2(-CITY / 2), W2(cz(i) - ROAD / 2), CITY * mScale, ROAD * mScale);
    }
    // river over the roads...
    g.fillStyle = '#17607a';
    g.fillRect(W2(-CITY / 2), W2(RIVER_Z - RIVER_HALF), CITY * mScale, RIVER_HALF * 2 * mScale);
    // ...then bridge stripes where avenues cross
    g.fillStyle = '#8a7478';
    for (let i = 0; i <= N; i++) {
      g.fillRect(W2(cx(i) - ROAD / 2), W2(RIVER_Z - RIVER_HALF), ROAD * mScale, RIVER_HALF * 2 * mScale);
    }
  }
  function updateMinimap() {
    mctx.drawImage(mmapStatic, 0, 0);
    const W2 = (x) => (x + GROUND_HALF) * mScale;
    const dot = (x, z, c, r) => { mctx.fillStyle = c; mctx.fillRect(W2(x) - r / 2, W2(z) - r / 2, r, r); };
    cars.forEach(c => { if (!c.dead) dot(c.group.position.x, c.group.position.z, c.isPolice ? '#6af' : '#fc3', 3); });
    boats.forEach(b => dot(b.pos.x, b.pos.z, '#7ef', 3));
    NPCs.forEach(n => { if (!n.dead) dot(n.pos.x, n.pos.z, n.type === 'police' ? '#35f' : '#5c5', 2); });
    if (player) {
      // the hero is a little arrow pointing where he faces
      const px = W2(player.pos.x), pz = W2(player.pos.z);
      const a = player.facing || 0;
      const fx = Math.sin(a), fz = Math.cos(a);
      const sx = -fz, sz = fx;
      mctx.fillStyle = '#fff';
      mctx.beginPath();
      mctx.moveTo(px + fx * 7, pz + fz * 7);
      mctx.lineTo(px - fx * 3 + sx * 4, pz - fz * 3 + sz * 4);
      mctx.lineTo(px - fx * 3 - sx * 4, pz - fz * 3 - sz * 4);
      mctx.closePath();
      mctx.fill();
    }
  }

  /* ---------------- Loop ---------------- */
  const clock = new THREE.Clock();
  const FIXED_STEP = 1 / 60;                 // physics runs at a steady 60 Hz
  let simAcc = 0;
  const _ipos = new THREE.Vector3();
  function angLerp(a, b, t) {                // shortest-path angle interpolation
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());

    // snapshot the pre-step state so rendering can interpolate smoothly
    cars.forEach(c => { c.prevPos.copy(c.pos); c.prevHeading = c.heading; });
    player.prevPos.copy(player.pos);

    // FIXED-TIMESTEP SIMULATION — identical handling at any frame rate,
    // lag spikes can no longer teleport cars across the map
    simAcc += dt;
    let steps = 0;
    while (simAcc >= FIXED_STEP && steps < 4) {
      beatRankCache = null;                  // re-rank survivors every tick
      if (!player.dead) updatePlayer(FIXED_STEP);
      NPCs.forEach(n => updateNPC(n, FIXED_STEP));
      cars.forEach(c => updateCar(c, FIXED_STEP));
      boats.forEach(b => updateBoat(b, FIXED_STEP));
      updateEscalation(FIXED_STEP);
      simAcc -= FIXED_STEP;
      steps++;
    }
    if (steps === 4) simAcc = 0;             // huge hitch: drop the backlog
    const alpha = Math.max(0, Math.min(1, simAcc / FIXED_STEP));

    // RENDER INTERPOLATION — every car glides between its last two physics states
    cars.forEach(c => {
      if (!c.dead) {
        _ipos.copy(c.prevPos).lerp(c.pos, alpha);
        const ih = angLerp(c.prevHeading, c.heading, alpha);
        const rx = _ipos.x + Math.cos(ih) * c.laneOffset;
        const rz = _ipos.z - Math.sin(ih) * c.laneOffset;
        c.group.position.set(rx, groundY(rx, rz), rz);   // ride the bridge ramps visually
        c.group.rotation.y = ih;
        c.group.userData.wheels.forEach(w => w.rotation.x += c.curSpeed * dt * 4);
        if (c.group.userData.lightRed) {
          const t = performance.now() / 160;
          const on = Math.floor(t) % 2 === 0;
          c.group.userData.lightRed.visible = on;
          c.group.userData.lightBlue.visible = !on;
        }
      }
      if (!c.dead && c.doorT) updateCarDoor(c, dt);
    });

    // walking characters follow the bridge decks / ramps too
    NPCs.forEach(n => {
      if (!n.dead) n.group.position.y = groundY(n.pos.x, n.pos.z);
    });

    updateFX(dt);
    updateCamera(dt);
    updateVehicleHUD();
    updateReloadHUD();
    updateCarPrompt();
    updateWeather(dt);
    updateClock();

    if (flashT > 0) { flashT -= dt; flashEl.style.opacity = Math.max(0, flashT * 2); }
    updateOcclusion(dt);
    updateMinimap();
    renderer.render(scene, camera);
  }

  /* ---------------- Boot ---------------- */
  function start() {
    Sfx.init();
    buildCity();
    spawnWorld();
    player = createPlayer();
    player.group.position.copy(player.pos);
    player.group.rotation.y = 0;
    // camera parked behind the hero, looking up the street (+z)
    camYaw = 0; camPitch = -0.17; camDist = CAM_DIST; camInit = false;
    recoilPitch = 0; recoilYaw = 0;
    snapCamera();
    Sfx.startAmbient();
    buildStars();
    buildMinimapStatic();
    updateHealthHUD();
    updateWantedHUD();
    updateWeaponHUD();
    updateAmmoHUD();
    updateShotsHUD();
    updateVehicleHUD();
    mouse.down = false; aimHeld = false;
    document.getElementById('startOverlay').classList.add('hidden');
    toast('Chào mừng đến VICE CITY! CHUỘT xoay camera · CLICK TRÁI tấn công.');
    tryPointerLock();
    animate();
  }

  initThree();
  bindInput();
  window.addEventListener('resize', () => {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  });

  document.getElementById('startBtn').addEventListener('click', start);
  document.getElementById('respawnBtn').addEventListener('click', respawn);
  // ?autostart=1 — skip the intro overlay (used by automated screenshot checks)
  if (window.location && /autostart/.test(window.location.search || '')) start();

  // build world immediately so background is visible behind overlay
  buildCity();
  buildRoutes();
  spawnWorld();
  buildMinimapStatic();
  updateMinimap();
  snapCamera();
  renderer.render(scene, camera);

  // debug / testing hook (harmless in production)
  window.__GTA__ = {
    get player() { return player; }, NPCs, cars, boats, WEAPONS, hittables,
    get camera() { return camera; }, get scene() { return scene; },
    get world() { return worldGroup; },
    N, RIVER_Z, RIVER_HALF, isInsideBuilding, isInsideWater, groundY,
    buildingBoxes, CITY_CORES,
    // third-person camera test hooks
    aim: () => aimInfo(),
    setCameraLook(yaw, pitch) {
      camYaw = yaw;
      if (pitch !== undefined) camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, pitch));
      freeLookT = 0;
    },
    setWeather,
    strikeLightning: triggerLightning,
    get weather() {
      return {
        state: weatherState,
        rain: weatherRain,
        dark: weatherDark,
        timer: weatherTimer,
        fogFar: scene && scene.fog ? scene.fog.far : 0,
        fogNear: scene && scene.fog ? scene.fog.near : 0,
        fogColor: scene && scene.fog ? scene.fog.color.getHex() : 0,
        sunVisible: !!(sunSprite && sunSprite.visible && sunSprite.material.opacity > 0.05),
        sunOpacity: sunSprite ? sunSprite.material.opacity : 0,
        rainVisible: !!(rainLines && rainLines.visible),
        rainOpacity: rainLines ? rainLines.material.opacity : 0,
        cloudShade: cloudMat ? cloudMat.color.r : 1,
        cloudOpacity: cloudMat ? cloudMat.opacity : 0,
        lightning: lightningFlash
      };
    },
    get cameraState() { return { yaw: camYaw, pitch: camPitch, dist: camDist, aimHeld, sens: sensScale, invertY }; },
    snapCamera,
    respawn,
    // test hooks: rebuild the police cruiser fleet via the production spawner
    spawnCruiser() {
      const c = makeCarEntity({ isPolice: true, color: 0xe8e8e8, speed: 9.5 });
      c.beatIdx = Math.max(-1, ...cars.filter(x => x.isPolice && x !== c)
        .map(x => x.beatIdx === undefined ? -1 : x.beatIdx)) + 1;
      return c;
    },
    dispatchCopNear(px, pz) {
      const cop = makeNPC('police');
      for (let t = 0; t < 24; t++) {
        const p = randomLocalPoint(new THREE.Vector3(px, 0, pz), 70);
        if (!isInsideBuilding(p.x, p.z) && !isInsideWater(p.x, p.z)) { cop.pos.copy(p); break; }
      }
      cop.group.position.copy(cop.pos);
      return cop;
    }
  };
})();
