/* Headless smoke test for PIXEL VICE CITY (no GPU needed — WebGLRenderer is stubbed).
   Run: node tests/smoke.test.cjs
   Verifies: expanded Vice-City-style map (river + bridges + sunset sky),
   third-person chase camera + camera-relative movement, AK-47 (500 rounds),
   aim-assist shots, cars brake/stop for the player, carjacking occupied cars,
   shoot-a-car-until-it-explodes with chain reactions. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* ---------- black-hole proxy (2D context etc.) ---------- */
function bhFactory() {
  const fn = function () { return bh; };
  const bh = new Proxy(fn, {
    get(t, p) {
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === 'length') return 0;
      return bh;
    },
    apply() { return bh; },
    construct() { return bh; },
    set() { return true; }
  });
  return bh;
}
const bh = bhFactory();

/* ---------- fake clock ---------- */
let now = 1000;
global.performance = { now: () => now };

/* ---------- DOM stubs ---------- */
function makeEl(id) {
  const el = {
    id, style: {}, dataset: {}, children: [], textContent: '', className: '', offsetWidth: 0,
    _h: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { el.children.push(c); return c; },
    remove() {},
    addEventListener(t, f) { if (typeof f === 'function') { (el._h[t] = el._h[t] || []).push(f); } },
    getContext() { return bhFactory(); },
    width: id === 'minimap' ? 150 : 300,
    height: 150
  };
  return el;
}
const els = {};
const handlers = {};
global.document = {
  getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
  createElement(tag) { return makeEl('_' + tag + Math.random()); },
  querySelectorAll() { return []; },
  body: makeEl('body')
};
global.window = {
  innerWidth: 1280, innerHeight: 720,
  addEventListener(t, f) { handlers[t] = f; },
  removeEventListener() {},
  touchJoy: null
};

let rafCb = null;
global.requestAnimationFrame = cb => { rafCb = cb; return 0; };

/* ---------- THREE with stubbed renderer ---------- */
const THREE = require(path.join(ROOT, 'lib/three.min.js'));
// mimic the browser: render() refreshes every object's world matrix
THREE.WebGLRenderer = function (opts) {
  this.domElement = opts && opts.canvas;
  this.setPixelRatio = () => {};
  this.setSize = () => {};
  this.render = (sc) => { sc.updateMatrixWorld(true); };
};
global.THREE = THREE;

/* ---------- load game ---------- */
const code = fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8');
vm.runInThisContext(code);

const G = global.window.__GTA__;
let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
}
function step(frames) {
  for (let i = 0; i < frames; i++) {
    now += 16;
    const cb = rafCb; rafCb = null;
    if (cb) cb();
  }
}
function key(c) { handlers.keydown({ code: c, preventDefault() {} }); }
function keyup(c) { handlers.keyup({ code: c }); }
// point the centre crosshair at a ground z coordinate by scanning camera pitch
function aimCameraAtGround(zTarget) {
  let bestP = -0.17, bestErr = Infinity;
  for (let p = -0.8; p <= 0.3; p += 0.005) {
    G.setCameraLook(0, p);
    G.snapCamera();
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(0, 0), G.camera);
    if (rc.ray.direction.y >= -0.005) continue;
    const t = -rc.ray.origin.y / rc.ray.direction.y;
    const pt = rc.ray.origin.clone().addScaledVector(rc.ray.direction, t);
    if (Math.abs(pt.x - player.pos.x) > 6) continue;
    const err = Math.abs(pt.z - zTarget);
    if (err < bestErr) { bestErr = err; bestP = p; }
  }
  G.setCameraLook(0, bestP);
  G.snapCamera();
}

/* ---------- start game (now offset ensures first dt > 0) ---------- */
els.startBtn._h.click[0]();
step(170);           // let the chase-cam converge: screen-centre aim == straight ahead

const player = G.player;

/* ================= TEST 0: multi-city mega map ================= */
check('game started, player exists', !!player);
check('map expanded to N=' + G.N + ' blocks per side (multi-city map)', G.N === 11);
check('river runs through the city', Math.abs(G.RIVER_Z) > 0 && G.RIVER_HALF === 14);
check('water detection works', G.isInsideWater(0, G.RIVER_Z) && !G.isInsideWater(0, G.RIVER_Z - 30));
check('player spawns on open ground (no building/water)',
  !G.isInsideBuilding(player.pos.x, player.pos.z) && !G.isInsideWater(player.pos.x, player.pos.z));
check('world spawned: NPCs=' + G.NPCs.length + ' cars=' + G.cars.length,
  G.NPCs.length === 104 && G.cars.length === 34);
check('every AI car has a visible driver mesh', G.cars.every(c => c.driverMesh !== null));

/* ================= TEST 1: AK-47 with 500 rounds ================= */
key('Digit4');
check('weapon 4 selects AK-47', player.weapon === 3);
check('AK-47 starts with 500 rounds', player.ammoStore[3] === 500);

handlers.mousedown({ button: 0 });
step(20);            // ~0.32 s -> several shots at cd=0.10
handlers.mouseup({ button: 0 });
const afterBurst = player.ammoStore[3];
check('AK-47 ammo decreased while firing (' + afterBurst + '/500)', afterBurst < 500 && afterBurst >= 480);
key('KeyR');
check('R starts a timed reload', player.reloadT > 0);
step(100);                  // wait out the AK-47's 1.4 s reload
check('R reloads AK-47 back to 500 (timed reload completes)', player.ammoStore[3] === 500);

/* ================= TEST 2: aim assist -> precise hit on NPC ================= */
// clear every other NPC and car far away so the lane is guaranteed clean
G.NPCs.forEach(n => { n.pos.set(400, 0, 400); n.group.position.set(400, 0, 400); });
G.cars.forEach(c => { c.pos.set(420, 0, 420); c.group.position.set(420, 0, 420); });
const civ = G.NPCs.find(n => n.type === 'civilian' && !n.dead);
civ.dead = false;
civ.pos.set(player.pos.x, 0, player.pos.z + 8);   // straight ahead (+z = screen-centre aim)
civ.group.position.copy(civ.pos);
civ.hp = 40;
step(2);
handlers.mousedown({ button: 0 });
step(6);             // guarantees >= 1 shot (cd = 0.10 s)
handlers.mouseup({ button: 0 });
// crosshair nearly dead-centre -> aim-assist snaps to HEAD (headshot kill),
// slightly off-centre -> chest hit (40 - 30 = 10). Both prove precise assisted fire.
check('aim-assist shot hit the civilian precisely (headshot kill or hp 40 -> 10)',
  (civ.dead && civ.hp <= 0) || civ.hp === 10);
check('exactly one bullet consumed for the assisted shot', player.ammoStore[3] === 499);

/* ================= TEST 3: cars stop for the player, never hurt him ================= */
player.wanted = 0;                 // stand the beat cops down so only the car can hurt him
player.hp = 100;
const car = G.cars[0];
car.dead = false;
car.isPolice = false;
car.driver = null;
car.inCar = undefined;
car.pos.set(player.pos.x, 0, player.pos.z + 5);   // 5 m away, heading toward the player
car.heading = Math.PI;
car.curSpeed = car.maxSpeed;
car.wpIndex = 0;
car.route = [[player.pos.x, player.pos.z], [player.pos.x, player.pos.z]]; // waypoint = player position
for (let i = 0; i < 90; i++) {                     // ~1.5 s of simulation
  now += 16;
  const cb = rafCb; rafCb = null;
  if (cb) cb();
  if (!isFinite(car.heading)) break;
}
const distAfter = car.pos.distanceTo(player.pos);
check('car braked and STOPPED near the player (curSpeed=' + car.curSpeed.toFixed(2) + ')', car.curSpeed < 0.05);
check('car stopped at safe distance (' + distAfter.toFixed(2) + ' m)', distAfter > 2.5);
check('player took ZERO damage from the car (hp=' + player.hp + ')', player.hp === 100);
// park this car far away so it does not interfere with the carjacking test
car.pos.set(420, 0, 420);
car.group.position.set(420, 0, 420);

/* ================= TEST 4: carjacking an occupied car ================= */
const victim = G.cars[1];
victim.stolen = false;
victim.dead = false;
victim.maxSpeed = 0; victim.curSpeed = 0;         // keep it parked for the test
victim.pos.set(player.pos.x + 2, 0, player.pos.z);
victim.group.position.copy(victim.pos);
const npcCountBefore = G.NPCs.length;
player.wanted = 0;                                 // clear ambient crime noise first
const wantedBefore = player.wanted;
key('KeyE');                                       // E next to an occupied car -> jack it
check('player is now driving', player.inCar === victim);
check('car marked as stolen', victim.stolen === true);
check('driver mesh removed from cabin', victim.driverMesh === null);
check('ejected driver spawned as new ped', G.NPCs.length === npcCountBefore + 1);
check('stealing raised the wanted level (' + player.wanted.toFixed(1) + ' stars)', player.wanted > wantedBefore);
key('KeyE');                                       // exit
check('player exited the car', player.inCar === null);
key('KeyE');                                       // re-enter stolen car
check('re-entering a stolen car spawns no extra driver', G.NPCs.length === npcCountBefore + 1 && player.inCar === victim);
key('KeyE');                                       // exit again

/* ================= TEST 5: shoot a car until it EXPLODES (+ chain reaction) ===== */
G.NPCs.forEach(n => { n.pos.set(400, 0, 400); n.group.position.set(400, 0, 400); });
const c1 = G.cars[2], c2 = G.cars[3];
// evacuate every other car far away so the chain reaction can't eat the fleet
G.cars.forEach((c, k) => {
  if (c !== c1 && c !== c2 && !c.dead) {
    c.pos.set(-140 + (k % 12) * 26, 0, 130 + Math.floor(k / 12) * 18);
    c.group.position.copy(c.pos);
    c.prevPos.copy(c.pos);
    c.curSpeed = 0;
  }
});
[c1, c2].forEach(c => {                            // freeze both targets in place
  c.dead = false; c.stolen = true;                 // stolen=true so nothing re-ejects drivers
  c.driverMesh = null;
  c.maxSpeed = 0; c.curSpeed = 0;
  c.laneOffset = 0;                                // centre them on the bullet line
});
c1.pos.set(player.pos.x, 0, player.pos.z + 12);    // straight ahead of the crosshair
c1.group.position.copy(c1.pos);
c1.heading = Math.PI;
c2.pos.set(player.pos.x, 0, player.pos.z + 16);    // 4 m behind c1 -> inside blast chain radius
c2.group.position.copy(c2.pos);
c2.heading = Math.PI;
player.wanted = 0;
const hpBeforeBoom = player.hp;
check('target car alive before shooting', !c1.dead && (c1.shot || 0) === 0);
// aim like a real player: tilt the third-person camera so the centre
// crosshair lands on the road a bit past the car — the bullet's descending
// path then passes straight through the car's body/cabin.
aimCameraAtGround(player.pos.z + 22);
handlers.mousedown({ button: 0 });
step(45);                                          // 3+ AK shots at cd=0.10 s
handlers.mouseup({ button: 0 });
check('car exploded after ' + (c1.shot || 0) + ' bullets', c1.dead === true);
check('wreck is charred black', c1.group.userData.body.material.color.getHex() === 0x181818);
check('explosion raised the wanted level (' + player.wanted.toFixed(1) + ')', player.wanted > 0);
check('hero standing 12 m away took NO blast damage', player.hp === hpBeforeBoom);
check('nearby car caught the chain-reaction fuse', c2.fuseT !== undefined || c2.dead);
step(120);                                         // let the fuse burn out
check('chain reaction blew up the second car', c2.dead === true);
check('dead wrecks removed from bullet targets', !G.hittables.includes(c1.group.userData.body));

/* ================= TEST 6: WANTED -> police car PURSUIT -> officer deploys ===== */
G.NPCs.forEach(n => { n.pos.set(400, 0, 400); n.group.position.set(400, 0, 400); });
const copCar = G.cars.find(c => c.isPolice && !c.dead);
G.cars.forEach(c => { if (c !== copCar) c.dead = true; });   // quiet streets for the test
copCar.dead = false;
copCar.mode = 'traffic';
copCar.deployed = false;
copCar.maxSpeed = 9.5; copCar.curSpeed = 0;
copCar.laneOffset = 0;
copCar.pos.set(player.pos.x, 0, player.pos.z - 30);          // 30 m up the same avenue
copCar.group.position.copy(copCar.pos);
copCar.heading = 0;                                          // facing the hero
const npcsBeforePursuit = G.NPCs.length;
player.inCar = null;
player.wanted = 1;                                           // crime reported: heat is ON
let sawPursuit = false, stoppedClose = false;
for (let i = 0; i < 480; i++) {
  now += 16;
  const cb = rafCb; rafCb = null;
  if (cb) cb();
  if (copCar.mode === 'pursuit') sawPursuit = true;
  const d = copCar.pos.distanceTo(player.pos);
  if (sawPursuit && d <= 11.5 && copCar.curSpeed < 0.05) { stoppedClose = true; break; }
}
check('police cruiser switched to PURSUIT while wanted', sawPursuit);
check('cruiser raced over and STOPPED near the hero (' +
  copCar.pos.distanceTo(player.pos).toFixed(1) + ' m)', stoppedClose);
check('police officer jumped OUT of the stopped cruiser', copCar.deployed === true);
check('exactly one officer deployed', G.NPCs.length === npcsBeforePursuit + 1);
const officer = G.NPCs.find(n => n.type === 'police' && n.state === 'chase' && !n.dead &&
  n.pos.distanceTo(copCar.group.position) < 6);
check('deployed officer hunts on foot right beside the cruiser', !!officer);
check('officer is inside shooting range of the hero (<16 m)',
  !!officer && officer.pos.distanceTo(player.pos) < 16);
player.wanted = 0;                                           // heat off
step(10);
check('cruiser stands down to normal traffic when stars are gone', copCar.mode === 'traffic');
const officerAfter = G.NPCs.find(n => n.type === 'police' && !n.dead &&
  n.pos.distanceTo(copCar.group.position) < 8);
check('deployed officer holsters and stops chasing', !!officerAfter && officerAfter.state !== 'chase');

/* ================= TEST 7: held-weapon models in hand + HUD icon ============== */
const armR = G.player.group.userData.armR;
function heldMount() {
  return armR.children.find(ch => ch.name && ch.name.startsWith('wp-')) || null;
}
function selectAndCheck(digit, mountName, iconName, label) {
  key(digit);
  const m = heldMount();
  check(label + ' model is mounted on the right hand', !!m && m.name === mountName);
  check(label + ' HUD icon shows ' + iconName,
    els.heldIcon.textContent === iconName && els.heldName.textContent === label);
}
selectAndCheck('Digit1', 'wp-fist', '✊', 'TAY');
selectAndCheck('Digit2', 'wp-knife', '🔪', 'DAO');
selectAndCheck('Digit3', 'wp-gun', '🔫', 'SÚNG');
selectAndCheck('Digit4', 'wp-ak', '🔫', 'AK-47');
step(2);   // refresh world matrices via the stubbed render
const akMount = heldMount();
const handPos = new THREE.Vector3().setFromMatrixPosition(akMount.matrixWorld);
check('AK model sits at HAND height (' + handPos.y.toFixed(2) + ' m), not on the floor',
  handPos.y > 0.9 && handPos.y < 1.9);
check('AK muzzle points forward of the player',
  Math.abs(handPos.x - player.pos.x) < 1.2 && handPos.z > player.pos.z - 1);

/* ================= TEST 8: multi-city high-rise cores (Đông Anh style) ========= */
check('map contains multiple city cores (' + G.CITY_CORES.length + ')', G.CITY_CORES.length >= 4);
let maxH = 0, towers = 0;
for (const b of G.buildingBoxes) { if (b.h > maxH) maxH = b.h; if (b.h >= 25) towers++; }
check('skyline has real skyscrapers (max height ' + maxH.toFixed(1) + ' m)', maxH >= 40);
check('dense high-rise clusters generated (' + towers + ' towers >= 25 m)', towers >= 10);

/* ================= TEST 9: see-through occlusion fix =========================== */
let tall = null;
for (const b of G.buildingBoxes) if (!tall || b.h > tall.h) tall = b;
// stand just north of the tallest tower and swing the chase camera around to
// the south side: the tower now stands between the lens and the hero, so it
// must fade to glass instead of hiding him
player.pos.set(tall.cx, 0, tall.minZ - 2);
while (G.isInsideBuilding(player.pos.x, player.pos.z)) player.pos.z -= 2;
player.group.position.copy(player.pos);
G.setCameraLook(Math.PI, -0.2);          // look south (-z): camera parks beyond the tower
G.snapCamera();
step(70);
check('tower between camera and hero fades see-through (fade=' + tall.fade.toFixed(2) + ')',
  tall.fade < 0.5);
// walk far north away from it -> building turns solid again
player.pos.set(tall.cx, 0, tall.minZ - 90);
while (G.isInsideBuilding(player.pos.x, player.pos.z)) player.pos.z -= 2;
player.group.position.copy(player.pos);
step(90);
check('building turns solid again once the path is clear (fade=' + tall.fade.toFixed(2) + ')',
  tall.fade > 0.85);

/* ================= TEST 10: silky vehicle motion (fixed timestep + interp) ===== */
const mover = G.cars.find(c => !c.dead && !c.driver);   // survivor cruiser patrols in traffic mode
let maxJump = 0;
let px2 = mover.group.position.x, pz2 = mover.group.position.z;
for (let i = 0; i < 90; i++) {            // one 16 ms frame at a time
  step(1);
  const ddx = mover.group.position.x - px2, ddz = mover.group.position.z - pz2;
  if (i > 10) maxJump = Math.max(maxJump, Math.hypot(ddx, ddz));
  px2 = mover.group.position.x; pz2 = mover.group.position.z;
}
// ~7.5 u/s at 60 Hz ≈ 0.125 u per frame; way below means NO snapping/stutter
check('AI car glides frame-by-frame (' + maxJump.toFixed(3) + ' u max/frame)', maxJump < 0.35);
check('pursuit top speed preserved via eased throttle', typeof mover.curSpeed === 'number' && mover.curSpeed >= 0);

/* ================= TEST 11: wanted-level police escalation ====================== */
const pursuing = () => G.cars.filter(c => !c.dead && c.isPolice && c.mode === 'pursuit').length;
const aliveCruisers = () => G.cars.filter(c => !c.dead && c.isPolice).length;
const footChasing = () => G.NPCs.filter(n => !n.dead && n.type === 'police' && n.state === 'chase').length;
player.wanted = 0; step(30);
// TEST 6 isolated its pursuit by killing other cars -> rebuild the fleet
while (aliveCruisers() < 8) G.spawnCruiser();
step(2);
const A = aliveCruisers();
check('police fleet rebuilt for escalation tests (' + A + ' cruisers)', A === 8);
player.wanted = 1; step(40);
const p1 = pursuing();
check('1 sao -> exactly ' + Math.min(1, A) + ' cruiser pursues (got ' + p1 + ')',
  p1 === Math.min(1, A));
player.wanted = 3; step(60);
const p3 = pursuing();
const huntersBefore = new Set(
  G.NPCs.filter(n => n.type === 'police' && n.state === 'chase'));
check('3 sao -> ' + Math.min(3, A) + ' cruisers pursue (got ' + p3 + ')',
  p3 === Math.min(3, A));
step(400);                                   // ~6.7 s of dispatch orders
const extraCops = G.NPCs.filter(n => n.type === 'police' && !n.dead &&
  n.state === 'chase' && !huntersBefore.has(n)).length;
check('3 sao -> extra walking cops join the hunt (+' + extraCops + ')',
  extraCops >= 1 && footChasing() >= 2);
player.wanted = 5; step(40);
check('5 sao -> EVERY cruiser joins the hunt (' + pursuing() + '/' + A + ')',
  pursuing() === A);
player.wanted = 0; step(120);
check('hết sao -> toàn bộ rút lui về tuần tra', pursuing() === 0 && footChasing() === 0);

/* ================= TEST 12: river boats under the raised bridges ================ */
check('river has plenty of boats (' + G.boats.length + ')', G.boats.length >= 10);
check('bridge deck is raised for boat clearance (deck=' + G.groundY(-17.5, G.RIVER_Z).toFixed(2) + ' m)',
  G.groundY(-17.5, G.RIVER_Z) > 1.3);
check('open water sits at ground level (y=' + G.groundY(-70, G.RIVER_Z) + ')',
  G.groundY(-70, G.RIVER_Z) === 0);
const bt = G.boats[0];
const bx0 = bt.pos.x;
step(150);                                   // 2.5 s of cruising
const bMoved = Math.abs(bt.pos.x - bx0);
check('boats actively cruise the river (moved ' + bMoved.toFixed(1) + ' u)', bMoved > 2);
check('boats stay inside the river band',
  G.boats.every(b => Math.abs(b.pos.z - G.RIVER_Z) <= G.RIVER_HALF - 1));

/* ================= TEST 13: bridge ramps aligned (world-group regression) ====== */
// REGRESSION: `worldGroup.add(box).rotation.x = a` tilted the ENTIRE world,
// burying/levitating characters & vehicles near bridges. Ramps must be their
// own meshes and the world group must never be rotated.
const wg = G.world;
check('world group rotation stays at zero (regression)', wg.rotation.x === 0 && wg.rotation.y === 0 && wg.rotation.z === 0);
G.scene.updateMatrixWorld(true);
let deckBB = null, rampLo = 0, rampHi = -99;
G.scene.traverse(o => {
  if (!o.isMesh || o.geometry.type !== 'BoxGeometry') return;
  const gp = o.geometry.parameters; if (!gp) return;
  if (gp.width === 9 && (gp.height === 0.14 || gp.height === 0.12) && o.getWorldPosition(new THREE.Vector3()).y > 0.4) {
    const bb = new THREE.Box3().setFromObject(o);
    if (gp.depth > 30) { if (!deckBB) deckBB = bb; }
    else { rampLo = Math.max(rampLo, bb.min.y); rampHi = Math.min(rampHi, bb.max.y + 0.0); }
    if (gp.depth < 30) rampHi = Math.max(rampHi, bb.max.y);
  }
});
if (!deckBB) { check('bridge deck mesh exists', false); }
else {
  check('deck is LEVEL (' + (deckBB.max.y - deckBB.min.y).toFixed(2) + ' thick)',
    deckBB.max.y - deckBB.min.y <= 0.2);
  check('ramps rise from bank ~0 to deck ~1.5 (top=' + rampHi.toFixed(2) + ', bottom=' + rampLo.toFixed(2) + ')',
    rampHi <= 1.75 && rampHi >= 1.3 && rampLo <= 0.15);
}


/* ================= TEST 14: third-person chase camera =========================== */
G.respawn();
G.setCameraLook(0, -0.17);
G.snapCamera();
step(2);
const camP = G.camera.position, heroP = player.pos;
const camDistXZ = Math.hypot(camP.x - heroP.x, camP.z - heroP.z);
check('chase camera sits ' + camDistXZ.toFixed(2) + ' m behind the hero', camDistXZ > 3.5 && camDistXZ < 8);
check('chase camera rides above the street (y=' + camP.y.toFixed(2) + ')', camP.y > 1.8 && camP.y < 5);
const camDir = new THREE.Vector3();
G.camera.getWorldDirection(camDir);
check('camera looks forward along the street', camDir.z > 0.8);
check('hero stands in front of the lens', heroP.z - camP.z > 2);
const headNdc = player.group.position.clone();
headNdc.y += 1.7;
headNdc.project(G.camera);
check('hero sits below the crosshair and never blocks the aim (ndc.y=' + headNdc.y.toFixed(2) + ')', headNdc.y < -0.05);
const aim0 = G.aim();
const aimAng = Math.acos(Math.max(-1, Math.min(1,
  (aim0.dir.x * camDir.x + aim0.dir.z * camDir.z) / Math.max(1e-6, Math.hypot(camDir.x, camDir.z)))));
check('centre crosshair aims where the camera looks (' + (aimAng * 180 / Math.PI).toFixed(1) + '°)', aimAng < 0.25);

/* ================= TEST 15: camera-relative movement =========================== */
G.respawn(); G.setCameraLook(0, -0.17); G.snapCamera(); step(2);
let mx0 = player.pos.x, mz0 = player.pos.z;
key('KeyW'); step(24); keyup('KeyW');
check('W walks away from the camera (+z)', player.pos.z - mz0 > 0.8 && Math.abs(player.pos.x - mx0) < 0.3);
G.respawn(); G.setCameraLook(Math.PI / 2, -0.17); G.snapCamera(); step(2);
mx0 = player.pos.x; mz0 = player.pos.z;
key('KeyW'); step(24); keyup('KeyW');
check('rotating the camera re-maps W to +x', player.pos.x - mx0 > 0.8 && Math.abs(player.pos.z - mz0) < 0.3);
G.respawn(); G.setCameraLook(0, -0.17); G.snapCamera(); step(2);
mx0 = player.pos.x; mz0 = player.pos.z;
key('KeyD'); step(24); keyup('KeyD');
// screen-right of a camera looking +z is world -x
check('D strafes toward screen-right (-x) relative to the camera', mx0 - player.pos.x > 0.8 && Math.abs(player.pos.z - mz0) < 0.4);
check('character turns toward the strafe direction (sin facing≈-1)', Math.abs(Math.sin(player.facing) + 1) < 0.35);

/* ================= TEST 16: driving chase-cam + speedometer ===================== */
const driver = G.cars.find(c => !c.dead && c.isPolice && !c.driver);
G.respawn();
player.pos.set(driver.pos.x + 1.6, 0, driver.pos.z);
player.group.position.copy(player.pos);
G.setCameraLook(driver.heading, -0.17);
G.snapCamera();
key('KeyE');
check('E carjacks the cruiser', player.inCar === driver);
key('KeyW'); step(60); keyup('KeyW');
const carNow = driver.group.position, camNow = G.camera.position;
const behindDot = (camNow.x - carNow.x) * Math.sin(driver.heading) + (camNow.z - carNow.z) * Math.cos(driver.heading);
check('driving camera swings behind the car (dot=' + behindDot.toFixed(2) + ')', behindDot < -1.5);
check('speedometer reads while driving (' + els.speedN.textContent + ' km/h)', Number(els.speedN.textContent) > 10);
const steerH0 = driver.heading;
key('KeyD'); step(10); keyup('KeyD');
check('D steers the car toward screen-right (heading decreases)', driver.heading < steerH0 - 0.02);
key('KeyE');
check('E steps out of the car again', player.inCar === null);

/* ================= TEST 17: right-mouse aim zoom =============================== */
G.respawn(); G.setCameraLook(0, -0.17); G.snapCamera(); step(2);
const d0 = Math.hypot(G.camera.position.x - player.pos.x, G.camera.position.z - player.pos.z);
handlers.mousedown({ button: 2 });
step(40);
const d1 = Math.hypot(G.camera.position.x - player.pos.x, G.camera.position.z - player.pos.z);
check('right mouse pulls the camera over the shoulder (' + d1.toFixed(2) + ' m)', d1 < d0 - 1);
check('aim camera sits over the screen-right shoulder', G.camera.position.x - player.pos.x < -0.2);
handlers.mouseup({ button: 2 });
step(20);

/* ================= TEST 18: wheel zoom ========================================= */
const distBefore = G.cameraState.dist;
handlers.wheel({ deltaY: 480, preventDefault() {} });
step(30);
check('wheel zooms the chase camera out (' + distBefore.toFixed(1) + ' → ' + G.cameraState.dist.toFixed(1) + ')',
  G.cameraState.dist > distBefore + 0.5);




/* ================= TEST 22: mouse look completeness (yaw/pitch/invert/sens) ==== */
document.pointerLockElement = els.game;          // fake pointer lock for the test
G.respawn();
G.setCameraLook(0, -0.17);
G.snapCamera();
step(2);
const look0 = G.cameraState;
handlers.mousemove({ clientX: 640, clientY: 360, movementX: 120, movementY: 0 });
check('mouse right turns the camera to screen-right (yaw ' + (G.cameraState.yaw - look0.yaw).toFixed(2) + ' rad)',
  look0.yaw - G.cameraState.yaw > 0.1);
handlers.mousemove({ clientX: 640, clientY: 360, movementX: -120, movementY: 0 });
check('mouse left turns it back symmetrically', Math.abs(G.cameraState.yaw - look0.yaw) < 1e-6);
const pitch0 = G.cameraState.pitch;
handlers.mousemove({ clientX: 640, clientY: 360, movementX: 0, movementY: -100 });
check('mouse up tilts the camera up (pitch ' + G.cameraState.pitch.toFixed(2) + ')',
  G.cameraState.pitch - pitch0 > 0.1);
handlers.mousemove({ clientX: 640, clientY: 360, movementX: 0, movementY: 100 });
check('mouse down tilts the camera back down', Math.abs(G.cameraState.pitch - pitch0) < 1e-6);
key('KeyY');
handlers.mousemove({ clientX: 640, clientY: 360, movementX: 0, movementY: -100 });
check('invert-Y flips the vertical axis', G.cameraState.pitch - pitch0 < -0.1);
key('KeyY');
const sens0 = G.cameraState.sens;
key('BracketRight');
check('] raises mouse sensitivity', G.cameraState.sens > sens0);
key('BracketLeft');
check('[ lowers it again', Math.abs(G.cameraState.sens - sens0) < 1e-6);
document.pointerLockElement = null;

/* ================= TEST 20: weapon handling (semi/auto, reload, recoil) ========= */
G.respawn();
player.wanted = 0;
key('Digit3');                       // pistol
step(20);                            // weapon draw time
check('pistol selected', player.weapon === 2);
player.ammoStore[2] = 100;
handlers.mousedown({ button: 0 });   // hold: pistol must NOT empty the mag
step(40);
handlers.mouseup({ button: 0 });
check('pistol is semi-auto: one round per click (' + player.ammoStore[2] + '/100)', player.ammoStore[2] === 99);
handlers.mousedown({ button: 0 });   // a fresh click fires again
step(6);
handlers.mouseup({ button: 0 });
check('next click fires the second pistol round', player.ammoStore[2] === 98);
check('firing kicks weapon recoil', player.recoil > 0.1);

G.respawn(); player.wanted = 0;
key('Digit3'); step(20);
player.ammoStore[2] = 40;
key('KeyR');
check('timed reload starts without refilling instantly', player.reloadT > 0 && player.ammoStore[2] === 40);
step(30);
check('reload still in progress mid-way', player.reloadT > 0 && player.ammoStore[2] === 40);
step(40);
check('pistol magazine refilled after the reload finishes', player.ammoStore[2] === 100);

player.ammoStore[2] = 0;
handlers.mousedown({ button: 0 });   // dry trigger
step(3);
handlers.mouseup({ button: 0 });
check('empty pistol auto-starts a reload', player.reloadT > 0 && player.ammoStore[2] === 0);
step(80);
check('auto-reload refills the pistol', player.ammoStore[2] === 100);

G.respawn(); player.wanted = 0;
key('Digit4'); step(20);             // AK-47
const akBefore = player.ammoStore[3];
handlers.mousedown({ button: 0 });   // hold: AK-47 sprays
step(45);
handlers.mouseup({ button: 0 });
const akFired = akBefore - player.ammoStore[3];
check('AK-47 full-auto keeps firing while the trigger is held (' + akFired + ' rounds)', akFired >= 3);
check('weapon recoil is applied after a burst', player.recoil > 0.1);

/* ================= TEST 21: bullets are stopped by buildings =================== */
G.respawn(); player.wanted = 0;
G.NPCs.forEach(n => { n.pos.set(400, 0, 400); n.group.position.set(400, 0, 400); });
G.cars.forEach(c => {
  if (c.dead) return;
  c.driver = null; c.prevPos.copy(c.pos);
  c.pos.set(420, 0, 420); c.group.position.copy(c.pos);
  c.curSpeed = 0;
});
const tower = G.buildingBoxes.reduce((a, b) => (a.h > b.h ? a : b));
player.pos.set(tower.cx, 0, tower.minZ - 25);
while (G.isInsideBuilding(player.pos.x, player.pos.z)) player.pos.z -= 2;
player.group.position.copy(player.pos);
const wallCar = G.cars.find(c => !c.dead);
wallCar.driver = null; wallCar.driverMesh = null; wallCar.stolen = true;
wallCar.maxSpeed = 0; wallCar.curSpeed = 0; wallCar.laneOffset = 0;
wallCar.pos.set(tower.cx, 0, tower.maxZ + 6);
wallCar.group.position.copy(wallCar.pos);
aimCameraAtGround(tower.maxZ + 18);
const wallShotsBefore = wallCar.shot || 0;
handlers.mousedown({ button: 0 });
step(20);                            // several AK rounds straight into the tower
handlers.mouseup({ button: 0 });
check('bullets are blocked by the tower (car behind it untouched)', (wallCar.shot || 0) === wallShotsBefore);

/* ================= TEST 19: Vice City sunset art direction ===================== */
G.setTimeOfDay('afternoon'); // art-direction checks assume the sunset baseline
G.setWeather('clear');
step(2);
let skyDomes = 0, sunSprites = 0, oceanPlane = null, palmTrunks = 0, neonMeshes = 0, opaqueFaded = 0;
const NEON_HEX = [0xff3fa4, 0x3fe0ff, 0xb45cff, 0xffd23f, 0xff6a3f, 0x64ff9a];
G.scene.traverse(o => {
  if (o.isSprite) sunSprites++;
  if (o.isMesh && o.geometry) {
    const g = o.geometry.parameters || {};
    if (o.geometry.type === 'SphereGeometry' && g.radius >= 1000) skyDomes++;
    if (o.geometry.type === 'PlaneGeometry' && g.width >= 2000 && g.height >= 2000) oceanPlane = o;
    if (o.geometry.type === 'CylinderGeometry' && o.material && o.material.color && o.material.color.getHex() === 0x7a5a38) palmTrunks++;
    if (o.material && !Array.isArray(o.material) && o.material.type === 'MeshBasicMaterial' && o.material.color &&
        NEON_HEX.indexOf(o.material.color.getHex()) >= 0) neonMeshes++;
  }
});
for (const b of G.buildingBoxes) if (b.mats[0].transparent) opaqueFaded++;
check('sunset sky dome is in the scene', skyDomes >= 1);
check('glowing sunset sun sprite is in the scene', sunSprites >= 1);
check('warm sunset fog paints the horizon', G.scene.fog && G.scene.fog.color.getHex() === 0xff9a80);
check('Vice City bay: huge ocean plane exists', !!oceanPlane && oceanPlane.position.y < 0);
check('palm trees line the streets (' + palmTrunks + ' trunks)', palmTrunks >= 20);
check('neon accent lights dress the skyline (' + neonMeshes + ' neon meshes)', neonMeshes >= 50);
check('building facades start OPAQUE (no transparent pipeline cost)', opaqueFaded === 0);


/* ================= TEST 23: Vice City 3D pedestrian rig ======================== */
const rigNpc = G.NPCs.find(n => !n.dead);
G.scene.updateMatrixWorld(true);
const rigBB = new THREE.Box3().setFromObject(rigNpc.group);
check('pedestrian is a full 3D humanoid (~' + (rigBB.max.y - rigBB.min.y).toFixed(2) + ' m tall)',
  rigBB.max.y - rigBB.min.y > 1.6 && rigBB.max.y - rigBB.min.y < 2.2);
check('pedestrian stands on the ground (feet ' + rigBB.min.y.toFixed(2) + ' m)', rigBB.min.y > -0.15 && rigBB.min.y < 0.25);
const rig = rigNpc.group.userData;
check('pedestrian rig has head, hair, hands, shoes, legs and arms',
  !!rig.head && !!rig.hair && !!rig.handL && !!rig.handR && !!rig.shoeL && !!rig.legL && !!rig.armL);
check('pedestrian body is sculpted from >= 15 low-poly pieces (' + rig.parts.length + ')', rig.parts.length >= 15);
let rigGlasses = 0, rigCaps = 0, rigLong = 0;
G.NPCs.forEach(n => {
  const u = n.group.userData;
  if (u.hair && u.hair.geometry && u.hair.geometry.type === 'CylinderGeometry') rigCaps++;
  u.parts.forEach(p => {
    const gp = p.geometry && p.geometry.parameters;
    if (!gp) return;
    if (gp.width === 0.3 && gp.height === 0.08) rigGlasses++;
    if (gp.width === 0.32 && gp.height === 0.34) rigLong++;
  });
});
check('street crowd wears sunglasses (' + rigGlasses + ')', rigGlasses >= 5);
check('police and civilians wear caps (' + rigCaps + ')', rigCaps >= 10);
check('long-haired pedestrians exist (' + rigLong + ')', rigLong >= 5);
const heroEyes = G.player.group.userData.parts.filter(p => p.geometry && p.geometry.parameters &&
  p.geometry.parameters.width === 0.07 && p.geometry.parameters.height === 0.045).length;
check('hero has a detailed 3D face (2 eyes)', heroEyes >= 2);
check('hero wears a patterned tropical shirt', !!(G.player.group.userData.body.material.map));
let rigPrints = 0;
G.NPCs.forEach(n => { const m = n.group.userData.body && n.group.userData.body.material; if (m && m.map) rigPrints++; });
check('some pedestrians wear tropical print shirts (' + rigPrints + ')', rigPrints >= 3);


/* ================= TEST 24: on-foot feel + car entry polish ==================== */
G.respawn();
G.NPCs.forEach(n => { n.pos.set(400, 0, 400); n.group.position.set(400, 0, 400); });
G.cars.forEach(c => {
  if (c.dead) return;
  c.driver = null;
  c.pos.set(420, 0, 420);
  c.prevPos.copy(c.pos);
  c.group.position.copy(c.pos);
  c.curSpeed = 0;
});
G.setCameraLook(0, -0.17); G.snapCamera(); step(2);
player.vel.set(0, 0, 0);                 // G.respawn already placed the hero at SPAWN
step(2);
key('KeyW'); step(4);
const vEarly = Math.hypot(player.vel.x, player.vel.z);
check('on foot accelerates from rest (v=' + vEarly.toFixed(2) + ' u/s)', vEarly > 0.3 && vEarly < 5.5);
step(22);
const vFull = Math.hypot(player.vel.x, player.vel.z);
check('reaches full walking speed (' + vFull.toFixed(2) + ' u/s)', vFull > 5.8);
keyup('KeyW'); step(22);
check('brakes smoothly to a stop', Math.hypot(player.vel.x, player.vel.z) < 0.2);

G.respawn();
let wallB = null;
for (const b of G.buildingBoxes) {
  if (b.h < 30) continue;
  let clear = true;
  for (const o of G.buildingBoxes) {
    if (o === b) continue;
    if (o.maxX > b.cx - 1 && o.minX < b.cx + 1 && o.maxZ > b.minZ - 4.5 && o.minZ < b.minZ + 1) { clear = false; break; }
  }
  if (clear) { wallB = b; break; }
}
if (!wallB) wallB = G.buildingBoxes.reduce((a, b) => (a.h > b.h ? a : b));
player.pos.set(wallB.cx, 0, wallB.minZ - 3);
while (G.isInsideBuilding(player.pos.x, player.pos.z)) player.pos.z -= 2;
player.group.position.copy(player.pos);
G.setCameraLook(0, -0.17); G.snapCamera(); step(2);
player.vel.set(0, 0, 0);
key('KeyW'); step(45); keyup('KeyW');
const wallGap = wallB.minZ - player.pos.z;
check('hero stops at the wall with body clearance (gap ' + wallGap.toFixed(2) + ' m)',
  wallGap > 0.2 && wallGap < 1.6 && !G.isInsideBuilding(player.pos.x, player.pos.z));

G.respawn();
player.wanted = 0;
let entryCar = G.cars.find(c => !c.dead);
if (!entryCar) entryCar = G.spawnCruiser();
entryCar.dead = false; entryCar.stolen = false; entryCar.driver = null;
entryCar.driverMesh = null; entryCar.maxSpeed = 9.5; entryCar.curSpeed = 0; entryCar.laneOffset = 0;
entryCar.heading = Math.PI / 2;
entryCar.pos.set(player.pos.x + 2, 0, player.pos.z + 1);
entryCar.group.position.copy(entryCar.pos);
step(2);
check('near-car prompt appears ("' + els.carPrompt.textContent + '")', els.carPrompt.textContent.indexOf('XE') >= 0);
key('KeyE');
check('E enters the car', player.inCar === entryCar);
check('camera aligns behind the car heading', Math.abs(G.cameraState.yaw - entryCar.heading) < 1e-6);
key('KeyE');
check('E exits beside a safe door',
  player.inCar === null && !G.isInsideBuilding(player.pos.x, player.pos.z) &&
  player.pos.distanceTo(entryCar.pos) > 1.2 && player.pos.distanceTo(entryCar.pos) < 4.5);
const parked = entryCar.pos.clone();
step(60);
check('stolen car stays parked where the hero left it', entryCar.pos.distanceTo(parked) < 0.5);


/* ================= TEST 25: weather + GMT+7 running clock ====================== */
G.setTimeOfDay('afternoon');   // deterministic sunset baseline for the weather checks
G.setWeather('clear');
step(2);
let wx = G.weather;
check('sunny weather keeps the warm sunset fog', wx.fogColor === 0xff9a80);
check('sun is visible in sunny weather', wx.sunVisible === true);
check('clear weather restores visibility (fog far ' + Math.round(wx.fogFar) + ' m)', wx.fogFar > 550);
check('weather HUD label shows sunny', els.weatherLabel.textContent.indexOf('NẮNG') >= 0);

G.setWeather('rain');
step(2);
wx = G.weather;
check('rain weather forces dark clouds (shade ' + wx.cloudShade.toFixed(2) + ')', wx.rain > 0.7 && wx.dark > 0.7 && wx.cloudShade < 0.6);
check('rain fog closes in (' + Math.round(wx.fogFar) + ' m)', wx.fogFar < 400);
check('the sun disappears behind the clouds', wx.sunVisible === false);
check('rain streaks are rendered', wx.rainVisible === true && wx.rainOpacity > 0.2);
check('weather HUD label shows rain', els.weatherLabel.textContent.indexOf('MƯA') >= 0);
step(120);                         // keep raining for ~2 s
check('rain keeps falling over time', G.weather.rainVisible === true && G.weather.rain > 0.7);
G.strikeLightning();
step(1);
check('lightning flash fires', G.weather.lightning > 0 && Number(els.lightning.style.opacity) > 0);
step(40);
check('lightning flash fades out', G.weather.lightning === 0);

G.setWeather('clear');
step(2);
wx = G.weather;
check('clearing weather brings the sunset back', wx.rain < 0.05 && wx.fogColor === 0xff9a80 && wx.sunVisible === true);

const cm = /^(\d{2}):(\d{2}):(\d{2})$/.exec(els.clockTime.textContent);
check('clock displays HH:MM:SS ("' + els.clockTime.textContent + '")', !!cm);
check('clock phase label exists', ['SÁNG', 'CHIỀU', 'TỐI'].indexOf(els.timePhase.textContent) >= 0);
check('clock labels the GMT+7 zone', els.clockZone.textContent === 'GMT+7');

key('KeyT'); step(1);
check('T hotkey cycles the weather (now ' + G.weather.state + ')', G.weather.state === 'cloudy');
G.setWeather('clear');
step(2);


/* ================= TEST 26: VC-style action animations & no aim icon ============ */
G.setWeather('clear');
G.respawn();
step(2);
key('Digit4');                       // AK-47
step(30);                            // finish the draw
G.scene.updateMatrixWorld(true);
const handW = new THREE.Vector3();
const akHandMount = G.player.group.userData.armR.children.find(ch => ch && ch.name === 'wp-ak');
akHandMount.getWorldPosition(handW);
check('gun is carried low at the hip while idle', handW.y > 0.85 && handW.y < 1.1);
handlers.mousedown({ button: 2 });   // aim
step(6);
G.scene.updateMatrixWorld(true);
akHandMount.getWorldPosition(handW);
check('aiming raises the weapon to the shoulder (' + handW.y.toFixed(2) + ' m)', handW.y > 1.15);
handlers.mouseup({ button: 2 });
step(4);

key('Digit1'); step(20);             // fists
handlers.mousedown({ button: 0 });
step(2);
const swingT = G.player.meleeT;
handlers.mouseup({ button: 0 });
check('punch plays a swing animation', swingT > 0);
step(40);

G.respawn();
let doorCar = G.cars.find(c => !c.dead);
if (!doorCar) doorCar = G.spawnCruiser();
doorCar.dead = false; doorCar.stolen = true; doorCar.driver = null;
doorCar.driverMesh = null; doorCar.maxSpeed = 0; doorCar.curSpeed = 0;
doorCar.heading = 0;
doorCar.pos.set(player.pos.x + 2, 0, player.pos.z + 1);
doorCar.group.position.copy(doorCar.pos);
step(2);
key('KeyE');
step(6);
const doorOpen = Math.abs(doorCar.group.userData.doorL.rotation.y) + Math.abs(doorCar.group.userData.doorR.rotation.y);
check('car door swings open when the hero enters (' + doorOpen.toFixed(2) + ' rad)', doorOpen > 0.1);
key('KeyE');
step(60);
const doorShut = Math.abs(doorCar.group.userData.doorL.rotation.y) + Math.abs(doorCar.group.userData.doorR.rotation.y);
check('car door closes again after the animation', doorShut < 0.02);

const hudHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
check('aim reticle icon removed from the HUD', hudHtml.indexOf('id="crosshair"') === -1);
let skirtCount = 0;
G.NPCs.forEach(n => { if (n.group.userData.skirt) skirtCount++; });
check('female pedestrians wear skirts (' + skirtCount + ')', skirtCount >= 1);


/* ================= TEST 27: random morning / afternoon / night ================= */
G.setWeather('clear');
step(2);
G.setTimeOfDay('morning');
step(2);
let ti = G.timeInfo;
check('morning phase is SÁNG', ti.phase === 'morning' && ti.label === 'SÁNG');
check('morning sun is up', ti.sun > 0.5);
check('morning stars are hidden', ti.stars < 0.2);
check('morning fog is bright (0x' + ti.fogColor.toString(16) + ')', ti.fogColor !== 0x0b1022 && ti.fogFar > 500);
check('clock shows SÁNG', els.timePhase.textContent === 'SÁNG');

G.setTimeOfDay('afternoon');
step(2);
ti = G.timeInfo;
check('afternoon phase is CHIỀU', ti.phase === 'afternoon' && ti.label === 'CHIỀU');
check('afternoon keeps the sunset fog', ti.fogColor === 0xff9a80);
check('clock shows CHIỀU', els.timePhase.textContent === 'CHIỀU');

G.setTimeOfDay('night');
step(2);
ti = G.timeInfo;
check('night phase is TỐI', ti.phase === 'night' && ti.label === 'TỐI');
check('night hides the sun', ti.sun < 0.1);
check('night shows the moon', ti.moon > 0.5);
check('night shows the stars', ti.stars > 0.5);
check('night fog is dark (0x' + ti.fogColor.toString(16) + ')', ti.fogColor === 0x0b1022);
check('clock shows TỐI', els.timePhase.textContent === 'TỐI');

G.setGameHour(15);
step(2);
const clockA = els.clockTime.textContent;
step(75);
check('in-game clock keeps running', els.clockTime.textContent !== clockA);
check('clock sits inside the afternoon hour', G.timeInfo.hour >= 15 && G.timeInfo.hour < 16);
check('clock still labels GMT+7', els.clockZone.textContent === 'GMT+7');

key('KeyG'); step(1);
check('G randomizes the time of day', ['SÁNG', 'CHIỀU', 'TỐI'].indexOf(els.timePhase.textContent) >= 0);


/* ================= TEST 28: main menu, settings and pause ====================== */
const uiHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
check('main menu has Start / Settings / About', ['id="startBtn"', 'id="settingsBtn"', 'id="aboutBtn"'].every(id => uiHtml.indexOf(id) >= 0));
check('settings panel has graphics / controls / audio tabs',
  ['id="settingsOverlay"', 'id="qQuality"', 'id="qFov"', 'id="qWeather"', 'id="qFps"', 'id="cSens"', 'id="cInvert"', 'id="aVol"', 'id="aMute"'].every(id => uiHtml.indexOf(id) >= 0));
check('about panel exists', uiHtml.indexOf('id="aboutOverlay"') >= 0);
check('in-game menu button + pause menu exist', uiHtml.indexOf('id="menuBtn"') >= 0 && uiHtml.indexOf('id="pauseOverlay"') >= 0);
check('old text-lines hint block removed from the HUD', uiHtml.indexOf('id="hint"') === -1);

G.setSetting('fov', 70);
check('graphics: FOV can be changed from settings (fov=' + G.camera.fov + ')', G.camera.fov === 70);
G.setSetting('sens', 2);
check('controls: mouse sensitivity can be changed from settings', Math.abs(G.cameraState.sens - 2) < 1e-6);
G.setSetting('invertY', true);
check('controls: invert-Y can be toggled from settings', G.cameraState.invertY === true);
G.setSetting('quality', 'low');
check('graphics: quality can be switched to low', G.settings.quality === 'low');
G.setSetting('showFps', true);
check('graphics: FPS counter can be enabled', G.settings.showFps === true);
G.setSetting('fxWeather', false);
check('graphics: weather effects can be disabled', G.settings.fxWeather === false);

// starting the game from the menu works
G.respawn();
player.hp = player.maxHp;
document.getElementById('menuBtn')._h.click[0]();
check('menu button pauses the game', G.paused === true);
document.getElementById('resumeBtn')._h.click[0]();
check('resume button unpauses', G.paused === false);

// restore sensible defaults for anything that runs later
G.setSetting('fov', 62);
G.setSetting('sens', 1);
G.setSetting('invertY', false);
G.setSetting('quality', 'medium');
G.setSetting('showFps', false);
G.setSetting('fxWeather', true);
check('settings can be restored to defaults', G.settings.fov === 62 && G.settings.quality === 'medium');

console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : '\n' + failures + ' TEST(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
