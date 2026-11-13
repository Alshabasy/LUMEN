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

Using the production preview and Playwright on 2026-11-13:

- At a 320 × 720 viewport, `document.documentElement.scrollWidth` was 320 px.
- With reduced motion emulated, the hero video was paused, `autoplay` was false,
  and its poster URL was present.
- Keyboard focus on the time slider was visible; ArrowRight advanced one sample;
  Space started and stopped playback.
- With `/api/horizons` and `/api/orbits` unavailable on the static preview, the
  local sky panels showed the committed `CACHED SNAPSHOT` fallback. No browser
  page errors were recorded.

## Production Lighthouse

**Not run.** There is no deployed production URL yet. The release record in the
README documents the deployment blocker: Vercel CLI/login state and
`VERCEL_*` credentials were unavailable in this environment. Local preview
results are not reported as production Lighthouse scores. Run Lighthouse mobile
against the production URL after deployment and record both Performance and
Accessibility scores here; targets are 85 and 90 respectively.
