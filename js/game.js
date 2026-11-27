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
  const BOMB_START = 6;           // throwable grenades carried from the start

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
    },
    {
      name: 'BOM', icon: '💣', kind: 'bomb', dmg: 0, cd: 0.9, mag: BOMB_START, range: 0, snd: 'click'
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

  /* ---- UNITY CITY (modern, PBR), VICE CITY (neon sunset) & GTA NIGHT (open-world night) palettes ---- */
  const STYLES = {
    modern: {
      ground: 0x8f9499, road: 0x383c42, sidewalk: 0xa7abb0, grass: 0x4f8f4f,
      line: 0xeef0f2, water: 0x1c6f92, bridge: 0x767c84, railing: 0x9aa2ab,
      sand: 0xdcc79c, shallow: 0x2f9fc0, foam: 0xf4fbfe, ocean: 0x10506e,
      building: [0x9aa4ad, 0xb8bfc6, 0x8a949d, 0x6e7882],
      districtPals: {
        nw: [0xdfe3e6, 0xc8cdd2, 0x9aa4ad, 0xb8bfc6],        // white concrete quarter
        ne: [0xb07a5a, 0xa5654a, 0xc08a5a, 0x9a6a4a],        // brick quarter
        sw: [0xd6c8a8, 0xc9b894, 0xbfa87e, 0xd0bd9c],        // sandstone old town
        se: [0x6a8a9e, 0x5f7f95, 0x8aa8b8, 0x7a95a5]         // blue glass downtown
      },
      neon: false
    },
    // GTA NIGHT: the reference open-world look — a dark city after sundown with
    // glowing neon signs, lit windows, bright street lamps and car headlights.
    night: {
      ground: 0x33383f, road: 0x23262e, sidewalk: 0x7e848c, grass: 0x3a5c40,
      line: 0xffe9b0, water: 0x0e3a56, bridge: 0x545a64, railing: 0x8a94a2,
      sand: 0xc2ad86, shallow: 0x1e5a78, foam: 0xe8f4fa, ocean: 0x08283e,
      building: [0x454a54, 0x3a3f48, 0x515660, 0x2e333c],
      districtPals: {
        nw: [0x626872, 0x505660, 0x464c56, 0x5a606a],        // dark concrete quarter
        ne: [0x54402e, 0x473626, 0x614a34, 0x3e2f20],        // dark brick quarter
        sw: [0x625a4e, 0x544c40, 0x6e6252, 0x4a433a],        // old town at night
        se: [0x2c4454, 0x243a48, 0x34525e, 0x1e303c]         // glass downtown at night
      },
      neon: true
    },
    neon: {
      ground: 0x3a3138, road: 0x2b2630, sidewalk: 0xb59a9c, grass: 0x3c6b46,
      line: 0xffe9c4, water: 0x17607a, bridge: 0x8a7478, railing: 0xf0a8c8,
      sand: 0xd9b98c, shallow: 0x2f8fa0, foam: 0xfff2df, ocean: 0x0e3f5a,
      building: [0x7a6a5a, 0x9a8571, 0x6f7f8f, 0x8a7f8a, 0x5f6a5f, 0x8a7266, 0x75838a, 0x7f6a7a],
      districtPals: {
        nw: [0x63c7c7, 0x86d6d2, 0x53adb8, 0xa0dcd6],        // teal dockside
        ne: [0xf79a7e, 0xf7b391, 0xe88d84, 0xffc7a1],        // coral condos
        sw: [0xe6d7bc, 0xd6c8b4, 0xc9b6d9, 0xe9cfba],        // lavender old town
        se: [0xf68fc0, 0xc98af0, 0xb18cff, 0x8bc6ff]         // neon downtown glass
      },
      neon: true
    }
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

  /* ---- persistent game settings (menu) ---- */
  const SETTINGS_KEY = 'pixel-vice-city-settings-v1';
  const settings = {
    quality: 'medium', fov: 62, fxWeather: true, showFps: false,
    sens: 1, invertY: false, volume: 60, muted: false,
    style: 'modern'     // 'modern' = UNITY CITY (hiện đại), 'neon' = VICE CITY (neon hoàng hôn), 'night' = GTA NIGHT (thành phố về đêm)
  };
  const isNeon = () => settings.style === 'neon' || settings.style === 'night';
  const STYLE_LABEL = { modern: 'UNITY CITY (hiện đại)', neon: 'VICE CITY (neon hoàng hôn)', night: 'GTA NIGHT (thành phố về đêm)' };
  const isVox = () => false;                 // legacy hook: phong cách voxel đã được thay bằng UNITY CITY
  function loadSettings() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return;
      if (s.quality === 'low' || s.quality === 'medium' || s.quality === 'high') settings.quality = s.quality;
      if (typeof s.fov === 'number') settings.fov = Math.max(50, Math.min(80, s.fov));
      if (typeof s.fxWeather === 'boolean') settings.fxWeather = s.fxWeather;
      if (typeof s.showFps === 'boolean') settings.showFps = s.showFps;
      if (typeof s.sens === 'number') settings.sens = Math.max(0.4, Math.min(3, s.sens));
      if (typeof s.invertY === 'boolean') settings.invertY = s.invertY;
      if (typeof s.volume === 'number') settings.volume = Math.max(0, Math.min(100, s.volume));
      if (typeof s.muted === 'boolean') settings.muted = s.muted;
      if (s.style === 'vice' || s.style === 'voxel') settings.style = 'neon';   // migrate old styles
      if (s.style === 'modern' || s.style === 'neon' || s.style === 'night') settings.style = s.style;
    } catch (e) { /* private mode / tests */ }
  }
  function saveSettings() {
    try { if (window.localStorage) window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
  }
  loadSettings();

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
    glass() {
      this.noise(0.14, 0.3, 6800);
      for (let i = 0; i < 5; i++) this.tone(2300 + Math.random() * 2400, 0.06, 'sine', 0.05, 1200 + Math.random() * 900);
    },
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
    jump() { this.tone(180, 0.1, 'sine', 0.12, 520); },
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
    laugh() {
      for (let i = 0; i < 4; i++) setTimeout(() => this.tone(340 + Math.random() * 200, 0.1, 'square', 0.05, 190), i * 140);
    },
    sob() {
      this.tone(215, 0.26, 'sine', 0.07, 150);
      setTimeout(() => this.tone(235, 0.3, 'sine', 0.06, 160), 270);
    },

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
  let skyMesh = null, sunSprite = null, moonSprite = null, starField = null;
  let ambientLight = null, hemiLight = null, keyLight = null, rimLight = null;
  let cloudGroup = null, cloudMat = null;
  let rainLines = null;

  const _c = (hex) => new THREE.Color(hex);

  const _skyTex = {};
  // sky gradient per graphics style: UNITY CITY = crisp blue daylight, VICE CITY = neon sunset
  const SKY_STOPS = {
    modern: {
      morning: [
        [0.00, '#0e4d8c'], [0.35, '#3d82c4'], [0.48, '#a8cfe8'],
        [0.52, '#ffe9c0'], [0.58, '#e8f0f6'], [0.75, '#cfe0ee'], [1.00, '#2a3a50']
      ],
      afternoon: [
        [0.00, '#0a63a8'], [0.35, '#2f87c8'], [0.48, '#9cc8e8'],
        [0.52, '#e8f2f8'], [0.60, '#d8e8f2'], [0.80, '#c2d8e8'], [1.00, '#8fb0c8']
      ],
      night: [
        [0.00, '#02030b'], [0.35, '#0a0f26'], [0.48, '#141c3d'],
        [0.52, '#20284a'], [0.60, '#33385e'], [0.75, '#2a2a4a'], [1.00, '#0a0a14']
      ]
    },
    neon: {
      morning: [
        [0.00, '#143a70'], [0.30, '#3f7fbf'], [0.45, '#8fc6ee'],
        [0.50, '#ffd9ae'], [0.55, '#ffe9cc'], [0.70, '#c9dff0'], [1.00, '#2a3550']
      ],
      afternoon: [
        [0.00, '#0b0b26'], [0.30, '#26164a'], [0.42, '#6a2a6a'],
        [0.47, '#c93f6e'], [0.50, '#ff8a5a'], [0.55, '#ffb078'],
        [0.72, '#a04a72'], [1.00, '#241a2e']
      ],
      night: [
        [0.00, '#02030b'], [0.35, '#0a0f26'], [0.48, '#141c3d'],
        [0.52, '#20284a'], [0.60, '#33385e'], [0.75, '#2a2a4a'], [1.00, '#0a0a14']
      ]
    },
    night: {
      morning: [
        [0.00, '#04060f'], [0.30, '#0c1226'], [0.45, '#18203e'],
        [0.50, '#28304e'], [0.58, '#3a4060'], [0.75, '#262c4a'], [1.00, '#080a12']
      ],
      afternoon: [
        [0.00, '#050610'], [0.30, '#0e1024'], [0.45, '#1e1438'],
        [0.50, '#2a1c42'], [0.58, '#3a2c52'], [0.75, '#241c38'], [1.00, '#0a0810']
      ],
      night: [
        [0.00, '#010208'], [0.30, '#080c20'], [0.45, '#10182f'],
        [0.50, '#1c243e'], [0.60, '#282f4c'], [0.75, '#1e2440'], [1.00, '#060810']
      ]
    }
  };
  function makeSkyTexture(kind) {
    const key = kind || (settings.style + ':afternoon');
    if (_skyTex[key]) return _skyTex[key];
    const parts = key.split(':');
    const stops = (SKY_STOPS[parts[0]] || SKY_STOPS.modern)[parts[1] || 'afternoon'] || SKY_STOPS.modern.afternoon;
    const c = document.createElement('canvas');
    c.width = 48; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    stops.forEach(([at, col]) => grd.addColorStop(at, col));
    g.fillStyle = grd;
    g.fillRect(0, 0, 48, 256);
    const tex = new THREE.CanvasTexture(c);
    _skyTex[key] = tex;
    return tex;
  }

  function makeMoonTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grd.addColorStop(0.00, 'rgba(255,255,255,1)');
    grd.addColorStop(0.30, 'rgba(232,240,255,0.95)');
    grd.addColorStop(0.55, 'rgba(170,195,255,0.28)');
    grd.addColorStop(1.00, 'rgba(80,110,200,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
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
      'Hãy dùng Chrome / Edge / Firefox bản mới và bật tăng tốc phần cứng, rồi tải lại trang.<br>' +
      'Kiểm tra nhanh tại get.webgl.org — hướng dẫn chi tiết: DEPLOYMENT.md → ' +
      '“How to enable WebGL 3D in your browser”.</div>';
  }

  function initThree() {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      fatalWebGL();
      throw e;
    }
    const qScale = settings.quality === 'low' ? 0.75 : settings.quality === 'high'
      ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;
    renderer.setPixelRatio(qScale);
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    // Unity-style PBR pipeline: linear -> sRGB output, ACES filmic tone mapping, soft shadows
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    if (renderer.shadowMap) {
      renderer.shadowMap.enabled = settings.quality !== 'low';
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    scene = new THREE.Scene();
    scene.background = _c(0xcfe4f0);
    scene.fog = new THREE.Fog(0xcfe4f0, 110, 700);

    camera = new THREE.PerspectiveCamera(settings.fov || 62, W / H, 0.1, 3000);

    /* gradient sky dome + glowing sun on the horizon */
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 24, 16),
      new THREE.MeshBasicMaterial({ map: makeSkyTexture(settings.style + ':afternoon'), side: THREE.BackSide, fog: false, depthWrite: false })
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

    /* warm key sun, violet sky bounce, cool rim — key casts soft PCF shadows */
    ambientLight = new THREE.AmbientLight(0xffd0c8, 0.45);
    scene.add(ambientLight);
    hemiLight = new THREE.HemisphereLight(0x9a7cff, 0x5a3a2a, 0.55);
    scene.add(hemiLight);
    keyLight = new THREE.DirectionalLight(0xffb070, 1.05);
    keyLight.position.set(120, 130, 260);
    keyLight.castShadow = true;
    const smap = settings.quality === 'high' ? 2048 : 1024;
    keyLight.shadow.mapSize.set(smap, smap);
    keyLight.shadow.camera.near = 20;
    keyLight.shadow.camera.far = 650;
    keyLight.shadow.camera.left = -120;
    keyLight.shadow.camera.right = 120;
    keyLight.shadow.camera.top = 120;
    keyLight.shadow.camera.bottom = -120;
    keyLight.shadow.bias = -0.00035;
    keyLight.shadow.normalBias = 0.03;
    scene.add(keyLight);
    scene.add(keyLight.target);
    rimLight = new THREE.DirectionalLight(0x4a3a8a, 0.35);
    rimLight.position.set(-160, 60, -220);
    scene.add(rimLight);

    buildClouds();
    buildRain();
    buildStarfield();
    buildMoon();
  }

  /* ================================================================
     WEATHER — sunny sunset, drifting clouds and random rain storms.
     The HUD also shows the live clock in the GMT+7 timezone.
     ================================================================ */
  function buildClouds() {
    const puffGeo = new THREE.SphereGeometry(1, 8, 6);
    cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });
    cloudGroup = new THREE.Group();
    for (let i = 0; i < 30; i++) {
      // puffy volumetric-looking clouds: several shaded spheres per cloud
      const cloud = new THREE.Group();
      const puffs = 3 + ((Math.random() * 4) | 0);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.scale.set(8 + Math.random() * 10, 1.7 + Math.random() * 1.6, 7 + Math.random() * 9);
        puff.position.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 3.4, (Math.random() - 0.5) * 26);
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 900, 62 + Math.random() * 55, (Math.random() - 0.5) * 900);
      cloudGroup.add(cloud);
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

  function buildStarfield() {
    const N = 700;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const elev = 0.08 + Math.random() * 0.9;
      const horiz = Math.cos(elev) * 1300;
      pos[i * 3] = Math.cos(a) * horiz;
      pos[i * 3 + 1] = Math.sin(elev) * 1300;
      pos[i * 3 + 2] = Math.sin(a) * horiz;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starField = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffffff, size: 2.6, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, fog: false
    }));
    starField.frustumCulled = false;
    starField.visible = false;
    scene.add(starField);
  }

  function buildMoon() {
    moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeMoonTexture(), transparent: true, depthWrite: false, fog: false, color: 0xdfe8ff
    }));
    moonSprite.scale.set(95, 95, 1);
    moonSprite.position.set(-260, 190, 700);
    moonSprite.visible = false;
    scene.add(moonSprite);
  }

  /* ================================================================
     TIME OF DAY — random morning / afternoon / night lighting with a
     running in-game clock. The world time zone label is GMT+7.
     ================================================================ */
  function makePalette(cfg) {
    const o = Object.assign({}, cfg);
    o.fogC = new THREE.Color(cfg.fog);
    o.skyC = new THREE.Color(cfg.sky);
    o.keyC = new THREE.Color(cfg.key);
    o.ambC = new THREE.Color(cfg.amb);
    o.hemiSkyC = new THREE.Color(cfg.hemiSky);
    o.hemiGroundC = new THREE.Color(cfg.hemiGround);
    o.rimC = new THREE.Color(cfg.rim);
    o.cloudC = new THREE.Color(cfg.cloud);
    return o;
  }
  const TIME_PALETTES = {
    modern: {
      morning: makePalette({
        fog: 0xcfdce8, fogNear: 130, fogFar: 800,
        sky: 0xffffff,
        key: 0xfff4e0, keyInt: 1.0,
        amb: 0xdfe9ff, ambInt: 0.42,
        hemiSky: 0xbfd8ff, hemiGround: 0x7a7468, hemiInt: 0.55,
        rim: 0x8a9ab8, rimInt: 0.25,
        sun: 1, moon: 0, stars: 0,
        cloud: 0xffffff, cloudOp: 0.35,
        label: 'SÁNG'
      }),
      afternoon: makePalette({
        fog: 0xbfd0de, fogNear: 100, fogFar: 640,
        sky: 0xffffff,
        key: 0xfff2dc, keyInt: 1.1,
        amb: 0xe8f0f8, ambInt: 0.45,
        hemiSky: 0xcfe4f8, hemiGround: 0x6a6a60, hemiInt: 0.6,
        rim: 0x9ab0c8, rimInt: 0.3,
        sun: 1, moon: 0, stars: 0,
        cloud: 0xffffff, cloudOp: 0.4,
        label: 'CHIỀU'
      }),
      night: makePalette({
        fog: 0x070b18, fogNear: 34, fogFar: 440,
        sky: 0x101a3c,
        key: 0x7a90c8, keyInt: 0.4,
        amb: 0x4a5a8a, ambInt: 0.28,
        hemiSky: 0x1c2c50, hemiGround: 0x08090f, hemiInt: 0.24,
        rim: 0x6a7aa8, rimInt: 0.14,
        sun: 0, moon: 1, stars: 1,
        cloud: 0x1c243e, cloudOp: 0.45,
        label: 'TỐI'
      })
    },
    neon: {
      morning: makePalette({
        fog: 0xd8e6f0, fogNear: 120, fogFar: 760,
        sky: 0xffffff,
        key: 0xfff2d8, keyInt: 1.05,
        amb: 0xdfe9ff, ambInt: 0.5,
        hemiSky: 0xbfd8ff, hemiGround: 0x6a5a4a, hemiInt: 0.5,
        rim: 0x8a7ab8, rimInt: 0.2,
        sun: 1, moon: 0, stars: 0,
        cloud: 0xffffff, cloudOp: 0.3,
        label: 'SÁNG'
      }),
      afternoon: makePalette({
        fog: 0xff9a80, fogNear: 80, fogFar: 620,
        sky: 0xffffff,
        key: 0xffb070, keyInt: 0.95,
        amb: 0xffd0c8, ambInt: 0.48,
        hemiSky: 0x9a7cff, hemiGround: 0x5a3a2a, hemiInt: 0.5,
        rim: 0x4a3a8a, rimInt: 0.3,
        sun: 1, moon: 0, stars: 0,
        cloud: 0xffffff, cloudOp: 0.22,
        label: 'CHIỀU'
      }),
      night: makePalette({
        fog: 0x0b1022, fogNear: 30, fogFar: 460,
        sky: 0x9aa0c8,
        key: 0x8fa8ff, keyInt: 0.38,
        amb: 0x7a7ab8, ambInt: 0.28,
        hemiSky: 0x2a3766, hemiGround: 0x0c0c14, hemiInt: 0.24,
        rim: 0x5a4a8a, rimInt: 0.12,
        sun: 0, moon: 1, stars: 1,
        cloud: 0x3a4160, cloudOp: 0.4,
        label: 'TỐI'
      })
    },
    // GTA NIGHT: the reference prototype look — deep blue night sky, pale
    // moonlight, dark streets and everything glowing back at you. The whole
    // style sits in twilight so the city always reads like the video.
    night: {
      morning: makePalette({
        fog: 0x0d1326, fogNear: 36, fogFar: 430,
        sky: 0x141c38,
        key: 0x8fa4d8, keyInt: 0.4,
        amb: 0x4a5878, ambInt: 0.34,
        hemiSky: 0x1a2a48, hemiGround: 0x0a0c12, hemiInt: 0.3,
        rim: 0x6a7aa8, rimInt: 0.18,
        sun: 0.25, moon: 0.75, stars: 0.55,
        cloud: 0x1c2440, cloudOp: 0.42,
        label: 'SÁNG'
      }),
      afternoon: makePalette({
        fog: 0x10142a, fogNear: 32, fogFar: 420,
        sky: 0x1a1430,
        key: 0xb88060, keyInt: 0.42,
        amb: 0x4a4060, ambInt: 0.32,
        hemiSky: 0x221c44, hemiGround: 0x0a0a10, hemiInt: 0.26,
        rim: 0x705a88, rimInt: 0.16,
        sun: 0.35, moon: 0.7, stars: 0.6,
        cloud: 0x241c38, cloudOp: 0.4,
        label: 'CHIỀU'
      }),
      night: makePalette({
        fog: 0x060a18, fogNear: 26, fogFar: 400,
        sky: 0x0e1632,
        key: 0x7a8fc8, keyInt: 0.34,
        amb: 0x3c4a74, ambInt: 0.26,
        hemiSky: 0x1c2c52, hemiGround: 0x07080e, hemiInt: 0.2,
        rim: 0x6a7ab8, rimInt: 0.14,
        sun: 0, moon: 1, stars: 1,
        cloud: 0x141c36, cloudOp: 0.38,
        label: 'TỐI'
      })
    }
  };
  function stylePalettes() { return TIME_PALETTES[settings.style] || TIME_PALETTES.modern; }
  const TIME_PHASES = { morning: 'SÁNG', afternoon: 'CHIỀU', night: 'TỐI' };
  const tod = {
    fog: new THREE.Color(0xff9a80), fogNear: 80, fogFar: 620,
    sky: new THREE.Color(0xffffff),
    key: new THREE.Color(0xffb070), keyInt: 0.85,
    amb: new THREE.Color(0xffd0c8), ambInt: 0.42,
    hemiSky: new THREE.Color(0x9a7cff), hemiGround: new THREE.Color(0x5a3a2a), hemiInt: 0.45,
    rim: new THREE.Color(0x4a3a8a), rimInt: 0.3,
    sun: 1, moon: 0, stars: 0,
    cloud: new THREE.Color(0xffffff), cloudOp: 0.22
  };
  let gameClockSec = 15 * 3600;      // in-game seconds of day; randomized on start
  let timePhase = 'afternoon';
  let timeJumpT = 110;
  let _skyKind = '';
  const _skyTime = { morning: 0, afternoon: 0, night: 0 };

  function phaseFromHour(h) {
    return (h >= 5 && h < 12) ? 'morning' : (h >= 12 && h < 18) ? 'afternoon' : 'night';
  }
  function setSkyTexture(phase) {
    const key = settings.style + ':' + phase;
    if (!skyMesh || _skyKind === key) return;
    _skyKind = key;
    skyMesh.material.map = makeSkyTexture(key);
    skyMesh.material.needsUpdate = true;
  }
  function snapTimePalette() {
    const P = stylePalettes()[timePhase];
    tod.fog.copy(P.fogC); tod.fogNear = P.fogNear; tod.fogFar = P.fogFar;
    tod.sky.copy(P.skyC);
    tod.key.copy(P.keyC); tod.keyInt = P.keyInt;
    tod.amb.copy(P.ambC); tod.ambInt = P.ambInt;
    tod.hemiSky.copy(P.hemiSkyC); tod.hemiGround.copy(P.hemiGroundC); tod.hemiInt = P.hemiInt;
    tod.rim.copy(P.rimC); tod.rimInt = P.rimInt;
    tod.sun = P.sun; tod.moon = P.moon; tod.stars = P.stars;
    tod.cloud.copy(P.cloudC); tod.cloudOp = P.cloudOp;
    setSkyTexture(timePhase);
  }
  function setGameTime(seconds) {
    gameClockSec = ((seconds % 86400) + 86400) % 86400;
    timePhase = phaseFromHour(gameClockSec / 3600);
    timeJumpT = 100 + Math.random() * 160;
    setSkyTexture(timePhase);
    snapTimePalette();
    if (typeof applyWeather === 'function') applyWeather();
  }
  function randomizeGameTime(snap) {
    const r = Math.random();
    const phase = r < 0.34 ? 'morning' : r < 0.67 ? 'afternoon' : 'night';
    let h;
    if (phase === 'morning') h = 6 + Math.random() * 5;
    else if (phase === 'afternoon') h = 12 + Math.random() * 5.5;
    else h = 20 + Math.random() * 8;                 // 20..28 → wraps past midnight
    gameClockSec = Math.floor(((h % 24) * 3600));
    timePhase = phaseFromHour(gameClockSec / 3600);
    timeJumpT = 100 + Math.random() * 160;
    setSkyTexture(timePhase);
    if (snap) snapTimePalette();
    if (typeof applyWeather === 'function') applyWeather();
  }
  function updateTimeOfDay(dt) {
    gameClockSec = (gameClockSec + dt) % 86400;
    const p = phaseFromHour(gameClockSec / 3600);
    if (p !== timePhase) { timePhase = p; setSkyTexture(p); }
    const P = stylePalettes()[timePhase];
    const k = 1 - Math.exp(-dt * 0.55);
    tod.fog.lerp(P.fogC, k);
    tod.fogNear += (P.fogNear - tod.fogNear) * k;
    tod.fogFar += (P.fogFar - tod.fogFar) * k;
    tod.sky.lerp(P.skyC, k);
    tod.key.lerp(P.keyC, k);
    tod.keyInt += (P.keyInt - tod.keyInt) * k;
    tod.amb.lerp(P.ambC, k);
    tod.ambInt += (P.ambInt - tod.ambInt) * k;
    tod.hemiSky.lerp(P.hemiSkyC, k);
    tod.hemiGround.lerp(P.hemiGroundC, k);
    tod.hemiInt += (P.hemiInt - tod.hemiInt) * k;
    tod.rim.lerp(P.rimC, k);
    tod.rimInt += (P.rimInt - tod.rimInt) * k;
    tod.sun += (P.sun - tod.sun) * k;
    tod.moon += (P.moon - tod.moon) * k;
    tod.stars += (P.stars - tod.stars) * k;
    tod.cloud.lerp(P.cloudC, k);
    tod.cloudOp += (P.cloudOp - tod.cloudOp) * k;
    // random time-of-day jumps keep the world varied
    timeJumpT -= dt;
    if (timeJumpT <= 0) {
      randomizeGameTime(false);
      toast('GIỜ ĐÃ ĐỔI — ' + TIME_PHASES[timePhase]);
    }
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

  const _wFogRain = new THREE.Color(0x55616e);
  const _wCloudRain = new THREE.Color(0x3a4048);
  const _wTmp = new THREE.Color();
  // Time-of-day values are the base; weather darkens them on top of it.
  function applyWeather() {
    if (!scene || !scene.fog) return;
    const t = Math.max(weatherDark, weatherRain * 0.6);
    _wTmp.copy(tod.fog).lerp(_wFogRain, t);
    scene.fog.color.copy(_wTmp);
    if (scene.background && scene.background.isColor) scene.background.copy(_wTmp);
    scene.fog.near = tod.fogNear * (1 - 0.45 * t);
    scene.fog.far = tod.fogFar * (1 - 0.5 * t);
    if (ambientLight) {
      ambientLight.color.copy(tod.amb);
      ambientLight.intensity = tod.ambInt + 0.05 * t;
    }
    if (hemiLight) {
      hemiLight.color.copy(tod.hemiSky);
      hemiLight.groundColor.copy(tod.hemiGround);
      hemiLight.intensity = tod.hemiInt * (1 - 0.3 * t);
    }
    if (keyLight) {
      keyLight.color.copy(tod.key);
      keyLight.intensity = tod.keyInt * (1 - 0.65 * t) + lightningFlash * 1.1;
    }
    if (rimLight) {
      rimLight.color.copy(tod.rim);
      rimLight.intensity = tod.rimInt * (1 - 0.8 * t);
    }
    if (skyMesh) {
      const dim = 1 - 0.5 * t;
      skyMesh.material.color.setRGB(tod.sky.r * dim, tod.sky.g * dim, tod.sky.b * dim);
    }
    if (sunSprite) {
      const so = Math.max(0, tod.sun * (1 - 1.5 * t));
      sunSprite.material.opacity = so;
      sunSprite.visible = so > 0.02;
    }
    if (moonSprite) {
      const mo = Math.max(0, tod.moon * (1 - 1.4 * t));
      moonSprite.material.opacity = mo;
      moonSprite.visible = mo > 0.02;
    }
    if (starField) {
      const st = Math.max(0, tod.stars * (1 - 1.2 * t));
      starField.material.opacity = st;
      starField.visible = st > 0.03;
    }
    if (cloudMat) {
      cloudMat.color.copy(tod.cloud).lerp(_wCloudRain, t);
      cloudMat.opacity = Math.min(1, tod.cloudOp + 0.55 * t);
    }
    // city night lights: windows + lamps glow after dark, neon signs brighten
    const nightGlow = Math.max(0, 1 - tod.sun) * (1 - 0.5 * weatherDark);
    for (let i = 0; i < buildingBoxes.length; i++) {
      const em = buildingBoxes[i].emissiveMats;
      if (em) for (let j = 0; j < em.length; j++) em[j].emissiveIntensity = 0.85 * nightGlow;
    }
    for (let i = 0; i < lampBulbs.length; i++) lampBulbs[i].emissiveIntensity = 1.6 * nightGlow;
    for (let i = 0; i < neonSignMats.length; i++) neonSignMats[i].opacity = 0.25 + 0.75 * nightGlow;
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
    if (!settings.fxWeather) {
      if (rainLines.visible) rainLines.visible = false;
      return;
    }
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
    if (!settings.fxWeather) return;
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
    updateTimeOfDay(dt);
    applyWeather();
    updateClouds(dt);
    updateRain(dt);
    Sfx.setRain(settings.fxWeather ? weatherRain : 0);
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
  const bridgeDecks = [];     // raised bridge decks {minX,maxX,minZ,maxZ,h,mesh,fade,lastOp}
  const blockMap = [];        // per-block city-map data {x,z,q,park,bar} for the wide minimap
  const lampBulbs = [];       // emissive lamp bulb materials (night glow)
  const neonSignMats = [];    // neon sign materials (brighten at night)
  const waterMats = [];       // animated water materials
  const waveMeshes = [];      // water planes with animated vertex waves
  let waterScrollT = 0;       // water texture scroll clock
  function registerWave(mesh, amp) {
    const pos = mesh.geometry.attributes.position;
    const base = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { base[i * 2] = pos.getX(i); base[i * 2 + 1] = pos.getY(i); }
    waveMeshes.push({ mesh, base, amp });
  }

  function box(w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, { roughness: 0.9 }));
    m.position.set(x, y, z);
    m.castShadow = false; m.receiveShadow = false;
    return m;
  }
  function neonBox(w, h, d, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    m.position.set(x, y, z);
    neonSignMats.push(m.material);
    return m;
  }
  function plane(w, d, color, x, y, z, rx, po) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, { roughness: 0.95 }));
    if (po) {                       // depth bias: painted surfaces win at any distance
      m.material.polygonOffset = true;
      m.material.polygonOffsetFactor = -po;
      m.material.polygonOffsetUnits = -po;
    }
    m.rotation.x = rx === undefined ? -Math.PI / 2 : rx;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    return m;
  }

  /* ---- merged geometry helpers: many tiny props -> ONE draw call ---- */
  function mergeBoxes(items, matl) {
    // axis-aligned boxes (x,y,z,w,h,d) merged into a single BufferGeometry
    const pos = new Float32Array(items.length * 108);
    const nor = new Float32Array(items.length * 108);
    let k = 0;
    const faces = [
      [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1], 1, 0, 0],
      [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1], -1, 0, 0],
      [[1, 1, -1], [-1, 1, -1], [-1, 1, 1], [1, 1, 1], 0, 1, 0],
      [[1, -1, 1], [-1, -1, 1], [-1, -1, -1], [1, -1, -1], 0, -1, 0],
      [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], 0, 0, 1],
      [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1], 0, 0, -1]
    ];
    const tri = [0, 1, 2, 0, 2, 3];
    for (const b of items) {
      for (const f of faces) {
        for (const t of tri) {
          pos[k * 3] = b.x + f[t][0] * b.w / 2;
          pos[k * 3 + 1] = b.y + f[t][1] * b.h / 2;
          pos[k * 3 + 2] = b.z + f[t][2] * b.d / 2;
          nor[k * 3] = f[3]; nor[k * 3 + 1] = f[4]; nor[k * 3 + 2] = f[5];
          k++;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    const m = new THREE.Mesh(geo, matl);
    m.receiveShadow = true;
    return m;
  }
  function mergeGroundQuads(items, matl) {
    // flat XZ quads (x,z,w,d,y) merged into a single BufferGeometry
    const pos = new Float32Array(items.length * 18);
    const nor = new Float32Array(items.length * 18);
    let k = 0;
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const tri = [0, 1, 2, 0, 2, 3];
    for (const q of items) {
      for (const t of tri) {
        pos[k * 3] = q.x + c[t][0] * q.w / 2;
        pos[k * 3 + 1] = q.y === undefined ? 0.03 : q.y;
        pos[k * 3 + 2] = q.z + c[t][1] * q.d / 2;
        nor[k * 3] = 0; nor[k * 3 + 1] = 1; nor[k * 3 + 2] = 0;
        k++;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return new THREE.Mesh(geo, matl);
  }

  /* ============================================================
     UNITY-STYLE FACADES — window grids with day glass + a night
     emissive map so the city lights up after dark.
     ============================================================ */
  const _facadeTex = {};
  // modern building facade: concrete tone + window grid + lit rooms (emissiveMap)
  function facadeTextures(baseColor, variant, neon, surf) {
    const sk = surf === 'brick' ? 1 : 0;
    const key = 'f:' + baseColor + ':' + variant + ':' + (neon ? 1 : 0) + ':' + sk;
    if (_facadeTex[key]) return _facadeTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    if (surf === 'brick') {
      g.drawImage(brickTexture(baseColor).image, 0, 0, 128, 128);
    } else {
      g.drawImage(concreteTexture(baseColor, variant).image, 0, 0, 128, 128);
    }
    const cols = 8, rows = 8, gap = 7, ww = (128 - gap * (cols + 1)) / cols, hh = (128 - gap * (rows + 1)) / rows;
    const night = document.createElement('canvas');
    night.width = 128; night.height = 128;
    const ng = night.getContext('2d');
    ng.fillStyle = '#000000'; ng.fillRect(0, 0, 128, 128);
    const lrng = mulberry32(baseColor + variant * 97);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = gap + i * (ww + gap), y = gap + j * (hh + gap);
      g.fillStyle = neon ? '#372e42' : '#2c3138';
      g.fillRect(x - 2, y - 2, ww + 4, hh + 4);
      const grd = g.createLinearGradient(x, y, x + ww, y + hh);
      if (neon) { grd.addColorStop(0, '#2a3a55'); grd.addColorStop(1, '#3a5070'); }
      else { grd.addColorStop(0, '#3d5568'); grd.addColorStop(1, '#5a7a90'); }
      g.fillStyle = grd;
      g.fillRect(x, y, ww, hh);
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.fillRect(x + 2, y + 2, ww - 6, 3);
      if (lrng() < 0.24) {
        const lit = neon ? ['#ffd27a', '#ff9ac8', '#8ad8ff'] : ['#ffe9b0', '#e8f2ff'];
        ng.fillStyle = lit[(lrng() * lit.length) | 0];
        ng.fillRect(x, y, ww, hh);
        // curtain silhouettes inside the lit room
        ng.fillStyle = 'rgba(30,22,18,0.5)';
        ng.fillRect(x + 1, y, 2, hh);
        ng.fillRect(x + ww - 3, y, 2, hh);
        ng.fillStyle = 'rgba(255,220,160,0.35)';
        ng.fillRect(x + 3, y + hh - 4, ww - 6, 4);
      }
    }
    const dayTex = new THREE.CanvasTexture(c);
    dayTex.magFilter = THREE.LinearFilter;
    dayTex.minFilter = THREE.LinearMipmapLinearFilter;
    const nightTex = new THREE.CanvasTexture(night);
    nightTex.magFilter = THREE.LinearFilter;
    nightTex.minFilter = THREE.LinearMipmapLinearFilter;
    _facadeTex[key] = { day: dayTex, night: nightTex };
    return _facadeTex[key];
  }
  // glass curtain-wall skyscraper: big reflective panes over a mullion grid
  function glassTowerTextures(variant, neon) {
    const key = 'gt:' + variant + ':' + (neon ? 1 : 0);
    if (_facadeTex[key]) return _facadeTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const cols = 4, rows = 4;
    const night = document.createElement('canvas');
    night.width = 128; night.height = 128;
    const ng = night.getContext('2d');
    ng.fillStyle = '#000000'; ng.fillRect(0, 0, 128, 128);
    const lrng = mulberry32(777 + variant * 13);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = i * 32, y = j * 32;
      const grd = g.createLinearGradient(x, y, x + 32, y + 32);
      if (neon) {
        const tone = lrng();
        if (tone < 0.4) { grd.addColorStop(0, '#5a3f8a'); grd.addColorStop(1, '#8a6fd0'); }
        else if (tone < 0.75) { grd.addColorStop(0, '#2f5a8a'); grd.addColorStop(1, '#5a8ad0'); }
        else { grd.addColorStop(0, '#8a3f6a'); grd.addColorStop(1, '#d06fa0'); }
      } else {
        grd.addColorStop(0, '#4a6f8f'); grd.addColorStop(1, '#7a9fbf');
      }
      g.fillStyle = grd;
      g.fillRect(x + 2, y + 2, 28, 28);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x + 4, y + 4, 24, 5);
      g.fillStyle = '#1c2228';
      g.fillRect(x, y, 32, 2); g.fillRect(x, y + 30, 32, 2);
      g.fillRect(x, y, 2, 32); g.fillRect(x + 30, y, 2, 32);
      if (lrng() < 0.22) {
        ng.fillStyle = '#ffe2a0';
        ng.fillRect(x + 2, y + 2, 28, 28);
      }
    }
    const dayTex = new THREE.CanvasTexture(c);
    dayTex.magFilter = THREE.LinearFilter;
    dayTex.minFilter = THREE.LinearMipmapLinearFilter;
    const nightTex = new THREE.CanvasTexture(night);
    nightTex.magFilter = THREE.LinearFilter;
    nightTex.minFilter = THREE.LinearMipmapLinearFilter;
    _facadeTex[key] = { day: dayTex, night: nightTex };
    return _facadeTex[key];
  }
  // ground-floor shop front: awning, shop windows, door (lit at night)
  function storefrontTextures(variant, neon) {
    const key = 'sf:' + variant + ':' + (neon ? 1 : 0);
    if (_facadeTex[key]) return _facadeTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const g = c.getContext('2d');
    const night = document.createElement('canvas');
    night.width = 128; night.height = 64;
    const ng = night.getContext('2d');
    ng.fillStyle = '#000000'; ng.fillRect(0, 0, 128, 64);
    g.fillStyle = neon ? '#7a4a58' : '#878c93';
    g.fillRect(0, 0, 128, 64);
    // striped awning over the shop windows
    const aw = [0xc94f7c, 0x2fa8a0, 0xd9a441, 0x4f6fd9, 0x3f8f5f];
    for (let s = 0; s < 8; s++) {
      g.fillStyle = s % 2 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.14)';
      g.fillRect(s * 16, 34, 16, 10);
      g.fillStyle = '#' + new THREE.Color(aw[variant % aw.length]).getHexString();
      g.globalAlpha = 0.6;
      g.fillRect(s * 16, 34, 16, 10);
      g.globalAlpha = 1;
    }
    // shop sign board with readable name
    g.fillStyle = neon ? '#2a1f33' : '#22303c';
    g.fillRect(4, 46, 120, 16);
    const signs = ['HOTEL', 'CAFE', '24H', 'SHOP', 'BAR', 'FOOD'];
    g.fillStyle = neon ? '#ffd76a' : '#e8f0f4';
    g.font = 'bold 12px sans-serif';
    g.textAlign = 'center';
    g.fillText(signs[variant % signs.length], 64, 58);
    g.textAlign = 'left';
    ng.fillStyle = neon ? '#ffd76a' : '#ffe9b0';
    ng.fillRect(4, 46, 120, 16);
    // shop windows + door
    g.fillStyle = '#1e3a4e';
    g.fillRect(6, 10, 44, 32);
    g.fillRect(78, 10, 44, 32);
    g.fillStyle = '#241a12';
    g.fillRect(56, 2, 16, 40);
    g.fillStyle = '#c9a86a';
    g.fillRect(68, 24, 3, 3);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(9, 12, 11, 28);
    g.fillRect(81, 12, 11, 28);
    ng.fillStyle = '#ffd9a0';
    ng.fillRect(6, 10, 44, 32);
    ng.fillRect(78, 10, 44, 32);
    ng.fillStyle = '#e8f2ff';
    ng.fillRect(56, 2, 16, 40);
    const dayTex = new THREE.CanvasTexture(c);
    dayTex.magFilter = THREE.LinearFilter;
    dayTex.minFilter = THREE.LinearMipmapLinearFilter;
    const nightTex = new THREE.CanvasTexture(night);
    nightTex.magFilter = THREE.LinearFilter;
    nightTex.minFilter = THREE.LinearMipmapLinearFilter;
    _facadeTex[key] = { day: dayTex, night: nightTex };
    return _facadeTex[key];
  }
  function facadeMaterial(baseColor, variant, neon, surf) {
    const t = facadeTextures(baseColor, variant, neon, surf);
    return new THREE.MeshStandardMaterial({
      color: 0xffffff, map: t.day,
      emissive: 0xffffff, emissiveMap: t.night, emissiveIntensity: 0,
      roughness: 0.75, metalness: 0.2
    });
  }
  function glassTowerMaterial(variant, neon) {
    const t = glassTowerTextures(variant, neon);
    return new THREE.MeshStandardMaterial({
      color: 0xffffff, map: t.day,
      emissive: 0xffffff, emissiveMap: t.night, emissiveIntensity: 0,
      roughness: 0.22, metalness: 0.6
    });
  }
  function storefrontMaterial(variant, neon) {
    const t = storefrontTextures(variant, neon);
    return new THREE.MeshStandardMaterial({
      color: 0xffffff, map: t.day,
      emissive: 0xffffff, emissiveMap: t.night, emissiveIntensity: 0,
      roughness: 0.7, metalness: 0.25
    });
  }

  /* ---- realistic surface textures (brick, concrete, asphalt, sidewalk, grass, sand, roof) ---- */
  const _surfTex = {};
  function brickTexture(tone) {
    const key = 'brick:' + tone;
    if (_surfTex[key]) return _surfTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const b = new THREE.Color(tone);
    g.fillStyle = '#' + b.clone().multiplyScalar(0.62).getHexString();
    g.fillRect(0, 0, 128, 128);                      // mortar
    const lr = mulberry32(tone * 13 + 5);
    const bh = 18, bw = 42;
    for (let row = 0; row < 7; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw + off; x < 128; x += bw) {
        const v = 0.8 + lr() * 0.4;
        g.fillStyle = '#' + b.clone().multiplyScalar(v).getHexString();
        g.fillRect(x + 1, row * bh + 1, bw - 2, bh - 2);
        g.fillStyle = 'rgba(0,0,0,0.10)';
        for (let k = 0; k < 5; k++) g.fillRect(x + 2 + ((lr() * (bw - 7)) | 0), row * bh + 2 + ((lr() * (bh - 6)) | 0), 3, 2);
        g.fillStyle = 'rgba(255,255,255,0.05)';
        g.fillRect(x + 1, row * bh + 1, bw - 2, 2);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _surfTex[key] = tex;
    return tex;
  }
  function concreteTexture(tone, variant) {
    const key = 'conc:' + tone + ':' + (variant % 3);
    if (_surfTex[key]) return _surfTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const b = new THREE.Color(tone);
    g.fillStyle = '#' + b.getHexString();
    g.fillRect(0, 0, 128, 128);
    const lr = mulberry32(tone * 9 + variant * 17);
    // panel seams
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(0, 63, 128, 2);
    g.fillRect(63, 0, 2, 128);
    // water stains
    for (let s = 0; s < 3; s++) {
      const x = 8 + ((lr() * 110) | 0), y = 8 + ((lr() * 110) | 0);
      const rg = g.createRadialGradient(x, y, 2, x, y, 14 + lr() * 14);
      rg.addColorStop(0, 'rgba(70,60,40,0.10)');
      rg.addColorStop(1, 'rgba(70,60,40,0)');
      g.fillStyle = rg;
      g.fillRect(x - 16, y - 16, 32, 32);
    }
    // speckle
    for (let i = 0; i < 500; i++) {
      g.fillStyle = lr() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
      g.fillRect((lr() * 128) | 0, (lr() * 128) | 0, 1, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _surfTex[key] = tex;
    return tex;
  }
  function asphaltTexture(dark) {
    const key = 'asphalt:' + (dark ? 1 : 0);
    if (_surfTex[key]) return _surfTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = dark ? '#33363c' : '#383c42';
    g.fillRect(0, 0, 128, 128);
    const lr = mulberry32(41 + dark * 7);
    for (let i = 0; i < 900; i++) {
      const v = 0.5 + lr();
      g.fillStyle = 'rgba(' + ((v * 70) | 0) + ',' + ((v * 72) | 0) + ',' + ((v * 78) | 0) + ',0.55)';
      g.fillRect((lr() * 128) | 0, (lr() * 128) | 0, 1 + ((lr() * 2) | 0), 1);
    }
    // faint cracks + patches
    g.strokeStyle = 'rgba(10,10,12,0.5)';
    for (let k = 0; k < 3; k++) {
      let x = 10 + ((lr() * 100) | 0), y = 10 + ((lr() * 100) | 0);
      g.beginPath(); g.moveTo(x, y);
      for (let seg = 0; seg < 4; seg++) { x += (lr() - 0.5) * 26; y += (lr() - 0.5) * 26; g.lineTo(x, y); }
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _surfTex[key] = tex;
    return tex;
  }
  function sidewalkTexture(tone) {
    const key = 'side:' + tone;
    if (_surfTex[key]) return _surfTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#' + new THREE.Color(tone).getHexString();
    g.fillRect(0, 0, 128, 128);
    const lr = mulberry32(tone * 3 + 11);
    // expansion joints
    g.fillStyle = 'rgba(0,0,0,0.20)';
    g.fillRect(0, 31, 128, 2); g.fillRect(0, 63, 128, 2); g.fillRect(0, 95, 128, 2);
    g.fillRect(31, 0, 2, 128); g.fillRect(63, 0, 2, 128); g.fillRect(95, 0, 2, 128);
    for (let i = 0; i < 420; i++) {
      g.fillStyle = lr() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
      g.fillRect((lr() * 128) | 0, (lr() * 128) | 0, 1 + ((lr() * 2) | 0), 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _surfTex[key] = tex;
    return tex;
  }
  function grassTexture(tone) {
    const key = 'grass:' + tone;
    if (_surfTex[key]) return _surfTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const b = new THREE.Color(tone);
    g.fillStyle = '#' + b.clone().multiplyScalar(0.85).getHexString();
    g.fillRect(0, 0, 128, 128);
    const lr = mulberry32(tone * 7 + 3);
    for (let i = 0; i < 900; i++) {
      const x = (lr() * 128) | 0, y = (lr() * 128) | 0;
      g.strokeStyle = lr() < 0.5
        ? '#' + b.clone().multiplyScalar(1.25).getHexString()
        : '#' + b.clone().multiplyScalar(0.6).getHexString();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (lr() - 0.5) * 2, y - 2 - lr() * 3); g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _surfTex[key] = tex;
    return tex;
  }
  function sandTexture(tone) {
    const key = 'sand:' + tone;
    if (_surfTex[key]) return _surfTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const b = new THREE.Color(tone);
    g.fillStyle = '#' + b.getHexString();
    g.fillRect(0, 0, 128, 128);
    const lr = mulberry32(tone * 11 + 9);
    for (let i = 0; i < 1100; i++) {
      g.fillStyle = lr() < 0.5
        ? '#' + b.clone().multiplyScalar(1.12).getHexString()
        : '#' + b.clone().multiplyScalar(0.88).getHexString();
      g.fillRect((lr() * 128) | 0, (lr() * 128) | 0, 1 + ((lr() * 2) | 0), 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _surfTex[key] = tex;
    return tex;
  }
  function roofTexture() {
    const key = 'roof:0';
    if (_surfTex[key]) return _surfTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#565b62';
    g.fillRect(0, 0, 128, 128);
    const lr = mulberry32(91);
    for (let i = 0; i < 1500; i++) {
      const v = 0.35 + lr();
      g.fillStyle = 'rgba(' + ((v * 120) | 0) + ',' + ((v * 124) | 0) + ',' + ((v * 130) | 0) + ',0.8)';
      g.fillRect((lr() * 128) | 0, (lr() * 128) | 0, 1 + ((lr() * 2) | 0), 1);
    }
    g.fillStyle = 'rgba(20,20,24,0.25)';
    g.fillRect(0, 62, 128, 2); g.fillRect(62, 0, 2, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _surfTex[key] = tex;
    return tex;
  }

  /* animated water: gradient canvas tile + scrolling highlights */
  const _waterTex = {};
  function waterTexture(neon) {
    const key = neon ? 'n' : 'm';
    if (_waterTex[key]) return _waterTex[key];
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, neon ? '#1f7f9a' : '#1c6f92');
    grd.addColorStop(1, neon ? '#0e3f5a' : '#10506e');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    for (let b = 0; b < 26; b++) {
      const y = (b * 19 + ((b * 7) % 13)) % 256;
      g.fillStyle = b % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,30,50,0.12)';
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.05 + b) * 4);
      g.lineTo(256, y + 8); g.lineTo(0, y + 8);
      g.closePath();
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    _waterTex[key] = tex;
    return tex;
  }
  function waterMaterial(neon) {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff, map: waterTexture(neon),
      roughness: 0.15, metalness: 0.5
    });
    waterMats.push(m);
    return m;
  }

  /* street furniture: lamps (merged into 3 draw calls), benches, bus stops, hydrants, billboards */
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, emissive: 0xffe9b0, emissiveIntensity: 0, roughness: 0.6
  });
  const _lampPoles = [], _lampHeads = [], _lampBulbSpecs = [];
  function addLamp(x, z, baseY) {
    const y0 = baseY === undefined ? 0.02 : baseY;
    _lampPoles.push({ x, y: y0 + 1.7, z, w: 0.09, h: 3.4, d: 0.09 });
    _lampPoles.push({ x: x + 0.26, y: y0 + 3.35, z, w: 0.55, h: 0.05, d: 0.05 });
    _lampHeads.push({ x: x + 0.5, y: y0 + 3.28, z, w: 0.34, h: 0.1, d: 0.2 });
    _lampBulbSpecs.push({ x: x + 0.5, y: y0 + 3.2, z, w: 0.22, h: 0.05, d: 0.11 });
  }
  function buildLampMeshes() {
    if (!_lampPoles.length) return;
    lampBulbs.push(lampBulbMat);
    const poles = mergeBoxes(_lampPoles, mat(0x2a2e33, { roughness: 0.5, metalness: 0.7 }));
    const heads = mergeBoxes(_lampHeads, mat(0x1c1f24, { roughness: 0.6 }));
    const bulbs = mergeBoxes(_lampBulbSpecs, lampBulbMat);
    worldGroup.add(poles, heads, bulbs);
  }
  function addBench(x, z, ry) {
    const g = new THREE.Group();
    const wood = mat(0x7a5a38, { roughness: 0.9 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.5), wood);
    seat.position.y = 0.48;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.08), wood);
    back.position.set(0, 0.72, -0.21);
    back.rotation.x = 0.12;
    const legM = mat(0x2a2a2e, { roughness: 0.6, metalness: 0.5 });
    const legs = mergeBoxes([
      { x: -0.6, y: 0.22, z: 0.16, w: 0.07, h: 0.45, d: 0.07 },
      { x: 0.6, y: 0.22, z: 0.16, w: 0.07, h: 0.45, d: 0.07 },
      { x: -0.6, y: 0.22, z: -0.16, w: 0.07, h: 0.45, d: 0.07 },
      { x: 0.6, y: 0.22, z: -0.16, w: 0.07, h: 0.45, d: 0.07 }
    ], legM);
    g.add(seat, back, legs);
    g.position.set(x, 0.02, z);
    g.rotation.y = ry || 0;
    worldGroup.add(g);
    return g;
  }
  function addBusStop(x, z, flip) {
    const g = new THREE.Group();
    const neon = isNeon();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 1.3), mat(neon ? 0xb5547c : 0x4a6f8f, { roughness: 0.55, metalness: 0.4 }));
    roof.position.y = 2.42;
    const glass = mat(0x3d5a70, { roughness: 0.2, metalness: 0.5 });
    const backG = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.3, 0.06), glass);
    backG.position.set(0, 1.55, -0.6);
    const sideG = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 1.2), glass);
    sideG.position.set(1.62, 1.55, 0);
    const poleM = mat(0x2a2e33, { roughness: 0.5, metalness: 0.7 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 6), poleM);
    pole.position.set(1.6, 1.2, 0);
    const seatB = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.5), mat(0x7a5a38, { roughness: 0.9 }));
    seatB.position.set(-0.2, 0.5, -0.2);
    g.add(roof, backG, sideG, pole, seatB);
    g.position.set(x, 0.02, z);
    if (flip) g.rotation.y = Math.PI;
    worldGroup.add(g);
    return g;
  }
  function addHydrant(x, z) {
    const g = new THREE.Group();
    const red = mat(0xb02a24, { roughness: 0.6, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.5, 8), red);
    body.position.y = 0.25;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), red);
    cap.position.y = 0.55;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6), red);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(0.13, 0.38, 0);
    g.add(body, cap, nozzle);
    g.position.set(x, 0.02, z);
    worldGroup.add(g);
    return g;
  }
  function addBillboard(x, z) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 5.5, 8), mat(0x3a3e44, { roughness: 0.6, metalness: 0.6 }));
    post.position.y = 2.75;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const g2 = c.getContext('2d');
    const cols = NEON_COLS;
    g2.fillStyle = '#' + new THREE.Color(cols[(rng() * cols.length) | 0]).getHexString();
    g2.fillRect(0, 0, 128, 64);
    g2.fillStyle = '#ffffff';
    g2.font = 'bold 26px sans-serif';
    g2.fillText('CITY', 30, 42);
    const tex = new THREE.CanvasTexture(c);
    const adMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0 });
    lampBulbs.push(adMat);           // billboard backlight joins the city night glow
    const panel = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.4, 0.24),
      [mat(0x2a2e33), mat(0x2a2e33), mat(0x2a2e33), mat(0x2a2e33), adMat, adMat]);
    panel.position.y = 5.2;
    panel.castShadow = true;
    g.add(post, panel);
    g.position.set(x, 0.02, z);
    g.rotation.y = (rng() * 2 - 1) * Math.PI / 2;
    worldGroup.add(g);
    return g;
  }

  function addBuilding(minX, minZ, maxX, maxZ) {
    const w = maxX - minX, d = maxZ - minZ;
    if (w < 4 || d < 4) return;
    const mx = (minX + maxX) / 2, mz = (minZ + maxZ) / 2;
    const neon = isNeon();
    const S = STYLES[settings.style];

    // district palette (GTA-style quarters) + CITY CORES: dense high-rise clusters.
    const districtKey = mz < RIVER_Z ? (mx < 0 ? 'nw' : 'ne') : (mx < 0 ? 'sw' : 'se');
    let pal = S.districtPals[districtKey];
    let h = 4 + Math.pow(rng(), 1.6) * 26;
    let coreBoost = 0;
    for (const c of CITY_CORES) {
      const dist = Math.hypot(mx - c.x, mz - c.z);
      if (dist < c.r) coreBoost = Math.max(coreBoost, 1 - dist / c.r);
    }
    if (coreBoost > 0) {
      h = 20 + coreBoost * 36 + rng() * 8;              // tower zone
      if (h > 30) pal = S.districtPals.se;              // glass curtain walls for skyscrapers
    }
    const tower = h > 30;
    const variant = (minX * 13 + minZ * 7) | 0;
    const baseC = pal[(rng() * pal.length) | 0];

    const emissiveMats = [];
    const surf = !neon && districtKey === 'ne' ? 'brick' : 'conc';   // brick quarter, concrete elsewhere
    const sideMat = tower ? glassTowerMaterial(variant, neon) : facadeMaterial(baseC, variant, neon, surf);
    const topMat = new THREE.MeshStandardMaterial({ map: roofTexture(), roughness: 0.95 });
    const mats = [sideMat, sideMat, topMat, topMat, sideMat, sideMat];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    m.position.set(mx, 0.02 + h / 2, mz);
    m.castShadow = true; m.receiveShadow = true;
    worldGroup.add(m);
    buildingMeshes.push(m);
    if (sideMat.emissiveMap) emissiveMats.push(sideMat);

    // parapet + cornice rim around the roof
    const parapet = box(w + 0.5, 0.55, d + 0.5, neon ? 0x7a5a6a : 0x6a7078, mx, 0.02 + h + 0.28, mz);
    parapet.castShadow = true;
    worldGroup.add(parapet);

    // ground-floor storefront band facing one street (lit windows at night)
    const faceFront = rng() < 0.5;
    const storeMat = storefrontMaterial(variant, neon);
    if (storeMat.emissiveMap) emissiveMats.push(storeMat);
    const bandMats = faceFront
      ? [sideMat, sideMat, topMat, topMat, storeMat, sideMat]
      : [sideMat, sideMat, topMat, topMat, sideMat, storeMat];
    const band = new THREE.Mesh(new THREE.BoxGeometry(w, 1.35, d + 0.26), bandMats);
    band.position.set(mx, 0.02 + 0.675, mz);
    worldGroup.add(band);
    buildingMeshes.push(band);

    // rooftop props: AC units, water tank; antennas on towers
    if (h > 12) {
      const ac = box(1.6, 1.1, 1.6, 0x9aa0a6, mx + w * 0.28, 0.02 + h + 0.75, mz - d * 0.26);
      ac.castShadow = true;
      worldGroup.add(ac);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 1.8, 8), mat(neon ? 0x8a6a4a : 0x7a5a3a, { roughness: 0.8 }));
      tank.position.set(mx - w * 0.3, 0.02 + h + 0.9, mz + d * 0.3);
      tank.castShadow = true;
      worldGroup.add(tank);
    }
    if (tower) {
      const mast = box(0.3, 3.5 + rng() * 2.5, 0.3, 0x2b2e33, mx + w * 0.25, 0.02 + h + 2, mz - d * 0.2);
      worldGroup.add(mast);
      // rooftop beacon
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshStandardMaterial({
        color: 0xff5a4a, emissive: 0xff2a1a, emissiveIntensity: 0.9, roughness: 0.5
      }));
      beacon.position.set(mx + w * 0.25, 0.02 + h + 3.8 + rng() * 2.2, mz - d * 0.2);
      worldGroup.add(beacon);
    }

    // neon signs dress the skyline (neon style only)
    if (neon) {
      if (w > 5 && d > 4) {
        const nc = NEON_COLS[(rng() * NEON_COLS.length) | 0];
        worldGroup.add(neonBox(Math.min(w * 0.6, 6.5), 0.34, 0.1, nc, mx, 1.55, (faceFront ? 1 : -1) * (d / 2 + 0.28) + mz));
      }
      if (tower) {
        const nc2 = NEON_COLS[(rng() * NEON_COLS.length) | 0];
        worldGroup.add(neonBox(0.24, h * 0.62, 0.24, nc2, maxX - 0.18, 0.02 + h * 0.52, minZ + 0.18));
        worldGroup.add(neonBox(0.24, h * 0.62, 0.24, nc2, minX + 0.18, 0.02 + h * 0.52, maxZ - 0.18));
        if (w > 8) {
          const nc3 = NEON_COLS[(rng() * NEON_COLS.length) | 0];
          worldGroup.add(neonBox(Math.min(w * 0.6, 9), 0.55, 0.35, nc3, mx, 0.02 + h + 0.9, maxZ - 0.4));
        }
      }
    }

    buildingBoxes.push({
      minX, maxX, minZ, maxZ, h,
      cx: mx, cz: mz,
      mats: [sideMat, topMat], fade: 1, lastOp: 1,
      emissiveMats
    });
  }

  /* Trees: neon palms with drooping fronds, modern leafy trees & conifers */
  function addTree(x, z) {
    const g = new THREE.Group();
    const neon = isNeon();
    const r = rng();
    if (neon) {
      // curved palm trunk + drooping fronds + coconuts
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.25, 3.4, 6), mat(0x7a5a38, { roughness: 0.9 }));
      trunk.position.y = 1.7;
      trunk.rotation.z = (rng() - 0.5) * 0.16;
      trunk.castShadow = true;
      g.add(trunk);
      const frondMat = mat(0x2f8a4f, { roughness: 0.9 });
      const fronds = 9;
      for (let i = 0; i < fronds; i++) {
        const a = (i / fronds) * Math.PI * 2 + rng() * 0.4;
        const frond = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 2.2), frondMat);
        frond.position.set(Math.cos(a) * 0.55, 3.35 + rng() * 0.2, Math.sin(a) * 0.55);
        frond.rotation.y = -a;
        frond.rotation.x = 0.5 + rng() * 0.3;      // drooping canopy
        g.add(frond);
      }
      const nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), mat(0x5a3a20, { roughness: 0.9 }));
      nut.position.y = 3.32;
      g.add(nut);
    } else if (r < 0.55) {
      // leafy deciduous tree: trunk + foliage blobs
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 2.6, 9), mat(0x6a4a2a, { roughness: 0.95 }));
      trunk.position.y = 1.3;
      trunk.castShadow = true;
      g.add(trunk);
      const leafM = mat(0x3f7a3f, { roughness: 1 });
      const leafD = mat(0x356b35, { roughness: 1 });
      const blobs = 5;
      for (let i = 0; i < blobs; i++) {
        const a = (i / blobs) * Math.PI * 2 + rng() * 0.5;
        const dd = i === 0 ? 0 : 0.85;
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), i % 2 ? leafM : leafD);
        s.position.set(Math.cos(a) * dd, 3.0 + rng() * 0.45, Math.sin(a) * dd);
        s.scale.set(1, 0.85 + rng() * 0.3, 1);
        s.castShadow = true;
        g.add(s);
      }
    } else {
      // conifer: stacked cones
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.4, 6), mat(0x5a3d22, { roughness: 0.95 }));
      trunk.position.y = 0.7;
      g.add(trunk);
      const green = mat(0x2f6a35, { roughness: 1 });
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.15 - i * 0.28, 1.4, 10), green);
        cone.position.y = 1.7 + i * 0.75;
        cone.castShadow = true;
        g.add(cone);
      }
    }
    g.position.set(x, 0.02, z);
    g.rotation.y = rng() * Math.PI * 2;
    worldGroup.add(g);
  }

  /* ---------------- Beach bar: open-front disco on the sand ----------------
     A glowing party hut on the north beach with a dance floor, a drinks
     counter, hanging disco lights and a spinning mirror ball. The front
     (city side) stays open so the dancing crowd inside is always visible. */
  let bar = null;
  let barFootprint = null;
  function isInsideBar(x, z) {
    return !!barFootprint && x > barFootprint.minX && x < barFootprint.maxX &&
      z > barFootprint.minZ && z < barFootprint.maxZ;
  }
  function barSignTexture(name, color) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = '#1a1020'; g.fillRect(0, 0, 128, 32);
    const col = '#' + new THREE.Color(color).getHexString();
    g.strokeStyle = col; g.lineWidth = 2;
    g.strokeRect(1, 1, 126, 30);
    g.fillStyle = col;
    g.font = 'bold 18px sans-serif';
    g.textAlign = 'center';
    g.fillText(name, 64, 23);
    g.textAlign = 'left';
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }
  function buildBar(x, z) {
    const mx = x, mz = z;
    const W = 15, D = 11, wallH = 2.8;
    const wallM = mat(0x3a2f44, { roughness: 0.9 });
    const roofM = mat(0x2a2233, { roughness: 0.95 });
    const emissiveMats = [];
    // wooden deck (beachfront, raised a touch above the sand)
    const deck = box(W + 0.8, 0.3, D + 0.8, 0x9a6a3a, mx, 0.15, mz);
    deck.castShadow = true; deck.receiveShadow = true;
    worldGroup.add(deck);
    // back wall (sea side) + side walls; the city-facing front stays OPEN
    const back = box(W, wallH, 0.45, 0x3a2f44, mx, 0.15 + wallH / 2, mz - D / 2 + 0.22);
    back.material = wallM;
    const sideL = box(0.45, wallH, D, 0x3a2f44, mx - W / 2 + 0.22, 0.15 + wallH / 2, mz);
    sideL.material = wallM;
    const sideR = box(0.45, wallH, D, 0x3a2f44, mx + W / 2 - 0.22, 0.15 + wallH / 2, mz);
    sideR.material = wallM;
    [back, sideL, sideR].forEach(m => { m.castShadow = true; worldGroup.add(m); buildingMeshes.push(m); });
    // roof slab — registered as a see-through deck so the chase-cam can look in
    const roof = box(W + 0.6, 0.3, D + 0.6, 0x2a2233, mx, 0.15 + wallH + 0.15, mz);
    roof.material = roofM; roof.castShadow = true;
    worldGroup.add(roof);
    bridgeDecks.push({
      minX: mx - W / 2 - 0.4, maxX: mx + W / 2 + 0.4,
      minZ: mz - D / 2 - 0.4, maxZ: mz + D / 2 + 0.4,
      h: wallH + 0.5, mesh: roof, fade: 1, lastOp: 1
    });
    // collision: thin wall strips only — the dance floor stays walkable,
    // so the hero can step in through the open front and join the party
    const pushWall = (a, b, c, d) => {
      buildingBoxes.push({
        minX: a, maxX: b, minZ: c, maxZ: d, h: wallH + 0.45, cx: mx, cz: mz,
        mats: [wallM, wallM], emissiveMats, fade: 1, lastOp: 1
      });
    };
    pushWall(mx - W / 2, mx + W / 2, mz - D / 2, mz - D / 2 + 0.5);
    pushWall(mx - W / 2, mx - W / 2 + 0.5, mz - D / 2, mz + D / 2);
    pushWall(mx + W / 2 - 0.5, mx + W / 2, mz - D / 2, mz + D / 2);
    // glowing checker dance floor
    const danceC = document.createElement('canvas');
    danceC.width = 128; danceC.height = 128;
    const dg = danceC.getContext('2d');
    dg.fillStyle = '#241a30'; dg.fillRect(0, 0, 128, 128);
    dg.fillStyle = 'rgba(255,63,164,0.85)';
    for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) {
      if ((xx + yy) % 2 === 0) dg.fillRect(xx * 16, yy * 16, 16, 16);
    }
    const danceTex = new THREE.CanvasTexture(danceC);
    const danceM = new THREE.MeshStandardMaterial({
      map: danceTex, emissive: 0xffffff, emissiveMap: danceTex, emissiveIntensity: 0.6, roughness: 0.9
    });
    const dance = new THREE.Mesh(new THREE.PlaneGeometry(W - 3, D - 4.5), danceM);
    dance.rotation.x = -Math.PI / 2;
    dance.position.set(mx, 0.32, mz - 0.3);
    dance.receiveShadow = true;
    worldGroup.add(dance);
    emissiveMats.push(danceM);
    // drinks counter along the back wall + bottle shelf + stools
    const counter = box(6.5, 1.0, 0.8, 0x5a3a20, mx, 0.15 + 0.5, mz - D / 2 + 1.7);
    counter.castShadow = true;
    worldGroup.add(counter); buildingMeshes.push(counter);
    worldGroup.add(box(6.9, 0.08, 1.0, 0x2a1c12, mx, 0.15 + 1.04, mz - D / 2 + 1.7));
    worldGroup.add(box(6.5, 0.5, 0.3, 0x241c16, mx, 0.15 + 1.55, mz - D / 2 + 1.05));
    const bottleCols = [0x3f9a4f, 0xc2a02e, 0x7a3ac2, 0xc23a2e, 0x3fe0ff];
    for (let i = 0; i < 9; i++) {
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 6),
        mat(bottleCols[i % bottleCols.length], { roughness: 0.3 }));
      bot.position.set(mx - 2.6 + i * 0.65, 0.15 + 1.28, mz - D / 2 + 1.05);
      worldGroup.add(bot);
    }
    for (let i = 0; i < 4; i++) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 8), mat(0x8a4a2a, { roughness: 0.8 }));
      stool.position.set(mx - 2.4 + i * 1.6, 0.15 + 0.28, mz - D / 2 + 2.8);
      worldGroup.add(stool);
    }
    // hanging disco light orbs + a spinning mirror ball
    const lights = [];
    for (let i = 0; i < 3; i++) {
      const lm = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: NEON_COLS[i], emissiveIntensity: 1.4, roughness: 0.4
      });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), lm);
      orb.position.set(mx + (i - 1) * 3.5, 0.15 + wallH - 0.35, mz - 1.5 + (i % 2) * 1.6);
      worldGroup.add(orb);
      lights.push({ mat: lm });
    }
    const ballM = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.25, metalness: 0.85 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), ballM);
    ball.position.set(mx, 0.15 + wallH - 0.3, mz + 0.7);
    worldGroup.add(ball);
    // glowing "BAR" neon sign over the open front
    const signTex = barSignTexture('BAR', 0xff3fa4);
    const signM = new THREE.MeshStandardMaterial({
      map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 1.15
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.9, 0.25), signM);
    sign.position.set(mx, 0.15 + wallH + 0.62, mz + D / 2 - 0.15);
    worldGroup.add(sign);
    emissiveMats.push(signM);
    for (const s of [-1, 1]) {
      worldGroup.add(box(0.12, 0.9, 0.12, 0x14121a, mx + s * 2.3, 0.15 + wallH + 0.3, mz + D / 2 - 0.15));
    }
    barFootprint = {
      minX: mx - W / 2 - 1, maxX: mx + W / 2 + 1,
      minZ: mz - D / 2 - 1, maxZ: mz + D / 2 + 1
    };
    bar = { x: mx, z: mz, pos: new THREE.Vector3(mx, 0, mz), lights, ball };
    return bar;
  }

  /* ---------------- Interior bars (3 walk-in venues inside city buildings) ----------------
     Real rooms with a door gap in the wall, a glowing dance floor, disco lights
     and dancing bikini girls. The hero (and fleeing NPCs) can walk in through
     the door. Kill EVERYONE inside and a fresh crowd walks in ~10 seconds later. */
  const interiorBars = [];
  function makeDanceMaterial() {
    const danceC = document.createElement('canvas');
    danceC.width = 128; danceC.height = 128;
    const dg = danceC.getContext('2d');
    dg.fillStyle = '#241a30'; dg.fillRect(0, 0, 128, 128);
    dg.fillStyle = 'rgba(255,63,164,0.85)';
    for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) {
      if ((xx + yy) % 2 === 0) dg.fillRect(xx * 16, yy * 16, 16, 16);
    }
    const danceTex = new THREE.CanvasTexture(danceC);
    return new THREE.MeshStandardMaterial({
      map: danceTex, emissive: 0xffffff, emissiveMap: danceTex, emissiveIntensity: 0.6, roughness: 0.9
    });
  }
  function buildInteriorBar(x, z, name, signColor) {
    const W = 16, D = 11, wallH = 3.6, TH = 0.5;
    const mx = x, mz = z;
    const variant = ((x * 13 + z * 7) | 0);
    const neon = isNeon();
    const wallM = facadeMaterial(0x6a4a5a, variant, neon, 'conc');
    const roofM = mat(0x2a2233, { roughness: 0.95 });
    const emissiveMats = [];
    // wooden club floor
    const floor = plane(W, D, 0x6a4a2e, mx, 0.02, mz);
    floor.receiveShadow = true;
    worldGroup.add(floor);
    // walls: the front (south) wall has a 2.4 m door gap in the middle
    const wallBox = (w, t, px, pz) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, t), wallM);
      mesh.position.set(px, wallH / 2, pz);
      mesh.castShadow = true; mesh.receiveShadow = true;
      worldGroup.add(mesh);
      buildingMeshes.push(mesh);
      return mesh;
    };
    const DOOR = 2.4, HALF = (W - DOOR) / 2;
    wallBox(W, TH, mx, mz - D / 2 + TH / 2);                                  // back (north)
    wallBox(HALF - 0.2, TH, mx - DOOR / 2 - (HALF - 0.2) / 2, mz + D / 2 - TH / 2);  // front west of door
    wallBox(HALF - 0.2, TH, mx + DOOR / 2 + (HALF - 0.2) / 2, mz + D / 2 - TH / 2);  // front east of door
    wallBox(TH, D, mx - W / 2 + TH / 2, mz);                                  // west
    wallBox(TH, D, mx + W / 2 - TH / 2, mz);                                  // east
    // door jambs so people funnel through the gap
    const jambM = mat(0x2a1c14, { roughness: 0.9 });
    for (const s of [-1, 1]) {
      const j = box(0.3, wallH, TH, 0x2a1c14, mx + s * (DOOR / 2 + 0.15), wallH / 2, mz + D / 2 - TH / 2);
      j.material = jambM;
      worldGroup.add(j); buildingMeshes.push(j);
    }
    // collision: thin wall strips only — the room itself stays walkable
    const pushWall = (a, b, c, d) => {
      buildingBoxes.push({
        minX: a, maxX: b, minZ: c, maxZ: d, h: wallH + 0.45, cx: mx, cz: mz,
        mats: [wallM, wallM], emissiveMats, fade: 1, lastOp: 1
      });
    };
    pushWall(mx - W / 2, mx + W / 2, mz - D / 2, mz - D / 2 + TH);
    pushWall(mx - W / 2, mx - W / 2 + TH, mz - D / 2, mz + D / 2);
    pushWall(mx + W / 2 - TH, mx + W / 2, mz - D / 2, mz + D / 2);
    pushWall(mx - W / 2, mx - DOOR / 2 - 0.2, mz + D / 2 - TH, mz + D / 2);
    pushWall(mx + DOOR / 2 + 0.2, mx + W / 2, mz + D / 2 - TH, mz + D / 2);
    pushWall(mx - DOOR / 2 - 0.35, mx - DOOR / 2 - 0.05, mz + D / 2 - TH, mz + D / 2);
    pushWall(mx + DOOR / 2 + 0.05, mx + DOOR / 2 + 0.35, mz + D / 2 - TH, mz + D / 2);
    // roof slab — a see-through deck for the chase-cam, like the beach bar
    const roof = box(W + 0.6, 0.3, D + 0.6, 0x2a2233, mx, wallH + 0.15, mz);
    roof.material = roofM; roof.castShadow = true;
    worldGroup.add(roof);
    bridgeDecks.push({
      minX: mx - W / 2 - 0.4, maxX: mx + W / 2 + 0.4,
      minZ: mz - D / 2 - 0.4, maxZ: mz + D / 2 + 0.4,
      h: wallH + 0.5, mesh: roof, fade: 1, lastOp: 1
    });
    // lit shop windows along the street level (they glow after dark)
    const storeM = storefrontMaterial(variant, neon);
    emissiveMats.push(storeM);
    const band = (w, t, px, pz) => {
      const m2 = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, t), storeM);
      m2.position.set(px, 0.6, pz);
      worldGroup.add(m2);
    };
    band(W, TH + 0.02, mx, mz - D / 2 + TH / 2);
    band(W - DOOR - 1, TH + 0.02, mx, mz + D / 2 - TH / 2);
    band(TH + 0.02, D, mx - W / 2 + TH / 2, mz);
    band(TH + 0.02, D, mx + W / 2 - TH / 2, mz);
    // glowing checker dance floor
    const danceM = makeDanceMaterial();
    const dance = new THREE.Mesh(new THREE.PlaneGeometry(W - 4, D - 4.5), danceM);
    dance.rotation.x = -Math.PI / 2;
    dance.position.set(mx, 0.04, mz - 0.3);
    dance.receiveShadow = true;
    worldGroup.add(dance);
    emissiveMats.push(danceM);
    // drinks counter along the back wall + bottles + stools
    const counter = box(6.5, 1.0, 0.8, 0x5a3a20, mx, 0.5, mz - D / 2 + 1.7);
    counter.castShadow = true;
    worldGroup.add(counter); buildingMeshes.push(counter);
    worldGroup.add(box(6.9, 0.08, 1.0, 0x2a1c12, mx, 1.04, mz - D / 2 + 1.7));
    worldGroup.add(box(6.5, 0.5, 0.3, 0x241c16, mx, 1.55, mz - D / 2 + 1.05));
    const bottleCols = [0x3f9a4f, 0xc2a02e, 0x7a3ac2, 0xc23a2e, 0x3fe0ff];
    for (let i = 0; i < 9; i++) {
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 6),
        mat(bottleCols[i % bottleCols.length], { roughness: 0.3 }));
      bot.position.set(mx - 2.6 + i * 0.65, 1.28, mz - D / 2 + 1.05);
      worldGroup.add(bot);
    }
    for (let i = 0; i < 4; i++) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 8), mat(0x8a4a2a, { roughness: 0.8 }));
      stool.position.set(mx - 2.4 + i * 1.6, 0.28, mz - D / 2 + 2.8);
      worldGroup.add(stool);
    }
    // wall neon strips + hanging disco orbs + spinning mirror ball
    const lights = [];
    if (neon) {
      for (const s of [-1, 1]) {
        worldGroup.add(neonBox(4.5, 0.18, 0.1, NEON_COLS[(s + 1) % NEON_COLS.length], mx - W / 2 + 0.42, 2.3, mz + s * 2.2));
        worldGroup.add(neonBox(4.5, 0.18, 0.1, NEON_COLS[(s + 2) % NEON_COLS.length], mx + W / 2 - 0.42, 2.3, mz + s * 2.2));
        worldGroup.add(neonBox(0.1, 0.18, 4.5, NEON_COLS[(s + 3) % NEON_COLS.length], mx + s * 3, 2.3, mz - D / 2 + 0.42));
      }
    }
    for (let i = 0; i < 3; i++) {
      const lm = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: NEON_COLS[i], emissiveIntensity: 1.4, roughness: 0.4
      });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), lm);
      orb.position.set(mx + (i - 1) * 3.5, wallH - 0.35, mz - 1.5 + (i % 2) * 1.6);
      worldGroup.add(orb);
      lights.push({ mat: lm });
    }
    const ballM = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.25, metalness: 0.85 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), ballM);
    ball.position.set(mx, wallH - 0.3, mz + 0.7);
    worldGroup.add(ball);
    // glowing neon sign over the door
    const signTex = barSignTexture(name, signColor);
    const signM = new THREE.MeshStandardMaterial({
      map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 1.15
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.9, 0.25), signM);
    sign.position.set(mx, wallH + 0.62, mz + D / 2 - 0.15);
    worldGroup.add(sign);
    emissiveMats.push(signM);
    const ib = {
      x: mx, z: mz, w: W, d: D, h: wallH, name,
      pos: new THREE.Vector3(mx, 0, mz), lights, ball,
      patrons: [], respawnT: 0,
      beat: { playing: false, next: 0 }
    };
    interiorBars.push(ib);
    return ib;
  }
  function buildInteriorBars() {
    interiorBars.length = 0;
    const gx = (bi) => (cx(bi) + cx(bi + 1)) / 2;   // block centre x
    const gz = (bj) => (cz(bj) + cz(bj + 1)) / 2;   // block centre z
    buildInteriorBar(gx(3), gz(2), 'DISCO', 0x3fe0ff);
    buildInteriorBar(gx(8), gz(2), 'CLUB', 0xffd23f);
    buildInteriorBar(gx(3), gz(8), 'BAR', 0xff3fa4);
  }
  // a fresh crowd inside one bar: 4 sexy bikini dancers + 2 party people
  function spawnInteriorPatrons(ib) {
    const prng = mulberry32(1234000 + interiorBars.indexOf(ib) * 7);
    ib.patrons.length = 0;
    for (let i = 0; i < 6; i++) {
      const n = makeNPC('civilian', i < 4 ? 'bikini' : 'party');
      n.dance = true; n.state = 'dance';
      n.pos.set(ib.x + (prng() * 2 - 1) * (ib.w / 2 - 1.6), 0, ib.z + (prng() * 2 - 1) * (ib.d / 2 - 1.6));
      n.group.position.copy(n.pos);
      n.home = n.pos.clone(); n.target = null;
      n.mood = prng() < 0.5 ? 'happy' : 'laugh';
      n.barIdx = interiorBars.indexOf(ib);
      ib.patrons.push(n);
    }
    ib.respawnT = 0;
  }
  // everybody in the bar is dead → after ~10 s the same patrons rise as a
  // brand-new crowd (objects are revived so the world population stays stable)
  function reviveInteriorBar(ib) {
    const prng = mulberry32(700000 + interiorBars.indexOf(ib) * 13);
    for (const n of ib.patrons) {
      const parts = n.group.userData.parts;
      parts.forEach(p => {
        if (p.material) {
          p.material.transparent = false;
          p.material.opacity = 1;
          p.material.depthWrite = true;
        }
      });
      const ci = corpses.indexOf(n);
      if (ci >= 0) corpses.splice(ci, 1);
      scene.add(n.group);
      n.group.visible = true;
      n.dead = false; n.gone = false; n.deathT = 0;
      n.hp = n.maxHp;
      n.dance = true; n.state = 'dance';
      n.fleeT = 0; n.path = [];
      n.pos.set(ib.x + (prng() * 2 - 1) * (ib.w / 2 - 1.6), 0, ib.z + (prng() * 2 - 1) * (ib.d / 2 - 1.6));
      n.group.position.copy(n.pos);
      n.group.rotation.set(0, n.facing, 0);
      n.home = n.pos.clone(); n.target = null;
      n.mood = prng() < 0.5 ? 'happy' : 'laugh';
      parts.forEach(p => { if (hittables.indexOf(p) < 0) hittables.push(p); });
    }
    ib.respawnT = 0;
  }
  function updateInteriorBars(dt) {
    const t = performance.now();
    for (let k = 0; k < interiorBars.length; k++) {
      const ib = interiorBars[k];
      for (let i = 0; i < ib.lights.length; i++) {
        const L = ib.lights[i];
        L.mat.emissive.setHex(NEON_COLS[Math.floor(t / 260 + i * 1.7 + k * 2) % NEON_COLS.length]);
      }
      ib.ball.rotation.y += dt * 1.2;
      // a thumping beat while the hero is in or near the venue
      if (player && !player.dead && Sfx.ctx) {
        const inside = Math.abs(player.pos.x - ib.x) < ib.w / 2 && Math.abs(player.pos.z - ib.z) < ib.d / 2;
        const d = player.pos.distanceTo(ib.pos);
        if ((inside || d < 26) && !ib.beat.playing) { ib.beat.playing = true; ib.beat.next = 0; }
        else if (!inside && d > 36 && ib.beat.playing) ib.beat.playing = false;
        if (ib.beat.playing) {
          const now = Sfx.ctx.currentTime;
          if (now >= ib.beat.next) {
            Sfx.tone(52, 0.14, 'sine', 0.45, 34);
            Sfx.noise(0.03, 0.08, 7000);
            ib.beat.next = now + 0.5;
          }
        }
      }
      // wiped out? a fresh crowd arrives ~10 seconds later
      if (ib.patrons.length && ib.patrons.every(n => n.dead)) {
        ib.respawnT += dt;
        if (ib.respawnT >= 10) reviveInteriorBar(ib);
      } else {
        ib.respawnT = 0;
      }
    }
  }

  function buildCity() {
    if (built) return;
    blockMap.length = 0;
    const C = STYLES[settings.style];
    const neon = isNeon();
    /* sand island frame around the city base (edge-to-edge, no coplanar overlap) */
    const ISLE = (CITY + ROAD + 8) / 2;                 // 201
    const FRAME = GROUND_HALF - ISLE;                    // 13.5 m of beach
    const sandY = -0.5;
    const sandFrameMat = new THREE.MeshStandardMaterial({ map: sandTexture(C.sand), roughness: 1 });
    sandFrameMat.map.repeat.set(44, 2);
    const sandMat = mat(C.sand, { roughness: 1 });
    for (const [sx, sz, sw, sd] of [
      [0, ISLE + FRAME / 2, GROUND_HALF * 2, FRAME],
      [0, -ISLE - FRAME / 2, GROUND_HALF * 2, FRAME],
      [ISLE + FRAME / 2, 0, FRAME, ISLE * 2],
      [-ISLE - FRAME / 2, 0, FRAME, ISLE * 2]
    ]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(sw, 1, sd), sandFrameMat);
      s.position.set(sx, sandY, sz);
      s.receiveShadow = true;
      worldGroup.add(s);
    }
    // city base slab (asphalt) — top face just under the painted road surfaces
    const base = new THREE.Mesh(new THREE.BoxGeometry(ISLE * 2, 0.6, ISLE * 2), mat(C.ground, { roughness: 1 }));
    base.position.set(0, -0.3, 0);
    base.receiveShadow = true;
    worldGroup.add(base);

    /* ---- open ocean + shallow lagoon ring (animated water) ---- */
    const waterM = waterMaterial(neon);
    waterM.map.repeat.set(14, 14);
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000, 40, 40), waterM);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -0.6, 0);
    worldGroup.add(ocean);
    registerWave(ocean, 0.3);
    const BAND = 28;
    const shallowMat = mat(C.shallow, { roughness: 0.3, metalness: 0.35 });
    for (const [px, pz, pw, pd] of [
      [0, -GROUND_HALF - BAND / 2, GROUND_HALF * 2 + BAND * 2, BAND],
      [0, GROUND_HALF + BAND / 2, GROUND_HALF * 2 + BAND * 2, BAND],
      [GROUND_HALF + BAND / 2, 0, BAND, GROUND_HALF * 2],
      [-GROUND_HALF - BAND / 2, 0, BAND, GROUND_HALF * 2]
    ]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), shallowMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(px, -0.04, pz);
      worldGroup.add(m);
    }
    // white surf line where the sand meets the water
    const F = 1.8;
    worldGroup.add(plane(GROUND_HALF * 2 + F * 2, F, C.foam, 0, 0.01, GROUND_HALF + F / 2));
    worldGroup.add(plane(GROUND_HALF * 2 + F * 2, F, C.foam, 0, 0.01, -GROUND_HALF - F / 2));
    worldGroup.add(plane(F, GROUND_HALF * 2 + F * 2, C.foam, GROUND_HALF + F / 2, 0.01, 0));
    worldGroup.add(plane(F, GROUND_HALF * 2 + F * 2, C.foam, -GROUND_HALF - F / 2, 0.01, 0));

    // roads (textured asphalt with cracks + wear)
    const roadMatX = new THREE.MeshStandardMaterial({ map: asphaltTexture(neon), roughness: 1 });
    roadMatX.map.repeat.set(ROAD / 8, CITY / 8);
    roadMatX.polygonOffset = true; roadMatX.polygonOffsetFactor = -2; roadMatX.polygonOffsetUnits = -2;
    const roadMatZ = new THREE.MeshStandardMaterial({ map: asphaltTexture(neon), roughness: 1 });
    roadMatZ.map.repeat.set(CITY / 8, ROAD / 8);
    roadMatZ.polygonOffset = true; roadMatZ.polygonOffsetFactor = -2; roadMatZ.polygonOffsetUnits = -2;
    for (let i = 0; i <= N; i++) {
      const rx = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, CITY), roadMatX);
      rx.rotation.x = -Math.PI / 2; rx.position.set(cx(i), 0.02, 0); rx.receiveShadow = true;
      worldGroup.add(rx);
      const rz = new THREE.Mesh(new THREE.PlaneGeometry(CITY, ROAD), roadMatZ);
      rz.rotation.x = -Math.PI / 2; rz.position.set(0, 0.02, cz(i)); rz.receiveShadow = true;
      worldGroup.add(rz);
    }

    // lane markings + crosswalks: all merged into ONE draw call
    const marks = [];
    for (let i = 0; i <= N; i++) {
      for (let s = -CENTER; s < CENTER; s += 8) {
        marks.push({ x: s + 2, z: cz(i), w: 3.2, d: 0.28, y: 0.03 });
        marks.push({ x: cx(i), z: s + 2, w: 0.28, d: 3.2, y: 0.03 });
      }
      for (let j = 0; j <= N; j++) {
        for (let k = -2; k <= 2; k++) {
          marks.push({ x: cx(i) + k * 0.8, z: cz(j) - ROAD / 2 - 2.6, w: 0.5, d: 3.4, y: 0.032 });
        }
      }
    }
    const markMat2 = mat(C.line, { roughness: 0.9 });
    markMat2.polygonOffset = true;
    markMat2.polygonOffsetFactor = -3;
    markMat2.polygonOffsetUnits = -3;

    // ---- river splitting the city (GTA 1 style), crossed by bridges on every avenue ----
    const riverBed = box(ISLE * 2, 0.3, RIVER_HALF * 2 + 2, 0x6a5a48, 0, 0.15, RIVER_Z);
    worldGroup.add(riverBed);
    const river = new THREE.Mesh(new THREE.PlaneGeometry(ISLE * 2, RIVER_HALF * 2, 24, 4), waterM);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, RIVER_LEVEL, RIVER_Z);
    worldGroup.add(river);
    registerWave(river, 0.09);
    // river banks: sandy promenade + stone retaining wall along the water edge
    const bankMat = new THREE.MeshStandardMaterial({ map: sandTexture(C.sand), roughness: 1 });
    bankMat.map.repeat.set(44, 0.6);
    for (const zz of [RIVER_Z - RIVER_HALF - 1.5, RIVER_Z + RIVER_HALF + 1.5]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(ISLE * 2, 0.14, 3), bankMat);
      bank.position.set(0, 0.31, zz);
      bank.receiveShadow = true;
      worldGroup.add(bank);
    }
    const wallMat = mat(neon ? 0x8a7478 : 0x8a9098, { roughness: 0.9 });
    for (const zz of [RIVER_Z - RIVER_HALF, RIVER_Z + RIVER_HALF]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(ISLE * 2, 0.7, 0.4), wallMat);
      wall.position.set(0, 0.35, zz);
      wall.receiveShadow = true;
      worldGroup.add(wall);
    }

    // blocks: sidewalk slab + curbs + buildings + street life
    const sidewalkMat = new THREE.MeshStandardMaterial({ map: sidewalkTexture(C.sidewalk), roughness: 0.95 });
    sidewalkMat.map.repeat.set(BLOCK / 8, BLOCK / 8);
    const curbMat = mat(neon ? 0x9a8a92 : 0x9fa4aa, { roughness: 0.95 });
    // build the three walk-in interior bars BEFORE the block loop so their
    // blocks are kept clear of normal buildings
    buildInteriorBars();
    for (let bi = 0; bi < N; bi++) for (let bj = 0; bj < N; bj++) {
      const minX = cx(bi) + ROAD / 2, maxX = cx(bi + 1) - ROAD / 2;
      const minZ = cz(bj) + ROAD / 2, maxZ = cz(bj + 1) - ROAD / 2;
      // no buildings inside the river
      if (!(maxZ < RIVER_Z - RIVER_HALF || minZ > RIVER_Z + RIVER_HALF)) continue;
      // record the block for the wide city map (quarter / park / bar venue)
      const bxc = (minX + maxX) / 2, bzc = (minZ + maxZ) / 2;
      const bm = {
        x: bxc, z: bzc,
        q: bzc < RIVER_Z ? (bxc < 0 ? 'nw' : 'ne') : (bxc < 0 ? 'sw' : 'se'),
        park: false, bar: false
      };
      blockMap.push(bm);
      const barHere = interiorBars.find(ib =>
        Math.abs(bxc - ib.x) < ib.w / 2 + 3 && Math.abs(bzc - ib.z) < ib.d / 2 + 3);
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK, BLOCK), sidewalkMat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set((minX + maxX) / 2, 0.02, (minZ + maxZ) / 2);
      sw.receiveShadow = true;
      worldGroup.add(sw);
      // raised curbs on all four edges (merged: 4 boxes -> 1 draw call)
      const curbSpecs = [
        { x: (minX + maxX) / 2, y: 0.06, z: minZ - 0.1, w: BLOCK, h: 0.16, d: 0.28 },
        { x: (minX + maxX) / 2, y: 0.06, z: maxZ + 0.1, w: BLOCK, h: 0.16, d: 0.28 },
        { x: minX - 0.1, y: 0.06, z: (minZ + maxZ) / 2, w: 0.28, h: 0.16, d: BLOCK },
        { x: maxX + 0.1, y: 0.06, z: (minZ + maxZ) / 2, w: 0.28, h: 0.16, d: BLOCK }
      ];
      const curbs = mergeBoxes(curbSpecs, curbMat);
      worldGroup.add(curbs);
      // an interior bar owns this block: the SAME random lot rolls still run
      // (keeping the world generation stream byte-identical), then everything
      // this lot generated is stripped so the venue stands alone on the block
      const keepI = {
        w: worldGroup.children.length,
        b: buildingBoxes.length,
        m: buildingMeshes.length,
        n: neonSignMats.length,
        p: _lampPoles.length,
        h: _lampHeads.length,
        s: _lampBulbSpecs.length
      };

      // simple lot layout
      const gap = 1.2;
      const inner = { minX: minX + gap, maxX: maxX - gap, minZ: minZ + gap, maxZ: maxZ - gap };
      const r = rng();
      if (r < 0.3) {
        // one big building + a tree
        addBuilding(inner.minX + 1, inner.minZ + 1, inner.maxX - 1, inner.maxZ - 1);
        addTree(inner.minX + 3, inner.maxZ - 2.5);
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
        else { addTree(midX + 4, midZ + 4); addTree(inner.maxX - 2.5, inner.minZ + 2.5); }
      } else {
        // park block: lawn, trees, benches, lamp
        bm.park = !barHere;
        const grassMat = new THREE.MeshStandardMaterial({ map: grassTexture(C.grass), roughness: 1 });
        grassMat.map.repeat.set(3, 3);
        const gx = (inner.minX + inner.maxX) / 2, gz = (inner.minZ + inner.maxZ) / 2;
        const grass = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK - 2.4, BLOCK - 2.4), grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(gx, 0.025, gz);
        grass.receiveShadow = true;
        worldGroup.add(grass);
        for (let t = 0; t < 5; t++) {
          addTree(inner.minX + 2.5 + rng() * (inner.maxX - inner.minX - 5),
            inner.minZ + 2.5 + rng() * (inner.maxZ - inner.minZ - 5));
        }
        addBench(gx - 2, gz + 2, rng() * Math.PI);
        addLamp(gx + 1, gz - 1);
      }
      if (barHere) {
        worldGroup.children.length = keepI.w;
        buildingBoxes.length = keepI.b;
        buildingMeshes.length = keepI.m;
        neonSignMats.length = keepI.n;
        _lampPoles.length = keepI.p;
        _lampHeads.length = keepI.h;
        _lampBulbSpecs.length = keepI.s;
        bm.bar = true;
      }
    }

    // ---- the beach bar on the north shore: dance floor + party crowd ----
    buildBar(55, -(GROUND_HALF - 7.5));

    // ---- tree-lined beachfront around the island rim ----
    const rim = GROUND_HALF - 5.5;
    for (let k = 0; k < 30; k++) {
      const side = k % 4;
      const t = -rim + 8 + rng() * (rim * 2 - 16);
      let x, z;
      if (side === 0) { x = t; z = rim; }
      else if (side === 1) { x = t; z = -rim; }
      else if (side === 2) { x = rim; z = t; }
      else { x = -rim; z = t; }
      if (Math.abs(z - RIVER_Z) < RIVER_HALF + 7) continue;   // keep the river channel clear
      if (isInsideBuilding(x, z) || isInsideBar(x, z)) continue;
      addTree(x, z);
    }
    // gentle sand dunes along the beach frame
    for (let k = 0; k < 14; k++) {
      const side = k % 4;
      const t = (rng() * 2 - 1) * (GROUND_HALF - 4);
      const rr = rng() * 3 + 1.6;
      const dune = new THREE.Mesh(new THREE.SphereGeometry(rr, 8, 5), sandMat);
      dune.scale.set(1, 0.32, 1);
      let x, z;
      if (side === 0) { x = t; z = GROUND_HALF - 2 + rng() * 6; }
      else if (side === 1) { x = t; z = -GROUND_HALF + 2 - rng() * 6; }
      else if (side === 2) { x = GROUND_HALF - 2 + rng() * 6; z = t; }
      else { x = -GROUND_HALF + 2 - rng() * 6; z = t; }
      if (isInsideBar(x, z)) continue;
      dune.position.set(x, 0.05, z);
      worldGroup.add(dune);
    }

    // ---- bridges: every avenue crosses the river on a RAISED concrete arch ----
    // deck sits 1.5 units above the water so the river boats can glide underneath.
    // NOTE: .add() returns the PARENT, so each ramp gets its own mesh reference
    // to tilt — rotating the returned value would tilt the entire world group!
    const rampAngle = Math.atan2(DECK_Y, RAMP_LEN);
    for (let i = 0; i <= N; i++) {
      const deck = box(ROAD, 0.14, RIVER_HALF * 2 + 4, C.bridge, cx(i), DECK_Y - 0.07, RIVER_Z);
      deck.castShadow = true;
      worldGroup.add(deck);
      // register the deck for the see-through camera: a hero swimming UNDER
      // the bridge stays readable (the deck fades to glass like buildings do)
      bridgeDecks.push({
        minX: cx(i) - ROAD / 2, maxX: cx(i) + ROAD / 2,
        minZ: RIVER_Z - RIVER_HALF - 2, maxZ: RIVER_Z + RIVER_HALF + 2,
        h: DECK_Y, mesh: deck, fade: 1, lastOp: 1
      });
      const rampN = box(ROAD, 0.12, RAMP_LEN, C.bridge, cx(i), DECK_Y / 2, RIVER_Z - RIVER_HALF - 2 - RAMP_LEN / 2);
      rampN.rotation.x = -rampAngle;                       // north ramp: dips AWAY from deck
      worldGroup.add(rampN);
      const rampS = box(ROAD, 0.12, RAMP_LEN, C.bridge, cx(i), DECK_Y / 2, RIVER_Z + RIVER_HALF + 2 + RAMP_LEN / 2);
      rampS.rotation.x = rampAngle;                        // south ramp mirrored
      worldGroup.add(rampS);
      // support piers under the deck
      for (const px of [cx(i) - ROAD / 2 + 0.9, cx(i), cx(i) + ROAD / 2 - 0.9]) {
        const pier = box(0.9, DECK_Y + 0.35, 1.4, 0x8a9098, px, (DECK_Y - 0.2) / 2, RIVER_Z);
        worldGroup.add(pier);
      }
      // crash rails + lattice truss railings
      worldGroup.add(box(0.35, 0.8, RIVER_HALF * 2 + 4, C.railing, cx(i) - ROAD / 2 + 0.25, DECK_Y + 0.36, RIVER_Z));
      worldGroup.add(box(0.35, 0.8, RIVER_HALF * 2 + 4, C.railing, cx(i) + ROAD / 2 - 0.25, DECK_Y + 0.36, RIVER_Z));
      const truss = box(0.14, 1.15, RIVER_HALF * 2 + 4, 0x5a6068, cx(i) - ROAD / 2 + 0.85, DECK_Y + 0.72, RIVER_Z);
      worldGroup.add(truss);
      const truss2 = truss.clone();
      truss2.position.x = cx(i) + ROAD / 2 - 0.85;
      worldGroup.add(truss2);
      // lane markings across the deck (merged)
      for (let s = RIVER_Z - RIVER_HALF + 3; s < RIVER_Z + RIVER_HALF - 3; s += 8) {
        marks.push({ x: cx(i), z: s, w: 0.28, d: 3.2, y: DECK_Y + 0.02 });
      }
      // bridge lamps on both rails
      for (const px of [cx(i) - ROAD / 2 + 0.45, cx(i) + ROAD / 2 - 0.45]) {
        for (let s = -2; s <= 2; s++) {
          addLamp(px, RIVER_Z + s * (RIVER_HALF / 2.3), DECK_Y);
        }
      }
    }

    // ---- street furniture: lamps along the avenues, bus stops, hydrants, billboards ----
    if (settings.quality !== 'low') {
      const lampStep = settings.quality === 'high' ? 60 : 110;
      for (let i = 0; i <= N; i++) {
        for (let s = -CENTER + 24; s < CENTER - 12; s += lampStep) {
          if (Math.abs(s - RIVER_Z) < RIVER_HALF + 10) continue;
          addLamp(cx(i) - ROAD / 2 - 1.1, s);
          addLamp(cx(i) + ROAD / 2 + 1.1, s);
          addLamp(s, cz(i) - ROAD / 2 - 1.1);
          addLamp(s, cz(i) + ROAD / 2 + 1.1);
        }
      }
      for (let b = 0; b < 10; b++) {
        const i = (rng() * (N + 1)) | 0;
        const x = (rng() * 2 - 1) * (CENTER - 70);
        const z = cz(i) - ROAD / 2 - 2.4;
        if (Math.abs(z - RIVER_Z) < RIVER_HALF + 8) continue;
        addBusStop(x, z, i % 2 === 0);
      }
      for (let b = 0; b < 26; b++) {
        const i = (rng() * (N + 1)) | 0;
        const j = (rng() * (N + 1)) | 0;
        addHydrant(cx(i) + (rng() < 0.5 ? -1 : 1) * (ROAD / 2 + 0.7), cz(j) + (rng() < 0.5 ? -1 : 1) * (ROAD / 2 + 0.7));
      }
      for (let b = 0; b < 5; b++) {
        const c0 = CITY_CORES[b % CITY_CORES.length];
        addBillboard(c0.x + (rng() * 2 - 1) * c0.r * 0.8, c0.z + (rng() * 2 - 1) * c0.r * 0.8);
      }
    }

    worldGroup.add(mergeGroundQuads(marks, markMat2));
    buildLampMeshes();
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
    const L = GROUND_HALF + SEA_BAND;       // island + the shallow swimming band
    v.x = Math.max(-L, Math.min(L, v.x));
    v.z = Math.max(-L, Math.min(L, v.z));
    return v;
  }

  /* ---- water: river + a shallow sea band along the beaches ---- */
  const SEA_BAND = 24;
  const RIVER_LEVEL = 0.36;
  const SEA_LEVEL = -0.04;
  function swimWaterAt(x, z) {
    // the raised bridge deck covers the river here: crossing a bridge is
    // always walking/driving on the deck, never swimming in the water below
    if (groundY(x, z) > 0.9) return null;
    if (isInsideWater(x, z)) return { level: RIVER_LEVEL, river: true };
    const ax = Math.abs(x), az = Math.abs(z);
    if (ax > GROUND_HALF && ax <= GROUND_HALF + SEA_BAND && az <= GROUND_HALF + 0.5) {
      return { level: SEA_LEVEL, river: false };
    }
    if (az > GROUND_HALF && az <= GROUND_HALF + SEA_BAND && ax <= GROUND_HALF + 0.5) {
      return { level: SEA_LEVEL, river: false };
    }
    return null;
  }

  /* ---- bridge height for rendering: characters/cars glide up the ramps ---- */
  const DECK_Y = 1.5, RAMP_LEN = 8;
  function groundY(x, z) {
    // the beach bar's wooden deck lifts the hero (and the dancers) off the sand
    if (barFootprint && x > barFootprint.minX && x < barFootprint.maxX &&
        z > barFootprint.minZ && z < barFootprint.maxZ) return 0.3;
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

  // Standing on a raised bridge deck, the railings on both sides keep people
  // and cars ON the bridge instead of letting them drop into the river below.
  function bridgeRailBlocks(x, z, fromY) {
    return fromY > 0.9 && isInsideWater(x, z) && groundY(x, z) < 0.5;
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

  /* ---------------- Unity-style low-poly humans ----------------
     A proper 3D human silhouette built from rounded low-poly shapes:
     tapered chest, hips + belt, neck, rounded head with jaw/face, hair
     styles, sunglasses/caps and hands/shoes. All pieces share a small
     geometry cache so 100+ pedestrians stay cheap. */
  const _sgeo = {};
  function sg(key, factory) {
    if (_sgeo[key]) return _sgeo[key];
    const g = factory();
    _sgeo[key] = g;
    return g;
  }
  /* realistic anatomy: smoother rounded parts with skin/fabric textures */
  // realistic human proportions: smaller head, rounded jaw/hips, smooth shoulders
  const G_HEAD = () => sg('head', () => { const g = new THREE.SphereGeometry(0.16, 20, 15); g.scale(0.92, 1.12, 0.98); return g; });
  const G_EAR = () => sg('ear', () => { const g = new THREE.SphereGeometry(0.034, 8, 6); g.scale(1, 1.5, 0.65); return g; });
  const G_JAW = () => sg('jaw', () => { const g = new THREE.SphereGeometry(0.145, 12, 10); g.scale(0.85, 0.5, 0.72); return g; });
  const G_NECK = () => sg('neck', () => new THREE.CylinderGeometry(0.048, 0.058, 0.17, 10));
  const G_TORSO = () => sg('torso', () => { const g = new THREE.CylinderGeometry(0.24, 0.2, 0.58, 12); g.scale(1, 1, 0.76); return g; });
  const G_SHOULDER = () => sg('shoulder', () => { const g = new THREE.SphereGeometry(0.085, 10, 8); g.scale(1, 0.85, 0.85); return g; });
  const G_CHEST = () => sg('chest', () => { const g = new THREE.SphereGeometry(0.1, 10, 8); g.scale(0.9, 0.8, 0.7); return g; });
  const G_PELVIS = () => sg('pelvis', () => { const g = new THREE.SphereGeometry(0.2, 12, 10); g.scale(0.9, 0.55, 0.65); return g; });
  const G_BELT = () => sg('belt', () => new THREE.BoxGeometry(0.36, 0.05, 0.275));
  const G_SKIRT = () => sg('skirt', () => new THREE.CylinderGeometry(0.28, 0.45, 0.46, 12));
  const G_ARM_UP = () => sg('armup', () => { const g = new THREE.CylinderGeometry(0.062, 0.068, 0.3, 9); g.translate(0, -0.15, 0); return g; });
  const G_ARM_LO = () => sg('armlo', () => { const g = new THREE.CylinderGeometry(0.05, 0.04, 0.28, 9); g.translate(0, -0.42, 0); return g; });
  const G_HAND = () => sg('hand', () => new THREE.BoxGeometry(0.11, 0.14, 0.13));
  const G_LEG_UP = () => sg('legup', () => { const g = new THREE.CylinderGeometry(0.084, 0.068, 0.42, 9); g.translate(0, -0.21, 0); return g; });
  const G_LEG_LO = () => sg('leglo', () => { const g = new THREE.CylinderGeometry(0.06, 0.046, 0.4, 9); g.translate(0, -0.58, 0); return g; });
  const G_SHOE = () => sg('shoe', () => { const g = new THREE.BoxGeometry(0.2, 0.11, 0.32); g.translate(0, -0.02, 0.06); return g; });
  const G_SOLE = () => sg('sole', () => { const g = new THREE.BoxGeometry(0.2, 0.035, 0.33); g.translate(0, -0.085, 0.06); return g; });
  const G_HAIR = () => sg('hair', () => new THREE.SphereGeometry(0.175, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52));
  const G_HAIRBACK = () => sg('hairback', () => new THREE.BoxGeometry(0.32, 0.42, 0.16));
  const G_BUN = () => sg('bun', () => new THREE.SphereGeometry(0.06, 9, 7));
  const G_EYE = () => sg('eye', () => new THREE.BoxGeometry(0.06, 0.038, 0.014));
  const G_EYEWHITE = () => sg('eyewhite', () => new THREE.BoxGeometry(0.078, 0.05, 0.012));
  const G_IRIS = () => sg('iris', () => new THREE.BoxGeometry(0.026, 0.036, 0.012));
  const G_PUPIL = () => sg('pupil', () => new THREE.BoxGeometry(0.013, 0.02, 0.012));
  const G_BROW = () => sg('brow', () => new THREE.BoxGeometry(0.09, 0.022, 0.02));
  const G_NOSE = () => sg('nose', () => { const g = new THREE.BoxGeometry(0.05, 0.085, 0.06); g.translate(0, 0, 0.005); return g; });
  const G_MOUTH = () => sg('mouth', () => new THREE.BoxGeometry(0.1, 0.016, 0.02));
  const G_SUNGLASSES = () => sg('sunglasses', () => new THREE.BoxGeometry(0.32, 0.085, 0.04));
  const G_CAP = () => sg('cap', () => new THREE.CylinderGeometry(0.205, 0.215, 0.13, 12));
  const G_CAPBRIM = () => sg('capbrim', () => new THREE.BoxGeometry(0.3, 0.03, 0.18));
  const G_POLICE_HAT = () => sg('phat', () => new THREE.CylinderGeometry(0.2, 0.21, 0.13, 12));
  const G_POLICE_BAND = () => sg('pband', () => new THREE.CylinderGeometry(0.212, 0.212, 0.06, 12));
  const G_POLICE_BRIM = () => sg('pbrim', () => new THREE.BoxGeometry(0.26, 0.03, 0.21));
  const G_BADGE = () => sg('badge', () => new THREE.BoxGeometry(0.055, 0.075, 0.02));
  const G_CHAIN = () => sg('chain', () => new THREE.BoxGeometry(0.17, 0.02, 0.02));

  // painted face: eye sockets, nose shading, lips, cheek tint — drawn onto the
  // head sphere so pedestrians get a real Gangstar-style face (front = u 0.25)
  const _faceTex = {};
  function faceTexture(skin, variant) {
    const key = 'face:' + skin + ':' + (variant % 5);
    if (_faceTex[key]) return _faceTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const b = new THREE.Color(skin);
    g.fillStyle = '#' + b.getHexString();
    g.fillRect(0, 0, 128, 128);
    const lr = mulberry32(skin * 3 + 7);
    // subtle skin mottling
    for (let i = 0; i < 420; i++) {
      g.fillStyle = lr() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(110,55,28,0.05)';
      g.fillRect((lr() * 128) | 0, (lr() * 128) | 0, 1 + ((lr() * 3) | 0), 1 + ((lr() * 3) | 0));
    }
    const cx = 32, ey = 56, eyegap = 16;              // face centre band (u ≈ 0.25)
    // eye sockets (soft dark ovals)
    for (const s of [-1, 1]) {
      const rg = g.createRadialGradient(cx + s * eyegap / 2, ey, 2, cx + s * eyegap / 2, ey, 9);
      rg.addColorStop(0, 'rgba(70,40,25,0.35)');
      rg.addColorStop(0.6, 'rgba(70,40,25,0.16)');
      rg.addColorStop(1, 'rgba(70,40,25,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.ellipse(cx + s * eyegap / 2, ey, 9, 6, 0, 0, Math.PI * 2);
      g.fill();
    }
    // nose: soft bridge + nostril shadow
    const nb = g.createLinearGradient(cx - 6, 46, cx + 6, 74);
    nb.addColorStop(0, 'rgba(255,235,210,0.22)');
    nb.addColorStop(0.5, 'rgba(120,70,40,0.10)');
    nb.addColorStop(1, 'rgba(60,30,15,0.24)');
    g.fillStyle = nb;
    g.fillRect(cx - 6, 46, 12, 28);
    g.fillStyle = 'rgba(60,30,15,0.35)';
    g.beginPath(); g.ellipse(cx, 68, 3.2, 2, 0, 0, Math.PI * 2); g.fill();
    // lips
    g.fillStyle = 'rgba(160,70,60,0.5)';
    g.beginPath(); g.ellipse(cx, 83, 6.5, 3, 0, 0, Math.PI * 2); g.fill();
    // cheek blush + brow shadow
    for (const s of [-1, 1]) {
      g.fillStyle = 'rgba(210,110,90,0.10)';
      g.beginPath(); g.ellipse(cx + s * 11, 74, 5, 3.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(60,35,20,0.16)';
      g.fillRect(cx + s * 8 - 5, 46, 10, 3);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _faceTex[key] = tex;
    return tex;
  }
  // hair with visible strands
  const _hairTex = {};
  function hairTexture(color) {
    const key = 'hair:' + color;
    if (_hairTex[key]) return _hairTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    const b = new THREE.Color(color);
    g.fillStyle = '#' + b.getHexString();
    g.fillRect(0, 0, 128, 128);
    const lr = mulberry32(color * 5 + 1);
    for (let i = 0; i < 260; i++) {
      const x = (lr() * 128) | 0, y = (lr() * 128) | 0;
      const v = 0.55 + lr();
      g.strokeStyle = 'rgba(' + Math.min(255, b.r * 255 * v + 20) + ',' + Math.min(255, b.g * 255 * v + 20) + ',' +
        Math.min(255, b.b * 255 * v + 20) + ',0.9)';
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (lr() - 0.5) * 6, y + 7, x + (lr() - 0.5) * 8, y + 14);
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _hairTex[key] = tex;
    return tex;
  }

  // skin: soft mottled shading (shared texture per tone)
  const _skinTex = {};
  function skinTexture(color) {
    const key = 'skin:' + color;
    if (_skinTex[key]) return _skinTex[key];
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#' + new THREE.Color(color).getHexString();
    g.fillRect(0, 0, 64, 64);
    const lr = mulberry32(color * 3 + 7);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = lr() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(110,55,28,0.05)';
      g.fillRect((lr() * 64) | 0, (lr() * 64) | 0, 1 + ((lr() * 3) | 0), 1 + ((lr() * 3) | 0));
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _skinTex[key] = tex;
    return tex;
  }
  // woven fabric: fold shading + weave speckle (wraps around the torso UVs)
  const _clothTex = {};
  function clothTexture(base, variant) {
    const key = 'cloth:' + base + ':' + (variant % 4);
    if (_clothTex[key]) return _clothTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#' + new THREE.Color(base).getHexString();
    g.fillRect(0, 0, 128, 128);
    const lr = mulberry32(base * 11 + variant * 7);
    for (let f = 0; f < 5; f++) {
      const x = 12 + f * 24 + ((lr() * 8) | 0);
      const grad = g.createLinearGradient(x - 9, 0, x + 9, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0.12)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
      grad.addColorStop(1, 'rgba(0,0,0,0.12)');
      g.fillStyle = grad;
      g.fillRect(x - 9, 0, 18, 128);
    }
    for (let i = 0; i < 340; i++) {
      g.fillStyle = lr() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.045)';
      g.fillRect((lr() * 128) | 0, (lr() * 128) | 0, 1, 1);
    }
    // hem shading at top/bottom
    g.fillStyle = 'rgba(0,0,0,0.10)';
    g.fillRect(0, 0, 128, 5);
    g.fillRect(0, 123, 128, 5);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _clothTex[key] = tex;
    return tex;
  }
  // denim twill weave for trousers
  const _denimTex = {};
  function denimTexture(base, variant) {
    const key = 'denim:' + base + ':' + (variant % 4);
    if (_denimTex[key]) return _denimTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#' + new THREE.Color(base).getHexString();
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,0.055)';
    g.lineWidth = 1;
    for (let i = -64; i < 128; i += 5) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 128); g.stroke();
    }
    g.strokeStyle = 'rgba(0,0,0,0.05)';
    for (let i = 0; i < 192; i += 5) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i - 64, 128); g.stroke();
    }
    const lr = mulberry32(base * 5 + variant * 13);
    for (let i = 0; i < 220; i++) {
      g.fillStyle = lr() < 0.5 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)';
      g.fillRect((lr() * 128) | 0, (lr() * 128) | 0, 1, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _denimTex[key] = tex;
    return tex;
  }

  // tropical print shirt fabric (cached per colour pair)
  const _shirtTex = {};
  function shirtTexture(base, accent, variant) {
    const key = base + ':' + accent + ':' + variant;
    if (_shirtTex[key]) return _shirtTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#' + new THREE.Color(base).getHexString();
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    g.fillRect(0, 0, 128, 6);
    g.fillRect(0, 122, 128, 6);
    const ac = '#' + new THREE.Color(accent).getHexString();
    g.fillStyle = ac;
    for (let k = 0; k < 8; k++) {
      const x = (k * 31 + variant * 13) % 128;
      const y = (k * 23 + variant * 9) % 128;
      for (let p = 0; p < 4; p++) {
        const a = p * Math.PI / 2 + 0.45;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4.5, 2.4, a, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffe9a8';
      g.fillRect(x - 1, y - 1, 2, 2);
      g.fillStyle = ac;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _shirtTex[key] = tex;
    return tex;
  }
  // striped / plaid casual shirt fabric
  function stripeTexture(base, accent, variant) {
    const key = 'st:' + base + ':' + accent + ':' + variant;
    if (_shirtTex[key]) return _shirtTex[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#' + new THREE.Color(base).getHexString();
    g.fillRect(0, 0, 128, 128);
    const ac = '#' + new THREE.Color(accent).getHexString();
    if (variant % 2) {                       // plaid
      g.fillStyle = ac;
      for (let x = 0; x < 128; x += 22) g.fillRect(x, 0, 7, 128);
      g.fillStyle = 'rgba(0,0,0,0.16)';
      for (let y = 0; y < 128; y += 22) g.fillRect(0, y, 128, 7);
      g.fillStyle = 'rgba(255,255,255,0.16)';
      for (let x = 11; x < 128; x += 22) g.fillRect(x, 0, 2, 128);
    } else {                                 // vertical stripes
      g.fillStyle = ac;
      for (let x = 0; x < 128; x += 26) g.fillRect(x, 0, 8, 128);
      g.fillStyle = 'rgba(255,255,255,0.14)';
      for (let x = 13; x < 128; x += 26) g.fillRect(x, 0, 2, 128);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _shirtTex[key] = tex;
    return tex;
  }
  const PRINT_ACCENTS = [0xff3fa4, 0x2fa8a0, 0xffcf4f, 0x7a4a22, 0xff6f91, 0xf7f0e0, 0x2f6fbf];

  function makeHuman(opt) {
    const g = new THREE.Group();
    const female = !!opt.female;
    const bikini = !!opt.bikini;
    const skin = opt.skin || 0xe8b88a, shirt = opt.shirt || 0x3366ff, pants = opt.pants || 0x2c2c34;
    const variant = opt.variant === undefined ? ((skin * 7 + shirt) | 0) : opt.variant;
    const skinTex = skinTexture(skin);
    const skinM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: skinTex, roughness: 0.68 });
    const headM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: faceTexture(skin, variant), roughness: 0.62 });
    const pantsM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: denimTexture(pants, variant), roughness: 0.85 });
    const hairM = new THREE.MeshStandardMaterial({ color: 0xffffff, map: hairTexture(opt.hair || 0x241c14), roughness: 0.6 });
    const shirtM = opt.shirtTex
      ? new THREE.MeshStandardMaterial({ map: opt.shirtTex, roughness: 0.82 })
      : new THREE.MeshStandardMaterial({ color: 0xffffff, map: clothTexture(shirt, variant), roughness: 0.82 });
    // bikini look: bare skin torso/legs/arms + a colourful two-piece
    const bikiniM = bikini ? mat(opt.bikiniColor || 0xff4f8a, { roughness: 0.75 }) : null;
    const torsoMat = bikini ? skinM : shirtM;
    const pelvisMat = bikini ? bikiniM : pantsM;
    const shoulderMat = bikini ? skinM : shirtM;
    const armUpMat = bikini ? skinM : shirtM;
    const shoeM = mat(opt.shoe || 0x18171c, { roughness: 0.75 });
    const soleM = mat(0xe8e6e0, { roughness: 0.9 });
    const eyeM = mat(0x141416, { roughness: 0.35 });
    const irisCols = [0x5a3a1c, 0x2f5a7a, 0x3a6a3a, 0x6a4a2a];
    const irisM = mat(irisCols[variant % irisCols.length], { roughness: 0.3 });
    const whiteM = mat(0xf5f2ea, { roughness: 0.4 });
    const detailM = mat(0x2a1c14, { roughness: 0.7 });
    const lipM = mat(0x9a4a3a, { roughness: 0.55 });
    const shoulderX = female ? 0.26 : 0.29;
    const skirt = !!opt.skirt;
    const legsMat = skirt ? skinM : (bikini ? skinM : pantsM);
    const parts = [];
    const add = (m) => { g.add(m); parts.push(m); return m; };
    const M = (geo, material) => new THREE.Mesh(geo, material);

    // hips, belt and tapered chest with shoulder pads
    const pelvis = M(G_PELVIS(), pelvisMat); pelvis.position.set(0, 0.92, 0); pelvis.scale.x = female ? 0.94 : 1;
    const belt = M(G_BELT(), mat(opt.belt || 0x24242a, { roughness: 0.6 })); belt.position.set(0, 1.03, 0);
    const torso = M(G_TORSO(), torsoMat); torso.position.set(0, 1.29, 0); torso.scale.x = female ? 0.9 : 1;
    const collar = M(new THREE.BoxGeometry(0.29, 0.08, 0.21), opt.suit ? whiteM : torsoMat); collar.position.set(0, 1.55, 0);
    add(pelvis); add(belt); add(torso); add(collar);
    // smooth shoulder caps
    for (const s of [-1, 1]) {
      const sh = M(G_SHOULDER(), shoulderMat); sh.position.set(s * (female ? 0.16 : 0.18), 1.49, 0); add(sh);
    }
    if (opt.suit) {
      // suit jacket: white shirt collar + tie
      const tie = M(new THREE.BoxGeometry(0.06, 0.22, 0.02), mat(opt.tieColor || 0x8a1a2a, { roughness: 0.5 }));
      tie.position.set(0, 1.3, 0.185);
      add(tie);
    }
    pelvis.castShadow = true; torso.castShadow = true;
    let skirtMesh = null;
    if (skirt) {
      skirtMesh = M(G_SKIRT(), mat(opt.skirtColor || pants, { roughness: 0.82 })); skirtMesh.position.set(0, 0.78, 0);
      add(skirtMesh);
    }
    if (female && !skirt && (opt.bust || bikini)) {
      // bikini top: the chest pieces double as the two cups
      for (const s of [-1, 1]) {
        const ch = M(G_CHEST(), bikini ? bikiniM : shirtM); ch.position.set(s * 0.09, 1.42, 0.16); add(ch);
      }
    }
    if (bikini) {
      // thin back strap holding the bikini top together
      const strap = M(new THREE.BoxGeometry(0.34, 0.045, 0.02), bikiniM); strap.position.set(0, 1.44, -0.14); add(strap);
    }

    // neck + head + jaw + ears (realistic proportions: smaller head, longer neck)
    const neck = M(G_NECK(), skinM); neck.position.set(0, 1.62, 0); add(neck);
    const head = M(G_HEAD(), headM); head.position.set(0, 1.72, 0); add(head);
    head.castShadow = true;
    const jaw = M(G_JAW(), skinM); jaw.position.set(0, 1.605, 0.045); add(jaw);
    const earL = M(G_EAR(), skinM); earL.position.set(-0.148, 1.72, 0); add(earL);
    const earR = M(G_EAR(), skinM); earR.position.set(0.148, 1.72, 0); add(earR);

    // face: whites + coloured iris + pupil + brows + nose + mouth — all mood-rigged
    const faceZ = 0.148;
    const faceRig = { mouth: null, browL: null, browR: null, eyes: [], tears: [], glasses: null };
    const addEyes = () => {
      const eWL = M(G_EYEWHITE(), whiteM); eWL.position.set(-0.058, 1.755, faceZ - 0.004);
      const eWR = eWL.clone(); eWR.position.x = 0.058;
      const iL = M(G_IRIS(), irisM); iL.position.set(-0.058, 1.755, faceZ + 0.006);
      const iR = iL.clone(); iR.position.x = 0.058;
      const pL = M(G_PUPIL(), eyeM); pL.position.set(-0.058, 1.755, faceZ + 0.008);
      const pR = pL.clone(); pR.position.x = 0.058;
      const bL = M(G_BROW(), hairM); bL.position.set(-0.058, 1.793, faceZ + 0.002);
      const bR = bL.clone(); bR.position.x = 0.058;
      add(eWL); add(eWR); add(iL); add(iR); add(pL); add(pR); add(bL); add(bR);
      [eWL, eWR, iL, iR, pL, pR, bL, bR].forEach(m => { m.userData.head = true; });
      faceRig.browL = bL; faceRig.browR = bR;
      faceRig.eyes.push(eWL, eWR, iL, iR, pL, pR);
      head.castShadow = true;
    };
    if (opt.face) {
      addEyes();
    } else if (opt.sunglasses) {
      const glasses = M(G_SUNGLASSES(), eyeM); glasses.position.set(0, 1.755, faceZ + 0.01);
      add(glasses); glasses.userData.head = true;
      faceRig.glasses = glasses;
    } else {
      addEyes();
    }
    const nose = M(G_NOSE(), skinM); nose.position.set(0, 1.7, faceZ + 0.02); add(nose); nose.userData.head = true;
    const mouth = M(G_MOUTH(), lipM); mouth.position.set(0, 1.64, faceZ + 0.004); add(mouth); mouth.userData.head = true;
    faceRig.mouth = mouth;
    // tears (hidden until the NPC cries)
    const tearMat = mat(0x9fd8ff, { roughness: 0.15 });
    tearMat.transparent = true;
    const tearL = M(new THREE.BoxGeometry(0.02, 0.06, 0.012), tearMat); tearL.position.set(-0.058, 1.745, faceZ + 0.022); tearL.visible = false;
    const tearR = tearL.clone(); tearR.position.x = 0.058;
    add(tearL); add(tearR);
    tearL.userData.head = true; tearR.userData.head = true;
    faceRig.tears.push(tearL, tearR);
    g.userData.faceRig = faceRig;

    // hair styles / hats
    let hair = null;
    if (opt.hat === 'police') {
      const hatMat = mat(opt.capColor || 0x142850, { roughness: 0.6 });
      const cap = M(G_POLICE_HAT(), hatMat); cap.position.set(0, 1.905, 0); add(cap); cap.userData.head = true;
      const band = M(G_POLICE_BAND(), mat(0x0c0c10, { roughness: 0.6 })); band.position.set(0, 1.85, 0); add(band); band.userData.head = true;
      const brim = M(G_POLICE_BRIM(), hatMat); brim.position.set(0, 1.835, 0.19); add(brim); brim.userData.head = true;
      const hatBadge = M(G_BADGE(), mat(0xffcf4f, { roughness: 0.35, metalness: 0.5 })); hatBadge.position.set(0, 1.88, 0.2); add(hatBadge); hatBadge.userData.head = true;
      hair = cap;
    } else if (opt.hat) {
      const hatMat = mat(opt.capColor || 0x1f3a6f, { roughness: 0.6 });
      const cap = M(G_CAP(), hatMat); cap.position.set(0, 1.9, 0); add(cap); cap.userData.head = true;
      const brim = M(G_CAPBRIM(), hatMat); brim.position.set(0, 1.85, 0.15); add(brim); brim.userData.head = true;
      hair = cap;
    } else if (opt.hairStyle !== 'bald') {
      hair = M(G_HAIR(), hairM); hair.position.set(0, 1.735, 0); add(hair); hair.userData.head = true;
      if (opt.hairStyle === 'long') {
        const back = M(G_HAIRBACK(), hairM); back.position.set(0, 1.565, -0.125); add(back); back.userData.head = true;
      } else if (opt.hairStyle === 'bun') {
        const bun = M(G_BUN(), hairM); bun.position.set(0, 1.9, -0.07); add(bun); bun.userData.head = true;
      }
    } else {
      // tiny scalp cap keeps the rig's `hair` slot occupied
      hair = M(new THREE.SphereGeometry(0.165, 10, 7), hairM); hair.position.set(0, 1.75, 0); hair.scale.set(0.98, 0.6, 0.98); add(hair);
    }

    // arms: shirt sleeve + bare forearm + hand (shoulder pivots keep the contract)
    const armR = new THREE.Group(); armR.position.set(-shoulderX, 1.47, 0);
    const armL = new THREE.Group(); armL.position.set(shoulderX, 1.47, 0);
    const armRU = M(G_ARM_UP(), armUpMat), armRL = M(G_ARM_LO(), skinM), handR = M(G_HAND(), skinM);
    const armLU = M(G_ARM_UP(), armUpMat), armLL = M(G_ARM_LO(), skinM), handL = M(G_HAND(), skinM);
    handR.position.set(0, -0.56, 0.02);
    handL.position.set(0, -0.56, 0.02);
    armR.add(armRU, armRL, handR);
    armL.add(armLU, armLL, handL);
    g.add(armL); g.add(armR);
    [armRU, armRL, handR, armLU, armLL, handL].forEach(m => { parts.push(m); });
    armRU.castShadow = true; armLU.castShadow = true;

    // legs: thigh + calf + sneaker with sole
    const legL = new THREE.Group(); legL.position.set(-0.105, 0.82, 0);
    const legR = new THREE.Group(); legR.position.set(0.105, 0.82, 0);
    const legLU = M(G_LEG_UP(), legsMat), legLLo = M(G_LEG_LO(), legsMat);
    const shoeL = M(G_SHOE(), shoeM), soleL = M(G_SOLE(), soleM);
    const legRU = M(G_LEG_UP(), legsMat), legRLo = M(G_LEG_LO(), legsMat);
    const shoeR = M(G_SHOE(), shoeM), soleR = M(G_SOLE(), soleM);
    shoeL.position.set(0, -0.75, 0.05);
    shoeR.position.set(0, -0.75, 0.05);
    legL.add(legLU, legLLo, shoeL, soleL);
    legR.add(legRU, legRLo, shoeR, soleR);
    g.add(legL); g.add(legR);
    [legLU, legLLo, shoeL, soleL, legRU, legRLo, shoeR, soleR].forEach(m => { parts.push(m); });
    legLU.castShadow = true; legRU.castShadow = true;

    // accessories
    if (opt.badge) {
      const badge = M(G_BADGE(), mat(0xffcf4f, { roughness: 0.4, metalness: 0.4 })); badge.position.set(0.1, 1.42, 0.17); add(badge);
    }
    if (opt.necklace) {
      const chain = M(G_CHAIN(), mat(0xffd24f, { roughness: 0.3, metalness: 0.8 })); chain.position.set(0, 1.37, 0.155); add(chain);
    }
    if (opt.holster) {
      const hol = M(new THREE.BoxGeometry(0.07, 0.16, 0.05), mat(0x141418, { roughness: 0.6 })); hol.position.set(-0.14, 0.98, 0.1); add(hol);
      const pouch = M(new THREE.BoxGeometry(0.06, 0.08, 0.04), mat(0x1a1a20, { roughness: 0.6 })); pouch.position.set(0.14, 0.95, 0.1); add(pouch);
    }

    add(blobShadow(0.42));
    parts.pop();                       // the shadow is not a hit target / fade part
    if (opt.scale) g.scale.setScalar(opt.scale);

    g.userData = {
      body: torso, head, hair, legL, legR, armL, armR, shoeL, shoeR, handL, handR,
      pelvis, belt, neck, jaw, skirt: skirtMesh, parts,
      faceRig
    };
    return g;
  }

  /* ---------------- Unity-style vehicles ----------------
     Detailed sedans / sports cars / SUVs / taxis / police cruisers:
     chassis, cabin glass, roof, pillars, bumpers, grille, plates,
     glowing head/taillights, mirrors, chrome rims, spinning wheels
     and animated side doors (same gameplay contract as before). */
  // tire tread ring + alloy spoke disc + glass reflection textures
  const G_TREAD = () => sg('tread', () => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 32;
    const g2 = c.getContext('2d');
    g2.fillStyle = '#17191d'; g2.fillRect(0, 0, 64, 32);
    for (let i = 0; i < 6; i++) {
      g2.fillStyle = 'rgba(255,255,255,0.10)';
      g2.fillRect(0, i * 5 + 2, 64, 2);
      g2.fillStyle = 'rgba(0,0,0,0.5)';
      g2.fillRect(0, i * 5 + 4, 64, 1);
    }
    for (let x = 0; x < 64; x += 8) {
      g2.fillStyle = 'rgba(255,255,255,0.13)';
      g2.fillRect(x, 0, 3, 32);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  });
  const G_RIMTEX = () => sg('rimtex', () => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g2 = c.getContext('2d');
    g2.fillStyle = '#b9bec6'; g2.fillRect(0, 0, 64, 64);
    g2.fillStyle = '#5f666e';
    for (let a = 0; a < 5; a++) {
      const ang = a * Math.PI * 2 / 5;
      g2.beginPath();
      g2.moveTo(32 + Math.cos(ang) * 6, 32 + Math.sin(ang) * 6);
      g2.lineTo(32 + Math.cos(ang + 0.42) * 31, 32 + Math.sin(ang + 0.42) * 31);
      g2.lineTo(32 + Math.cos(ang - 0.42) * 31, 32 + Math.sin(ang - 0.42) * 31);
      g2.closePath();
      g2.fill();
    }
    g2.fillStyle = '#23262b';
    g2.beginPath(); g2.arc(32, 32, 5, 0, Math.PI * 2); g2.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  });
  const G_GLASSTEX = () => sg('glasstex', () => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g2 = c.getContext('2d');
    const grd = g2.createLinearGradient(0, 0, 64, 64);
    grd.addColorStop(0, '#1c3646'); grd.addColorStop(1, '#2f5066');
    g2.fillStyle = grd; g2.fillRect(0, 0, 64, 64);
    g2.strokeStyle = 'rgba(255,255,255,0.28)';
    g2.lineWidth = 6;
    g2.beginPath(); g2.moveTo(-10, 42); g2.lineTo(42, -10); g2.stroke();
    g2.beginPath(); g2.moveTo(8, 74); g2.lineTo(74, 8); g2.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  });
  const G_TIRE = () => sg('tire', () => { const g = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 16); g.rotateZ(Math.PI / 2); return g; });
  const G_RIMDISC = () => sg('rimdisc', () => new THREE.CircleGeometry(0.2, 10));

  function makeCar(opt) {
    const g = new THREE.Group();
    const kind = opt.kind || 'sedan';
    const bodyC = opt.color || 0xc23a2e;
    const paint = () => mat(bodyC, { roughness: 0.28, metalness: 0.7 });
    const darkM = mat(0x14161a, { roughness: 0.85, metalness: 0.3 });
    const glassM = new THREE.MeshStandardMaterial({ map: G_GLASSTEX(), roughness: 0.08, metalness: 0.6 });
    const chrome = mat(0xc8ccd2, { roughness: 0.2, metalness: 0.95 });
    const add = (m) => { g.add(m); return m; };

    const isSuv = kind === 'suv' || kind === 'police';
    const bodyY = isSuv ? 0.68 : 0.62;

    // rounded monocoque chassis: bevelled ExtrudeGeometry slab
    const s = new THREE.Shape();
    const W = 1.9, L = 4.2, rr = 0.5, taper = 0.1;
    s.moveTo(-W / 2 + rr + taper, -L / 2);
    s.lineTo(W / 2 - rr - taper, -L / 2);
    s.quadraticCurveTo(W / 2 - taper, -L / 2, W / 2 - taper, -L / 2 + rr);
    s.lineTo(W / 2 - taper, L / 2 - rr - taper * 0.6);
    s.quadraticCurveTo(W / 2 - taper, L / 2 - taper * 0.6, W / 2 - rr - taper, L / 2 - taper * 0.6);
    s.lineTo(-W / 2 + rr, L / 2 - taper * 0.6);
    s.quadraticCurveTo(-W / 2, L / 2 - taper * 0.6, -W / 2, L / 2 - rr - taper * 0.6);
    s.lineTo(-W / 2, -L / 2 + rr);
    s.quadraticCurveTo(-W / 2, -L / 2, -W / 2 + rr, -L / 2);
    const bodyGeo = new THREE.ExtrudeGeometry(s, {
      depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12,
      bevelSegments: 2, curveSegments: 6
    });
    bodyGeo.rotateX(-Math.PI / 2);
    const body = add(new THREE.Mesh(bodyGeo, paint()));
    body.position.y = bodyY;
    body.castShadow = true;

    // fender bulges over each wheel arch
    const fenderGeo = new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    for (const [fx, fz] of [[-0.88, 1.32], [0.88, 1.32], [-0.88, -1.32], [0.88, -1.32]]) {
      const f = add(new THREE.Mesh(fenderGeo, paint()));
      f.scale.set(0.46, 0.34, 0.9);
      f.position.set(fx, 0.56, fz);
    }

    // hood + trunk with slight slopes
    const hood = add(new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.14, 1.05), paint()));
    hood.position.set(0, 0.9, 1.45); hood.rotation.x = -0.07;
    const trunk = add(new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.14, 0.9), paint()));
    trunk.position.set(0, 0.9, -1.66); trunk.rotation.x = 0.06;

    // glass canopy: raked windshield, side windows, rear glass, roof panel
    const windshield = add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.06), glassM));
    windshield.position.set(0, 1.28, 0.72); windshield.rotation.x = -0.62;
    const rearGlass = add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.06), glassM));
    rearGlass.position.set(0, 1.24, -1.1); rearGlass.rotation.x = 0.55;
    const roof = add(new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.1, 1.5), paint()));
    roof.position.set(0, isSuv ? 1.58 : 1.5, -0.25);
    roof.castShadow = true;
    const sideL = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 1.55), glassM));
    sideL.position.set(-0.82, 1.26, -0.25); sideL.rotation.z = -0.16;
    const sideR = sideL.clone(); sideR.position.x = 0.82; sideR.rotation.z = 0.16; add(sideR);
    for (const s of [-1, 1]) {
      const pillar = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), darkM));
      pillar.position.set(s * 0.8, 1.28, 0.0);
    }

    // bumpers + grille + license plates
    const fb = add(new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.26, 0.18), kind === 'police' ? mat(0x1c1e22) : paint()));
    fb.position.set(0, 0.5, 2.26);
    const rb = add(new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.26, 0.18), paint()));
    rb.position.set(0, 0.5, -2.26);
    const grille = add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.05), darkM));
    grille.position.set(0, 0.6, 2.24);
    const strip = add(new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.03, 0.05), chrome));
    strip.position.set(0, 0.5, 2.24);
    const plateF = add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.03), mat(0xd8dce0, { roughness: 0.5 })));
    plateF.position.set(-0.45, 0.42, 2.26);
    const plateB = add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.03), mat(0xd8dce0, { roughness: 0.5 })));
    plateB.position.set(0.45, 0.42, -2.26);

    // round headlights + glowing taillights
    const headM = new THREE.MeshStandardMaterial({ color: 0xfff8dc, emissive: 0xfff2c0, emissiveIntensity: 0.6, roughness: 0.25 });
    const tailM = new THREE.MeshStandardMaterial({ color: 0xff4a3a, emissive: 0xff2216, emissiveIntensity: 0.7, roughness: 0.3 });
    for (const s of [-1, 1]) {
      const hl = add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), headM));
      hl.position.set(s * 0.58, 0.66, 2.1);
      hl.scale.set(1.2, 0.85, 0.55);
      const tl = add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.11, 0.06), tailM));
      tl.position.set(s * 0.58, 0.72, -2.1);
    }
    // side mirrors on stalks
    for (const s of [-1, 1]) {
      const stalk = add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.16), paint()));
      stalk.position.set(s * 0.95, 1.05, 0.78);
      const mir = add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.05), paint()));
      mir.position.set(s * 1.03, 1.07, 0.84);
    }
    // exhaust + radio antenna
    const ex = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.22, 8), chrome));
    ex.rotation.x = Math.PI / 2;
    ex.position.set(-0.45, 0.32, -2.2);
    const ant = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.55, 4), darkM));
    ant.position.set(0.55, 1.85, -0.4);

    // wheels: treaded tire + alloy spoke discs on both faces
    const wheels = [];
    const tireM = new THREE.MeshStandardMaterial({ map: G_TREAD(), roughness: 0.9 });
    const rimM = new THREE.MeshStandardMaterial({ map: G_RIMTEX(), roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide });
    for (const [wx, wz] of [[-0.92, 1.3], [0.92, 1.3], [-0.92, -1.35], [0.92, -1.35]]) {
      const w = new THREE.Group();
      const tire = new THREE.Mesh(G_TIRE(), tireM);
      const rimL = new THREE.Mesh(G_RIMDISC(), rimM);
      rimL.rotation.y = Math.PI / 2;
      rimL.position.x = 0.135;
      const rimR = rimL.clone(); rimR.rotation.y = -Math.PI / 2; rimR.position.x = -0.135;
      tire.castShadow = true;
      w.add(tire, rimL, rimR);
      w.position.set(wx, 0.36, wz);
      g.add(w);
      wheels.push(w);
    }

    // kind-specific details
    if (kind === 'sport') {
      const wing = add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.4), paint()));
      wing.position.set(0, 1.3, -2.15);
      for (const s of [-1, 1]) {
        const strut = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.1), darkM));
        strut.position.set(s * 0.7, 1.14, -2.15);
      }
    }
    if (kind === 'suv') {
      for (const s of [-1, 1]) {
        const rail = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.7), chrome));
        rail.position.set(s * 0.72, 1.7, -0.25);
      }
    }
    if (kind === 'taxi') {
      const sign = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.3), new THREE.MeshStandardMaterial({
        color: 0x1a1a1a, emissive: 0xffd76a, emissiveIntensity: 0.8, roughness: 0.5
      })));
      sign.position.set(0, 1.7, -0.25);
    }
    if (kind === 'police') {
      const doorM = mat(0x1c1e22, { roughness: 0.5 });
      for (const s of [-1, 1]) {
        const patch = add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 1.2), doorM));
        patch.position.set(s * 0.96, 0.72, 0.55);
      }
      const bar = add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.95), mat(0x20242a, { roughness: 0.5 })));
      bar.position.set(0, 1.7, -0.25);
      const lr = add(new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.13, 0.34), new THREE.MeshBasicMaterial({ color: 0xff2222 })));
      lr.position.set(0, 1.79, -0.25);
      const lb = add(new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.13, 0.34), new THREE.MeshBasicMaterial({ color: 0x2244ff })));
      lb.position.set(0, 1.79, -0.25);
      g.userData.lightRed = lr; g.userData.lightBlue = lb;
    }

    // animated side doors (hinged at the front edge) — same contract as before
    const doorGeo = new THREE.BoxGeometry(0.05, 0.52, 1.15);
    const doorL = new THREE.Mesh(doorGeo, paint());
    const doorR = new THREE.Mesh(doorGeo, paint());
    const hingeL = new THREE.Group(); hingeL.position.set(-0.9, 0.72, 0.62); doorL.position.set(0, 0, -0.58); hingeL.add(doorL);
    const hingeR = new THREE.Group(); hingeR.position.set(0.9, 0.72, 0.62); doorR.position.set(0, 0, -0.58); hingeR.add(doorR);
    g.add(hingeL, hingeR);
    g.add(blobShadow(1.15));
    g.userData.wheels = wheels;
    g.userData.body = body;
    g.userData.cabin = windshield; g.userData.hood = hood; g.userData.trunk = trunk;
    g.userData.sideL = sideL; g.userData.sideR = sideR; g.userData.rearGlass = rearGlass;
    g.userData.doorL = hingeL; g.userData.doorR = hingeR;
    g.userData.doorMeshes = [doorL, doorR];
    return g;
  }

  // small driver figure seated inside the cabin (visible through the glass)
  function makeDriver(isPolice) {
    const g = new THREE.Group();
    const shirt = isPolice ? 0x1f3a6f : CIV_SHIRTS[(rng() * CIV_SHIRTS.length) | 0];
    const skinM = mat(0xe8b88a, { roughness: 0.55 });
    const shirtM = mat(shirt, { roughness: 0.8 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.4, 0.26), shirtM);
    torso.position.set(-0.36, 1.0, -0.15);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), skinM);
    head.position.set(-0.36, 1.32, -0.15);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(0x24180f, { roughness: 0.7 }));
    hair.position.set(-0.36, 1.33, -0.15);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), shirtM);
    arm.position.set(-0.12, 1.02, -0.05);
    g.add(torso, head, hair, arm);
    if (isPolice) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), mat(0x142850, { roughness: 0.6 }));
      cap.position.set(-0.36, 1.5, -0.15);
      g.add(cap);
    }
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
    // hero outfit per graphics style: modern = striped shirt + dark slacks,
    // neon = Tommy cream tropical shirt, night = dark leather jacket (GTA NIGHT)
    const style = settings.style;
    const heroOpt = style === 'neon'
      ? { shirt: 0xf3efe2, pants: 0x2b3140, hair: 0x2a1c12, face: true, shoe: 0x1a181e, shirtTex: shirtTexture(0xf3efe2, 0x2fa8a0, 1) }
      : style === 'night'
        ? { shirt: 0x2a2622, pants: 0x1c1f26, hair: 0x14100c, face: true, shoe: 0x101014, shirtTex: stripeTexture(0x2a2622, 0x8a2a2a, 1) }
        : { shirt: 0xe8ecf0, pants: 0x2b3140, hair: 0x1f160d, face: true, shoe: 0x1a181e, shirtTex: stripeTexture(0xe8ecf0, 0x4a6f8f, 1) };
    const g = makeHuman(heroOpt);
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

    // BOMB: black iron ball with a capped fuse, held ready to throw
    const bomb = new THREE.Group();
    const bombBody = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mat(0x26262c));
    const bombCap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.06, 6), mat(0x9a9a9a));
    bombCap.position.y = 0.155;
    const bombFuse = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.16, 0.022), mat(0xe0c679));
    bombFuse.position.set(0.05, 0.24, 0); bombFuse.rotation.z = 0.55;
    bomb.add(bombBody, bombCap, bombFuse);
    g.userData.bomb = handMount(bomb, 'wp-bomb');
    g.userData.armR.add(g.userData.fist);        // default: bare fists on show

    const muzzle = new THREE.Group();
    muzzle.position.set(0, 1.45, 0.42);

    return {
      group: g, pos: SPAWN.clone(), prevPos: SPAWN.clone(), vel: new THREE.Vector3(),
      hp: 100, maxHp: 100, armor: 0, maxArmor: 100, weapon: 0,
      ammoStore: { 2: MAG_SIZE, 3: AK_MAG, 4: BOMB_START },   // per-weapon reserve
      shotsFired: 0, swimming: false, swimLevel: 0,
      wanted: 0, crimeTimer: 0, speed: 6.4, sprint: 1.65,
      inCar: null, muzzle,
      facing: 0, anim: 0, idleT: 0, meleeT: 0, meleeTotal: 0.32,
      isMoving: false, targetSeen: false,
      switchT: 0, reloadT: 0, reloadTotal: 0, recoil: 0, bloom: 0,
      attackCd: 0, shotCd: 0, dead: false, lastFire: 0,
      // open-world mobility: jump, roll-dodge, crouch & crawl
      vy: 0, yOff: 0, onGround: true, jumpLock: false,
      crouch: false, crawl: false,
      rollT: 0, rollCd: 0, rollSpin: 0, rollDir: new THREE.Vector3(0, 0, 1)
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
    [u.knife, u.gun, u.ak, u.bomb, u.fist].forEach(m => armR.remove(m));
    if (w === 1) armR.add(u.knife);          // 🔪 in the right hand
    else if (w === 2) armR.add(u.gun);       // pistol in the right hand
    else if (w === 3) armR.add(u.ak);        // rifle in the right hand
    else if (w === 4) armR.add(u.bomb);      // 💣 grenade in the right hand
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
  const BIKINI_COLS = [0xff4f8a, 0xff2a4a, 0x40e0d0, 0xffd166, 0x9b7bff, 0xff6a3f, 0x3fe0ff, 0xf3f0e4];
  const CIV_PANTS = [0x2b3140, 0x3a3a48, 0x5a4a3a, 0x555a66, 0x1f2a3a, 0x4a3f55, 0x6b6b78];
  const SKINS = [0xf1c8a0, 0xe0ac7a, 0xc98d5a, 0xa86f45, 0x8a5a3a, 0x6b4024, 0xf5d6b8];
  const HAIRS = [0x120d09, 0x24180f, 0x3a2414, 0x5a3a1c, 0x8a6a3a, 0xd8c08a, 0x2a2a2e];
  const CAPS = [0xff4f6a, 0x3f8f5f, 0x2f6fbf, 0xffd25e, 0x9b6bff];
  function makeNPC(type, kind) {
    const isPolice = type === 'police';
    const isEnemy = type === 'enemy';
    let opt;
    if (isPolice) {
      opt = {
        shirt: 0x1f3a6f, pants: 0x15151c, skin: SKINS[(rng() * SKINS.length) | 0], hair: 0x140f0a,
        hat: 'police', capColor: 0x142850, sunglasses: rng() < 0.5, badge: true,
        holster: true, belt: 0x0c0c10, shoe: 0x0d0d10, scale: 0.97 + rng() * 0.06
      };
    } else if (isEnemy) {
      // street gang thug: dark hoodie/tee, beanie or cap, shades, a pistol on the hip
      opt = {
        shirt: [0x14161c, 0x1a1a22, 0x241c1a, 0x0e1014][(rng() * 4) | 0],
        pants: [0x16181e, 0x1c1c24, 0x22201c][(rng() * 3) | 0],
        skin: SKINS[(rng() * SKINS.length) | 0], hair: 0x0c0a08,
        hat: rng() < 0.6 ? 'baseball' : undefined,
        capColor: [0x101218, 0x2a1a12, 0x141a20][(rng() * 3) | 0],
        sunglasses: rng() < 0.45,
        holster: true, belt: 0x0c0c10, shoe: 0x121216,
        scale: 0.95 + rng() * 0.1
      };
    } else if (kind === 'bikini') {
      // beautiful beach/party girl in a colourful two-piece bikini
      opt = {
        female: true, bikini: true,
        bikiniColor: BIKINI_COLS[(rng() * BIKINI_COLS.length) | 0],
        skin: SKINS[(rng() * SKINS.length) | 0],
        hair: HAIRS[(rng() * HAIRS.length) | 0],
        hairStyle: rng() < 0.5 ? 'long' : 'bun',
        bust: true,
        sunglasses: rng() < 0.45,
        necklace: rng() < 0.5,
        shoe: [0xf5f2ea, 0x2a2a30, 0xc26a8a][(rng() * 3) | 0],
        belt: 0xffd24f,
        scale: 0.94 + rng() * 0.08
      };
    } else if (kind === 'party') {
      // bar party-goer: bright tropical shirt, shades, maybe a skirt + necklace
      const pf = rng() < 0.5;
      opt = {
        female: pf,
        shirt: CIV_SHIRTS[(rng() * CIV_SHIRTS.length) | 0],
        pants: CIV_PANTS[(rng() * CIV_PANTS.length) | 0],
        skin: SKINS[(rng() * SKINS.length) | 0],
        hair: HAIRS[(rng() * HAIRS.length) | 0],
        hairStyle: pf ? (rng() < 0.5 ? 'long' : 'bun') : 'short',
        sunglasses: rng() < 0.5,
        bust: pf && rng() < 0.7,
        necklace: rng() < 0.6,
        shirtTex: shirtTexture(CIV_SHIRTS[(rng() * CIV_SHIRTS.length) | 0],
          PRINT_ACCENTS[(rng() * PRINT_ACCENTS.length) | 0], (rng() * 4) | 0),
        shoe: [0x1b1a20, 0x2a2a30, 0xc2a02e][(rng() * 3) | 0],
        belt: 0x24242a,
        scale: 0.94 + rng() * 0.1
      };
      if (pf && rng() < 0.4) {
        opt.skirt = true;
        opt.skirtColor = [0xff6f91, 0x40e0d0, 0xffd166, 0x9b7bff, 0xf3f0e4][(rng() * 5) | 0];
      }
    } else {
      const female = rng() < 0.42;
      const hairRoll = rng();
      const hairStyle = female ? (hairRoll < 0.45 ? 'long' : (hairRoll < 0.62 ? 'bun' : 'short'))
        : (hairRoll < 0.1 ? 'bald' : (hairRoll < 0.25 ? 'long' : 'short'));
      opt = {
        female: female,
        shirt: CIV_SHIRTS[(rng() * CIV_SHIRTS.length) | 0],
        pants: CIV_PANTS[(rng() * CIV_PANTS.length) | 0],
        skin: SKINS[(rng() * SKINS.length) | 0],
        hair: HAIRS[(rng() * HAIRS.length) | 0],
        hairStyle: hairStyle,
        sunglasses: rng() < 0.38,
        bust: female && rng() < 0.6,
        hat: rng() < 0.1 ? 'baseball' : undefined,
        capColor: CAPS[(rng() * CAPS.length) | 0],
        necklace: rng() < 0.18,
        shirtTex: null,
        shoe: [0x1b1a20, 0x2a2a30, 0x3a2a1c][(rng() * 3) | 0],
        belt: 0x24242a,
        scale: 0.94 + rng() * 0.1
      };
      const clothRoll = rng();
      if (clothRoll < 0.32) {
        opt.shirtTex = shirtTexture(opt.shirt, PRINT_ACCENTS[(rng() * PRINT_ACCENTS.length) | 0], (rng() * 4) | 0);
      } else if (clothRoll < 0.6) {
        opt.shirtTex = stripeTexture(opt.shirt, [0xffffff, 0x1f1f28, 0xf7e9d0][(rng() * 3) | 0], (rng() * 4) | 0);
      }
      if (female && rng() < 0.55) {
        opt.skirt = true;
        opt.skirtColor = [0xff6f91, 0x40e0d0, 0xffd166, 0x9b7bff, 0xf3f0e4, 0x2b3140][(rng() * 6) | 0];
      }
      if (rng() < 0.15) {          // sharp-dressed civilians: suit + tie
        opt.suit = true;
        opt.shirt = [0x2a2f38, 0x3a3f4a, 0x26262e, 0x4a4038][(rng() * 4) | 0];
        opt.tieColor = [0x8a1a2a, 0x1a3a6a, 0xc2a02e][(rng() * 3) | 0];
      }
    }
    const g = makeHuman(opt);
    const start = isPolice ? randomRoadNode() : randomWalkablePoint();
    g.position.copy(start);
    scene.add(g);

    const npc = {
      type, group: g, pos: start.clone(),
      bikini: kind === 'bikini',
      hp: isPolice ? 70 : (isEnemy ? 60 : 40), maxHp: isPolice ? 70 : (isEnemy ? 60 : 40),
      state: isPolice ? 'patrol' : (isEnemy ? 'gang' : 'walk'),
      home: isEnemy ? start.clone() : null,
      target: null, wanderTimer: 0, speed: isPolice ? 3.4 : (isEnemy ? 1.7 : 1.9),
      dead: false, deathT: 0, fleeDir: new THREE.Vector3(),
      path: [], pathI: 0, shootCd: rng() * 1.2, losTimer: 0, los: true,
      anim: 0, facing: 0, runSpeed: 5.2,
      mood: isPolice ? (rng() < 0.5 ? 'angry' : 'calm') : (isEnemy ? 'angry' : rollMood()),
      moodAnim: 0, bubbleT: 2 + rng() * 4, hideT: 0, bubble: null,
      alertedT: 0
    };
    g.userData.owner = npc;
    g.userData.parts.forEach(p => p.userData.owner = npc);
    g.userData.head.userData.head = true;
    NPCs.push(npc);
    npc.group.userData.parts.forEach(p => hittables.push(p));
    return npc;
  }

  /* ---------------- NPC moods & living faces (Gangstar-style streets) ---------------- */
  const MOOD_EMOJI = { happy: '😊', talk: '💬', laugh: '😂', cry: '😭', angry: '😠', fear: '😱' };
  function rollMood() {
    const r = rng();
    if (r < 0.4) return 'calm';
    if (r < 0.6) return 'happy';
    if (r < 0.8) return 'talk';
    if (r < 0.86) return 'laugh';
    if (r < 0.94) return 'angry';
    return 'cry';
  }
  const _bubbleTex = {};
  function bubbleTexture(emoji) {
    if (_bubbleTex[emoji]) return _bubbleTex[emoji];
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(32, 28, 23, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(22, 47); g.lineTo(42, 47); g.lineTo(26, 61);
    g.closePath();
    g.fill();
    g.font = '30px serif';
    g.textAlign = 'center';
    g.fillText(emoji, 32, 38);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    _bubbleTex[emoji] = tex;
    return tex;
  }
  // animate the face: smile / talk (moving lips) / laugh / cry (tears + sobbing) / anger / fear
  function updateFace(npc, dt) {
    const rig = npc.group.userData.faceRig;
    if (!rig || !rig.mouth) return;
    npc.moodAnim = (npc.moodAnim || 0) + dt;
    const a = npc.moodAnim;
    let mood = npc.mood || 'calm';
    if (npc.state === 'flee' || (npc.fleeT || 0) > 0) mood = 'fear';
    if (npc.hp < npc.maxHp && mood !== 'fear') mood = 'fear';          // hurt -> scared
    const m = rig.mouth;
    m.rotation.x = 0; m.rotation.z = 0; m.scale.set(1, 1, 1); m.position.y = 1.64;
    if (rig.browL) {
      rig.browL.position.y = 1.793; rig.browR.position.y = 1.793;
      rig.browL.rotation.z = 0; rig.browR.rotation.z = 0;
    }
    rig.eyes.forEach(e => {
      if (e.userData._baseScale === undefined) e.userData._baseScale = e.scale.x || 1;
      e.scale.setScalar(e.userData._baseScale);
    });
    const u = npc.group.userData;
    if (u.head) { u.head.rotation.x = 0; u.head.rotation.z = 0; }
    switch (mood) {
      case 'happy':
        m.scale.set(1.55, 0.75, 1); m.position.y = 1.647;
        if (rig.browL) { rig.browL.position.y = 1.795; rig.browR.position.y = 1.795; }
        break;
      case 'laugh':
        m.scale.set(1.3, 1.5 + Math.sin(a * 4.2) * 0.55, 1); m.position.y = 1.642;
        if (rig.browL) { rig.browL.position.y = 1.801; rig.browR.position.y = 1.801; }
        if (u.head) u.head.rotation.z = Math.sin(a * 2.1) * 0.12;
        break;
      case 'talk':
        m.scale.set(1.1, 0.65 + Math.abs(Math.sin(a * 3.4)) * 0.95, 1); m.position.y = 1.643;
        if (rig.browL) {
          rig.browL.position.y = 1.795 + Math.sin(a * 3.4) * 0.01;
          rig.browR.position.y = 1.795 + Math.sin(a * 3.4 + 0.6) * 0.01;
        }
        break;
      case 'cry':
        m.scale.set(1.25, 0.7, 1); m.rotation.x = 0.55; m.position.y = 1.637;
        if (rig.browL) { rig.browL.rotation.z = 0.42; rig.browR.rotation.z = -0.42; }
        if (u.head) u.head.rotation.x = 0.3;
        npc.group.rotation.z = Math.sin(a * 6.5) * 0.045;               // sobbing shoulders
        break;
      case 'angry':
        m.scale.set(0.75, 0.85, 1); m.position.y = 1.641;
        if (rig.browL) {
          rig.browL.rotation.z = -0.38; rig.browR.rotation.z = 0.38;
          rig.browL.position.y = 1.787; rig.browR.position.y = 1.787;
        }
        break;
      case 'fear':
        if (rig.browL) { rig.browL.position.y = 1.803; rig.browR.position.y = 1.803; }
        m.scale.set(1.05, 1.25, 1); m.position.y = 1.639;
        rig.eyes.forEach(e => e.scale.setScalar((e.userData._baseScale || 1) * 1.3));
        break;
      default: break;
    }
    // tears drip down crying cheeks
    if (rig.tears.length) {
      const crying = mood === 'cry';
      rig.tears.forEach((t, i) => {
        if (!crying) { t.visible = false; return; }
        t.visible = true;
        const cyc = (a * 0.85 + i * 0.55) % 1.5;
        t.position.y = 1.745 - cyc * 0.15;
        t.material.opacity = Math.max(0, 1 - cyc * 1.3);
      });
    }
    // emoji speech bubble above the head (only for nearby NPCs)
    npc.bubbleT = (npc.bubbleT === undefined ? 2 + rng() * 4 : npc.bubbleT) - dt;
    if (!npc.bubble) {
      npc.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, transparent: true, depthWrite: false }));
      npc.bubble.scale.set(0.85, 0.85, 1);
      npc.bubble.visible = false;
      scene.add(npc.bubble);
    }
    npc.bubble.position.set(npc.pos.x, 2.48, npc.pos.z);
    if (npc.bubble.visible) {
      npc.hideT -= dt;
      if (npc.hideT <= 0) npc.bubble.visible = false;
    }
    const emoji = MOOD_EMOJI[mood];
    if (emoji && npc.bubbleT <= 0) {
      const near = player && !player.dead && npc.pos.distanceTo(player.pos) < 24;
      if (near && !npc.dead) {
        npc.bubble.material.map = bubbleTexture(emoji);
        npc.bubble.material.needsUpdate = true;
        npc.bubble.visible = true;
        npc.hideT = 1.6;
        npc.bubbleT = 3.5 + rng() * 5;
        if (mood === 'laugh') Sfx.laugh();
        else if (mood === 'cry') Sfx.sob();
        else if (mood === 'angry') Sfx.warn();
      } else {
        npc.bubbleT = 1.5 + rng() * 2;
      }
    }
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
      laneOffset: ROAD / 4, honkT: 0, dead: false,      // right-hand lane keeps traffic tidy
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
    const hullM = mat(hullC, { roughness: 0.4, metalness: 0.4 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.6), hullM);
    hull.position.y = 0.32;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.2, 4), hullM);
    bow.rotation.x = Math.PI / 2;                        // pointed bow forward (+z)
    bow.position.set(0, 0.34, 3.2);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 4.2), mat(0xd8d2c2, { roughness: 0.6 }));
    deck.position.set(0, 0.68, -0.4);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.8), mat(0xe9e4d4, { roughness: 0.5 }));
    cabin.position.set(0, 1.02, -0.8);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.24, 1.85), mat(0x223649, { roughness: 0.15, metalness: 0.5 }));
    glass.position.set(0, 1.24, -0.8);
    const railM = mat(0xcfd4d8, { roughness: 0.4, metalness: 0.7 });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 4.4), railM);
    rail.position.set(-0.95, 1.0, -0.4);
    const rail2 = rail.clone(); rail2.position.x = 0.95;
    const outboard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.4), mat(0x1c1e22, { roughness: 0.6 }));
    outboard.position.set(0, 0.35, -2.6);
    g.add(hull, bow, deck, cabin, glass, rail, rail2, outboard);
    scene.add(g);

    const boat = {
      group: g,
      pos: new THREE.Vector3(startX, 0, RIVER_Z + (rng() * 2 - 1) * (RIVER_HALF - 8)),
      dirX: dirX >= 0 ? 1 : -1,
      speed: 2 + rng() * 2.2,
      baseZ: RIVER_Z + (rng() * 2 - 1) * (RIVER_HALF - 8),
      phase: rng() * Math.PI * 2,
      wobT: rng() * 10, wakeT: 0.5, prevZ: 0,
      maxSpeed: 0, state: 'cruise', yieldT: 0   // 'cruise' | 'yield'
    };
    boat.maxSpeed = boat.speed;
    boat.prevZ = boat.pos.z;
    g.rotation.y = boat.dirX === 1 ? Math.PI / 2 : -Math.PI / 2;
    boats.push(boat);
    return boat;
  }

  function updateBoat(b, dt) {
    b.wobT += dt;
    // ---- hero avoidance: a boat that meets the main character in the water
    // brakes to a full stop, waits a beat, then turns around and heads to the
    // other side of the river before resuming its cruise ----
    let heroAhead = false;
    if (player && !player.dead && !player.inCar &&
        (player.swimming || swimWaterAt(player.pos.x, player.pos.z))) {
      const dx = player.pos.x - b.pos.x, dz = player.pos.z - b.pos.z;
      const dd2 = dx * dx + dz * dz;
      heroAhead = dd2 < 18 * 18 && dx * b.dirX > -2;
    }
    if (heroAhead && b.state === 'cruise') {
      b.state = 'yield';
      b.yieldT = 1.1 + Math.random() * 0.9;          // stand still for a moment
    }
    if (b.state === 'yield') {
      b.speed = Math.max(0, b.speed - 8 * dt);    // brake hard to a stop
      b.yieldT -= dt;
      if (b.yieldT <= 0) {
        // depart: turn away from the hero and cross to the far side
        if (player && !player.dead &&
            (player.pos.x - b.pos.x) * b.dirX > -1) b.dirX = -b.dirX;
        b.baseZ = RIVER_Z + ((player && !player.dead && player.pos.z >= RIVER_Z)
          ? -1 : 1) * (RIVER_HALF - 8);
        b.state = 'cruise';
      }
    } else {
      b.speed = Math.min(b.maxSpeed, b.speed + 2.5 * dt);   // ease back to cruise
    }
    // steady cruise along the river + lazy weave between the banks
    b.pos.x += b.dirX * b.speed * dt;
    if (b.state !== 'yield') {
      b.pos.z = b.baseZ + Math.sin(b.wobT * 0.35 + b.phase) * (RIVER_HALF - 8);
    }
    // wrap around the map edges -> endless traffic in both directions
    if (b.pos.x > CENTER + 16) b.pos.x = -CENTER - 16;
    if (b.pos.x < -CENTER - 16) b.pos.x = CENTER + 16;

    const vz = (b.pos.z - b.prevZ) / Math.max(dt, 1e-4);
    b.prevZ = b.pos.z;
    if (b.speed > 0.05) {                  // hold heading while stopped
      const targetH = Math.atan2(b.dirX * b.speed, vz);
      let dh = targetH - b.group.rotation.y;                 // shortest-path yaw glide
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      b.group.rotation.y += dh * Math.min(1, dt * 2.5);
    }
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

  /* ---------------- Sharks in the river & bay ---------------- */
  const sharks = [];
  function makeSharkModel() {
    const g = new THREE.Group();
    const backM = mat(0x4a565f, { roughness: 0.55 });
    const darkM = mat(0x333c44, { roughness: 0.6 });
    const bellyM = mat(0xd8dde0, { roughness: 0.6 });
    // fusiform body: main mass + tapered snout + tail peduncle (great-white silhouette)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), backM);
    body.scale.set(0.8, 0.6, 1.9);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 8), backM);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.03, 1.72);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 10), bellyM);
    belly.scale.set(0.66, 0.4, 1.55);
    belly.position.set(0, -0.18, -0.12);
    const peduncle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 8), backM);
    peduncle.rotation.x = Math.PI / 2;
    peduncle.position.set(0, 0.04, -1.55);
    // crescent caudal fin (upper + lower lobes) on a wagging group
    const tail = new THREE.Group();
    tail.position.set(0, 0.04, -1.9);
    const lobeGeo = new THREE.ConeGeometry(0.55, 1.05, 4);
    const lobeU = new THREE.Mesh(lobeGeo, backM);
    lobeU.scale.set(1, 0.14, 1);
    lobeU.position.set(0, 0.4, -0.32);
    lobeU.rotation.z = -0.2;
    const lobeL = new THREE.Mesh(lobeGeo, bellyM);
    lobeL.scale.set(1, 0.14, 1);
    lobeL.position.set(0, -0.4, -0.32);
    lobeL.rotation.z = Math.PI + 0.2;
    tail.add(lobeU, lobeL);
    // first dorsal (tall, swept back) + small second dorsal
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.85, 4), darkM);
    dorsal.scale.set(1, 1, 0.22);
    dorsal.position.set(0, 0.72, -0.15);
    dorsal.rotation.x = -0.18;
    const dorsal2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 4), darkM);
    dorsal2.scale.set(1, 1, 0.2);
    dorsal2.position.set(0, 0.4, -1.2);
    dorsal2.rotation.x = 0.3;
    // pectoral fins (swept out + down)
    const pecGeo = new THREE.ConeGeometry(0.42, 0.95, 4);
    const finL = new THREE.Mesh(pecGeo, backM);
    finL.scale.set(0.16, 1, 0.5);
    finL.rotation.z = Math.PI / 2 - 0.22;
    finL.position.set(-0.56, 0.06, 0.55);
    const finR = new THREE.Mesh(pecGeo, backM);
    finR.scale.set(0.16, 1, 0.5);
    finR.rotation.z = -Math.PI / 2 + 0.22;
    finR.position.set(0.56, 0.06, 0.55);
    // pelvic fins + anal fin
    const finPL = finL.clone(); finPL.scale.set(0.1, 0.5, 0.32); finPL.position.set(-0.34, -0.1, -0.75);
    const finPR = finR.clone(); finPR.scale.set(0.1, 0.5, 0.32); finPR.position.set(0.34, -0.1, -0.75);
    const anal = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 4), bellyM);
    anal.scale.set(0.14, 1, 0.5);
    anal.position.set(0, -0.16, -1.35);
    // gill slits + eyes + mouth line
    for (let i = 0; i < 3; i++) {
      for (const s of [-1, 1]) {
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.15, 0.05), darkM);
        slit.position.set(s * 0.64, 0.05, 1.3 - i * 0.15);
        slit.rotation.y = s * 0.25;
        g.add(slit);
      }
    }
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), mat(0x0a0c0e, { roughness: 0.2 }));
      eye.position.set(s * 0.4, 0.24, 1.58);
      g.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.06), darkM);
    mouth.position.set(0, -0.12, 2.05);
    g.add(body, belly, nose, peduncle, tail, dorsal, dorsal2, finL, finR, finPL, finPR, anal, mouth);
    g.userData.tail = tail;
    return g;
  }

  function spawnSharkAt(x, z, kind, r) {
    const useRng = r || rng;   // extra sharks draw from their own stream so the
                               // main world RNG stream stays untouched
    const w = swimWaterAt(x, z);
    const level = w ? w.level : RIVER_LEVEL;
    const g = makeSharkModel();
    const s = {
      group: g, pos: new THREE.Vector3(x, 0, z), level, kind,
      home: new THREE.Vector3(x, 0, z),             // river guards hold their bridge
      angle: useRng() * Math.PI * 2, speed: 2.2, anim: useRng() * 10,
      biteCd: 0, patrolT: 0.5 + Math.random() * 2, target: null
    };
    g.position.set(x, level + 0.06, z);
    g.rotation.y = s.angle;
    scene.add(g);
    sharks.push(s);
    return s;
  }
  function updateShark(s, dt) {
    // target: the swimming hero, or any swimmer NPC in the water
    let best = 26 * 26, target = null;
    if (player && player.swimming && !player.dead) {
      const d = s.pos.distanceToSquared(player.pos);
      if (d < best) { best = d; target = { kind: 'player', pos: player.pos }; }
    }
    for (let i = 0; i < NPCs.length; i++) {
      const n = NPCs[i];
      if (!n.swim || n.dead || !swimWaterAt(n.pos.x, n.pos.z)) continue;
      const d = s.pos.distanceToSquared(n.pos);
      if (d < best) { best = d; target = { kind: 'npc', npc: n, pos: n.pos }; }
    }
    s.target = target;
    let desiredAngle = s.angle, speed = 2.2;
    if (target) {
      desiredAngle = Math.atan2(target.pos.x - s.pos.x, target.pos.z - s.pos.z);
      speed = 4.5;
    } else {
      // the bridge guards hold their crossing; the sea patrols circle their bay
      if (s.pos.distanceToSquared(s.home) > 24 * 24) {
        desiredAngle = Math.atan2(s.home.x - s.pos.x, s.home.z - s.pos.z);
        s.patrolT = 0.5;
      } else {
        s.patrolT -= dt;
        if (s.patrolT <= 0) {
          s.patrolT = 2 + Math.random() * 4;
          s.angle += (Math.random() - 0.5) * 1.8;
        }
      }
    }
    let dh = desiredAngle - s.angle;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const maxTurn = 3.0 * dt;
    s.angle += Math.max(-maxTurn, Math.min(maxTurn, dh));
    const nx = s.pos.x + Math.sin(s.angle) * speed * dt;
    const nz = s.pos.z + Math.cos(s.angle) * speed * dt;
    // sharks glide through the river channel even beneath the bridge decks,
    // so they can hunt a swimmer all the way across a bridge crossing
    const nw = isInsideWater(nx, nz) ? { level: RIVER_LEVEL, river: true } : swimWaterAt(nx, nz);
    if (nw) {
      s.pos.x = nx; s.pos.z = nz; s.level = nw.level;
    } else {
      s.angle += Math.PI * (0.6 + Math.random() * 0.4);   // bounce at the shore
      s.patrolT = 0;
    }
    s.biteCd = Math.max(0, s.biteCd - dt);
    if (target && s.pos.distanceTo(target.pos) < 1.9 && s.biteCd <= 0) {
      s.biteCd = 1.25;
      if (target.kind === 'player') {
        playerTakeDamage(16, s.pos);
        spawnBlood(player.pos.clone().setY(0.5), new THREE.Vector3(Math.sin(s.angle), 0, Math.cos(s.angle)), 8);
        toast('CÁ MẬP TẤN CÔNG!');
        Sfx.blood();
      } else {
        damageNPC(target.npc, 60, target.npc.pos.clone().setY(0.4),
          new THREE.Vector3(Math.sin(s.angle), 0, Math.cos(s.angle)));
        spawnBlood(target.npc.pos.clone().setY(0.4), new THREE.Vector3(Math.sin(s.angle), 0, Math.cos(s.angle)), 12);
      }
    }
    s.anim += dt * (target ? 8 : 5);
    s.group.position.set(s.pos.x, s.level + 0.06 + Math.sin(s.anim * 0.8) * 0.03, s.pos.z);
    s.group.rotation.y = s.angle;
    if (s.group.userData.tail) s.group.userData.tail.rotation.y = Math.sin(s.anim) * 0.5;
  }
  function randomWaterPoint(pos, r) {
    for (let t = 0; t < 24; t++) {
      const a = rng() * Math.PI * 2, d = 1 + rng() * r;
      const x = pos.x + Math.cos(a) * d, z = pos.z + Math.sin(a) * d;
      if (swimWaterAt(x, z)) return new THREE.Vector3(x, 0, z);
    }
    return pos.clone();
  }
  // a dry spot on the sand ring around the island (bikini girls stroll here)
  function randomBeachPoint(r) {
    const useRng = r || rng;
    for (let t = 0; t < 20; t++) {
      const side = (useRng() * 4) | 0;
      const along = (useRng() * 2 - 1) * (GROUND_HALF - 10);
      const b = GROUND_HALF - 1.5 - useRng() * 4;
      let x, z;
      if (side === 0) { x = along; z = -b; }
      else if (side === 1) { x = along; z = b; }
      else if (side === 2) { x = b; z = along; }
      else { x = -b; z = along; }
      if (!isInsideBuilding(x, z) && !isInsideBar(x, z) && !swimWaterAt(x, z)) {
        return new THREE.Vector3(x, 0, z);
      }
    }
    return null;
  }
  // a beach stroll target along the SAME shore, so the girls never cut
  // through the city to reach the other side of the island
  function beachPointNear(pos, range) {
    for (let t = 0; t < 12; t++) {
      const along = (rng() * 2 - 1) * range;
      let x = pos.x, z = pos.z;
      if (Math.abs(pos.z) > Math.abs(pos.x)) {
        z = (pos.z > 0 ? 1 : -1) * (GROUND_HALF - 1.5 - rng() * 4);
        x = Math.max(-GROUND_HALF + 3, Math.min(GROUND_HALF - 3, pos.x + along));
      } else {
        x = (pos.x > 0 ? 1 : -1) * (GROUND_HALF - 1.5 - rng() * 4);
        z = Math.max(-GROUND_HALF + 3, Math.min(GROUND_HALF - 3, pos.z + along));
      }
      if (!isInsideBuilding(x, z) && !isInsideBar(x, z) &&
          !swimWaterAt(x, z) && !isInsideWater(x, z)) {
        return new THREE.Vector3(x, 0, z);
      }
    }
    return pos.clone();
  }
  // party animation: bounce to the beat, wave the arms, step in place
  function updateDancer(npc, dt) {
    npc.anim += dt * 2.2;
    const a = npc.anim;
    npc.danceT = (npc.danceT === undefined ? 1 : npc.danceT) - dt;
    if (npc.danceT <= 0) {
      npc.danceT = 1.5 + rng() * 2.5;
      npc.danceFace = npc.facing + (rng() * 2 - 1) * 1.4;
    }
    npc.facing = angLerp(npc.facing, npc.danceFace || 0, Math.min(1, dt * 2.5));
    const u = npc.group.userData;
    npc.group.position.set(npc.pos.x, 0.32 + Math.abs(Math.sin(a * 2)) * 0.14, npc.pos.z);
    npc.group.rotation.y = npc.facing;
    npc.group.rotation.z = Math.sin(a * 2) * 0.07;
    u.armL.rotation.x = -1.95 + Math.sin(a * 2.1) * 0.45;
    u.armR.rotation.x = -1.95 + Math.sin(a * 2.1 + 1.5) * 0.45;
    u.armL.rotation.z = Math.sin(a * 1.2) * 0.5;
    u.armR.rotation.z = -Math.sin(a * 1.2 + 0.6) * 0.5;
    u.legL.rotation.x = Math.sin(a * 2) * 0.32;
    u.legR.rotation.x = -Math.sin(a * 2) * 0.32;
    if (u.head) u.head.rotation.y = Math.sin(a * 0.7) * 0.35;
    updateFace(npc, dt);
  }
  function updateSwimmer(npc, dt) {
    const water = swimWaterAt(npc.pos.x, npc.pos.z);
    if (!water) {                         // shoved onto land (e.g. tests): stand still
      npc.group.position.set(npc.pos.x, 0, npc.pos.z);
      npc.group.rotation.set(0, npc.facing, 0);
      return;
    }
    // flee from a nearby shark, otherwise paddle around
    let threat = null, td = 12 * 12;
    for (let i = 0; i < sharks.length; i++) {
      const d = sharks[i].pos.distanceToSquared(npc.pos);
      if (d < td) { td = d; threat = sharks[i]; }
    }
    let mx = 0, mz = 0, moving = false, speed = 1.9;
    if (threat) {
      const dir = new THREE.Vector3(npc.pos.x - threat.pos.x, 0, npc.pos.z - threat.pos.z);
      if (dir.lengthSq() > 0.001) dir.normalize();
      mx = dir.x; mz = dir.z; moving = true; speed = 3.6;
    } else {
      npc.wanderTimer = (npc.wanderTimer || 0) - dt;
      if (!npc.target || npc.wanderTimer <= 0 || npc.pos.distanceTo(npc.target) < 1) {
        npc.target = randomWaterPoint(npc.pos, 9);
        npc.wanderTimer = 2 + rng() * 5;
      }
      const dir = npc.target.clone().sub(npc.pos).setY(0);
      if (dir.lengthSq() > 0.01) { dir.normalize(); mx = dir.x; mz = dir.z; moving = true; }
    }
    if (moving) {
      const nx = npc.pos.x + mx * speed * dt;
      const nz = npc.pos.z + mz * speed * dt;
      if (swimWaterAt(nx, nz)) { npc.pos.x = nx; npc.pos.z = nz; }
      else { npc.target = null; }
      npc.facing = Math.atan2(mx, mz);
      npc.anim += dt * (speed * 1.6);
      clampToWorld(npc.pos);
    }
    const w = swimWaterAt(npc.pos.x, npc.pos.z) || water;
    npc.group.position.set(
      npc.pos.x,
      w.level - 1.05 + Math.sin(npc.anim * 1.2) * 0.05,
      npc.pos.z
    );
    npc.group.rotation.set(0, npc.facing, 0);
    const a = npc.anim;
    npc.group.userData.legL.rotation.x = moving ? Math.sin(a) * 0.35 : 0;
    npc.group.userData.legR.rotation.x = moving ? -Math.sin(a) * 0.35 : 0;
    npc.group.userData.armR.rotation.x = -1.0 + Math.sin(a) * 0.5;
    npc.group.userData.armL.rotation.x = -1.0 - Math.sin(a) * 0.5;
    npc.group.userData.armL.rotation.z = 0;
  }

  function spawnWorld() {
    if (spawned) return;
    buildRoutes();
    // CROWDED streets: 80 civilians walking around
    for (let i = 0; i < 80; i++) makeNPC('civilian');
    // and a heavy police PRESENCE on foot (24 beat cops)
    for (let i = 0; i < 24; i++) makeNPC('police');
    // busy traffic across all cities
    const CAR_COLORS = [0xc23a2e, 0x2e6fc2, 0x2e8f4a, 0xc2a02e, 0x7a3ac2, 0xdfe3e6, 0x8a2a4a];
    const CAR_KINDS = ['sedan', 'sedan', 'sedan', 'sport', 'suv', 'taxi'];
    for (let i = 0; i < 12; i++) makeCarEntity({ color: CAR_COLORS[(rng() * CAR_COLORS.length) | 0], kind: CAR_KINDS[(rng() * CAR_KINDS.length) | 0] });
    // police cruisers get a response rank used by the wanted-level escalation
    let beatIdx = 0;
    for (let i = 0; i < 8; i++) {
      const c = makeCarEntity({ isPolice: true, kind: 'police', color: 0xe8e8e8, speed: 9.5 });
      c.beatIdx = beatIdx++;
    }
    for (let i = 0; i < 14; i++) makeCarEntity({
      color: [0x2e6fc2, 0x2e8f4a, 0xc2a02e, 0x4a4a52, 0x8a5a2e][(rng() * 5) | 0],
      kind: CAR_KINDS[(rng() * CAR_KINDS.length) | 0], speed: 6 + rng() * 3
    });

    // ---- street gangs: three turfs of armed thugs guarding their block ----
    for (let t = 0; t < 3; t++) {
      const turf = randomWalkablePoint();
      for (let i = 0; i < 4; i++) {
        const n = makeNPC('enemy');
        let p = null;
        for (let k = 0; k < 30 && !p; k++) {
          const cand = randomLocalPoint(turf, 10);
          if (!isInsideBuilding(cand.x, cand.z) && !isInsideWater(cand.x, cand.z)) p = cand;
        }
        if (p) { n.pos.copy(p); n.group.position.copy(p); }
        n.home = n.pos.clone();
      }
    }
    // river life: cruisers & fishing boats running BOTH directions under the bridges
    for (let k = 0; k < 11; k++) {
      const x = -CENTER + 10 + k * ((CENTER * 2 - 20) / 10);
      makeBoat(k % 2 === 0 ? 1 : -1, x);
    }

    // people swimming in the river and along the beaches
    for (let i = 0; i < 8; i++) {
      const n = makeNPC('civilian');
      n.swim = true;
      n.state = 'swim';
      n.speed = 1.9;
      n.target = null;
      n.wanderTimer = 0;
      let p = null;
      for (let t = 0; t < 60 && !p; t++) {
        let x, z;
        if (i < 3) {
          x = -CENTER + 20 + rng() * (CITY - 40);
          z = RIVER_Z + (rng() * 2 - 1) * (RIVER_HALF - 3);
        } else {
          const side = (i - 3) % 4;
          const spread = (rng() * 2 - 1) * CENTER;
          if (side === 0) { x = spread; z = -(GROUND_HALF + 6 + rng() * 14); }
          else if (side === 1) { x = spread; z = GROUND_HALF + 6 + rng() * 14; }
          else if (side === 2) { x = GROUND_HALF + 6 + rng() * 14; z = spread; }
          else { x = -GROUND_HALF - 6 - rng() * 14; z = spread; }
        }
        if (swimWaterAt(x, z)) p = new THREE.Vector3(x, 0, z);
      }
      if (p) { n.pos.copy(p); n.group.position.copy(p); }
    }

    // sharks: river monsters near the bridges + offshore patrols
    // (never ON a bridge lane — the deck is dry land, not swimmable water)
    const riverSharkX = [cx(2), cx(5), cx(9)];
    for (let i = 0; i < 3; i++) {
      let placed = null;
      for (let t = 0; t < 40 && !placed; t++) {
        const x = riverSharkX[i] + (rng() * 2 - 1) * 8;
        const z = RIVER_Z + (rng() * 2 - 1) * 6;
        if (swimWaterAt(x, z)) placed = spawnSharkAt(x, z, 'river');
      }
      if (!placed) {                       // fallback: right beside the bridge lane
        for (let off = 7.5; off <= 12 && !placed; off += 1.5) {
          const x = riverSharkX[i] + (i % 2 ? off : -off);
          if (swimWaterAt(x, RIVER_Z)) placed = spawnSharkAt(x, RIVER_Z, 'river');
        }
      }
    }
    spawnSharkAt((rng() * 2 - 1) * CENTER, -(GROUND_HALF + 12), 'sea');
    spawnSharkAt((rng() * 2 - 1) * CENTER, GROUND_HALF + 12, 'sea');
    spawnSharkAt(GROUND_HALF + 12, (rng() * 2 - 1) * CENTER, 'sea');
    // every OTHER bridge crossing gets its own river guard too — drawn from a
    // private RNG stream so the main world generation stays byte-identical
    const sharkRng = mulberry32(987654321);
    for (let i = 0; i <= N; i++) {
      if (i === 2 || i === 5 || i === 9) continue;   // already guarded above
      let placed = null;
      for (let t = 0; t < 40 && !placed; t++) {
        const x = cx(i) + (sharkRng() * 2 - 1) * 8;
        const z = RIVER_Z + (sharkRng() * 2 - 1) * 6;
        if (swimWaterAt(x, z)) placed = spawnSharkAt(x, z, 'river', sharkRng);
      }
      if (!placed) {                       // fallback: right beside the bridge lane
        for (let off = 7.5; off <= 12 && !placed; off += 1.5) {
          const x = cx(i) + (i % 2 ? off : -off);
          if (swimWaterAt(x, RIVER_Z)) placed = spawnSharkAt(x, RIVER_Z, 'river', sharkRng);
        }
      }
    }

    // ---- the beach bar party: a packed dance floor with bikini beauties ----
    if (bar) {
      const partyRng = mulberry32(20241124);
      for (let i = 0; i < 12; i++) {
        const n = makeNPC('civilian', i < 5 ? 'bikini' : 'party');
        n.dance = true; n.state = 'dance';
        n.pos.set(bar.x + (partyRng() * 2 - 1) * 5.5, 0, bar.z + (partyRng() * 2 - 1) * 3);
        n.group.position.copy(n.pos);
        n.home = n.pos.clone(); n.target = null;
        n.mood = partyRng() < 0.5 ? 'happy' : 'laugh';
      }
      // bikini girls strolling along the sandy shore
      for (let i = 0; i < 5; i++) {
        const n = makeNPC('civilian', 'bikini');
        n.beach = true;
        const p = randomBeachPoint(partyRng);
        if (p) { n.pos.copy(p); n.group.position.copy(p); n.home = p.clone(); }
        n.target = null; n.wanderTimer = 0;
      }
    }

    // ---- walk-in interior bars: bikini dancers + party crowd inside the rooms ----
    for (const ib of interiorBars) spawnInteriorPatrons(ib);

    spawned = true;
  }

  /* ---------------- Graphics style switch (VICE CITY <-> FREELIFE voxel) ---------------- */
  function applyWorldStyle(style) {
    if (style !== 'modern' && style !== 'neon' && style !== 'night') return;
    if (settings.style === style) { toast('Phong cách đồ họa: ' + STYLE_LABEL[style]); return; }
    settings.style = style;
    saveSettings();

    const pv = player ? {
      hp: player.hp, armor: player.armor, wanted: player.wanted, weapon: player.weapon,
      ammo2: player.ammoStore[2], ammo3: player.ammoStore[3], ammo4: player.ammoStore[4]
    } : null;
    const oldPlayer = player;                       // keep the object identity: tests hold a reference

    // tear down every entity and the whole city, then rebuild in the new style
    const drop = (obj) => { if (obj && obj.parent) obj.parent.remove(obj); };
    NPCs.forEach(n => { drop(n.group); if (n.bubble) drop(n.bubble); });
    if (mission) clearMissionMarkers();
    mission = null;                       // the marked car/point died with the old world
    cars.forEach(c => drop(c.group));
    boats.forEach(b => drop(b.group));
    sharks.forEach(s => drop(s.group));
    bombs.forEach(b => drop(b.mesh));
    tracers.forEach(t => drop(t.mesh));
    smokes.forEach(t => drop(t.mesh));
    bloodParticles.forEach(p => drop(p.mesh));
    splats.forEach(p => drop(p.mesh));
    corpses.forEach(n => drop(n.group));
    if (player) { if (player.inCar) { player.inCar.driver = null; player.inCar = null; } drop(player.group); }
    while (worldGroup.children.length) worldGroup.remove(worldGroup.children[0]);
    NPCs.length = 0; cars.length = 0; boats.length = 0; sharks.length = 0;
    corpses.length = 0; bloodParticles.length = 0; splats.length = 0;
    tracers.length = 0; smokes.length = 0; bombs.length = 0; hittables.length = 0;
    buildingBoxes.length = 0; buildingMeshes.length = 0;
    bridgeDecks.length = 0;
    player = null;
    built = false; spawned = false;
    beatRankCache = null;

    buildCity();
    buildRoutes();
    spawnWorld();
    buildMinimapStatic();
    updateMinimap();
    snapTimePalette();
    applyWeather();

    // rebuild the hero but transplant the fresh state into the ORIGINAL object
    // so outside references (tests, hooks) keep working
    const fresh = createPlayer();
    player = oldPlayer || fresh;
    if (oldPlayer) for (const k of Object.keys(fresh)) player[k] = fresh[k];
    player.group.position.copy(player.pos);
    player.group.rotation.y = 0;
    if (pv) {
      player.hp = pv.hp; player.armor = pv.armor; player.wanted = pv.wanted;
      player.ammoStore[2] = pv.ammo2; player.ammoStore[3] = pv.ammo3; player.ammoStore[4] = pv.ammo4;
      if (pv.weapon !== 0) setPlayerWeapon(pv.weapon);
    }
    camYaw = 0; camPitch = -0.17; camDist = CAM_DIST; camInit = false;
    snapCamera();
    updateHealthHUD(); updateWantedHUD(); updateWeaponHUD(); updateAmmoHUD();
    updateShotsHUD(); updateReloadHUD(); updateVehicleHUD();
    startMission();                       // missions live in the new world too
    toast('Phong cách đồ họa: ' + STYLE_LABEL[style]);
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
    } else if (npc.type === 'enemy') {
      npc.state = 'attack'; npc.alertedT = 10; npc.path = [];
    }
    
    if (npc.hp <= 0) killNPC(npc, dir);
    else if (npc.type === 'civilian') { npc.state = 'flee'; npc.fleeDir.copy(dir).setY(0).normalize(); npc.fleeT = 4; }
  }

  function killNPC(npc, dir) {
    npc.dead = true;
    if (npc.bubble) npc.bubble.visible = false;
    npc.deathT = 0;
    Sfx.die();
    spawnBlood(npc.pos.clone().setY(1.0), dir, 20);
    spawnSplat(npc.pos.clone());
    // mark meshes non-hittable
    npc.group.userData.parts.forEach(p => { const i = hittables.indexOf(p); if (i >= 0) hittables.splice(i, 1); });
    corpses.push(npc);
    // gang-hunt missions count every dead thug
    if (npc.type === 'enemy' && mission && mission.active && mission.type === 'kill') {
      mission.progress = Math.min(mission.need, mission.progress + 1);
      floatTextWorld('+1 MỤC TIÊU (' + mission.progress + '/' + mission.need + ')', npc.pos.x, npc.pos.y + 2.3, npc.pos.z, '#7df');
      updateMissionHUD();
    }
  }

  function playerTakeDamage(dmg, from) {
    if (player.dead) return;
    if (player.rollT > 0) return;                 // mid-roll dodge: the shots whiz past
    if (player.armor > 0) {                       // armor soaks damage before HP
      const absorbed = Math.min(player.armor, dmg);
      player.armor -= absorbed;
      dmg -= absorbed;
    }
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
    if (!player || player.dead || player.swimming || !canFire()) return;
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
    if (player.inCar) {
      const c = player.inCar;
      const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
      const rx = -Math.cos(c.heading), rz = Math.sin(c.heading);   // driver-side window (screen-right)
      _muzzleW.set(c.pos.x + rx * 0.55 + fx * 0.95, 1.35, c.pos.z + rz * 0.55 + fz * 0.95);
    } else {
      player.group.localToWorld(_muzzleW.copy(player.muzzle.position));
    }
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
    for (let i = 0; i < hittables.length; i++) {
      const h = hittables[i];
      if (player.inCar && h.userData.owner === player.inCar) continue;   // no self-hits from the car
      _shotTargets.push(h);
    }
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
      if (hitOwner.type === 'civilian' || hitOwner.type === 'police' || hitOwner.type === 'enemy') {
        const dmg = hitHead ? w.headDmg : w.dmg;
        damageNPC(hitOwner, dmg, hitPoint, dir);
        // shooting a gangster barely alarms the cops — a true self-defense
        triggerCrime(hitOwner.type === 'police' ? 1.6 : (hitOwner.type === 'enemy' ? 0.35 : 0.9));
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
        triggerCrime(npc.type === 'police' ? 1.6 : (npc.type === 'enemy' ? 0.35 : 0.9));
      } else if (npc.type === 'civilian') {
        triggerCrime(0.7);
      } else if (npc.type === 'police') {
        triggerCrime(1.2);
      } else if (npc.type === 'enemy') {
        triggerCrime(0.2);     // brawling with a thug barely alerts the cops
      }
    });
    if (!hitAny) {
      // swing whoosh visual: brief arm anim handled by cooldown
      if (isKnife) Sfx.click();
    } else {
      hitMark();
    }
  }


  /* ---------------- BOM: thrown explosive grenade ---------------- */
  const bombs = [];
  const BOMB_RADIUS = 6.5;        // blast radius in metres
  const BOMB_FUSE = 2.0;          // seconds from throw to BOOM
  const BOMB_GRAV = 22;           // grenade gravity for the lobbed arc

  function makeBombMesh() {
    const g = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), mat(0x26262c));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.08, 6), mat(0x8f8f8f));
    cap.position.y = 0.21;
    const fuse = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.025), mat(0xd9c27a));
    fuse.position.set(0.05, 0.3, 0); fuse.rotation.z = 0.55;
    g.add(bodyM, cap, fuse);
    g.userData.body = bodyM;
    return g;
  }

  function throwBomb() {
    if (!player || player.dead || player.swimming || player.inCar) return;
    if (!canFire() || player.attackCd > 0) return;
    if (getAmmo(4) <= 0) {
      Sfx.empty();
      toast('HẾT BOM — gõ cheat reload để nạp thêm');
      player.attackCd = 0.5;
      return;
    }
    player.attackCd = 0.85;
    setAmmo(4, getAmmo(4) - 1);
    player.meleeT = player.meleeTotal = 0.34;    // arm-swing throw animation
    const a = aimInfo();
    const from = player.pos.clone().setY(1.25);
    const tgt = a.point.clone();
    let dx = tgt.x - from.x, dz = tgt.z - from.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 34) { const k = 34 / dist; dx *= k; dz *= k; }   // max lob distance
    const T = Math.max(0.42, Math.min(1.25, Math.hypot(dx, dz) / 12));
    const vel = new THREE.Vector3(dx / T, 0.5 * BOMB_GRAV * T + (tgt.y - from.y) / T, dz / T);
    const mesh = makeBombMesh();
    mesh.position.copy(from);
    scene.add(mesh);
    bombs.push({ mesh, pos: from.clone(), vel, fuse: BOMB_FUSE, spin: rng() * Math.PI * 2 });
    player.shotsFired = (player.shotsFired || 0) + 1;
    pulseAmmo(); updateAmmoHUD(); updateShotsHUD();
    Sfx.click();
    toast('💣 THẢ BOM — chạy ra chỗ khác!');
  }

  function updateBomb(b, dt) {
    b.vel.y -= BOMB_GRAV * dt;
    b.pos.addScaledVector(b.vel, dt);
    clampToWorld(b.pos);
    const water = swimWaterAt(b.pos.x, b.pos.z);
    if (water && b.pos.y <= water.level + 0.1) {   // splashdown over the river/sea
      b.pos.y = water.level + 0.1;
      explodeBomb(b);
      return;
    }
    const floorY = groundY(b.pos.x, b.pos.z) + 0.2;
    if (b.pos.y <= floorY) {                        // lands / small bounce on the ground or bridge deck
      b.pos.y = floorY;
      b.vel.y = -b.vel.y * 0.35;
      b.vel.x *= 0.55; b.vel.z *= 0.55;
      if (Math.abs(b.vel.y) < 0.4) b.vel.set(0, 0, 0);
    }
    b.fuse -= dt;
    b.spin += dt * 6;
    b.mesh.position.copy(b.pos);
    b.mesh.rotation.set(b.spin, b.spin * 0.7, 0);
    if (b.fuse < 0.8) {                             // blinking fuse warning
      const on = Math.floor(b.fuse * 16) % 2 === 0;
      if (b.mesh.userData.body) b.mesh.userData.body.material.color.setHex(on ? 0xff4a30 : 0x26262c);
    }
    if (b.fuse <= 0) explodeBomb(b);
  }

  function explodeBomb(b) {
    const i = bombs.indexOf(b);
    if (i >= 0) bombs.splice(i, 1);
    if (b.mesh.parent) scene.remove(b.mesh);
    const p = b.pos.clone();

    Sfx.boom();
    const boom = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.95 }));
    boom.position.copy(p);
    scene.add(boom);
    tracers.push({ mesh: boom, life: 0.55, t: 0, grow: true });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 1 }));
    core.position.copy(p);
    scene.add(core);
    tracers.push({ mesh: core, life: 0.35, t: 0, grow: true });
    for (let k = 0; k < 12; k++) spawnSmoke(p.clone().add(new THREE.Vector3((rng() - 0.5) * 1.6, rng() * 1.3, (rng() - 0.5) * 1.6)), 1 + rng());
    spawnSparks(p, new THREE.Vector3(0, 1, 0));
    spawnScorch(new THREE.Vector3(p.x, 0, p.z));

    // everybody inside the blast radius gets it
    NPCs.forEach(n => {
      if (n.dead) return;
      const d = n.pos.distanceTo(p);
      if (d < BOMB_RADIUS) damageNPC(n, Math.max(25, 140 - d * 18), n.pos.clone().setY(1.1), n.pos.clone().sub(p).normalize());
    });
    // cars near the blast catch fire and explode a moment later
    cars.forEach(c => {
      if (c.dead) return;
      if (c.group.position.distanceTo(p) < BOMB_RADIUS && c.fuseT === undefined) c.fuseT = 0.2 + rng() * 0.4;
    });
    // the hero can blow himself up too — stand back
    if (!player.dead) {
      const pd = player.pos.distanceTo(p);
      if (pd < BOMB_RADIUS) playerTakeDamage(Math.max(10, 110 - pd * 16), p);
    }
    triggerCrime(1.2);
    toast('💥 BOM NỔ!');
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

  // cars are solid: push overlapping bodies apart; the player's car can also
  // ram them hard enough to break glass, stop the victim and set it on fire
  const _carSep = new THREE.Vector3();
  function collideCars(mover, dt, damaging) {
    const impactSpeed = Math.abs(mover.curSpeed);
    for (let i = 0; i < cars.length; i++) {
      const o = cars[i];
      if (o === mover || o.dead) continue;
      _carSep.set(mover.pos.x - o.pos.x, 0, mover.pos.z - o.pos.z);
      let d = _carSep.length();
      if (d < 0.001) { _carSep.set(1, 0, 0); d = 0.001; }
      if (d >= 2.2) continue;
      // solid bodies: separate both cars
      const push = (2.2 - d) / 2;
      _carSep.normalize();
      mover.pos.addScaledVector(_carSep, push);
      o.pos.addScaledVector(_carSep, -push);
      clampToWorld(mover.pos);
      clampToWorld(o.pos);
      if (!damaging || impactSpeed <= 5) continue;
      o.crashCd = (o.crashCd || 0) - dt;
      if (o.crashCd > 0) continue;
      o.crashCd = 0.5;
      o.crashDmg = (o.crashDmg || 0) + impactSpeed * 0.4;
      Sfx.metalHit();
      spawnSparks(mover.pos.clone().setY(0.8), new THREE.Vector3(Math.sin(mover.heading), 0, Math.cos(mover.heading)));
      spawnSmoke(new THREE.Vector3(
        o.group.position.x + Math.sin(o.heading) * 1.3, 1.0,
        o.group.position.z + Math.cos(o.heading) * 1.3), 0.5);
      if (o.crashDmg >= 2.2) {
        breakCarGlass(o);
        o.stunT = Math.max(o.stunT || 0, 1.2);       // the rammed car comes to a stop
      }
      if (o.crashDmg >= 4 && o.fuseT === undefined) { o.fuseT = 3.0; Sfx.warn(); }
    }
  }

  // windshield + side windows shatter into flying shards
  function breakCarGlass(car) {
    if (car.glassBroken) return;
    car.glassBroken = true;
    const u = car.group.userData;
    [u.cabin, u.sideL, u.sideR, u.rearGlass].forEach(m => { if (m) m.visible = false; });
    if (u.cabin) {
      const hi = hittables.indexOf(u.cabin);
      if (hi >= 0) hittables.splice(hi, 1);
    }
    const p = car.pos.clone().setY(1.15);
    Sfx.glass();
    for (let i = 0; i < 14; i++) {
      const shard = new THREE.Mesh(
        new THREE.PlaneGeometry(0.06 + rng() * 0.09, 0.06 + rng() * 0.09),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xcfeef4 : 0x8fc8d8, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
      shard.position.copy(p);
      shard.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      bloodParticles.push({ mesh: shard, vel: new THREE.Vector3((rng() - 0.5) * 6, 1.5 + rng() * 3.5, (rng() - 0.5) * 6), life: 0.9 + rng() * 0.6, t: 0 });
      scene.add(shard);
    }
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

    if (npc.swim) { updateSwimmer(npc, dt); return; }

    // party people keep dancing inside the beach bar — unless a wanted hero
    // barges in, then the whole dance floor scatters
    if (npc.dance) {
      if (player && !player.dead && player.wanted > 0 && npc.pos.distanceTo(player.pos) < 10) {
        npc.dance = false;
        npc.state = 'flee';
        npc.fleeDir = npc.pos.clone().sub(player.pos).setY(0).normalize();
        npc.fleeT = 6;
      } else {
        updateDancer(npc, dt);
        return;
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
    } else if (npc.type === 'enemy') {
      // ---- gang thugs: hold their turf, then rush & gun down the hero ----
      const d = player && !player.dead ? npc.pos.distanceTo(player.pos) : 1e9;
      npc.alertedT = Math.max(0, (npc.alertedT || 0) - dt);
      if (npc.state === 'gang') {
        // idly hang around the turf, keeping an eye on the street
        if (!npc.target || npc.wanderTimer <= 0 || npc.pos.distanceTo(npc.target) < 1.2) {
          npc.target = npc.home ? randomLocalPoint(npc.home, 12) : randomLocalPoint(npc.pos, 8);
          npc.wanderTimer = 2 + rng() * 6;
        }
        npc.wanderTimer -= dt;
        moveDir.copy(npc.target).sub(npc.pos).setY(0);
        npc.speed = 1.7;
        if (d < 14) {
          npc.state = 'attack'; npc.path = []; npc.alertedT = 8;
          if (performance.now() - lastGangAlert > 2500) {
            lastGangAlert = performance.now();
            if (mission && mission.active && mission.type === 'kill') toast('Băng đảng phát hiện bạn!');
            Sfx.warn();
          }
        }
      } else if (npc.state === 'attack') {
        npc.losTimer -= dt;
        if (npc.losTimer <= 0) { npc.losTimer = 0.25; npc.los = hasLOS(npc.pos, player.pos); }
        if (d > 50) { npc.state = 'return'; npc.path = []; }
        else if (npc.los) {
          moveDir.copy(player.pos).sub(npc.pos).setY(0);
          if (d > 9) {
            npc.speed = 4.3;                     // close the distance
          } else {
            moveDir.set(0, 0, 0);                // stand and shoot
            npc.speed = 0;
            npc.shootCd -= dt;
            if (npc.shootCd <= 0) { npc.shootCd = 1.4 + rng() * 1.2; enemyShoot(npc); }
          }
        } else {
          // lost sight: jog toward the last known position
          moveDir.copy(player.pos).sub(npc.pos).setY(0);
          npc.speed = 4.3;
        }
      } else if (npc.state === 'return') {
        if (!npc.home) { npc.state = 'gang'; npc.target = null; }
        else {
          moveDir.copy(npc.home).sub(npc.pos).setY(0);
          npc.speed = 3.2;
          if (npc.pos.distanceTo(npc.home) < 2) { npc.state = 'gang'; npc.target = null; npc.hp = npc.maxHp; }
          else if (d < 14) { npc.state = 'attack'; npc.path = []; }
        }
      } else {
        npc.state = 'gang'; npc.target = null;
      }
      moving = true;
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
            npc.target = npc.beach ? beachPointNear(npc.pos, 30) : randomLocalPoint(npc.pos, 6);
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
      // smooth acceleration to the desired gait instead of teleporting to it
      if (npc.curSpeed === undefined) npc.curSpeed = 0;
      npc.curSpeed += (npc.speed - npc.curSpeed) * Math.min(1, dt * 4);
      const px0 = npc.pos.x, pz0 = npc.pos.z;
      npc.pos.addScaledVector(moveDir, npc.curSpeed * dt);
      // keep on walkable ground (block sidewalks / roads), avoid buildings and
      // the open river/sea — the raised bridge deck is dry ground and allowed
      const intoWater = isInsideWater(npc.pos.x, npc.pos.z) && groundY(npc.pos.x, npc.pos.z) < 0.5;
      if (isInsideBuilding(npc.pos.x, npc.pos.z) || intoWater) {
        npc.pos.sub(moveDir.clone().multiplyScalar(npc.curSpeed * dt * 2));
        if (npc.type !== 'police') { npc.target = null; }
      }
      clampToWorld(npc.pos);
      // fluid turning: ease the body toward the walk direction, never snap
      const wantFacing = Math.atan2(moveDir.x, moveDir.z);
      npc.facing = angLerp(npc.facing, wantFacing, Math.min(1, dt * 7));
      npc.anim += dt * (npc.curSpeed * 2.2);
      // walk bob + drift detection (blocked NPCs re-pick a route instead of freezing)
      npc.bob = Math.abs(Math.sin(npc.anim * 2)) * 0.035;
      const moved2 = (npc.pos.x - px0) * (npc.pos.x - px0) + (npc.pos.z - pz0) * (npc.pos.z - pz0);
      if (moved2 < 0.00002) {
        npc.stuckT = (npc.stuckT || 0) + dt;
        if (npc.stuckT > 1.2 && npc.type !== 'police') { npc.target = null; npc.stuckT = 0; }
      } else {
        npc.stuckT = 0;
      }
    } else {
      npc.curSpeed = 0;
      npc.bob = 0;
    }
    // cars are solid for pedestrians too: walk around, never through —
    // when bumped, turn away from the car instead of pushing into it
    let pushed = false, pushX = 1, pushZ = 0;
    for (let ci = 0; ci < cars.length; ci++) {
      const c = cars[ci];
      if (c.dead) continue;
      const dx = npc.pos.x - c.pos.x, dz = npc.pos.z - c.pos.z;
      const dd = Math.hypot(dx, dz);
      const minD = 1.25;
      if (dd > 0.001 && dd < minD) {
        npc.pos.x = c.pos.x + dx / dd * minD;
        npc.pos.z = c.pos.z + dz / dd * minD;
        pushed = true; pushX = dx / dd; pushZ = dz / dd;
      } else if (dd <= 0.001) {
        npc.pos.x = c.pos.x + minD;
        pushed = true;
      }
    }
    if (pushed && npc.type !== 'police' && npc.state !== 'flee') {
      npc.target = new THREE.Vector3(npc.pos.x + pushX * 3.5, 0, npc.pos.z + pushZ * 3.5);
      npc.wanderTimer = 1.5;
    }
    npc.group.position.set(npc.pos.x, npc.pos.y, npc.pos.z);
    npc.group.rotation.y = npc.facing;
    // pedestrians glance at the hero when he strolls close by; otherwise
    // they scan the street around them instead of staring stiffly ahead
    const nearHero = npc.type === 'civilian' && npc.state !== 'flee' && player && !player.dead &&
      npc.pos.distanceTo(player.pos) < 8;
    if (nearHero) {
      let wantHead = Math.atan2(player.pos.x - npc.pos.x, player.pos.z - npc.pos.z) - npc.facing;
      while (wantHead > Math.PI) wantHead -= Math.PI * 2;
      while (wantHead < -Math.PI) wantHead += Math.PI * 2;
      const u = npc.group.userData;
      if (u.head) u.head.rotation.y = Math.max(-0.9, Math.min(0.9, wantHead));
    } else {
      const u = npc.group.userData;
      if (u.head) {
        // idle: look around; walking: look along the turn with a gentle sway
        u.head.rotation.y = moving
          ? Math.sin(npc.anim * 0.9) * 0.18
          : Math.sin((npc.idleT || 0) * 0.8 + (npc.pathI || 0)) * 0.5;
      }
    }
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
      // natural walk: torso rocks gently with the stride
      npc.group.rotation.z = Math.sin(npc.anim) * 0.05;
    }
    updateFace(npc, dt);
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

  // gang pistol fire: weaker than police but the thugs shoot from up close
  function enemyShoot(npc) {
    npc.shootT = 0.35;
    const from = npc.pos.clone().setY(1.35);
    const to = player.pos.clone().setY(1.0);
    const dir = to.clone().sub(from).normalize();
    dir.x += (rng() - 0.5) * 0.18; dir.z += (rng() - 0.5) * 0.18; dir.normalize();
    Sfx.shoot();
    spawnMuzzle(from);
    spawnTracer(from, player.pos.clone().setY(1.0), 0xff7a5a);
    const dist = npc.pos.distanceTo(player.pos);
    const hitChance = Math.max(0.18, 1 - dist / 22);
    if (rng() < hitChance) playerTakeDamage(4 + rng() * 5, npc.pos);
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

    // traffic queues: brake behind the car ahead instead of driving through it
    let blocked = false, aheadDist = 99;
    for (let i = 0; i < cars.length; i++) {
      const o = cars[i];
      if (o === car || o.dead) continue;
      const dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z;
      const dd = Math.hypot(dx, dz);
      if (dd > 6 || dd < 0.4) continue;
      const dot = (dx * Math.sin(car.heading) + dz * Math.cos(car.heading)) / dd;
      if (dot > 0.55) { blocked = true; if (dd < aheadDist) aheadDist = dd; }
    }
    if (car.stunT > 0) { car.stunT -= dt; target = 0; rate = 6; }      // rammed: grind to a halt
    else if (blocked) {
      car.blockedT = (car.blockedT || 0) + dt;
      if (aheadDist < 2.6) target = 0;                                 // right on their bumper
      else target = Math.min(target, car.maxSpeed * 0.3);              // crawl up behind
      rate = 5;
    } else {
      car.blockedT = 0;
    }
    car.curSpeed += (target - car.curSpeed) * Math.min(1, dt * rate);
    if ((playerNear || (blocked && aheadDist < 2.6)) && car.curSpeed < 0.02) car.curSpeed = 0;

    if (car.curSpeed > 0.01) {
      steerToward(car, wx, wz, dt, (car.blockedT || 0) > 2.2, 2.4);
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

  // global separation sweep: run AFTER every car has moved so queued traffic
  // can never end a tick overlapping (a push can shove one car into another)
  function separateCars() {
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < cars.length; i++) {
        const a = cars[i];
        if (a.dead) continue;
        for (let j = i + 1; j < cars.length; j++) {
          const b = cars[j];
          if (b.dead) continue;
          _carSep.set(a.pos.x - b.pos.x, 0, a.pos.z - b.pos.z);
          let d = _carSep.length();
          if (d < 0.001) { _carSep.set(1, 0, 0); d = 0.001; }
          if (d >= 2.2) continue;
          const push = (2.2 - d) / 2;
          _carSep.normalize();
          a.pos.addScaledVector(_carSep, push);
          b.pos.addScaledVector(_carSep, -push);
          clampToWorld(a.pos);
          clampToWorld(b.pos);
        }
      }
    }
    // pedestrians stay clear of the solid car bodies too (after cars moved)
    for (let n = 0; n < NPCs.length; n++) {
      const npc = NPCs[n];
      if (npc.dead || npc.swim) continue;
      for (let j = 0; j < cars.length; j++) {
        const c = cars[j];
        if (c.dead) continue;
        const dx = npc.pos.x - c.pos.x, dz = npc.pos.z - c.pos.z;
        const dd = Math.hypot(dx, dz);
        if (dd > 0.001 && dd < 1.25) {
          npc.pos.x = c.pos.x + dx / dd * 1.25;
          npc.pos.z = c.pos.z + dz / dd * 1.25;
        } else if (dd <= 0.001) {
          npc.pos.x = c.pos.x + 1.25;
        }
      }
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
      if (isInsideBuilding(fx, fz) || carAheadAt(fx, fz)) {
        const lx = car.pos.x + Math.sin(car.heading + 0.9) * ahead;
        const lz = car.pos.z + Math.cos(car.heading + 0.9) * ahead;
        dh = ((isInsideBuilding(lx, lz) || carAheadAt(lx, lz)) ? -1 : 1) * 1.1;   // swing to the free side
      }
    }
    const maxTurn = (turnRate || 2.4) * dt;                  // rad/s ceiling
    car.heading += Math.max(-maxTurn, Math.min(maxTurn, dh));
  }
  function carAheadAt(x, z) {
    for (let i = 0; i < cars.length; i++) {
      const o = cars[i];
      if (o.dead) continue;
      const dx = o.pos.x - x, dz = o.pos.z - z;
      if (dx * dx + dz * dz < 3.2 * 3.2) return true;
    }
    return false;
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
    // stand up straight behind the wheel
    player.crouch = false; player.crawl = false; player.group.scale.set(1, 1, 1);
    player.vy = 0; player.yOff = 0; player.onGround = true;
    player.rollT = 0; player.rollSpin = 0;
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
      toast('Đã lên xe — WASD lái, F xuống xe');
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

  const cheatBuf = [];
  function applyCheat(which) {
    if (!player || player.dead) return;
    if (which === 'health') {
      player.hp = player.maxHp;
      updateHealthHUD();
      toast('CHEAT — MÁU ĐẦY ❤');
    } else if (which === 'armor') {
      player.armor = player.maxArmor;
      updateHealthHUD();
      toast('CHEAT — GIÁP ĐẦY 🛡');
    } else if (which === 'reload') {
      player.ammoStore[2] = MAG_SIZE;
      player.ammoStore[3] = AK_MAG;
      player.ammoStore[4] = BOMB_START;
      player.reloadT = 0;
      updateAmmoHUD(); updateReloadHUD(); updateShotsHUD();
      toast('CHEAT — FULL ĐẠN + BOM MỌI VŨ KHÍ 🔫💣');
    }
    Sfx.warn();
  }
  function cheatType(key) {
    if (!player || player.dead || paused) return;
    if (typeof key !== 'string' || key.length !== 1) return;
    const ch = key.toLowerCase();
    if (ch < 'a' || ch > 'z') return;
    cheatBuf.push(ch);
    if (cheatBuf.length > 24) cheatBuf.shift();
    const buf = cheatBuf.join('');
    if (buf.endsWith('health')) { cheatBuf.length = 0; applyCheat('health'); }
    else if (buf.endsWith('armor')) { cheatBuf.length = 0; applyCheat('armor'); }
    else if (buf.endsWith('reload')) { cheatBuf.length = 0; applyCheat('reload'); }
  }

  function onKey(e, down) {
    if (cheatOpen) return;                 // the cheat console owns the keyboard while open
    keys[e.code] = down;
    if (down) {
      handleKeyPress(e.code);
      if (e.key !== undefined) cheatType(e.key);
    }
  }
  // cycle through the weapon wheel (Open World GTA Style: Q / E)
  function cycleWeapon(dir) {
    if (!player || player.dead || player.inCar || player.swimming) return;
    const n = WEAPONS.length;
    setPlayerWeapon((player.weapon + dir + n) % n);
  }
  function toggleCrouch() {
    if (!player || player.dead || player.inCar || player.swimming) return;
    player.crouch = !player.crouch;
    if (player.crouch) player.crawl = false;
    toast(player.crouch ? 'ĐÃ NGỒI — ấn C để đứng dậy' : 'ĐÃ ĐỨNG DẬY');
    Sfx.click();
  }
  function toggleCrawl() {
    if (!player || player.dead || player.inCar || player.swimming) return;
    player.crawl = !player.crawl;
    if (player.crawl) { player.crouch = false; toast('ĐÃ BÒ SÁT ĐẤT — ấn Z để đứng dậy'); }
    else toast('ĐÃ ĐỨNG DẬY');
    Sfx.click();
  }

  function handleKeyPress(code) {
    if (!player || player.dead) return;
    if (code === 'Digit1' || code === 'Numpad1') setPlayerWeapon(0);
    else if (code === 'Digit2' || code === 'Numpad2') setPlayerWeapon(1);
    else if (code === 'Digit3' || code === 'Numpad3') setPlayerWeapon(2);
    else if (code === 'Digit4' || code === 'Numpad4') setPlayerWeapon(3);
    else if (code === 'Digit5' || code === 'Numpad5') setPlayerWeapon(4);
    else if (code === 'Backquote') openCheatConsole();
    else if (code === 'KeyR') {
      const w = WEAPONS[player.weapon];
      if (w && w.kind === 'melee') toast('Vũ khí cận chiến không cần nạp đạn');
      else { startReload(false); Sfx.click(); }
    }
    else if (code === 'KeyQ') cycleWeapon(-1);       // previous weapon / item
    else if (code === 'KeyE') cycleWeapon(1);        // next weapon / item
    else if (code === 'KeyF') { if (player.inCar) exitCar(); else enterCar(); }   // action / enter vehicle
    else if (code === 'KeyC') toggleCrouch();        // crouch
    else if (code === 'KeyZ') toggleCrawl();         // crawl
    else if (code === 'KeyV') recenterCamera();      // snap the camera back
    else if (code === 'BracketRight') { sensScale = Math.min(3, sensScale * 1.15); settings.sens = sensScale; saveSettings(); syncSettingsUI(); toast('Độ nhạy chuột: ' + Math.round(sensScale * 100) + '%'); Sfx.click(); }
    else if (code === 'BracketLeft') { sensScale = Math.max(0.4, sensScale / 1.15); settings.sens = sensScale; saveSettings(); syncSettingsUI(); toast('Độ nhạy chuột: ' + Math.round(sensScale * 100) + '%'); Sfx.click(); }
    else if (code === 'KeyY') { invertY = !invertY; settings.invertY = invertY; saveSettings(); syncSettingsUI(); toast(invertY ? 'Đảo trục dọc: BẬT' : 'Đảo trục dọc: TẮT'); Sfx.click(); }
    else if (code === 'KeyM') {                      // show mission info
      if (missionPanelOpen) closeMissionPanel();
      else openMissionPanel();
    }
    else if (code === 'Escape') {
      if (missionPanelOpen) closeMissionPanel();
      else if (paused) resumeGame();
      else openPause();
    }
    else if (code === 'KeyT') {
      const order = ['clear', 'cloudy', 'rain', 'storm'];
      const next = order[(order.indexOf(weatherState) + 1) % order.length];
      setWeather(next);
      toast('Thời tiết: ' + WEATHER_STATES[next].label);
      Sfx.click();
    }
    else if (code === 'KeyG') {
      randomizeGameTime(false);
      toast('GIỜ ĐÃ ĐỔI — ' + TIME_PHASES[timePhase]);
      Sfx.click();
    }
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
      let lockWasHeld = false;
      document.addEventListener('pointerlockchange', () => {
        dragLook = false;
        if (document.pointerLockElement === canvas) {
          lockWasHeld = true;
          toast('CHUỘT khoá — ESC để mở MENU tạm dừng');
        } else {
          const justUnlocked = lockWasHeld;
          lockWasHeld = false;
          toast('Đã mở khoá chuột — click để khoá lại');
          if (justUnlocked && !paused && player && !player.dead) openPause();
        }
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
      if (c.dead) continue;
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
    const deckY = groundY(pos.x, pos.z);
    if (dx !== 0) {
      const nx = pos.x + dx;
      if (!buildingBlocked(nx, pos.z, r) && !carBlocked(nx, pos.z, r) && !bridgeRailBlocks(nx, pos.z, deckY)) pos.x = nx;
      else player.vel.x = 0;                       // slide along the wall / bridge railing
    }
    if (dz !== 0) {
      const nz = pos.z + dz;
      if (!buildingBlocked(pos.x, nz, r) && !carBlocked(pos.x, nz, r) && !bridgeRailBlocks(pos.x, nz, deckY)) pos.z = nz;
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
      player.swimming = false;
      player.isMoving = Math.abs(player.inCar.curSpeed) > 1.5;
      driveCar(dt);
      const wc = WEAPONS[player.weapon];
      if (wc && wc.kind === 'gun' && (wc.auto ? mouse.down : mouse.pressed)) fireGun();
      mouse.pressed = false;
      updateTargetHint(dt);
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
    const water = swimWaterAt(player.pos.x, player.pos.z);
    const wasSwimming = player.swimming;
    // The river keeps flowing UNDER the raised bridge decks: a hero who
    // arrives swimming glides beneath the deck and crosses the bridge in the
    // water — he is never yanked up onto the deck to walk. (Approaching the
    // bridge on foot still walks across the deck as before.)
    const underBridgePass = !water && wasSwimming &&
      Math.abs(player.pos.z - RIVER_Z) <= RIVER_HALF &&
      groundY(player.pos.x, player.pos.z) > 0.9;
    player.swimming = !!water || underBridgePass;
    if (water) player.swimLevel = water.level;
    else if (!player.swimming) player.swimLevel = 0;
    if (player.swimming && !wasSwimming) {
      toast('ĐANG BƠI… cẩn thận CÁ MẬP!');
      Sfx.blood();
      player.crouch = false; player.crawl = false;   // stand up to swim
    }
    // stance: crouch and crawl trade speed for a smaller profile
    const stanceMul = player.crawl ? 0.24 : (player.crouch ? 0.48 : 1);
    const maxSpd = player.swimming
      ? (sprinting ? 4.3 : 3.0)
      : player.speed * (sprinting ? player.sprint : 1) * (aimHeld ? 0.65 : 1) * stanceMul;
    // Weighty locomotion: ease toward the target velocity and brake smoothly
    // instead of snapping to full speed the instant a key goes down.
    const tvx = moving ? wx * maxSpd : 0;
    const tvz = moving ? wz * maxSpd : 0;
    const vel = player.vel;
    const accel = player.swimming ? 16 : moving ? (sprinting ? 26 : 40) : 46;
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

    // ---- roll-dodge (Ctrl): forward tumble, a speed kick and brief i-frames ----
    player.rollCd = Math.max(0, player.rollCd - dt);
    if ((keys['ControlLeft'] || keys['ControlRight']) && !player.swimming && !player.crawl &&
        player.rollCd <= 0 && player.onGround && moving) {
      player.rollT = 0.38;
      player.rollCd = 1.1;
      player.rollSpin = 0;
      const rv = Math.hypot(vel.x, vel.z);
      if (rv > 0.3) player.rollDir.set(vel.x / rv, 0, vel.z / rv);
      else player.rollDir.set(wx, 0, wz).normalize();   // fall back to the input direction
      Sfx.click();
    }
    if (player.rollT > 0) {
      player.rollT = Math.max(0, player.rollT - dt);
      player.rollSpin += dt * 17;                    // one full forward tumble
      vel.x = player.rollDir.x * 7.6;                // the dodge itself is a dash
      vel.z = player.rollDir.z * 7.6;
    }

    if (speed > 0.001) {
      moveWithCollision(player.pos, vel.x * dt, vel.z * dt);
      clampToWorld(player.pos);
    }

    // ---- jump (Space): hop with gravity, land back softly ----
    const wantJump = keys['Space'] && !player.swimming && !player.crawl;
    if (wantJump && player.onGround && !player.jumpLock) {
      player.vy = 6.6;
      player.onGround = false;
      player.jumpLock = true;
      Sfx.jump();
    }
    if (!keys['Space']) player.jumpLock = false;
    if (!player.onGround) {
      player.vy -= 24 * dt;
      player.yOff += player.vy * dt;
      if (player.yOff <= 0) {
        player.yOff = 0; player.vy = 0; player.onGround = true;
        spawnDust(player.pos.clone().setY(0.2), new THREE.Vector3(0, -1, 0));
      }
    }

    // stride-synced body bob while moving; a soft breathing sway while idle
    if (speed < 0.25) player.idleT = (player.idleT || 0) + dt;
    else player.idleT = 0;
    const bob = speed > 0.6 ? Math.abs(Math.sin(player.anim || 0)) * 0.03 : 0;
    const breathe = speed < 0.25 ? Math.sin((player.idleT || 0) * 2.0) * 0.006 : 0;
    player.group.position.set(
      player.pos.x,
      groundY(player.pos.x, player.pos.z) + player.yOff + bob + breathe + (player.crawl ? 0.12 : 0),
      player.pos.z
    );

    // facing: run toward the actual velocity, otherwise face the crosshair
    const aimFacing = Math.atan2(aim.dir.x, aim.dir.z);
    const aimingNow = aimHeld || (mouse.down && player.weapon !== 0);
    let targetFacing = aimFacing;
    if (!aimingNow && speed > 0.4) targetFacing = Math.atan2(vel.x, vel.z);
    else if (!aimingNow && speed <= 0.4) targetFacing = camYaw + Math.PI;  // idle: turn to face the camera
    player.facing = angLerp(player.facing, targetFacing, Math.min(1, dt * 14));
    player.group.rotation.y = player.facing;

    if (player.swimming) {
      // swim: torso half-submerged, arms paddling, legs kicking, no shooting
      player.group.rotation.x = 0;
      player.anim = (player.anim || 0) + dt * (0.6 + speed * 1.1);
      const a = player.anim;
      player.group.position.set(
        player.pos.x,
        player.swimLevel - 1.05 + Math.sin(a * 1.3) * 0.05,
        player.pos.z
      );
      const legSwing = Math.sin(a) * 0.35;
      player.group.userData.legL.rotation.x = moving ? legSwing : 0;
      player.group.userData.legR.rotation.x = moving ? -legSwing : 0;
      player.group.userData.armR.rotation.x = -1.0 + Math.sin(a) * 0.5;
      player.group.userData.armL.rotation.x = -1.0 - Math.sin(a) * 0.5;
      player.group.userData.armL.rotation.z = 0;
      player.isMoving = moving;
      mouse.pressed = false;
      updateTargetHint(dt);
      return;
    }

    // stance pose: crawl lies the body down, crouch shrinks the silhouette,
    // a roll tumbles end-over-end, a sprint leans forward slightly
    if (player.crawl) {
      player.group.scale.set(1, 1, 1);
      player.group.rotation.x = -1.25;
    } else if (player.rollT > 0) {
      player.group.scale.set(1, 1, 1);
      player.group.rotation.x = -player.rollSpin;   // full forward tumble
    } else {
      player.group.scale.set(1, player.crouch ? 0.78 : 1, 1);
      player.group.rotation.x = sprinting && speed > 2 ? 0.07 : 0;
    }

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
    } else if (w && w.kind === 'bomb') {
      if (mouse.pressed) throwBomb();        // one grenade per click
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
      const deckY = groundY(car.pos.x, car.pos.z);
      car.pos.addScaledVector(fwd, car.curSpeed * dt);
      clampToWorld(car.pos);
      const offDeck = bridgeRailBlocks(car.pos.x, car.pos.z, deckY) ||
        (isInsideWater(car.pos.x, car.pos.z) && deckY < 0.5);   // never drive into the open river
      if (isInsideBuilding(car.pos.x, car.pos.z) || offDeck) car.pos.addScaledVector(fwd, -car.curSpeed * dt);
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

    // ramming other cars: solid impact — shattered glass, the victim stops,
    // smoulders a few seconds, then blows up
    collideCars(car, dt, true);
    player.pos.copy(car.pos);
    player.facing = car.heading;      // keep the hero's heading (and the minimap
                                      // arrow) pointing where the car is driving
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
      // the chase-cam pivot follows the stance: lower while crouched/crawling
      const stanceDrop = player.crawl ? 0.85 : (player.crouch ? 0.5 : 0);
      out.set(player.group.position.x, player.group.position.y + CAM_PIVOT_H - stanceDrop, player.group.position.z);
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
          // storefront bands + lit windows fade together for a clean X-ray
          if (b.emissiveMats) for (let j = 0; j < b.emissiveMats.length; j++) {
            b.emissiveMats[j].transparent = fading;
            b.emissiveMats[j].depthWrite = !fading;
            b.emissiveMats[j].opacity = op;
          }
          b.lastOp = op;
        }
      }
    }
    // bridge decks get the same X-ray treatment: when the hero swims under a
    // bridge, the deck fades to glass so the chase-cam keeps him readable
    for (let i = 0; i < bridgeDecks.length; i++) {
      const d = bridgeDecks[i];
      const near = !(d.maxX < ax - 12 || d.minX > ax + 12 || d.maxZ < az - 12 || d.minZ > az + 12);
      const blocked = near && segHitsBox(ax, ay, az, bx, by, bz, d, 0.12);
      const target = blocked ? OCCL_TARGET : 1;
      if (target !== d.lastOp) {
        d.fade += (target - d.fade) * Math.min(1, dt * 9);
        const op = Math.abs(d.fade - target) < 0.012 ? target : d.fade;
        if (op !== d.lastOp) {
          const m = d.mesh.material;
          m.transparent = op < 0.999;
          m.depthWrite = !m.transparent;
          m.opacity = op;
          d.lastOp = op;
        }
      }
    }
  }

  /* ---------------- Beach bar FX: disco lights + a thumping beat ----------------
     The light orbs cycle through the neon palette and the mirror ball spins;
     a simple four-on-the-floor kick + hi-hat plays while the hero is near. */
  const barBeat = { playing: false, next: 0 };
  function updateBarFX(dt) {
    if (!bar) return;
    const t = performance.now();
    for (let i = 0; i < bar.lights.length; i++) {
      const L = bar.lights[i];
      L.mat.emissive.setHex(NEON_COLS[Math.floor(t / 260 + i * 1.7) % NEON_COLS.length]);
    }
    bar.ball.rotation.y += dt * 1.2;
    if (player && !player.dead && Sfx.ctx) {
      const d = player.pos.distanceTo(bar.pos);
      if (d < 42 && !barBeat.playing) { barBeat.playing = true; barBeat.next = 0; }
      else if (d > 55 && barBeat.playing) barBeat.playing = false;
      if (barBeat.playing) {
        const now = Sfx.ctx.currentTime;
        if (now >= barBeat.next) {
          Sfx.tone(52, 0.14, 'sine', 0.5, 34);      // bass drum thump
          Sfx.noise(0.03, 0.09, 7000);              // hi-hat tick
          barBeat.next = now + 0.5;                 // ~120 BPM
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
  const armorFill = document.getElementById('armorFill');
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
  const timePhaseEl = document.getElementById('timePhase');
  const weatherLabel = document.getElementById('weatherLabel');
  const lightningEl = document.getElementById('lightning');
  let msgTimer = null, flashT = 0;

  function buildStars() {
    wantedBox.innerHTML = '';
    for (let i = 0; i < 5; i++) { const s = document.createElement('span'); s.className = 'star'; s.textContent = '★'; wantedBox.appendChild(s); }
  }
  function updateHealthHUD() {
    healthFill.style.width = Math.max(0, player.hp) + '%';
    if (armorFill) armorFill.style.width = Math.max(0, Math.min(100, player.armor)) + '%';
  }
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
    if (w && (w.kind === 'gun' || w.kind === 'bomb')) ammoN.textContent = getAmmo(player.weapon);
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
  // Running in-game clock (world time zone GMT+7). The hour is randomized at
  // the start and occasionally jumps, so the world cycles morning/afternoon/night.
  let _lastClockTxt = '';
  function updateClock() {
    if (clockZone && clockZone.textContent !== 'GMT+7') clockZone.textContent = 'GMT+7';
    if (!clockTime) return;
    const total = Math.floor(gameClockSec) % 86400;
    const hh = String(Math.floor(total / 3600)).padStart(2, '0');
    const mm = String(Math.floor(total / 60) % 60).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    const txt = hh + ':' + mm + ':' + ss;
    if (txt !== _lastClockTxt) { _lastClockTxt = txt; clockTime.textContent = txt; }
  }
  let _lastPhaseLbl = '';
  function updateTimeHUD() {
    if (!timePhaseEl) return;
    const lbl = TIME_PHASES[timePhase] || '';
    if (lbl !== _lastPhaseLbl) { _lastPhaseLbl = lbl; timePhaseEl.textContent = lbl; }
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
        if (c.isPolice) txt = 'F — TRỘM XE CẢNH SÁT';
        else if (c.stolen || !c.driverMesh) txt = 'F — LÊN XE';
        else txt = 'F — TRỘM XE';
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
    player.armor = 0;
    player.swimming = false;
    player.isMoving = false;
    player.stepT = 0;
    player.facing = 0; player.group.rotation.set(0, 0, 0);
    player.switchT = 0; player.reloadT = 0; player.bloom = 0; player.recoil = 0;
    player.targetSeen = false;
    // reset mobility state on respawn
    player.crouch = false; player.crawl = false; player.group.scale.set(1, 1, 1);
    player.vy = 0; player.yOff = 0; player.onGround = true;
    player.rollT = 0; player.rollCd = 0; player.rollSpin = 0;
    if (crosshair) crosshair.classList.remove('aim', 'target');
    scene.add(player.group);
    camYaw = 0; camPitch = -0.17; camDist = CAM_DIST; camInit = false;
    snapCamera();
    document.getElementById('wasted').classList.add('hidden');
    updateHealthHUD(); updateWantedHUD(); updateVehicleHUD();
    updateReloadHUD();
    updateMissionHUD();
    if (!mission) startMission();        // never leave the hero without an objective
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
    const C = STYLES[settings.style];
    const hex = (c) => '#' + new THREE.Color(c).getHexString();
    const W2 = (x) => (x + GROUND_HALF) * mScale;
    const s = mScale;
    const Wpx = mmapStatic.width, Hpx = mmapStatic.height;
    // deep open ocean
    g.fillStyle = '#0a121c';
    g.fillRect(0, 0, Wpx, Hpx);
    // shallow swimming band around the island
    g.fillStyle = hex(C.shallow);
    g.fillRect(W2(-GROUND_HALF - SEA_BAND), W2(-GROUND_HALF - SEA_BAND),
      (GROUND_HALF + SEA_BAND) * 2 * s, (GROUND_HALF + SEA_BAND) * 2 * s);
    // sandy island ring (the beach)
    g.fillStyle = hex(C.sand);
    g.fillRect(W2(-GROUND_HALF), W2(-GROUND_HALF), GROUND_HALF * 2 * s, GROUND_HALF * 2 * s);
    // city ground base
    g.fillStyle = hex(C.ground);
    g.fillRect(W2(-CITY / 2), W2(-CITY / 2), CITY * s, CITY * s);
    // district tints: the four quarters read at a glance, like a GTA IV map
    const QS = {
      nw: { x0: -CITY / 2, z0: -CITY / 2, x1: 0, z1: RIVER_Z, name: 'KHU BÊ TÔNG' },
      ne: { x0: 0, z0: -CITY / 2, x1: CITY / 2, z1: RIVER_Z, name: 'KHU GẠCH' },
      sw: { x0: -CITY / 2, z0: RIVER_Z, x1: 0, z1: CITY / 2, name: 'PHỐ CỔ' },
      se: { x0: 0, z0: RIVER_Z, x1: CITY / 2, z1: CITY / 2, name: 'TRUNG TÂM' }
    };
    for (const k of ['nw', 'ne', 'sw', 'se']) {
      const r = QS[k];
      g.fillStyle = hex(C.districtPals[k][0]);
      g.globalAlpha = 0.28;
      g.fillRect(W2(r.x0), W2(r.z0), (r.x1 - r.x0) * s, (r.z1 - r.z0) * s);
      g.globalAlpha = 1;
    }
    // parks: green lawns inside the blocks
    g.fillStyle = hex(C.grass);
    for (const b of blockMap) {
      if (b.park) g.fillRect(W2(b.x - BLOCK / 2 + 1.6), W2(b.z - BLOCK / 2 + 1.6), (BLOCK - 3.2) * s, (BLOCK - 3.2) * s);
    }
    // street grid
    g.fillStyle = hex(C.road);
    for (let i = 0; i <= N; i++) {
      g.fillRect(W2(cx(i) - ROAD / 2), W2(-CITY / 2), ROAD * s, CITY * s);
      g.fillRect(W2(-CITY / 2), W2(cz(i) - ROAD / 2), CITY * s, ROAD * s);
    }
    // river over the roads...
    g.fillStyle = hex(C.water);
    g.fillRect(W2(-CITY / 2), W2(RIVER_Z - RIVER_HALF), CITY * s, RIVER_HALF * 2 * s);
    // ...then bridge stripes where avenues cross
    g.fillStyle = hex(C.bridge);
    for (let i = 0; i <= N; i++) {
      g.fillRect(W2(cx(i) - ROAD / 2), W2(RIVER_Z - RIVER_HALF), ROAD * s, RIVER_HALF * 2 * s);
    }
    // the beach bar glows pink on the sand
    if (bar) {
      g.fillStyle = '#ff4fa0';
      g.fillRect(W2(bar.x - 7.5), W2(bar.z - 5.5), 15 * s, 11 * s);
    }
    // the three walk-in interior bars glow gold on their blocks
    for (const ib of interiorBars) {
      g.fillStyle = '#ffd25e';
      g.fillRect(W2(ib.x - ib.w / 2), W2(ib.z - ib.d / 2), ib.w * s, ib.d * s);
      g.strokeStyle = '#120a1c';
      g.lineWidth = 1;
      g.strokeRect(W2(ib.x - ib.w / 2), W2(ib.z - ib.d / 2), ib.w * s, ib.d * s);
    }
    // district name plates + compass, street-map style
    g.textAlign = 'center';
    g.font = 'bold ' + Math.max(9, Math.round(Hpx / 26)) + 'px monospace';
    for (const k of ['nw', 'ne', 'sw', 'se']) {
      const r = QS[k];
      const lx = W2((r.x0 + r.x1) / 2), lz = W2((r.z0 + r.z1) / 2);
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.fillText(r.name, lx + 1, lz + 1);
      g.fillStyle = 'rgba(244,248,255,0.92)';
      g.fillText(r.name, lx, lz);
    }
    // compass arrow (north = up) in the top-left corner
    const cx0 = 15, cy0 = 19;
    g.fillStyle = '#ffd25e';
    g.beginPath();
    g.moveTo(cx0, cy0 - 7);
    g.lineTo(cx0 - 4, cy0 + 2);
    g.lineTo(cx0 + 4, cy0 + 2);
    g.closePath();
    g.fill();
    g.font = 'bold 9px monospace';
    g.fillStyle = '#fff';
    g.fillText('N', cx0, cy0 + 12);
    // neat border frame
    g.strokeStyle = 'rgba(0,0,0,0.85)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, Wpx - 2, Hpx - 2);
  }
  function updateMinimap() {
    mctx.drawImage(mmapStatic, 0, 0);
    const W2 = (x) => (x + GROUND_HALF) * mScale;
    const dot = (x, z, c, r) => { mctx.fillStyle = c; mctx.fillRect(W2(x) - r / 2, W2(z) - r / 2, r, r); };
    cars.forEach(c => { if (!c.dead) dot(c.group.position.x, c.group.position.z, c.isPolice ? '#6af' : '#fc3', 4); });
    boats.forEach(b => dot(b.pos.x, b.pos.z, '#7ef', 4));
    sharks.forEach(sh => dot(sh.pos.x, sh.pos.z, '#ff4a4a', 4));
    NPCs.forEach(n => { if (!n.dead) dot(n.pos.x, n.pos.z, n.type === 'police' ? '#35f' : (n.type === 'enemy' ? '#f44' : '#5c5'), 3); });
    // mission target: a pulsing yellow ring + navigation arrow on the minimap
    if (mission && mission.active && mission.target && typeof updateMission === 'function') {
      const t = missionTargetPos();
      if (t && player) {
        const pulse = 3 + Math.sin(performance.now() / 160) * 2;
        mctx.strokeStyle = '#ffd25e';
        mctx.lineWidth = 2.5;
        mctx.beginPath();
        mctx.arc(W2(t.x), W2(t.z), 6 + pulse * 1.6, 0, Math.PI * 2);
        mctx.stroke();
        // route line + arrowhead from the hero to the objective
        const px = W2(player.pos.x), pz = W2(player.pos.z);
        const tx = W2(t.x), tz = W2(t.z);
        mctx.globalAlpha = 0.8;
        mctx.beginPath();
        mctx.moveTo(px, pz);
        mctx.lineTo(tx, tz);
        mctx.stroke();
        const ang = Math.atan2(tz - pz, tx - px);
        mctx.beginPath();
        mctx.moveTo(tx, tz);
        mctx.lineTo(tx - Math.cos(ang - 0.45) * 11, tz - Math.sin(ang - 0.45) * 11);
        mctx.moveTo(tx, tz);
        mctx.lineTo(tx - Math.cos(ang + 0.45) * 11, tz - Math.sin(ang + 0.45) * 11);
        mctx.stroke();
        mctx.globalAlpha = 1;
      }
    }
    if (player) {
      // the hero is a little arrow pointing where he faces (while driving it
      // follows the car's heading so it always shows the true travel direction)
      const px = W2(player.pos.x), pz = W2(player.pos.z);
      const a = player.inCar ? player.inCar.heading : (player.facing || 0);
      const fx = Math.sin(a), fz = Math.cos(a);
      const sx = -fz, sz = fx;
      mctx.fillStyle = '#fff';
      mctx.beginPath();
      mctx.moveTo(px + fx * 9, pz + fz * 9);
      mctx.lineTo(px - fx * 4 + sx * 5, pz - fz * 4 + sz * 5);
      mctx.lineTo(px - fx * 4 - sx * 5, pz - fz * 4 - sz * 5);
      mctx.closePath();
      mctx.fill();
    }
  }

  /* ---------------- Missions (Open World GTA Style) ----------------
     Simple open-world missions like the reference prototype: wipe out a
     street gang, steal a marked car and deliver it, or reach a meeting
     point. The objective is always on screen; press M for the full panel. */
  const MISSION_DEFS = [
    { type: 'kill', title: 'DỌN DẸP BĂNG ĐẢNG', icon: '🔫', desc: 'Tiêu diệt {need} tên côn đồ. Mũi tên vàng trên minimap chỉ thẳng vào tên côn đồ sống gần nhất — chấm đỏ trên minimap, HUD hiện số tên còn lại.' },
    { type: 'steal', title: 'LẤY XE HÀNG', icon: '🚗', desc: 'Trộm chiếc xe được đánh dấu, sau đó theo mũi tên vàng trên minimap lái xe vào vòng tròn giao hàng (HUD hiện khoảng cách còn lại).' },
    { type: 'visit', title: 'ĐIỂM HẸN', icon: '📍', desc: 'Theo mũi tên vàng trên minimap tới vòng tròn được đánh dấu (đi bộ hoặc lái xe).' }
  ];
  let mission = null;               // { type, title, icon, desc, need, progress, target, car, carTaken, active, nextT, beacon }
  let missionsDone = 0;
  let missionPanelOpen = false;
  let lastGangAlert = 0;

  // the position the beacon + minimap ring should point at right now
  function missionTargetPos() {
    if (!mission || !mission.active) return null;
    if (mission.type === 'steal' && !mission.carTaken && mission.car && !mission.car.dead) {
      return mission.car.group.position;
    }
    return mission.target;
  }

  function pickMissionPoint(minDist) {
    for (let k = 0; k < 40; k++) {
      const p = randomWalkablePoint();
      if (p.distanceTo(player.pos) > minDist) return p;
    }
    return randomWalkablePoint();
  }

  function spawnMissionBeacon() {
    const t = missionTargetPos();
    if (!t) return;
    const g = new THREE.Group();
    const ringM = new THREE.MeshBasicMaterial({ color: 0xffd25e });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.14, 6, 24), ringM);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const coneM = new THREE.MeshBasicMaterial({ color: 0xffe08a });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.7, 6), coneM);
    cone.position.y = 2.7;
    g.add(cone);
    g.userData.beacon = true;
    g.position.set(t.x, 0.2, t.z);
    scene.add(g);
    mission.beacon = g;
  }

  function clearMissionMarkers() {
    if (!mission) return;
    if (mission.beacon) { scene.remove(mission.beacon); mission.beacon = null; }
  }

  // reinforcements keep every kill-mission completable: there is ALWAYS
  // a living thug to hunt (the beacon points straight at the nearest one)
  function spawnGangMember(pos) {
    const n = makeNPC('enemy');
    let p = pos || null;
    if (!p) {
      for (let t = 0; t < 30; t++) {
        const cand = randomWalkablePoint();
        if (!isInsideBuilding(cand.x, cand.z) && !isInsideWater(cand.x, cand.z)) { p = cand; break; }
      }
      if (!p) p = randomWalkablePoint();
    }
    n.pos.copy(p); n.group.position.copy(p); n.home = p.clone();
    return n;
  }
  function livingEnemies() { return NPCs.filter(n => n.type === 'enemy' && !n.dead); }

  function startMission() {
    if (!player || player.dead) { mission = null; return; }
    const def = MISSION_DEFS[missionsDone % MISSION_DEFS.length];
    mission = {
      type: def.type, title: def.title, icon: def.icon, desc: def.desc,
      need: 0, progress: 0, target: null, car: null, carTaken: false,
      active: true, nextT: 0, beacon: null
    };
    if (def.type === 'kill') {
      mission.need = 4 + (missionsDone % 2);
      // guarantee enough targets: top the gang up to the required head count
      const alive = livingEnemies();
      for (let i = alive.length; i < mission.need; i++) spawnGangMember(null);
      const fresh = livingEnemies();
      let best = null, bd = 1e9;
      fresh.forEach(n => {
        const d = n.pos.distanceTo(player.pos);
        if (d < bd) { bd = d; best = n.pos; }
      });
      mission.target = best ? best.clone() : pickMissionPoint(40);
      if (alive.length < mission.need) toast('Băng đảng nhận tiếp viện — còn ' + fresh.length + ' tên để tiêu diệt!');
    } else if (def.type === 'steal') {
      let best = null, bd = 1e9;
      cars.forEach(c => {
        if (c.dead || c.isPolice) return;
        const d = c.pos.distanceTo(player.pos);
        if (d < bd) { bd = d; best = c; }
      });
      mission.car = best || cars.find(c => !c.dead && !c.isPolice) || null;
      mission.target = pickMissionPoint(70);
    } else {
      mission.target = pickMissionPoint(55);
    }
    mission.desc = def.desc.replace('{need}', mission.need);
    spawnMissionBeacon();
    updateMissionHUD();
    updateMissionPanel();
    toast('NHIỆM VỤ MỚI — ' + mission.icon + ' ' + mission.title + ' (ấn M để xem)');
    Sfx.warn();
  }

  function completeMission() {
    mission.active = false;
    mission.nextT = 4;
    missionsDone++;
    clearMissionMarkers();
    const roll = rng();
    let reward;
    if (roll < 0.34) { player.ammoStore[2] += 30; player.ammoStore[3] += 60; reward = '+30 ĐẠN SÚNG · +60 ĐẠN AK'; }
    else if (roll < 0.67) { player.armor = Math.min(player.maxArmor, player.armor + 25); reward = '+25 GIÁP'; }
    else { player.hp = Math.min(player.maxHp, player.hp + 30); reward = '+30 MÁU'; }
    updateHealthHUD(); updateAmmoHUD();
    toast('✅ HOÀN THÀNH NHIỆM VỤ: ' + mission.title + ' — ' + reward);
    Sfx.warn();
    updateMissionHUD(); updateMissionPanel();
  }

  function failMission(reason) {
    mission.active = false;
    mission.nextT = 5;
    clearMissionMarkers();
    toast('❌ NHIỆM VỤ THẤT BẠI — ' + reason);
    Sfx.warn();
    updateMissionHUD(); updateMissionPanel();
  }

  function updateMission(dt) {
    if (!mission) return;
    if (!mission.active) {
      mission.nextT -= dt;
      if (mission.nextT <= 0) startMission();
      else updateMissionHUD();
      return;
    }
    if (!player || player.dead) return;
    if (mission.type === 'kill') {
      if (mission.progress >= mission.need) { completeMission(); return; }
      // the ring always sits on a LIVING thug — never on an empty turf
      const alive = livingEnemies();
      if (alive.length === 0) {
        for (let i = 0; i < 2; i++) spawnGangMember(null);
        toast('Băng đảng tiếp viện đang tới — theo mũi tên vàng trên bản đồ!');
      } else {
        let best = null, bd = 1e9;
        alive.forEach(n => {
          const d = n.pos.distanceTo(player.pos);
          if (d < bd) { bd = d; best = n.pos; }
        });
        if (best) mission.target.copy(best);
      }
    } else if (mission.type === 'steal') {
      if (mission.car && mission.car.dead) { failMission('chiếc xe hàng đã bị phá huỷ'); return; }
      if (!mission.carTaken && player.inCar === mission.car) {
        mission.carTaken = true;
        toast('Đã lấy xe! Theo mũi tên vàng trên bản đồ tới vòng tròn giao hàng.');
        updateMissionHUD();
      }
      if (mission.carTaken && player.inCar === mission.car && player.pos.distanceTo(mission.target) < 8) {
        completeMission(); return;
      }
    } else if (mission.type === 'visit') {
      if (player.pos.distanceTo(mission.target) < 6) { completeMission(); return; }
    }
    // beacon: bob + spin over the objective, follow the marked car before it is stolen
    if (mission.beacon) {
      const t = missionTargetPos();
      if (t) {
        mission.beacon.visible = true;
        mission.beacon.position.set(t.x, 0.2 + Math.sin(performance.now() / 420) * 0.5, t.z);
        mission.beacon.rotation.y += dt * 1.3;
      } else mission.beacon.visible = false;
    }
    updateMissionHUD();                      // live progress / remaining thugs / distance
  }

  /* ---- mission HUD (always on screen) + M panel ---- */
  const missionHud = document.getElementById('missionHud');
  const missionHudText = document.getElementById('missionHudText');
  function updateMissionHUD() {
    if (!missionHud) return;
    if (mission && mission.active) {
      missionHud.classList.remove('hidden');
      let t = mission.icon + ' ' + mission.title;
      if (mission.type === 'kill') {
        const alive = livingEnemies().length;
        t += ' — ' + mission.progress + '/' + mission.need + ' · còn ' + alive + ' tên côn đồ';
      } else if (mission.type === 'steal') {
        t += mission.carTaken
          ? ' — lái vào vòng tròn vàng (cách ' + Math.round(player.pos.distanceTo(mission.target)) + 'm)'
          : ' — trộm xe được đánh dấu';
      } else {
        t += ' — tới vòng tròn vàng (cách ' + Math.round(player.pos.distanceTo(mission.target)) + 'm)';
      }
      if (missionHudText.textContent !== t) missionHudText.textContent = t;
    } else if (mission) {
      missionHud.classList.remove('hidden');
      const t = '⏳ Nhiệm vụ mới trong ' + Math.max(0, Math.ceil(mission.nextT)) + 's…';
      if (missionHudText.textContent !== t) missionHudText.textContent = t;
    } else {
      missionHud.classList.add('hidden');
    }
  }

  const missionOverlay = document.getElementById('missionOverlay');
  const missionTitleEl = document.getElementById('missionTitle');
  const missionDescEl = document.getElementById('missionDesc');
  const missionProgressEl = document.getElementById('missionProgress');
  function updateMissionPanel() {
    if (!mission || !missionOverlay) return;
    if (missionTitleEl) missionTitleEl.textContent = mission.icon + ' ' + mission.title;
    if (missionDescEl) missionDescEl.textContent = mission.desc || '';
    if (missionProgressEl) {
      if (mission.type === 'kill') {
        const alive = livingEnemies().length;
        missionProgressEl.textContent = 'TIẾN ĐỘ: ' + mission.progress + '/' + mission.need +
          ' tên đã bị hạ · còn ' + alive + ' tên côn đồ (theo mũi tên trên minimap)';
      } else {
        missionProgressEl.textContent = mission.active ? 'TIẾN ĐỘ: đang thực hiện — theo mũi tên vàng trên bản đồ' : 'TIẾN ĐỘ: đã kết thúc';
      }
    }
  }
  function openMissionPanel() {
    if (!player || player.dead || missionPanelOpen) return;
    if (!mission) { toast('Chưa có nhiệm vụ — hãy đợi vài giây'); return; }
    missionPanelOpen = true;
    paused = true;
    if (document.exitPointerLock) { try { document.exitPointerLock(); } catch (e) {} }
    hideOverlay(settingsOverlay); hideOverlay(aboutOverlay);
    updateMissionPanel();
    showOverlay(missionOverlay);
    Sfx.click();
  }
  function closeMissionPanel() {
    if (!missionPanelOpen) return;
    missionPanelOpen = false;
    hideOverlay(missionOverlay);
    paused = false;
    tryPointerLock();
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

  let fpsFrames = 0, fpsAcc = 0;
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());
    if (paused) { renderer.render(scene, camera); return; }   // menus freeze the sim
    fpsFrames++; fpsAcc += dt;
    if (fpsAcc >= 0.5) {
      if (settings.showFps && fpsN) fpsN.textContent = Math.round(fpsFrames / fpsAcc);
      fpsFrames = 0; fpsAcc = 0;
    }

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
      separateCars();
      boats.forEach(b => updateBoat(b, FIXED_STEP));
      sharks.forEach(sh => updateShark(sh, FIXED_STEP));
      bombs.slice().forEach(b => updateBomb(b, FIXED_STEP));
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

    // walking characters follow the bridge decks / ramps too (+ gentle walk bob)
    NPCs.forEach(n => {
      if (!n.dead && !n.swim) n.group.position.y = groundY(n.pos.x, n.pos.z) + (n.bob || 0);
    });

    updateFX(dt);
    updateBarFX(dt);
    updateInteriorBars(dt);
    updateCamera(dt);
    updateVehicleHUD();
    updateReloadHUD();
    updateCarPrompt();
    updateWeather(dt);
    updateMission(dt);
    updateClock();
    updateTimeHUD();

    if (flashT > 0) { flashT -= dt; flashEl.style.opacity = Math.max(0, flashT * 2); }
    updateOcclusion(dt);
    updateMinimap();
    // sun shadow frustum + water texture follow the player (Unity-style soft shadows)
    if (keyLight && keyLight.shadow && player) {
      keyLight.position.set(player.pos.x + 120, 130, player.pos.z + 260);
      keyLight.target.position.set(player.pos.x, 0, player.pos.z);
    }
    waterScrollT += dt;
    for (let i = 0; i < waterMats.length; i++) {
      waterMats[i].map.offset.x = waterScrollT * 0.008;
      waterMats[i].map.offset.y = waterScrollT * 0.005;
    }
    // gentle rolling waves on the ocean + river
    for (let i = 0; i < waveMeshes.length; i++) {
      const wv = waveMeshes[i];
      const pos = wv.mesh.geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const x = wv.base[v * 2], y = wv.base[v * 2 + 1];
        pos.setY(v, Math.sin(x * 0.02 + waterScrollT * 0.9) * wv.amp +
          Math.cos(y * 0.026 + waterScrollT * 0.7) * wv.amp * 0.6);
      }
      pos.needsUpdate = true;
      wv.mesh.geometry.computeVertexNormals();
    }
    renderer.render(scene, camera);
  }

  /* ---------------- Menus, settings and pause ---------------- */
  const startOverlay = document.getElementById('startOverlay');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const settingsOverlay = document.getElementById('settingsOverlay');
  const aboutOverlay = document.getElementById('aboutOverlay');
  const fpsBox = document.getElementById('fpsBox');
  const fpsN = document.getElementById('fpsN');
  let menuReturn = 'start';
  let paused = false;

  function showOverlay(el) { if (el) el.classList.remove('hidden'); }
  function hideOverlay(el) { if (el) el.classList.add('hidden'); }
  function hideGameOverlays() {
    hideOverlay(pauseOverlay); hideOverlay(settingsOverlay); hideOverlay(aboutOverlay); hideOverlay(missionOverlay);
  }
  function openSettings(from) {
    menuReturn = from || 'start';
    hideOverlay(startOverlay); hideOverlay(pauseOverlay); hideOverlay(aboutOverlay);
    showOverlay(settingsOverlay);
    syncSettingsUI();
  }
  function openAbout(from) {
    menuReturn = from || 'start';
    hideOverlay(startOverlay); hideOverlay(pauseOverlay); hideOverlay(settingsOverlay);
    showOverlay(aboutOverlay);
  }
  function backToMenu() {
    hideOverlay(settingsOverlay); hideOverlay(aboutOverlay);
    if (menuReturn === 'pause') showOverlay(pauseOverlay);
    else showOverlay(startOverlay);
  }
  function openPause() {
    if (!player || player.dead) return;
    paused = true;
    if (document.exitPointerLock) { try { document.exitPointerLock(); } catch (e) {} }
    hideOverlay(settingsOverlay); hideOverlay(aboutOverlay); hideOverlay(missionOverlay);
    missionPanelOpen = false;
    showOverlay(pauseOverlay);
  }
  function resumeGame() {
    hideGameOverlays();
    paused = false;
    tryPointerLock();
  }

  /* ---------------- Cheat console (press ~) ---------------- */
  const cheatOverlay = document.getElementById('cheatOverlay');
  const cheatInput = document.getElementById('cheatInput');
  const cheatOut = document.getElementById('cheatOut');
  let cheatOpen = false;
  let cheatWasPaused = false;

  function openCheatConsole() {
    if (!player || player.dead || cheatOpen) return;
    cheatOpen = true;
    cheatWasPaused = paused;
    hideGameOverlays();
    paused = true;                                 // freeze the world while typing the code
    if (document.exitPointerLock) { try { document.exitPointerLock(); } catch (e) {} }
    showOverlay(cheatOverlay);
    if (cheatInput) { cheatInput.value = ''; if (cheatInput.focus) cheatInput.focus(); }
    if (cheatOut) cheatOut.textContent = '';
    Sfx.click();
  }
  function closeCheatConsole() {
    if (!cheatOpen) return;
    cheatOpen = false;
    hideOverlay(cheatOverlay);
    if (cheatWasPaused) showOverlay(pauseOverlay);  // came from the pause menu: back to it
    else { paused = false; tryPointerLock(); }
  }
  function runCheatCommand(raw) {
    if (!cheatOpen) return;
    const cmd = String(raw || '').trim().toLowerCase();
    const table = { health: 'HỒI ĐẦY MÁU ❤', armor: 'ĐẦY GIÁP 🛡', reload: 'FULL ĐẠN + BOM 🔫💣' };
    if (Object.prototype.hasOwnProperty.call(table, cmd)) {
      applyCheat(cmd);
      if (cheatOut) cheatOut.textContent = '✔ ' + cmd + ' — ' + table[cmd];
      if (cheatInput) cheatInput.value = '';
    } else if (cmd === 'help') {
      if (cheatOut) cheatOut.textContent = 'CÁC LỆNH: health · armor · reload';
    } else if (cmd) {
      if (cheatOut) cheatOut.textContent = '✖ LỆNH KHÔNG HỢP LỆ: "' + cmd + '" — dùng health / armor / reload';
      Sfx.warn();
    }
    if (cheatInput && cheatInput.focus) cheatInput.focus();
  }

  function applyAudioSettings() {
    if (!Sfx.master) return;
    Sfx.master.gain.value = settings.muted ? 0 : (settings.volume / 100) * 0.35;
  }
  function syncSettingsUI() {
    const q = document.getElementById('qQuality'); if (q) q.value = settings.quality;
    const fov = document.getElementById('qFov'); if (fov) fov.value = settings.fov;
    const fovV = document.getElementById('qFovVal'); if (fovV) fovV.textContent = settings.fov;
    const wfx = document.getElementById('qWeather'); if (wfx) wfx.checked = !!settings.fxWeather;
    const fpsC = document.getElementById('qFps'); if (fpsC) fpsC.checked = !!settings.showFps;
    const sens = document.getElementById('cSens'); if (sens) sens.value = Math.round(settings.sens * 100);
    const sensV = document.getElementById('cSensVal'); if (sensV) sensV.textContent = Math.round(settings.sens * 100) + '%';
    const inv = document.getElementById('cInvert'); if (inv) inv.checked = !!settings.invertY;
    const vol = document.getElementById('aVol'); if (vol) vol.value = settings.volume;
    const volV = document.getElementById('aVolVal'); if (volV) volV.textContent = settings.volume;
    const mute = document.getElementById('aMute'); if (mute) mute.checked = !!settings.muted;
    const stl = document.getElementById('qStyle'); if (stl) stl.value = settings.style;
    if (fpsBox) fpsBox.classList.toggle('hidden', !settings.showFps);
  }
  function applySettings() {
    sensScale = settings.sens;
    invertY = !!settings.invertY;
    if (renderer) {
      const pr = settings.quality === 'low' ? 0.75 : settings.quality === 'high'
        ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;
      renderer.setPixelRatio(pr);
      renderer.setSize(W, H, false);
      if (renderer.shadowMap) renderer.shadowMap.enabled = settings.quality !== 'low';
      if (keyLight && keyLight.shadow) {
        const smap = settings.quality === 'high' ? 2048 : 1024;
        keyLight.shadow.mapSize.set(smap, smap);
      }
    }
    if (camera) { camera.fov = settings.fov; camera.updateProjectionMatrix(); }
    if (cloudGroup) cloudGroup.visible = !!settings.fxWeather;
    if (rainLines && !settings.fxWeather) rainLines.visible = false;
    applyAudioSettings();
    if (fpsBox) fpsBox.classList.toggle('hidden', !settings.showFps);
    saveSettings();
    syncSettingsUI();
  }

  function bindMenu() {
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    on('startBtn', 'click', start);
    on('settingsBtn', 'click', () => openSettings('start'));
    on('aboutBtn', 'click', () => openAbout('start'));
    on('settingsBackBtn', 'click', backToMenu);
    on('aboutBackBtn', 'click', backToMenu);
    on('menuBtn', 'click', openPause);
    on('resumeBtn', 'click', resumeGame);
    on('pauseSettingsBtn', 'click', () => openSettings('pause'));
    on('pauseAboutBtn', 'click', () => openAbout('pause'));
    on('cheatClose', 'click', closeCheatConsole);
    on('missionCloseBtn', 'click', closeMissionPanel);
    on('cheatInput', 'keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') runCheatCommand(e.target.value);
      else if (e.key === 'Escape') closeCheatConsole();
    });

    const tabs = document.querySelectorAll ? document.querySelectorAll('.tab') : [];
    Array.prototype.forEach.call(tabs, tab => {
      tab.addEventListener('click', () => {
        Array.prototype.forEach.call(tabs, t => t.classList.remove('active'));
        tab.classList.add('active');
        const map = { gfx: 'tabGfx', ctl: 'tabCtl', aud: 'tabAud' };
        Object.keys(map).forEach(k => {
          const body = document.getElementById(map[k]);
          if (body) body.classList.toggle('hidden', k !== tab.dataset.tab);
        });
      });
    });

    on('qStyle', 'change', e => applyWorldStyle(e.target.value));
    on('qQuality', 'change', e => { settings.quality = e.target.value; applySettings(); });
    on('qFov', 'input', e => {
      settings.fov = +e.target.value;
      if (camera) { camera.fov = settings.fov; camera.updateProjectionMatrix(); }
      const v = document.getElementById('qFovVal'); if (v) v.textContent = settings.fov;
      saveSettings();
    });
    on('qWeather', 'change', e => { settings.fxWeather = !!e.target.checked; applySettings(); });
    on('qFps', 'change', e => { settings.showFps = !!e.target.checked; applySettings(); });
    on('cSens', 'input', e => {
      settings.sens = (+e.target.value) / 100;
      sensScale = settings.sens;
      const v = document.getElementById('cSensVal'); if (v) v.textContent = Math.round(settings.sens * 100) + '%';
      saveSettings();
    });
    on('cInvert', 'change', e => { settings.invertY = !!e.target.checked; invertY = settings.invertY; saveSettings(); });
    on('aVol', 'input', e => {
      settings.volume = +e.target.value;
      applyAudioSettings();
      const v = document.getElementById('aVolVal'); if (v) v.textContent = settings.volume;
      saveSettings();
    });
    on('aMute', 'change', e => { settings.muted = !!e.target.checked; applyAudioSettings(); saveSettings(); });
  }

  /* ---------------- Boot ---------------- */
  function start() {
    Sfx.init();
    applyAudioSettings();
    buildCity();
    spawnWorld();
    player = createPlayer();
    player.group.position.copy(player.pos);
    player.group.rotation.y = 0;
    // open the world after dark — the reference "Open World GTA Style" night look
    setGameTime((21.2 + Math.random() * 1.6) * 3600);
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
    paused = false;
    hideOverlay(startOverlay);
    hideGameOverlays();
    if (camera) { camera.fov = settings.fov; camera.updateProjectionMatrix(); }
    // first mission kicks in right away (M = mission info)
    missionsDone = 0; mission = null; missionPanelOpen = false;
    startMission();
    toast('Chào mừng đến VICE CITY! Ấn M để xem NHIỆM VỤ, ESC để mở MENU.');
    tryPointerLock();
    animate();
  }

  initThree();
  bindInput();
  bindMenu();
  applySettings();
  window.addEventListener('resize', () => {
    W = window.innerWidth; H = window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  });

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
    buildingBoxes, CITY_CORES, interiorBars, blockMap,
    // third-person camera test hooks
    aim: () => aimInfo(),
    setCameraLook(yaw, pitch) {
      camYaw = yaw;
      if (pitch !== undefined) camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, pitch));
      freeLookT = 0;
    },
    get settings() { return Object.assign({}, settings); },
    setSetting(key, value) {
      if (!(key in settings)) return;
      if (key === 'style') { applyWorldStyle(value); return; }
      settings[key] = value;
      applySettings();
    },
    get paused() { return paused; },
    openPause,
    resumeGame,
    sharks, swimWaterAt, bombs,
    get bar() { return bar; },
    hurtPlayer(dmg) { playerTakeDamage(dmg); },
    applyCheat,
    get cheatConsoleOpen() { return cheatOpen; },
    openCheatConsole, closeCheatConsole, runCheatCommand,
    applyWorldStyle, isVox, isNeon,
    makeNPC, makeHuman, makeCarEntity,
    setWeather,
    // mission + mobility hooks (Open World GTA Style update)
    get mission() { return mission; },
    get missionsDone() { return missionsDone; },
    get missionPanelOpen() { return missionPanelOpen; },
    startMission, updateMission, updateMissionHUD,
    openMissionPanel, closeMissionPanel,
    missionTargetPos,
    forceMission(type) {
      const idx = MISSION_DEFS.findIndex(d => d.type === type);
      missionsDone = idx < 0 ? 0 : idx;
      mission = null;
      startMission();
      return mission;
    },
    damageNPC,
    cycleWeapon, toggleCrouch, toggleCrawl,
    spawnEnemyNear(px, pz) {
      const n = makeNPC('enemy');
      for (let t = 0; t < 24; t++) {
        const p = randomLocalPoint(new THREE.Vector3(px, 0, pz), 20);
        if (!isInsideBuilding(p.x, p.z) && !isInsideWater(p.x, p.z)) { n.pos.copy(p); break; }
      }
      n.home = n.pos.clone();
      n.group.position.copy(n.pos);
      return n;
    },
    spawnMissionBeacon,
    spawnGangMember, livingEnemies, clearMissionMarkers,
    strikeLightning: triggerLightning,
    setGameHour(h) { setGameTime(h * 3600); updateClock(); updateTimeHUD(); },
    setTimeOfDay(phase) {
      const h = phase === 'morning' ? 8 : phase === 'afternoon' ? 15 : 22;
      setGameTime(h * 3600);
      updateClock(); updateTimeHUD();
    },
    randomizeTime() { randomizeGameTime(false); updateClock(); updateTimeHUD(); },
    get timeInfo() {
      return {
        hour: gameClockSec / 3600,
        phase: timePhase,
        label: TIME_PHASES[timePhase] || '',
        clock: clockTime ? clockTime.textContent : '',
        sun: sunSprite ? sunSprite.material.opacity : 0,
        moon: moonSprite ? moonSprite.material.opacity : 0,
        stars: starField ? starField.material.opacity : 0,
        fogColor: scene && scene.fog ? scene.fog.color.getHex() : 0,
        fogFar: scene && scene.fog ? scene.fog.far : 0
      };
    },
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
      const c = makeCarEntity({ isPolice: true, kind: 'police', color: 0xe8e8e8, speed: 9.5 });
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
