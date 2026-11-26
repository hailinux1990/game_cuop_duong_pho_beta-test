# Deployment Guide — PIXEL VICE CITY

PIXEL VICE CITY — UNITY CITY is a standalone **3D third-person open-world** web game (GTA style) with a full **Unity-quality graphics overhaul** (sRGB + ACES tone mapping, PBR materials, soft shadows, detailed buildings/NPCs/vehicles) that runs in any modern browser on Windows, Ubuntu, or other platforms. It needs WebGL (hardware acceleration enabled). The game opens on a **night-time city** — like the "Open World GTA Style" prototype — with armed street gangs, full mobility (jump/roll/crouch/crawl) and a mission system.

## Quick Start

### Windows

1. **Double-click `index.html`** to open the game directly
2. **Or run a local server** from Command Prompt/PowerShell:
   ```cmd
   cd game_test_gta
   python -m http.server 8123
   ```
3. **Open your browser** to: `http://localhost:8123/`

### Ubuntu / Linux

1. **Double-click `index.html`** to open the game directly
2. **Or run a local server** from Terminal:
   ```bash
   cd game_test_gta
   python3 -m http.server 8123
   ```
3. **Open your browser** to: `http://localhost:8123/`

## System Requirements

- **Browser**: Chrome, Edge, Firefox, or Safari (modern versions)
- **3D Support**: WebGL required (Chrome/Edge/Firefox with hardware acceleration; the game shows a friendly "THIẾU WEBGL" message if unavailable)
- **Memory**: 2GB+ RAM recommended
- **No GPU acceleration**: The game includes a headless mode for systems without dedicated GPU

## Launch Options

### Direct File Access
- Simply double-click `index.html` - the game loads entirely offline
- No internet connection required (all assets are bundled locally)
- Works in offline mode

### Local Server
Recommended for testing changes or sharing with others:

```bash
# Ubuntu/Linux
python3 -m http.server 8123

# Windows (Command Prompt)
python -m http.server 8123

# Windows (PowerShell)
python -m http.server 8123
```

### Alternative Servers
If Python isn't available:

**Node.js + http-server**:
```bash
npm install -g http-server
http-server game_test_gta -p 8123
```

**Serve with live reload** (for development):
```bash
# Install dependencies if needed
npm install

# For Ubuntu/Linux
npx live-server

# For Windows with npm globally installed
live-server
```

## Port Configuration

The default port is `8123`. If you need to change it:

```bash
# Ubuntu/Linux
python3 -m http.server 8080

# Windows
python -m http.server 8080
```

Then access the game at: `http://localhost:8080/`

## Troubleshooting

### Game doesn't load
1. **Refresh the page** - clear browser cache if needed
2. **Enable WebGL** - check browser settings
3. **Check console** - open browser developer tools for JavaScript errors

### How to enable WebGL 3D in your browser
WebGL is the browser's built-in 3D API — it is not a plugin and needs no install.
It runs on the GPU, so it requires **hardware acceleration** to be switched on.

**Quick check:** open https://get.webgl.org/ — a spinning cube means WebGL works.
If the cube is missing, enable it as follows:

**Google Chrome:**
1. Open `chrome://settings/system` (Settings → System)
2. Turn ON **"Use hardware acceleration when available"** → click **Relaunch**
3. Verify on `chrome://gpu` that "WebGL" says **Hardware accelerated**
4. Old/blocklisted GPU? Open `chrome://flags`, set **"Override software rendering list"** to **Enabled**, relaunch

**Microsoft Edge:**
1. Open `edge://settings/system`
2. Turn ON **"Use hardware acceleration when available"** → restart Edge
3. Verify on `edge://gpu`; if needed enable **"Override software rendering list"** in `edge://flags`

**Mozilla Firefox:**
1. Settings → General → **Performance**
2. Untick **"Use recommended performance settings"**, tick **"Use hardware acceleration when available"** → restart Firefox
3. Verify on `about:support` (section Graphics, "WebGL 1/2 Driver Renderer")
4. Extra check in `about:config`: `webgl.disabled` must be **false**, `webgl.force-enabled` = **true** if needed

**Safari (macOS/iOS):** WebGL is on by default in modern versions; if the game
still reports no WebGL, update the OS/browser.

**Windows:** update the GPU driver (NVIDIA / AMD / Intel sites or Device Manager).
**Ubuntu / Linux:** update the graphics drivers (mesa / vendor driver); WebGL is
usually disabled over remote desktop (RDP/VNC/teamviewer) — run the browser on
the real machine, or use the software fallback below.

**Still no WebGL (VM, remote desktop, very old GPU):**
- In Chrome/Edge enable **"Override software rendering list"** — the browser then
  uses SwiftShader (software WebGL): slower, but the game still runs;
- the game also ships a headless smoke-test mode (`node tests/smoke.test.cjs`)
  that validates all logic without any GPU.

### Performance issues
1. **Close other tabs** - game uses significant GPU resources
2. **Lower graphics** - some browsers have graphics settings
3. **Lower the quality preset** - Cài đặt → Đồ họa → Chất lượng Thấp (tắt bóng đổ, giảm độ phân giải)

### Audio not working
- The game uses WebAudio API - ensure browser allows audio autoplay
- Click anywhere on the page first to enable audio

## Advanced Usage

### Run smoke tests (headless mode)
Validate the game logic without graphics:

```bash
cd game_test_gta
node tests/smoke.test.cjs
```

All 346 smoke tests should pass. A browser harness also lives in `tests/browser-smoke.html` (works even without WebGL by stubbing the renderer).

### Mobile/iPad
- Works with touch controls
- Use virtual joystick on screen
- Tap to attack, swipe to aim

## Building for Distribution

To package as a desktop app:

### Electron (cross-platform)
1. Install Electron: `npm install -g electron`
2. Create main process script
3. Use `electron-packager` to distribute

### Web deployment
Deploy to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3
- Firebase Hosting

Just upload all files (`index.html`, `js/`, `lib/`, `LICENSE`) to the root directory.

## Game Controls

**Keyboard / Mouse (third-person):**
- WASD / Arrow keys: Move relative to the camera
- Shift: Run · Space: Jump · Ctrl: Roll-dodge (brief invulnerability + forward dash)
- C: Crouch · Z: Crawl
- Mouse: Orbit the chase-camera 360° horizontally and up/down (click to lock the pointer, ESC to unlock; without lock: hold right button still to aim, drag to orbit)
- Wheel: Zoom the camera
- Left click: Attack / shoot toward the centre of the camera (no reticle icon; GTA-style auto-aim; pistol = one shot per click, AK-47 = hold for full auto)
- Right click (hold still): Over-the-shoulder aim zoom, tighter spread, steadier recoil
- V: Snap the camera back behind the hero / car
- [ / ]: Mouse sensitivity down / up   ·   Y: Invert vertical look
- Q / E: Cycle the weapon wheel (previous / next) · 1-5: Direct weapon select (fists / knife / pistol / AK-47 / bomb)
- R: Reload (timed; auto-reloads when the magazine runs dry)
- F: Action / enter / exit / steal vehicles · M: Mission info panel · ESC: pause menu

**Touch:**
- Left half: virtual joystick for movement
- Right half: drag to orbit the camera, quick tap to attack/shoot

## File Structure
```
game_test_gta/
├── index.html          # Game interface
├── js/game.js          # Game logic + Unity-style graphics (~5600 lines)
├── lib/three.min.js    # Three.js engine (r128)
├── LICENSE            # Game license
├── README.md          # This documentation
├── DEPLOYMENT.md      # Deployment guide
├── tests/             # Automated tests (Node smoke + browser harness)
└── debug_bridge.cjs   # Debug utilities
```

## Version Notes
- Full Unity-style graphics overhaul: sRGB output + ACES Filmic tone mapping, PBR (MeshStandardMaterial) materials, PCFSoft shadows that follow the player, emissive night windows & street lamps, animated water
- Realism pass 2: shaded skin textures + coloured irises + sleeved arms/bare forearms, woven fabric folds + denim twill + print shirts, sneakers with white soles; bevelled ExtrudeGeometry car bodies with fender bulges, raked glass canopies, treaded tires + 5-spoke alloy rims, round glowing headlights; realistic great-white sharks (full fin set, gills, white belly, crescent tail); brick/concrete facades, asphalt with cracks, sidewalk joints, grass blades, sand speckle, roof gravel, curtained night windows, readable shop signs, rolling vertex waves on ocean + river
- Gangstar Vegas pass 3: living pedestrian faces — per-NPC moods (calm/happy/talking/laughing/crying with dripping tears + sobbing/angry/fear with wide eyes), emoji speech bubbles (😊💬😂😭😠😱) over nearby heads, laugh/sob sound cues, suit + tie civilians, glowing billboards after dark
- Human pass 4 (real people): realistic head proportions + painted faces on the skull sphere (eye sockets, nose bridge, nostrils, lips, cheeks, brows), strand-textured hair, coloured irises over the sockets, smooth shoulder caps, rounded hips — the 3D mood rig still animates the face on top
- Interaction pass 5: ESC opens/closes the pause menu (also via pointer-lock release); the idle hero turns to face the camera so you can inspect his face/eyes/body from the front; pedestrians glance at the hero when he walks close; ramming cars at speed shatters windshields/side windows (flying glass shards), makes the victim smoulder for a few seconds and then explode (chain reaction included)
- Traffic pass 6: cars are solid bodies — AI cars never clip through each other, they brake and queue behind the car ahead then steer around obstructions, the rammed car grinds to a stop (stun), pedestrians walk AROUND cars instead of through them, the hero on foot is blocked by parked/moving cars, and all traffic keeps a consistent right-hand lane
- Locomotion pass 7: natural NPC movement — eased turning (no snap rotation), smooth acceleration to walking speed, stride bob, gentle torso rock while walking, idle head scanning instead of standing frozen, and automatic re-routing when a car blocks the path (plus a global post-tick separation sweep so queued cars never overlap)
- Open World GTA Style pass 8 (matches the reference prototype): the game opens after dark at ~21:30 with a deep blue night sky, moon, stars and dark fog; a third graphics style GTA NIGHT locks the city into that neon-lit night look; armed street-gang NPCs hold three turfs (141 NPC total — they spot the hero, give chase and open fire with pistols, red dots on the minimap); full on-foot mobility — jump (Space), roll-dodge (Ctrl, i-frames + dash), crouch (C), crawl (Z) with the chase-cam dropping to match the stance; the weapon wheel cycles with Q/E while F handles action/enter-vehicle (V snaps the camera); and a mission system with the M info panel — wipe out the gang (kill N thugs), steal the marked car and deliver it to the glowing ring, or reach the meeting point — missions chain automatically with ammo/armor/health rewards
- Mission clarity pass 9: a kill mission is never impossible — the ring always points at a LIVING thug (the target follows the nearest one in real time), the gang gets topped up with reinforcements when the mission starts, and fresh thugs are sent in if the player wipes them out mid-mission; the on-screen mission HUD shows kills X/N and how many thugs remain, the steal/visit HUD shows the remaining distance in metres, and a yellow route line + navigation arrowhead is drawn on the minimap pointing straight to the objective (the main 3D view stays clean — no floating arrow)
- River-crossing pass 10: the river now keeps flowing UNDER the raised bridge decks — a hero who arrives swimming glides beneath the deck and crosses the bridge still in swim state (never yanked up onto the deck to walk; approaching on foot still walks the deck), the deck fades see-through whenever it stands between the chase-cam and the hero; every bridge crossing has its own great-white guard shark in the river water that chases and bites anyone swimming (they can hunt right under the decks); river boats that meet the hero in the water brake to a full stop, wait a beat, then turn around and move to the other side of the river before resuming their cruise
- Minimap pass 11: the hero's white arrow on the minimap moves with the character and always points in the true travel direction — on foot it follows the look direction, and while driving it follows the car's heading (it previously froze at the last on-foot direction)
- Beach bar pass 12: a wooden beach bar with an open front now stands on the north shore — glowing checker dance floor, drinks counter with bottles and stools, three colour-cycling disco orbs, a spinning mirror ball, a neon BAR sign (also marked on the minimap) and a 120 BPM kick+hi-hat beat that fades in when the hero comes near; 12 party people dance inside the whole night (5 beautiful bikini girls among them, waving their arms and bouncing to the beat — the whole floor scatters when a wanted hero barges in), the hero can walk in through the open front (walls and roof fade see-through for the chase-cam), and 5 bikini girls stroll along the sandy shore around the island without ever stepping into the water or the city
- Three switchable graphics styles: UNITY CITY (modern daylight), VICE CITY (neon sunset) and GTA NIGHT (city after dark)
- Detailed 3D pedestrians (two-segment arms/legs, ears, caps/police hats, sunglasses, skirts), detailed cars (sedan/sport/SUV/taxi/police with spinning wheels, animated doors), detailed speedboats
- Gameplay: open world 11×11 blocks, 141 NPC (80 civilians + 24 police + 8 swimmers + 12 gangsters + 12 bar dancers + 5 beach bikini girls), 34 cars, wanted system, weapons, missions, weather/time
- Built with Three.js r128
- No external dependencies
- All content procedural
- Tested on Windows 10/11 and Ubuntu 20.04+

## Support
For issues or questions:
1. Check the smoke tests: `node tests/smoke.test.cjs`
2. Verify browser console for JavaScript errors
3. Ensure WebGL is enabled
4. Check that the server is running correctly (port 8123)