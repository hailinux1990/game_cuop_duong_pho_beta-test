# Deployment Guide — PIXEL VICE CITY

PIXEL VICE CITY — UNITY CITY is a standalone **3D third-person open-world** web game (GTA style) with a full **Unity-quality graphics overhaul** (sRGB + ACES tone mapping, PBR materials, soft shadows, detailed buildings/NPCs/vehicles) that runs in any modern browser on Windows, Ubuntu, or other platforms. It needs WebGL (hardware acceleration enabled).

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

All 263 smoke tests should pass. A browser harness also lives in `tests/browser-smoke.html` (works even without WebGL by stubbing the renderer).

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
- Shift: Run
- Mouse: Orbit the chase-camera 360° horizontally and up/down (click to lock the pointer, ESC to unlock; without lock: hold right button still to aim, drag to orbit)
- Wheel: Zoom the camera
- Left click: Attack / shoot toward the centre of the camera (no reticle icon; GTA-style auto-aim; pistol = one shot per click, AK-47 = hold for full auto)
- Right click (hold still): Over-the-shoulder aim zoom, tighter spread, steadier recoil
- C: Snap the camera back behind the hero / car
- [ / ]: Mouse sensitivity down / up   ·   Y: Invert vertical look
- 1-4: Switch weapons (fists / knife / pistol / AK-47)
- R: Reload (timed; auto-reloads when the magazine runs dry)
- E: Enter / exit / steal vehicles

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
- Two switchable graphics styles: UNITY CITY (modern daylight, default) and VICE CITY (neon sunset)
- Detailed 3D pedestrians (two-segment arms/legs, ears, caps/police hats, sunglasses, skirts), detailed cars (sedan/sport/SUV/taxi/police with spinning wheels, animated doors), detailed speedboats
- Gameplay unchanged (open world 11×11 blocks, 112 NPC, 34 cars, wanted system, weapons, weather/time)
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