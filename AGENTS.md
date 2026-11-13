# LUMEN — Lunar Landing Site Navigator · Project Playbook (AGENTS.md)

> **Single source of truth** for scope, stack, science rules, design system, workflow and delivery.
> **Event:** NASA Space Apps Challenge 2026 — Cairo local event (13–14 Nov 2026, SUT) · **Challenge:** *Lunar Landing Site Navigator*
> **Deadlines (verify on spaceappschallenge.org):** global project submission opens Sat 14 Nov 09:00 and closes Sun 15 Nov 23:59 local time, but local events judge by *their own* end time → **confirm Cairo's cut-off and submit early.** Teams ≤ 6.
> **Team:** Amr Alshabasy (Team Leader) · **Time budget:** 8–15 hours · **Dev machine:** Linux
> **Scope decision (v1):** *Lean* — Python precomputes SPICE geometry → static JSON → a stunning static web app.
> The terrain-aware *Full* engine is documented in §11 as a **future roadmap only**. Do not build it in v1.
> **Document policy:** update this file when a project-wide decision changes. Do not create competing rule files.

---

## 0. Instruction for every AI agent (paste at the start of each session)

> Read the root `AGENTS.md` completely before recommending or changing anything. State which section/task you are working on. Do not invent science, data, coordinates, test results or file contents. Preserve the frame, unit, time-system, provenance and honesty rules. Make only the requested scoped change and keep the diff small. Add or update tests for science code. Run the relevant checks and report exactly what you ran and what passed or failed; never claim a check passed unless you ran it. Do not add dependencies without explaining why first. Do not commit or push unless asked.

---

## 1. Product definition

### 1.1 Problem
Landing-site planning depends on when the **Sun** (power, thermal) and **Earth** (direct-to-Earth line of sight) are above the local horizon. Existing tools (Quickmap, Moon Trek, JPL Horizons) are built for specialists. Schedule slips force planners to re-evaluate sites and dates quickly.

### 1.2 Solution — LUMEN
A fast, beautiful web app that lets planners, educators and the public:
1. Pick a **site** and a **date window**.
2. See the **Sun and Earth against the local horizon** (sky dome + 3D Moon).
3. Read **sunset / Earthset / sunrise / Earthrise** countdowns from refined event times.
4. **Compare two sites or two date windows** side by side.
5. Read a transparent **screening indicator** (GO / CAUTION / NO-GO) built from visible metrics.
6. Inspect **assumptions, data sources, frames, time scales and limitations**.

### 1.3 v1 scope (must work flawlessly)
- 4–6 documented candidate sites (south-pole candidates + at least one Apollo reference site).
- Precomputed Sun/Earth azimuth/elevation time series via **SPICE** for a fixed date window.
- Current precompute window: **2027-01-01T00:00:00Z through 2027-03-02T00:00:00Z**, inclusive, at 900 s. Window summaries are calculated over this full generated interval.
- A 3D viewer for the selected lunar site and an optional current Earth/Sun and Moon/Earth orbital-context view from **JPL Horizons vectors**. Visual distance scales are expanded and labelled.
- Refined event times (sunrise/sunset, Earthrise/Earthset).
- Sky dome, 3D Moon scene, timeline, shared time cursor, compare mode, method/limits panel.
- **Flat (reference-sphere) local horizon only.** Terrain is *not* modelled in v1 and the UI must say so wherever results are shown.

### 1.4 Non-goals for v1
No backend server, database, user accounts, LOLA DEM processing, link budgets, relay scheduling, power/thermal models, AI chat that produces science, or live telemetry.

### 1.5 Honesty contract (what we may and may not claim)
- Results are **geometric screening**, not landing approval, not a comms link guarantee, not NASA guidance.
- v1 ignores terrain. At the south pole terrain dominates real illumination; never imply otherwise.
- Artistic elements (Moon texture, star field, glow, animations) are **illustrative** and labelled as such.
- No mock number may appear as a real result. Placeholder data must be visibly tagged `MOCK`.

---

## 2. Non-negotiable engineering principles

1. **Science is deterministic code, not LLM output.** Only SPICE and tested algorithms produce numbers. AI may explain verified outputs, never create them.
2. **Reproducible:** every dataset records site, coordinates, frame, time range, time scale, step, kernel list + checksums, algorithm version/commit.
3. **Frames, units, time are explicit** in names, schemas and UI. Never pass an unlabeled vector.
4. **UTC at the edges, ET (TDB) inside.** Convert with SPICE (`str2et`/`et2utc`) and a loaded leapseconds kernel. Reject requests outside kernel coverage.
5. **Compute from the surface site, not the Moon's centre.** Earth's direction shifts by ~0.26° (Moon radius ÷ Earth–Moon distance) — this matters for Earth-visibility edges.
6. **Earth visibility ≠ communications availability.** Use the term *geometric direct-to-Earth visibility*.
7. **Vertical slice first:** one site → one JSON → one chart → one dome, working end-to-end, before adding features.
8. **Boring, pinned, stable dependencies.** No alpha/beta libraries for core features.
9. **Smooth beats clever.** A feature that stutters or breaks is removed, not shipped (see §7.6 performance budget).
10. **Small validated product > large impressive unverified one.**

---

## 3. Technology stack (lean)

### 3.1 Frontend (the product)
| Area | Choice | Notes |
|---|---|---|
| Language/build | **TypeScript + Vite** | strict mode on |
| UI | **React** | functional components + hooks |
| 3D | **Three.js** via **@react-three/fiber** (+ **@react-three/drei** helpers) | R3F major must match the React major; pin exact versions |
| Smooth scroll | **Lenis** | one instance, disabled for reduced-motion |
| Animation | **GSAP + ScrollTrigger** | page narrative, reveals, pinned sections |
| State | **Zustand** | selected site(s), time cursor, playback, compare mode |
| Styling | **Tailwind CSS** + CSS variables for design tokens | no heavy component kit |
| Charts | **Custom SVG/Canvas** | full design control; no chart library unless needed |
| Icons | **Lucide** | |
| Tests | **Vitest** (+ React Testing Library only for critical bits) | Playwright optional, only if time remains |

No TanStack Query, no shadcn, no form library in v1 — SPICE datasets are static JSON loaded once; current Horizons snapshots and orbit vectors use the existing same-origin API routes.

### 3.2 Scientific precompute (Python, run locally on Mac/Linux)
| Area | Choice |
|---|---|
| Language | Python (supported release) + `venv` |
| Geometry/time | **SpiceyPy** (NAIF SPICE) — mandatory engine |
| Math | NumPy (SciPy only if root-finding is needed) |
| Validation | **JPL Horizons** (web or API) — independent cross-check, mandatory |
| Tests | pytest |
| Lint | Ruff |

### 3.3 Hosting and tools
Static hosting (GitHub Pages, Netlify or Vercel — check current free-tier limits). The v1.1 live Horizons snapshot requires a same-origin serverless function; Vercel is the configured deployment target for that route. Git + GitHub. VS Code. Node LTS.

### 3.4 Data sources
| Data | Source | Use |
|---|---|---|
| Ephemerides, frames, constants, leapseconds | NAIF/JPL SPICE kernels | all geometry |
| Independent reference | JPL Horizons | validation spot checks |
| Current orbital context | JPL Horizons VECTORS API, DE441 | geometric Earth heliocentric and Moon geocentric vectors in Ecliptic J2000 |
| Moon surface texture (visual only) | NASA/LRO-derived public imagery (e.g., NASA Visible Earth/SVS) | illustrative backdrop |
| 3D hardware models (optional) | NASA 3D Resources | lander/rover set-dressing |
| Moon texture, real (visual) | Moon Trek WMTS — LRO WAC global mosaic (open tiles; bake a 2K–4K texture at build time) | hero + 3D Moon (replaces illustrative texture; credit LRO/NASA) |
| South-pole context layers | Moon Trek WMTS / Quickmap: percentage illumination and LOLA average Earth/Sun visibility (layer names reported by a third-party index — **confirm in the official Trek layer list**) | context overlay + qualitative cross-check, *not* a numeric source (tiles are colour-mapped) |
| Candidate-site terrain (stretch S1) | NASA GSFC PGDA south-pole site LOLA DEMs, 5 m/px (e.g., Connecting ridge, Shackleton rim, Peak near Shackleton, de Gerlache rim, Leibnitz beta plateau, Malapert massif) | optional terrain horizon for 1–2 sites |
| Terrain (future, §11) | NASA GSFC PGDA / PDS LOLA | full terrain engine **not in v1** |

---

## 4. Architecture and repository

### 4.1 Flow
```text
NAIF kernels + site config
        │
        ▼
scripts/precompute (Python + SpiceyPy)   ← validated against JPL Horizons
        │  writes
        ▼
frontend/public/data/*.json  (small, versioned, with provenance)
        │  fetched once
        ▼
React + R3F app  → dome · 3D Moon · timeline · compare · method panel
```

### 4.2 Structure (create folders only when used)
```text
lumen/
├── AGENTS.md
├── api/horizons.ts            # v1.1 same-origin JPL Horizons proxy
├── vercel.json                # Vite static build + serverless API deployment
├── README.md                  # short run guide (only commands that were actually tested)
├── .gitignore  .env.example
├── config/
│   ├── sites.json             # site list: id, name, lat/lon (+convention), source citation
│   ├── analysis.json          # date window, step, aberration setting, frame name
│   └── verdict.json           # screening-indicator thresholds (placeholders, documented)
├── data/
│   ├── README.md              # how to download kernels
│   ├── kernels/               # ignored by Git
│   └── kernel_manifest.json   # name, source URL, coverage, checksum, load order
├── scripts/
│   ├── precompute.py          # kernels + sites -> JSON
│   ├── validate_horizons.py   # compares selected epochs to Horizons values
│   └── tests/                 # pytest: time conversion, frames, events, coverage errors
├── frontend/
│   ├── public/data/           # generated JSON, textures
│   └── src/
│       ├── app/  components/  features/{explorer,dome,moon3d,timeline,compare,method}/
│       ├── design/            # tokens, motion presets, typography
│       ├── state/  data/  types/
└── docs/
    ├── scientific-method.md   # equations, assumptions, references
    ├── validation.md          # Horizons comparisons + tolerances
    └── decisions.md           # lightweight decision log (see §10)
```

**Next-version live extension (approved 2026-11-13):** `api/horizons.ts` is a
small same-origin proxy for the NASA/JPL Horizons observer API. The Vite dev
server mounts it locally; `vercel.json` serves it as a Vercel function in a
production deployment. This does not replace or mutate the static SPICE
datasets.

---

## 5. Scientific requirements (v1)

### 5.1 Kernels (record every one in `kernel_manifest.json`)
Typical set — **verify current filenames/versions on the NAIF site before use**:
- Leapseconds (LSK): e.g., `naif0012.tls`
- Planetary ephemeris (SPK): e.g., `de440s.bsp`
- Lunar orientation (PCK): e.g., `moon_pa_de440_200625.bpc`
- Lunar frame definitions (FK): the current DE440-based Moon frame kernel (e.g., `moon_de440_250416.tf`)
- Body constants (PCK text): e.g., `pck00011.tpc` for radii

**Frame warning:** older Moon FK versions did not map the generic `MOON_PA`/`MOON_ME` names to DE440-based frames. Use the **explicit DE440-based frame name defined in the loaded FK** (for example `MOON_ME_DE440_ME421` — confirm in the file) and record it in `analysis.json`. Never rely on an alias you have not verified.

Rules: load via one deterministic loader, expose loaded-kernel metadata, check coverage, fail loudly outside coverage, never silently overwrite a kernel set.

### 5.2 Coordinates and frames
- Site coordinates are **selenographic latitude/longitude** (state: planetocentric latitude, east-positive longitude, range, reference radius) and must be copied from a **cited source**; never typed from memory.
- Use the **ME (mean Earth/polar axis) frame** for site coordinates unless a decision-log entry says otherwise.
- Local frame: **East-North-Up** at the site. Azimuth measured clockwise from North, elevation from the local horizontal plane. State this in the UI legend.
- Every coordinate object carries: value, units, frame, origin, convention, method.

### 5.3 Geometry procedure (per time sample)
1. `str2et` from UTC (ET inside).
2. Sun and Earth positions **relative to the surface site** in the Moon body-fixed frame, with a documented aberration setting (default `LT+S`; change only via the decision log).
3. Rotate into the site's ENU basis.
4. Elevation = `asin(up · û)`; azimuth = `atan2(east, north)`.
5. Apparent angular radii: Sun and Earth from body radii and distance.
6. Flags (v1, flat horizon):
   - `sun_center_above_horizon` = elevation > 0
   - Earth: `earth_center_visible` (el > 0), `earth_any_disc_visible` (el > −radius), `earth_full_disc_visible` (el > +radius)
7. **Event refinement:** find horizon crossings by bisection (or SPICE geometry finders) on the continuous function, not by sampling alone. Store refined UTC event times.

### 5.4 Output schema (one file per site; illustrative)
```json
{
  "schema_version": "1.0",
  "site": { "id": "apollo-11", "name": "…", "lat_deg": 0.0, "lon_deg_east": 0.0, "frame": "<verified frame>", "source": "<citation>" },
  "time": { "start_utc": "…", "end_utc": "…", "step_s": 900, "scale_in": "UTC", "scale_calc": "ET/TDB" },
  "horizon": { "model": "flat-reference-sphere", "terrain_included": false, "mask": null },
  "series": { "sun_el_deg": [], "sun_az_deg": [], "earth_el_deg": [], "earth_az_deg": [], "earth_radius_deg": [] },
  "events": [ { "type": "sunset", "utc": "…" } ],
  "summary": { "sunlit_fraction": 0.0, "earth_center_visible_fraction": 0.0, "longest_dark_h": 0.0, "longest_earth_outage_h": 0.0 },
  "provenance": { "kernels": [], "algorithm_commit": "", "generated_utc": "", "aberration": "LT+S" },
  "warnings": []
}
```
Quantise angles to 0.01° and use arrays, not per-sample objects. Budget: ≤ 1.5 MB gzipped per site.

### 5.5 Screening indicator (the "verdict")
- Computed in the **frontend from `summary` fields and `config/verdict.json`**, never hidden.
- Three states with **text + icon + colour** (never colour alone): `GO`, `CAUTION`, `NO-GO`.
- Thresholds are **documented placeholders** (not NASA criteria) and user-adjustable in the method panel.
- The indicator is always shown **next to the raw metrics** and the label "Geometric screening only — terrain not included in v1."
- *Design note:* a single good/bad label can mislead for complex decisions, so we ship it as a *screening aid with visible inputs*, not as a recommendation.

### 5.6 Validation (mandatory before UI polish)
1. **Horizons spot checks:** at least 3 epochs × 2 sites (Sun and Earth az/el). Use the correct Horizons observer-on-Moon setup (check the manual for site-coordinate syntax). Record tolerances and mismatch causes in `docs/validation.md`.
   **Horizons setup:** target Sun (`10`) and Earth (`399`); observer table; centre `coord@301` with `COORD_TYPE=GEODETIC` and `SITE_COORD='<E-lon>,<lat>,<h_km>'` (Moon longitudes are **east-positive**); request quantity 4 (apparent AZ/EL) and 13 (angular diameter); `CSV_FORMAT=YES`; time in UT. No refraction is modelled for non-Earth sites (matches our airless assumption). Horizons uses the **lunar mean-Earth frame (DE421-based)** and has no PA frame — keep site coordinates in ME. Rise/set events: `STEP_SIZE='1m RAD'` with `R_T_S_ONLY` (geometric horizon, no refraction; Horizons states rise/set may not be accurate below ~1 minute). **Horizons is best-effort — save every reference response as a fixture in the repo** so tests and the demo never depend on it being online. Horizons currently states that its TDB-to-UTC conversion after 2027-01-01 holds the last known leap-second offset; record this future time-tag limitation when using the configured interval.
2. **Sanity checks (not a substitute for #1):**
   - At the lunar poles the Sun stays within roughly ±1.6° of the horizon (axial tilt ≈ 1.54°).
   - From a near-side equatorial site Earth stays in nearly the same sky region with a small libration wobble.
3. **Failure tests:** out-of-coverage dates, missing kernel, invalid site, step too large.
4. A reference test must never compare two outputs produced by the same code path.

---

## 6. Features and data flow (UI behaviour contract)

- **One shared time cursor** drives: dome, 3D Moon lighting, timeline, countdowns, metrics.
- Controls: site selector, date-window selector, play/pause, step ±, scrub, speed, compare toggle.
- **Countdowns** come from refined events: `next_event − cursor`. If no event is in range, say so — never invent one.
- **Compare mode:** two panels with identical settings; if windows or steps differ, show a visible warning and do not present values as like-for-like.
- **Method panel:** frames, time scales, kernels (names/versions), data sources, limitations, validation summary, credits.
- **Loading/empty/error states** are designed, not defaults. A failed JSON fetch shows a clear message and a retry.
- Units on every axis, label and tooltip.
- **v1.1 current snapshot:** fetch current-minute airless apparent Sun/Earth
  azimuth, elevation and angular diameter from JPL Horizons for the selected
  curated site. Label it as current ephemeris, never as telemetry or live
  surface conditions. Keep it separate from the SPICE cursor, show UTC and
  provenance, refresh at most once per minute, preserve the last good snapshot
  on transient failures, and continue to state the flat-horizon/terrain limit.
- **v1.2 atmosphere:** the page-wide star drift and nebula are illustrative
  motion. Label them so they cannot be mistaken for a measured star catalog;
  the Sun/Earth site directions remain tied to the live Horizons snapshot.
  Sound is synthesized locally with Web Audio, opt-in after a user gesture,
  quiet by default, and has a master volume control. No audio autoplay.

---

## 7. Design system — "Awwwards-grade" but disciplined

> Inspiration: award-winning sites (Awwwards-style) — cinematic art direction, huge typography, scroll-driven storytelling, tactile micro-interactions, one memorable WebGL moment. **Do not copy any specific site.**
> Rule: *wow* must never cost *clarity* or *speed*.

### 7.1 Concept
**"The light goes out."** A cinematic descent from black space to the lunar horizon. The page is a story (scroll) that lands in a precise tool (explore). Mood: calm, precise, a little awe. Black canvas, warm Sun, cool Earth.

### 7.2 Design tokens
```css
:root{
  --bg:#0A0A0A; --surface:#141418; --line:#26262C;
  --ink:#FFFFFF; --muted:#9A9AA2;
  --sun:#FFB000;  /* Sun, primary accent */
  --earth:#4FC3F7;/* Earth, secondary accent */
  --go:#5ED69A; --caution:#FFB000; --nogo:#EB5555;
  --radius:16px; --ease:cubic-bezier(.22,1,.36,1);
}
```
Provide a light variant only if time allows; dark is the primary theme. Contrast ≥ 4.5:1 for text.

### 7.3 Typography
- **Display:** a bold, wide/geometric grotesque (e.g., *Unbounded* or *Syne*), very large, tight tracking, uppercase for hero/section titles.
- **UI/body:** a clean humanist sans (e.g., *Manrope*).
- **Numbers/data:** a monospace (e.g., *JetBrains Mono*) with tabular figures for countdowns and metrics.
- Always define system-font fallbacks; self-host or use Google Fonts with `display=swap`.

### 7.4 Page narrative (scroll)
1. **Hero:** full-viewport 3D Moon limb with Sun rim-light, giant `LUMEN`, tagline "Know when the light goes out — before you land.", scroll cue.
2. **Problem (pinned):** three beats — Power (Sun), Link (Earth), Tools (complexity) — each reveals with the 3D scene reacting (Sun sinks, Earth link breaks).
3. **Explore (the tool):** full-viewport workspace — site/date bar, dome + 3D Moon, timeline, metrics, verdict. This is the product; it must be flawless.
4. **Compare:** two sites side by side, one slider moves both.
5. **Method & limits:** calm, readable, trust-building (frames, kernels, validation, "terrain not included in v1").
6. **Footer:** team (Amr Alshabasy — Team Leader), NASA Space Apps 2026, credits.

### 7.5 Motion and interaction
- **Lenis** smooth scroll + **GSAP ScrollTrigger**; one scroll system only.
- Motion language: slow, confident easing (`--ease`), 0.4–0.9 s, stagger ≤ 80 ms; no bouncy or gimmicky effects.
- Signature moments (pick few, perfect them): hero Moon rotation tied to scroll; Sun glow that tracks the time cursor; countdown digits that roll; verdict badge morph.
- Desktop-only polish: custom cursor, subtle magnetic buttons. **Never** hijack native behaviour on touch.
- Controls: scroll, **arrow keys** (step time), **Space** (play/pause), drag (rotate camera / scrub). All keyboard reachable with visible focus.
- `prefers-reduced-motion`: disable smooth scroll, parallax and auto-play; keep instant state changes.

### 7.6 Performance budget (smoothness is a requirement)
- Initial JS ≤ ~500 KB gzipped (excluding 3D textures); code-split the 3D scene; lazy-load textures.
- Target 60 fps on a mid-range laptop, ≥ 30 fps on a mid-range phone; cap DPR at 2; dispose geometries/textures.
- Moon texture: 2K WebP/KTX2 first, 4K only on capable devices.
- Star field as `Points`, not meshes. Avoid per-frame React re-renders: drive animations with refs/`useFrame`, not state.
- Lighthouse targets (mobile): Performance ≥ 85, Accessibility ≥ 90, no console errors.
- If a visual effect drops frame rate, **cut it**.

### 7.7 Accessibility and clarity
- Essential results available **without the 3D scene** (text summary + table).
- Colour + icon + label for every state; keyboard focus rings; ARIA for sliders/tabs; alt text for images.
- The first screen of the tool must answer: *Which site? Which time? Is the Sun up? Is Earth visible? When does that change?*
- Legend for azimuth/elevation convention and a persistent "Illustrative graphics · Geometric screening only" note.

### 7.8 Inspiration notes (patterns only — never copy layout, copy or assets)
*I could read page text/metadata but not render the visuals, so these are structural observations, not pixel references.*
- **mapadoastro.com.br** (3D birth-chart reader): near-black theme (`#040405`); a 3D sky as the hero; a guided **planet-by-planet narrated tour** with an audio summary and progress ("0:42 / 3:01"); a **demo-first CTA** next to the main CTA; a **compare two charts** feature. → LUMEN: a narrated "Play the lunar day" tour of a site (captions always on, audio optional), a "Try the Apollo reference site" demo button, compare mode as a first-class feature.
- **dark-moon.org** (AI pentest platform — not about the Moon): near-black (`#050609`); **numbered sections with an on-page index** ("S.01 Platform…"); terminal-style result blocks; big stat counters; a 3D "orbital map" hero link; and **evidence with its caveat** ("one measured run, not a blanket guarantee"). → LUMEN: sections `L.01 Problem · L.02 Explorer · L.03 Compare · L.04 Method · L.05 Limits`, mono data readouts, counters computed from real data (sites, days, samples), and the same caveat tone for every claim.
- **Avoid:** paywall/pricing patterns, dense mega-nav, scroll hijacking inside the tool, anything that hides the "terrain not included" note.

---

## 8. Coding and repository rules

- Clear physical names (`sun_elevation_deg`, not `angle`). Units/frames in names or schemas.
- Python: type hints on public functions, Ruff, small pure functions, no hidden global kernel state, tests runnable without large downloads.
- TypeScript: strict, no `any` without a comment, data access in `data/` layer, components focused, no science in components.
- Never silently replace missing data with zero. Structured errors with actionable messages.
- No secrets, no kernels, no large raw data in Git. `.env.example` has placeholders only.
- Respect dataset licences; credit NASA/JPL/LRO sources on the credits screen. Check NASA media-usage guidelines; do not imply NASA endorsement or misuse logos.
- Git: `main` always runs; one branch per feature (`feature/dome`, `fix/event-refinement`); small commits (`feat:`, `fix:`, `docs:`); review the diff before committing.

---

## 9. Workflow with the available AI tools (free plans)

| Tool | Role | Use for | Avoid |
|---|---|---|---|
| **Claude (claude.ai)** | Architect + reviewer | Plan, science review, design direction, final audit. Paste relevant files; it cannot see your repo. | Broad rewrites without review |
| **ChatGPT** | Second opinion + content | Cross-check equations, copy, pitch text | Treating its numbers as validated |
| **Codex** | Implementer | One scoped task at a time, with tests | Redesigning conventions silently |
| **GitHub Copilot** | Inline helper | Autocomplete, small refactors, test scaffolds | Multi-file tasks without a clear request |
| **Human owner** | Decider | Approve assumptions, review diffs, merge | Accepting science without evidence |

**Free-plan hygiene:** message limits are real — keep prompts focused, request **complete files** (not fragments), and switch tools when one runs out. Commit after every working step.

**One-writer rule:** only one agent edits a file set at a time; use branches for parallel work.

**Per-feature loop:** (1) write a 3-line task with acceptance criteria → (2) Claude reviews risks (non-trivial tasks) → (3) Codex implements + tests → (4) run build/tests/app locally → (5) Claude reviews the diff → (6) fix confirmed issues → (7) commit → (8) update this file if a project-wide rule changed.

---

## 10. Decision log (replaces ADR folder for a 48-hour build)

Add a row for any decision affecting several parts: frame name, aberration setting, event method, verdict thresholds, time window, step size, fonts, hosting.

| Date | Decision | Alternatives | Why | Owner |
|---|---|---|---|---|
| — | Lean v1, terrain deferred | Full engine now | 24–48 h limit, validate first | Amr |
| — | Flat-horizon local model in v1, labelled everywhere | Spherical-only silently | Honesty | Amr |
| 2026-11-13 | Bebas Neue display + Manrope body + DM Mono data type system | Generic geometric display face | Condensed display echoes mission instrumentation while preserving readable data | Amr |
| 2026-11-13 | Existing Moon animation used as a muted, labelled hero background | Decorative-only static hero | Gives the landing state an immediate lunar context without treating art as science | Amr |
| 2026-11-13 | Lazy-loaded R3F orbital instrument in the hero | CSS-only depth | Adds real 3D shapes while keeping the initial bundle focused on the explorer | Amr |
| 2026-11-13 | Lenis is the single smooth-scroll layer; GSAP owns animation timing | Multiple scroll systems | Prevents competing scroll state and honors reduced-motion behavior | Amr |
| 2026-11-13 | Tailwind utilities supplement, rather than replace, the custom token CSS | Component-kit styling | Keeps the distinctive visual system while using the mandated stack | Amr |
| 2026-11-13 | v1.1 adds a current-minute NASA/JPL Horizons Sun/Earth snapshot through a same-origin Vercel function; Vite mounts the same handler in development | Browser cross-origin fetch / replacing SPICE timeline | Horizons does not return browser CORS headers; preserve reproducible SPICE outputs while adding a clearly separate, refreshed current ephemeris | Amr |
| 2026-11-13 | v1.2 adds a parallax star canvas, opt-in Web Audio soundscape, and desktop reticle cursor | Static backdrop / bundled sound files / native mouse pointer only | Create an immersive guided feel with low-cost, local effects; preserve reduced-motion behavior and keep the starfield labeled illustrative | Amr |
| 2026-11-13 | v1.3 adds a free camera for the selected lunar surface site and an optional current Horizons vector orbit view | Static sky-only 3D scene | Let users inspect the site, then orient its lunar context with current geometric state vectors; disclose expanded visual distances and preserve SPICE cursor geometry separately | Amr |
| 2026-11-13 | Precompute interval is 2027-01-01T00:00:00Z through 2027-03-02T00:00:00Z inclusive at 900 s, with kernel interval checks before generation | Previous shorter 2026 interval | Compute summary fractions over a window longer than two lunar synodic cycles; keep the future UTC conversion caveat visible | Amr |

---

## 11. Future roadmap — "Full" terrain-aware engine (NOT in v1)

Only start after v1 is deployed and validated. Keep these rules when you do:

- **F1 DEM ingestion:** select a NASA GSFC PGDA/PDS LOLA south-pole product; read its label (projection, frame/ephemeris, pixel registration, vertical units, nodata, uncertainty/count layers); record in the manifest; read windows with Rasterio/GDAL; test coordinate→pixel mapping. Never assume an Earth EPSG code for a lunar raster. A pixel size is not an effective resolution.
- **F2 Terrain horizon:** compute maximum apparent elevation vs azimuth from the site (state observer height, azimuth step, radius, curvature treatment, nodata/edge handling); fill the reserved `horizon.mask` field; compare Sun/Earth against it.
- **F3 Backend (only if needed):** FastAPI + Pydantic with bounded requests, provenance in responses, no arbitrary file paths.
- **F4 Quality:** uncertainty/sensitivity (DEM, sampling, kernels, step), partial-disc Earth tests, performance profiling, optional database/caching.
- Gate: reference-case validation + sensitivity checks before any claim about terrain-aware results.

---

## 12. Work plan (24–48 hours) and cut line (Work on it as 8 - 15 hours only)

| Block | Hours (from start) | Output | Gate |
|---|---|---|---|
| Setup | 0–2 | Repo, Vite app runs, Python venv + SpiceyPy imports, kernels downloaded + manifest | App and script both run |
| Science slice | 2–8 | One site → JSON (series + events + provenance) | Time/frame tests pass |
| Validation | 8–11 | Horizons spot checks recorded | Tolerances documented |
| UI slice | 11–16 | Dome + timeline + time cursor reading real JSON | Values match JSON |
| Full product | 16–26 | All sites, compare, method panel, countdowns, verdict | No mock data shown as real |
| Design + motion | 26–34 | Hero 3D, scroll narrative, micro-interactions | Meets §7.6 budget |
| QA + deploy | 34–40 | Tests, a11y pass, mobile pass, deploy, README | Clean-clone run works |
| Submission | 40–46 | Description, video, slides | Matches what the app really does |
| Buffer | 46–48 | Fixes only | — |

**If you have < 30 hours:** cut in this order → custom cursor → pinned "Problem" scene → 4K textures → compare-by-date (keep compare-by-site) → extra sites (keep 4). **Never cut:** validation, honesty labels, method panel, shared time cursor.

---

## 13. Testing and release checklist

**Automated:** pytest (time conversion, frame transform, event bisection, coverage failure); Vitest (verdict logic, countdown math, unit formatting); type-check and production build in CI if time allows.

**Live-data checks:** selected-site requests must use the curated coordinate
source, query only the Sun/Earth and at most once per minute, fail clearly when
Horizons is unavailable, and preserve the last good snapshot. Live output must
remain separate from SPICE series and include UTC, units, source, and the flat
horizon/terrain caveat. Live means current Horizons ephemeris, not telemetry.

**Manual "it works" checklist:**
- [ ] Clean clone → documented commands start the app.
- [ ] `precompute.py` regenerates identical JSON for identical inputs/kernels.
- [ ] Horizons spot checks recorded and within documented tolerance.
- [ ] All sites load; switching sites and dates never throws console errors.
- [ ] Time cursor, dome, 3D lighting, timeline and countdowns stay in sync.
- [ ] Compare mode warns on mismatched windows/steps.
- [ ] Every result view shows frame/time-scale info and the "terrain not included" note.
- [ ] Keyboard-only run-through works; reduced-motion respected.
- [ ] Works in Chrome, Safari and Firefox, and on a phone-sized viewport.
- [ ] Lighthouse mobile targets met (§7.6); no secrets or kernels committed.

---

## 14. Run commands (target; mark as tested only after running)

```bash
# Python (from repo root, Mac/Linux)
python3 -m venv .venv && source .venv/bin/activate
pip install spiceypy numpy pytest ruff
python scripts/precompute.py            # writes frontend/public/data/*.json
python scripts/validate_horizons.py     # compares to stored Horizons reference values
pytest scripts/tests

# Frontend
cd frontend && npm install && npm run dev     # local dev
npm run build && npm run preview               # production check
```

---

## 15. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Frame/alias mistake | Plausible but wrong directions | Explicit frame name, Horizons checks, sanity checks |
| Time-scale error | Shifted events | SPICE routines only, UTC/ET fields, test epochs |
| Coarse sampling | Missed windows | Event refinement by bisection |
| Terrain omitted | Over-optimistic polar results | Label everywhere; roadmap §11 |
| Fancy UI hurting speed | Judges see lag | Performance budget; cut effects |
| Verdict misread as advice | Misleading | Visible inputs, screening label, editable thresholds |
| Free-plan AI limits | Stalled work | Small prompts, full files, tool switching, frequent commits |
| Overbuilding | Unfinished product | Cut line in §12 |

---

## 16. Definition of success

A judge can open LUMEN, choose a lunar site and date window, feel the cinematic story, then use the tool to see — smoothly and clearly — when the Sun and Earth are above the horizon, compare two scenarios, and inspect the exact data, frames, time scales and limitations behind every number.

**Governing rule:** a smaller validated product that feels amazing is better than a larger one whose science or smoothness cannot be defended.

---

## 17. Judging playbook — NASA Space Apps Cairo 2026 (five criteria)

*Source: the organisers' "What Makes a Strong Project?" guide (Impact, Creativity, Validity, Relevance, Presentation). Every item below must have **evidence in the submission**, not just in our heads.*

| Criterion | What judges look for | What LUMEN must show (evidence) |
|---|---|---|
| **1 · Impact** — who benefits and how | Real problem; named beneficiaries; positive effect on people/science/space exploration | A 30-second **"schedule slip" scenario**: the planner moves a landing date or site and sees power/comms change. Beneficiaries: mission planners (CLPS/Artemis-style planning), educators/students, the public. Context: international lunar activity (e.g., the CSA Moon-exploration portal lists Artemis, Gateway/Canadarm3 and a Canadian utility rover). **Measure, don't invent:** time 2–3 testers on "compare two sites in ≤ 3 clicks" and report the real result. |
| **2 · Creativity** — fresh approach | Original perspective; inventive use of data/tools | Existing tools (Quickmap, Moon Trek, Horizons) are analysis-first; LUMEN is **decision-first**: one shared time cursor, dome + 3D Moon, narrated "play the lunar day", two-site compare, transparent screening indicator. Real LRO texture and Trek context layers used meaningfully. |
| **3 · Validity** — does it actually work | Sound science; evidence, tests, prototype; reliable claims | Working prototype on real SPICE output; `docs/validation.md` with Horizons comparisons (§5.6) and tolerances; kernel manifest; tests; **explicit limits** (flat horizon v1, terrain not included, screening ≠ recommendation). Stretch S1 adds a terrain horizon for 1–2 sites. |
| **4 · Relevance** — right challenge, NASA data | Addresses the challenge's objectives; NASA data contributes meaningfully | Coverage map below. Data actually used: SPICE kernels/DE440, JPL Horizons (validation), LRO WAC imagery, (stretch) LOLA DEMs. |
| **5 · Presentation** — tell the story | Clear problem → solution → method → results; visuals; value | Hook → problem → live demo → method/validation → limits → impact, in ≤ 3 min; deck + video + README + screenshots; links tested in a private window. |

### Challenge-objective coverage (Relevance)
| Challenge asks for | LUMEN feature | Status target |
|---|---|---|
| Curated sites + custom coordinates | 4–6 cited sites; custom lat/lon input (v1.1 if time) | v1 curated / custom stretch |
| Side-by-side or sequential comparison | Compare mode (two sites or two windows) | v1 |
| Date/time flexibility, lunar days/seasons | Date window + slider + play | v1 |
| Sun & Earth vs horizon; time to sunset/Earthset | Dome + refined event countdowns | v1 |
| Elevation angle, sunlight duration, Earth windows | Metrics panel + timeline bands | v1 |
| 2D/3D/other visualisations | Dome, 3D Moon, timeline | v1 |
| Animations/timelines | Play the lunar day | v1 |
| Planners **and** educators/public | Expert panel + guided story mode + kid-readable legend | v1 |
| Terrain/LOLA horizons | Flat horizon labelled; S1 terrain for 1–2 sites | **gap, disclosed** |
| Libration / orbital variations | Inherent in SPICE lunar orientation + ephemeris (state this in the method panel) | v1 |
| No atmosphere → no refraction | Airless geometry (Horizons ignores refraction for non-Earth sites too) | v1 |

### Stretch gate S1 — terrain horizon (decide, don't drift)
Start only if, by **T-14 h**, v1 is validated and the UI is complete. Use one PGDA 5 m site DEM (e.g., Shackleton rim), compute an azimuth→max-elevation horizon mask offline in Python, add it as `horizon.mask`, flag results `terrain_included:true` **only for that site**. Cross-check *qualitatively* against Quickmap/Trek average-visibility layers. If not done by **T-8 h, drop it** and keep the disclosure.

### Submission checklist (from the guide + official rules)
- [ ] Challenge selected on the team page; NASA data used meaningfully (name each dataset in the description).
- [ ] Description, demo link, repo/README, video, slides — **all links open in a private window**.
- [ ] **AI-use disclosure included** (required). Draft: *"AI tools (Claude, ChatGPT, Codex, GitHub Copilot) were used for code scaffolding, UI iteration, text drafting, voice-over generation and video assembly. All ephemeris geometry comes from NASA SPICE and was cross-checked against JPL Horizons; humans reviewed and tested all results."* — edit to match what was truly done.
- [ ] Rights/credits for every asset (NASA/LRO imagery, fonts, music). No copied code or text from other teams.
- [ ] Check the rule about using photos/video/voices of people under 18 in the demo.
- [ ] Team ≤ 6 members listed; Cairo local cut-off confirmed; submitted **before** it, with a buffer.

## 18. Research notes and related work (as of 13 Nov 2026)
- **Quickmap** already offers LOLA average Sun/Earth visibility layers, time-based layers, Sun/Earth positions in 3D and a visibility-analysis tool → LUMEN must not be pitched as "first"; pitch it as **faster, simpler decisions + clearer honesty**.
- **Moon Trek** exposes a RESTful WMTS API (tile URL template documented in the Trek API docs); check each layer's GetCapabilities for file type and coverage; missing tiles mean no data.
- **Horizons** supports user-defined lunar sites (`coord@301`), airless az/el, rise/transit/set; manual states best-effort availability.
- **Related public projects exist for this same challenge** (two GitHub repos, "Lunar Horizon" and "Lunar Horizon Wheel", both describing terrain-aware LOLA horizons and validation against PGDA maps and Horizons). I only read their descriptions. **Rule: do not copy their code, structure, text or figures.** Learning shared *conventions* is fine (e.g., LOLA counts the Sun as visible if any part of the disk is above the horizon; Earth is often judged by its centre) — implement independently, cite published references, and record the convention in `decisions.md`. Our honest weakness is terrain; our differentiators are UX, storytelling, comparison speed and clarity of limits.
- Unverified items to confirm before relying on them: exact Trek layer identifiers, PGDA product sizes/licences, Cairo's local cut-off time, and the Project Submission Guide published 13 Nov.

---

## 19. References (verify versions at time of use)

- NAIF SPICE Toolkit: https://naif.jpl.nasa.gov/naif/toolkit.html
- NAIF rules for use of SPICE: https://naif.jpl.nasa.gov/naif/rules.html
- SpiceyPy docs: https://spiceypy.readthedocs.io/en/main/
- JPL Horizons manual: https://ssd.jpl.nasa.gov/horizons/manual.html
- JPL Horizons API: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- NASA PDS Geosciences — LRO LOLA: https://pds-geosciences.wustl.edu/missions/lro/lola.htm
- NASA GSFC PGDA south-pole LOLA products (future): https://pgda.gsfc.nasa.gov/products/78 · /81 · /90
- NASA 3D Resources: https://science.nasa.gov/3d-resources/
- Moon Trek: https://trek.nasa.gov/moon/ · Trek WMTS API docs: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon
- LROC Quickmap: https://quickmap.lroc.asu.edu/ · JPL Horizons API: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- PGDA south-pole site LOLA DEMs: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/
- CSA Moon exploration: https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/
- Space Apps participant FAQs: https://www.spaceappschallenge.org/resources/participant-faqs/
- React: https://react.dev/ · Vite: https://vite.dev/ · Three.js: https://threejs.org/docs/ · React Three Fiber: https://r3f.docs.pmnd.rs/
- GSAP ScrollTrigger: https://gsap.com/docs/v3/Plugins/ScrollTrigger/ · Lenis: https://lenis.darkroom.engineering/
