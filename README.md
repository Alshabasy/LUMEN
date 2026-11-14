# 🌕 LUMEN — Lunar Landing Site Navigator

**A transparent screening tool for lunar surface illumination and geometric direct-to-Earth visibility.**

LUMEN is a web application created for the NASA Space Apps Challenge 2026 challenge **“Lunar Landing Site Navigator.”** It helps mission planners, educators, students, and the public explore how the Sun and Earth appear above the horizon at selected lunar reference sites and times.

> **Scope:** LUMEN provides geometric screening on a flat reference sphere. Terrain is not modelled. Results are not landing approval, a communications guarantee, or NASA guidance.

| | |
|---|---|
| 🚀 **Live application** | [lumen-lunar-navigator.vercel.app](https://lumen-lunar-navigator.vercel.app/) |
| 🛰️ **Challenge** | NASA Space Apps Challenge 2026 · *Lunar Landing Site Navigator* |
| 📍 **Sites** | Five cited reference sites: Apollo 11, Apollo 12, Shackleton Rim, de Gerlache Rim 1, and Malapert Massif |
| 🗓️ **Generated interval** | 2027-01-01T00:00:00Z through 2027-03-02T00:00:00Z, inclusive · 900-second samples |
| 🧭 **Scientific frame** | `MOON_ME_DE440_ME421` · east-positive selenographic longitude |

## 📚 Contents

- [Challenge and project](#-challenge-and-project)
- [30-second tour](#-30-second-tour)
- [What the application does](#-what-the-application-does)
- [NASA data and other sources](#-nasa-data-and-other-sources)
- [Scientific method and conventions](#-scientific-method-and-conventions)
- [System design](#-system-design)
- [Technology](#-technology)
- [Run the application](#-run-the-application)
- [Regenerate and validate the science data](#-regenerate-and-validate-the-science-data)
- [Verification record](#-verification-record)
- [Limits and interpretation](#-limits-and-interpretation)
- [Repository map and further reading](#-repository-map-and-further-reading)
- [Credits and licensing](#-credits-and-licensing)

## 🪐 Challenge and project

Lunar landing planning depends on local lighting, surface visibility, and the timing of changes in those conditions. A schedule shift can change when a site receives sunlight or has a geometric view of Earth. LUMEN brings those time-dependent quantities into a guided interface so users can inspect a site, move through a generated time window, compare sites, and see the assumptions behind each result.

The application is designed for two kinds of use:

- **Mission-planning exploration:** compare cited sites and inspect generated Sun and Earth horizon events during an early screening exercise.
- **Education and public communication:** use the visual story, timeline, and plain-language explanations to understand why a landing site's local sky changes over time.

LUMEN focuses on making assumptions visible. It is an independent challenge project and is **not sponsored, endorsed, or operated by NASA**.

## 👋 30-second tour

1. Open the [live application](https://lumen-lunar-navigator.vercel.app/) and choose **Open Navigator**.
2. Select a reference site. Move the UTC time cursor to see Sun and Earth directions, current horizon states, and the next available in-window event.
3. Turn on **Compare mode** to add a second site, or use **Schedule Slip** to compare two date slices for one polar site.
4. Open **Method**, **Limits**, and **Credits** to review the science conventions, validation evidence, assumptions, and visual sources.

## 🧭 What the application does

- Browse five reference sites with source citations and a common lunar frame.
- Explore a reproducible, precomputed SPICE timeline from **2027-01-01 through 2027-03-02 UTC** at 15-minute spacing.
- View local Sun and Earth azimuth/elevation, angular-disc visibility, selected-time readouts, window summaries, and refined sunrise, sunset, Earthrise, and Earthset events when those events exist within the generated window.
- Jump to an in-window event, enter a UTC date and time, step the time cursor with the arrow keys, and use Space to play or pause the timeline.
- Compare two sites at a shared time cursor. A separate **Schedule Slip** view compares two seven-day date slices from the generated series for a selected polar site.
- Explore an interactive 3D Moon scene and an optional current Sun/Earth orbital context view. Orbital distances and body sizes are expanded for visibility and are labelled as not to scale.
- Request a separate, current-minute NASA/JPL Horizons snapshot for the selected site's Sun and Earth directions. This is an ephemeris result, not telemetry, and it does not alter the precomputed SPICE timeline.
- Use an optional 0–5° elevation offset to see an illustrative sensitivity calculation from the saved elevation series. It is not terrain data.
- Review method, validation, asset credits, and limitations in the application.

## 🛰️ NASA data and other sources

LUMEN distinguishes inputs that produce numerical results from imagery that is used only for visual context.

### Data used for geometry and validation

| Source | How LUMEN uses it |
|---|---|
| [NAIF/JPL SPICE](https://naif.jpl.nasa.gov/naif/) kernels — `naif0012.tls`, `de440s.bsp`, `pck00011.tpc`, `moon_pa_de440_200625.bpc`, and `moon_de440_250416.tf` | Offline source for the reproducible Sun/Earth geometry, lunar orientation, and UTC/ET conversion used in the generated site datasets. Kernel URLs, load order, and SHA-256 values are recorded in [`data/kernel_manifest.json`](data/kernel_manifest.json). |
| [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Independent observer-table fixtures check Sun (`10`) and Earth (`399`) azimuth, elevation, and angular diameter for all five sites at three saved epochs. The live application also requests current site-relative Sun/Earth observations and geometric vector data through the Vercel API routes. |
| NASA site-coordinate references | Apollo 11 is sourced from NASA's Apollo landing-coordinate record; Apollo 12 from NASA/NSSDC; south-pole candidate coordinates from the NASA Lunar Surface Data Book and cited PGDA product records. Site sources and coordinate conventions are recorded in [`config/sites.json`](config/sites.json). |
| [NASA Goddard Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html) | Source for the Sun's volumetric mean radius used to compute the generated solar angular-radius series. |

Horizons validation fixtures are committed under [`data/fixtures/`](data/fixtures/), so routine validation does not require a live Horizons connection. The saved checks use Horizons observer tables for all five sites and geometric rise/set comparisons for Apollo 11 and de Gerlache Rim 1. Results and tolerances are documented in [`docs/validation.md`](docs/validation.md).

### NASA imagery used only as visual references

| Asset | Source and role |
|---|---|
| Moon hero video | NASA Goddard Scientific Visualization Studio, [The Moon's Rotation](https://svs.gsfc.nasa.gov/4709/). Used as a looping visual; it does not provide site geometry or terrain. |
| Moon texture | NASA Goddard SVS [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), using an LROC WAC natural-color mosaic. Used for the 3D Moon's appearance only. |
| Earth texture | NASA Earth Observatory [Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/), a static January global map based on MODIS/Terra 2004 observations. It is not current imagery. |
| Sun texture | NASA Solar Dynamics Observatory / AIA [171 Å image](https://sdo.gsfc.nasa.gov/assets/img/browse/2026/09/01/20260901_000610_4096_0171.jpg). False-color ultraviolet imagery, used for appearance only. |

The 3D assets, hero film, stars, and visual effects do not contribute to scientific calculations. Full asset sources and usage notes are in [`docs/asset-credits.md`](docs/asset-credits.md). QuickMap and Moon Trek are useful related exploration tools; this application does not use their map layers as numerical inputs.

## 📐 Scientific method and conventions

1. **Precompute:** Python and SpiceyPy load the pinned NAIF kernels, verify required coverage for the configured interval, and compute the Sun and Earth relative to each lunar surface site.
2. **Local sky:** target vectors are expressed in the site's East-North-Up frame. Azimuth is clockwise from North; elevation is measured from the local horizontal plane.
3. **Serialize:** generated datasets store angles, angular radii, refined event times, summary metrics, and provenance in versioned JSON under [`frontend/public/data/`](frontend/public/data/).
4. **Render:** the frontend reads those datasets for the timeline and comparison views. Live Horizons snapshots are displayed separately and are never silently substituted into the SPICE series.

**Conventions:**

- Lunar reference frame: `MOON_ME_DE440_ME421`.
- Site coordinates: planetocentric selenographic latitude, east-positive longitude, in degrees; reference radius `1737.4 km`.
- UTC is used at input and display boundaries. SPICE ET/TDB is used internally.
- Geometry is computed from the surface site with `LT+S` aberration correction.
- The generated primary fractions and event times use body-centre elevation relative to the flat 0° horizon. The interface separately displays apparent-disc visibility states.
- The configured time interval is inclusive at 900-second sample spacing. Events outside this generated interval are not extrapolated or presented as available.
- Longest dark and Earth-centre outage runs are sampled summaries. Runs touching a window edge are flagged as window-bounded lower bounds.

## 🧱 System design

```text
NAIF SPICE kernels + cited site coordinates
                  │
                  ▼
       Python / SpiceyPy precompute
                  │
                  ▼
 frontend/public/data/<site>.json ──► React explorer, timeline, compare, 3D view

 NASA/JPL Horizons ──► /api/horizons  (current site-relative Sun/Earth observer data)
                  └─► /api/orbits    (current geometric orbital vectors)

 Saved Horizons fixtures ──► offline scientific validation
```

The Vite development server mounts local handlers for both API routes. Vercel serves the same TypeScript handlers as serverless functions in production. The application requires no user account, application database, or Horizons API key.

### Live API routes

- `GET /api/horizons` — accepts only the supported site ID, target (`10` or `399`), and a current UTC-minute epoch. The handler builds the Horizons request from an allowlist, uses `APPARENT=AIRLESS`, applies a timeout, and returns structured errors for invalid or failed requests.
- `GET /api/orbits` — accepts no query parameters and returns current geometric vectors used by the orbital context view. The visual scale is expanded and disclosed in the UI.

The client keeps a committed, UTC-labelled Horizons snapshot available as a clearly identified fallback if a live request fails. Cached values are never labelled current.

## 🧰 Technology

| Area | Tools |
|---|---|
| Web application | React, TypeScript, Vite |
| 3D and interaction | Three.js, React Three Fiber, GSAP / ScrollTrigger, Lenis |
| State and styling | Zustand, Tailwind CSS utilities, project CSS and design tokens |
| Scientific pipeline | Python, SpiceyPy, NumPy |
| Independent validation and code checks | Saved JPL Horizons fixtures, pytest, Ruff, Vitest |
| Hosting | Vercel static deployment and serverless functions |
| Additional visual/audio tools | NASA imagery listed above; optional locally synthesized Web Audio cues |

## 🚀 Run the application

The generated site JSON and visual assets are checked into the repository. You can run the web application without downloading SPICE kernels or regenerating the datasets.

**Tested environment:** Node.js `26.1.0`, npm `11.13.0`, and Python `3.12.3`.

```bash
cd frontend
npm ci
npm run dev
```

Vite prints a local development URL when the server is ready. Its development middleware also mounts `/api/horizons` and `/api/orbits`. To run frontend tests and make a production build:

```bash
npm run test
npm run build
```

## 🔁 Regenerate and validate the science data

Dataset generation requires network access to fetch the pinned NAIF kernels. The downloaded kernels are intentionally excluded from Git; the fetch script records their local checksums.

```bash
# From the repository root
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./fetch_data.sh

PYTHONPATH=scripts .venv/bin/python scripts/precompute.py
PYTHONPATH=scripts .venv/bin/python scripts/validate_horizons.py
.venv/bin/pytest scripts/tests -q
.venv/bin/ruff check scripts
```

`precompute.py` checks kernel coverage and frame transforms before writing the five site datasets. `validate_horizons.py` reads committed fixtures and runs offline; it does not contact Horizons. The separate `scripts/capture_horizons_fixtures.py` utility makes network requests and replaces validation fixtures, so use it only when intentionally refreshing the reference data.

## ✅ Verification record

Recorded checks for the current working snapshot on **2026-11-13**:

| Command or check | Recorded result |
|---|---|
| `PYTHONPATH=scripts .venv/bin/pytest scripts/tests -q` | 12 passed |
| `.venv/bin/ruff check scripts` | All checks passed |
| `cd frontend && npm run test` | 17 tests passed across 4 files |
| `cd frontend && npm run build` | Passed. Vite emitted a chunk-size warning for the lazy 3D scene: 948.71 kB minified, 249.65 kB gzip. |
| Production browser and HTTP smoke check | Landing page and explorer loaded; Compare mode displayed two panels; LIVE NOW showed a timestamped Horizons snapshot; LIVE ORBITS activated. Root and both valid API routes returned HTTP 200. |
| Production mobile layout at 390 px | No document-level horizontal overflow observed. |

The production deployment was reported **READY** at [lumen-lunar-navigator.vercel.app](https://lumen-lunar-navigator.vercel.app/). A clean-clone check was not repeated after the latest working-tree edits. Lighthouse mobile scores have not been recorded; see [`docs/quality-pass.md`](docs/quality-pass.md) for the detailed quality record and remaining checks.

## ⚠️ Limits and interpretation

- **Terrain is not modelled.** The local horizon is a flat reference sphere; no LOLA elevation raster, crater rim, massif, slope, or azimuth-dependent terrain mask is used.
- The horizon-offset control is an **illustrative sensitivity calculation**, not topographic data.
- Sunlit and Earth-visible fractions are geometric screening metrics. Earth visibility does not establish a radio link, relay availability, or communications quality.
- LUMEN does not model solar array output, battery state, thermal behavior, lander performance, or operational constraints.
- The screening indicator uses project-configured placeholder thresholds, not NASA criteria or a mission recommendation.
- The precomputed time series covers only the configured interval. It does not extrapolate beyond that range.
- Horizons notes that its TDB-to-UTC conversion after 2027-01-01 uses the last known leap-second offset. This future time-tag limitation is recorded in [`docs/validation.md`](docs/validation.md).
- Horizons and SPICE use different lunar ephemeris/frame provenance. The DE421-based lunar Mean Earth frame used by Horizons and the DE440 SPICE inputs are recorded as a possible source of residual differences, not a proven explanation.
- Orbital-view distances and body sizes are expanded for visibility and are not to scale. The textures and starfield are illustrative.
- The curated interface supports the five listed sites; it does not accept arbitrary custom landing coordinates.

## 🗂️ Repository map and further reading

| Path | Purpose |
|---|---|
| [`config/analysis.json`](config/analysis.json) | Time window, sample step, frame, and aberration setting |
| [`config/sites.json`](config/sites.json) | Curated site coordinates, conventions, and citations |
| [`config/verdict.json`](config/verdict.json) | Visible screening thresholds, explicitly marked as placeholders |
| [`scripts/precompute.py`](scripts/precompute.py) | SPICE dataset generation and coverage checks |
| [`scripts/lumen_science.py`](scripts/lumen_science.py) | Time, geometry, event, and summary calculations |
| [`scripts/validate_horizons.py`](scripts/validate_horizons.py) | Offline comparison against saved Horizons fixtures |
| [`api/horizons.ts`](api/horizons.ts), [`api/orbits.ts`](api/orbits.ts) | Bounded Vercel API handlers for current Horizons data |
| [`frontend/src/`](frontend/src/) | React application, data access, 3D scene, and UI features |
| [`docs/scientific-method.md`](docs/scientific-method.md) | Calculation conventions and assumptions |
| [`docs/validation.md`](docs/validation.md) | Independent Horizons observer and event checks |
| [`docs/asset-credits.md`](docs/asset-credits.md) | Image, video, font, icon, and sound attribution |
| [`docs/quality-pass.md`](docs/quality-pass.md) | Test, browser, performance, and accessibility record |
| [`docs/usability-test.md`](docs/usability-test.md) | Five-minute usability script and blank participant results table |
| [`docs/submission-pack.md`](docs/submission-pack.md) | Challenge submission notes and evidence mapping |

## 🎨 Credits and licensing

NASA imagery and data are credited at their points of use and in the in-app Credits section. NASA does not sponsor or endorse this project. Third-party software and asset terms are listed in [`docs/asset-credits.md`](docs/asset-credits.md).

**Repository code license:** no standalone license file is currently present in the repository. Do not assume the project code is licensed for reuse without permission. Individual data and visual assets retain their own source terms.
