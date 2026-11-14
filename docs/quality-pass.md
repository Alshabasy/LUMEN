# Quality pass record

## Code and local checks

- `cd frontend && npm run test` — **17 tests passed** across four test files on
  2026-11-13.
- `cd frontend && npm run build` — **passed** on 2026-11-13. Vite reported a
  948.71 kB minified 3D scene chunk (249.65 kB gzip); this remains above the
  default 500 kB warning threshold.
- `cd frontend && npm run lint` — exited 0. Oxlint reported existing React hook,
  ref, and Three.js mutation warnings in `App.tsx`, `UniverseCanvas.tsx`, and
  `OrbitalScene.tsx`; this run is not warning-free.
- `git diff --check` — exited 0 with no output.

The Three.js scene is dynamically imported and becomes ready when its section is
within the observer margin; the canvas is capped at DPR 1.5. R3F disposes
declarative mesh geometries and materials on unmount. The shared loaded Moon,
Earth, and Sun textures are explicitly disposed and removed from the loader
cache when the canvas unmounts. The hero video has a poster still and does not
autoplay when `prefers-reduced-motion: reduce` is active.

## Local browser smoke

Using the anonymous Vercel preview and a fresh isolated Codex browser context on
2026-11-13 (not an incognito browser profile):

- At a 320 × 720 viewport, `document.documentElement.scrollWidth` was 320 px.
- With reduced motion emulated, the hero video was paused, `autoplay` was false,
  and its poster URL was present.
- Keyboard focus on the time slider was visible; ArrowRight advanced one sample;
  Space started and stopped playback.
- Landing page and Explorer rendered; Compare mode opened. LIVE NOW displayed a
  timestamped NASA/JPL Horizons ephemeris, and LIVE ORBITS displayed the JPL
  vector view. The time slider accepted ArrowRight and the selected-site cursor
  advanced in the earlier browser run. No browser page errors were recorded in
  the earlier run; the final preview run inspected the rendered states but did
  not capture a browser console log.
- Direct HTTP checks on the final preview: `/` returned 200, `/api/orbits`
  returned 200 with `epochUtc`, `frame`, `units`, and vector fields, and both
  `/api/horizons` Sun and Earth requests at the same UTC minute returned 200
  with observer-table results. Cached fallback behavior was verified on the
  earlier static-preview run, not re-induced on the final Vercel preview.

## Production Lighthouse

**Not run.** The anonymous Vercel preview is temporary and has not been claimed
as a persistent production deployment. No Lighthouse mobile scores are
available. Run Lighthouse against the claimed production URL and record both
Performance and Accessibility scores; targets are 85 and 90 respectively.
