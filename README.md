# AHA Design Consultants — Cinematic Architectural Intro (Three.js + GSAP)

Real-time, procedural 3D architectural construction intro for **AHA Design Consultants** (Architecture, Interior Design, Redevelopment & Project).  
**Location:** Vardham Industrial, Thane West, Maharashtra - 400601.

Built with Vite, Three.js, and GSAP — no video, no external 3D models, no paid dependencies.

> **Reference:** The upgrade prompt specifies `references/building.png` as the primary visual/architectural composition reference. If that file is not present in the workspace, the model follows the prompt's described language (two connected masses: lower stepped broad glass-and-concrete volume + taller ~9-storey tower with exposed dark structural framing, podium connector, horizontal slab extensions, charcoal framing, blue-grey glazing, mullions/parapets/terraces, dark presentation environment, technical grid, subtle urban silhouettes). Inspect and refine against the reference image when available.

## What this delivers
- **Architecture:** Two interconnected masses — broad lower stepped block and taller 9-storey tower — on a podium, with columns/beams/slabs/facade/glass/mullions/terraces/parapets assembled in a logical construction sequence. Surrounding urban silhouettes and technical grid.
- **Materials/lighting:** PBR-style materials (warm off-white concrete, charcoal framing, muted blue-green glass), warm key + cool ambient/fill + warm rim, filmic tone mapping, atmospheric fog, contact-shadow plane. No bloom/neon/particles.
- **Camera:** Dedicated controller with bbox/FOV-based framing and named keyframes **ESTABLISHING → STRUCTURE → APPROACH → DETAIL → HERO**. Single continuous ~8s dolly/push-in with subtle lateral parallax and upward hero arc (real camera motion, not CSS scale). Portrait/mobile-adjusted path. Dev debug helpers via `?debug=1`.
- **Timeline (8s):** 0–2 wide establishing + slow dolly; 2–4 construction reveal; 4–6 cinematic push-in toward connection; 6–8 hero reveal, title, subtle fade to near-black; `complete` fires **after** fade.
- **Lifecycle/Wix:** Preserved skip, reduced-motion, WebGL/error fallback, 12s failsafe, responsive resize/DPR caps, geometry/material reuse & disposal, and Wix `postMessage` bridge.

## Project structure
- `index.html` — canvas + minimal HUD/title/fade overlay
- `src/main.js` — bootstrap, lifecycle, failsafes, bridge wiring
- `src/scene.js` — renderer, scene, lighting, fog, tone mapping
- `src/building.js` — procedural architectural complex, materials, sequencing items, bbox/dispose
- `src/animation.js` — GSAP master timeline (construction, lighting ramp, title/fade)
- `src/camera.js` — cinematic camera controller & named keyframes (bbox-framed)
- `src/wix-bridge.js` — `postMessage` bridge
- `src/styles.css` — minimal cinematic UI

## Run locally
```bash
npm install
npm run dev
```
Open the printed local URL.
- `?preview=1` — standalone/preview auto-start behavior helper
- `?debug=1` — development-only camera keyframe/path helpers (console + markers)

## Production build
```bash
npm run build
npm run preview
```
Output: `dist/` (static). Deploy to any **HTTPS** host (Vercel/Netlify/Cloudflare Pages). Build: `npm run build`, output: `dist`.

## Wix Classic Editor integration (dedicated Intro page)

Hosted as a standalone HTTPS app embedded on a Wix Intro page; Wix navigates to the real homepage after completion. The iframe **cannot** manipulate Wix parent DOM.

### Messages
- Iframe → Wix: `{ source: "aha-design-intro", type: "ready" | "complete" | "skip" | "error" }`
- Wix → Iframe: `{ source: "aha-design-wix", type: "start" | "skip" }`

`complete` is emitted only after the cinematic exit fade finishes. On skip/error/failsafe the corresponding event is emitted and the app cleans up.

### Velo page code (example)
```js
import wixLocation from 'wix-location';
// optional: import { session } from 'wix-storage';

$w.onReady(function () {
  const intro = $w('#htmlIntro');        // HTML embed element ID
  let finished = false;

  function goHome(reason) {
    if (finished) return;
    finished = true;
    // navigate to real homepage (adjust path/URL to your site)
    wixLocation.to('/');
  }

  intro.onMessage((event) => {
    const data = event.data;
    if (!data || data.source !== 'aha-design-intro') return;
    if (data.type === 'ready') {
      intro.postMessage({ source: 'aha-design-wix', type: 'start' });
    }
    if (data.type === 'complete' || data.type === 'skip' || data.type === 'error') {
      goHome(data.type);
    }
  });

  // 12s failsafe (never trap user)
  setTimeout(() => goHome('timeout'), 12000);
});
```

**One-time-per-session (optional):** gate playback in Wix Velo with `wix-storage` session before posting `start`; do not rely on storage inside the cross-origin iframe.

### Manual steps in Wix Editor
1. Duplicate/backup site. Enable Dev Mode (Velo).
2. Create/open dedicated Intro page; add **Embed → Embed a Site** with deployed HTTPS URL; set ID `htmlIntro`.
3. Paste page code above; set homepage target path.
4. Test in Preview and published/staging on desktop (1920×1080, 1366×768) and mobile (390×844, 360×800) before going live.

## Behavior & accessibility
- Skip Intro button (top-right)
- `prefers-reduced-motion`: final composed state, minimal transition, then fade/complete
- WebGL unavailable or runtime error: branded fallback + `error` event, never blocks navigation
- 12s max failsafe
- Responsive canvas, DPR capped (≤1.6 desktop / ≤1.25 small screens)
- No autoplay audio, no scrollbars/overflow
- Thin progress bar with phase labels (ESTABLISHING / STRUCTURE / APPROACH / HERO REVEAL)

## Performance notes
- Shared geometries/materials, grouped assembly, minimal draw-call overhead for this scene scale
- No postprocessing/bloom; shadow maps disabled (contact plane used) for mobile safety
- Correct disposal of renderer, geometries, materials on exit

## Known limitations
- Not a replacement for Wix native/browser loader; true fullscreen over Wix chrome depends on page/layout.
- Cross-origin iframe cannot control parent DOM or reliably read Wix session storage.
- Preview vs published origins vary; bridge uses non-sensitive fixed events (validate `source`).
- `references/building.png` was not present in-repo during this upgrade; proportions should be fine-tuned against it when available.
- Visual “photorealism” is approximated in real-time WebGL without paid assets/HDRI pipelines; validate on target devices.

## Upgrade notes
- Procedural dual-mass complex + podium/silhouettes/grid presentation.
- Bbox-driven cinematic camera controller with named keyframes and continuous dolly path.
- 8s timeline with fade-gated `complete` event and Wix bridge `aha-design-intro`.
- UI/copy themed for AHA Design Consultants (Architecture, Interior Design, Redevelopment & Project), Vardham Industrial, Thane West, Maharashtra - 400601.
