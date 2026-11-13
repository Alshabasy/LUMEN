# LUMEN — Lunar Landing Site Navigator

LUMEN is a lunar landing-site screening tool for cited reference sites. Its
reproducible timeline uses precomputed NASA SPICE geometry; a separate current
snapshot queries NASA/JPL Horizons for the Sun and Earth at the selected lunar
site. The Horizons snapshot updates every minute and is an ephemeris, not live
telemetry. LUMEN is not landing approval, a communications guarantee, or NASA
guidance. Terrain is not included.

## Judges quick start

**Production URL:** Not deployed yet. The deployment blocker and pending private-
browser checks are recorded under [Deployment status](#deployment-status).

**30-second tour:** Start at the landing page, open Mission Control, choose one
of the generated sites, and move the shared time cursor to see the local Sun and
Earth horizon readouts. Turn on Compare mode to view a second site at the same
cursor. In the Schedule Slip panel, select a polar site and two UTC dates to
compare generated-series screening over each displayed interval. Open Method
and Credits to inspect frames, validation, asset sources, and limits.

**Limits:** All precomputed results are geometric screening on a flat reference
sphere; terrain is not modelled. The horizon sensitivity control is illustrative
and does not add terrain data. Earth-centre visibility is not a communications
link guarantee, and the screening indicator uses documented placeholder
thresholds rather than NASA mission criteria. The timeline is precomputed SPICE
data; LIVE NOW and LIVE ORBITS are separate NASA/JPL Horizons snapshots. A
cached snapshot is labeled with its capture UTC when live requests fail.

See [the submission pack](docs/submission-pack.md),
[quality record](docs/quality-pass.md), and
[usability test script](docs/usability-test.md).

## Current validation status

- All five curated sites have cited coordinates and generated SPICE datasets.
- The current generated interval is 2027-01-01T00:00:00Z through
  2027-03-02T00:00:00Z, inclusive, with 15-minute samples. Summary fractions
  cover this complete generated window.
- Saved Horizons observer-table fixtures independently check Sun/Earth angles
  at three epochs for all five sites. The largest recorded azimuth and
  elevation differences are each 0.005°, under a 0.1° tolerance.
- Horizons geometric event checks cover Apollo 11 sunrise/sunset and all four
  rise/set event types at de Gerlache Rim 1. The largest recorded difference is
  58 seconds under a 120-second tolerance; Apollo 11 has no Earth rise/set in
  the generated interval.
- Shackleton Rim, de Gerlache Rim 1, and Malapert Massif coordinates are sourced
  from the NASA Lunar Surface Data Book and PGDA.
- Results use a flat reference-sphere horizon.
- Horizons documents that UTC conversion after 2027-01-01 holds the last known
  leap-second offset; future UTC conversion carries that limitation.

See [the scientific method](docs/scientific-method.md) and
[validation results](docs/validation.md) for assumptions and limits.

## Clean-checkout verification

Run these from a fresh clone. `fetch_data.sh` downloads the pinned NAIF kernel
files and records local checksums; the repository manifest records the sources
and scientific configuration. Routine Horizons validation reads saved fixtures
and does not contact the network.

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./fetch_data.sh
PYTHONPATH=scripts .venv/bin/python scripts/precompute.py
PYTHONPATH=scripts .venv/bin/python scripts/validate_horizons.py
.venv/bin/pytest scripts/tests -q
.venv/bin/ruff check scripts
cd frontend
npm ci
npm run test
npm run build
```

Clean-checkout run completed in `/tmp/lumen-release-clean` from a fresh local
Git clone overlaid with this working snapshot (uncommitted source is not in the
repository's current `HEAD`). Results on Python 3.12 / Node 26.1.0 / npm 11.13.0:

- `python3 -m venv .venv` and `.venv/bin/pip install -r requirements.txt` —
  succeeded; NumPy 2.5.4, SpiceyPy 6.0.3, pytest 8.4.2, Ruff 0.17.5 installed.
- `./fetch_data.sh` — fetched all five configured kernels from the pinned NAIF
  URLs and wrote local SHA-256 checksums.
- `PYTHONPATH=scripts .venv/bin/python scripts/precompute.py` — exited 0 and
  regenerated all five site files after kernel coverage checks.
- `PYTHONPATH=scripts .venv/bin/python scripts/validate_horizons.py` — passed;
  angle maxima 0.005°/0.005°, event maximum 58.0 seconds / 120-second limit.
- `.venv/bin/pytest scripts/tests -q` — `9 passed`; `.venv/bin/ruff check
  scripts` — `All checks passed!`.
- `npm ci` — 132 packages added, 0 vulnerabilities; `npm run test` — 12 passed;
  `npm run build` — succeeded. Vite reports the lazy 3D chunk at 948.57 kB
  minified (249.61 kB gzip), above its 500 kB warning threshold.
- Generated site JSON gzip sizes: Apollo 11 45,251 bytes; Apollo 12 51,048;
  de Gerlache Rim 1 38,992; Malapert Massif 42,164; Shackleton Rim 37,528.

### Deployment status

Not deployed. This environment has no Vercel CLI, no `~/.vercel` project link,
and no `VERCEL_*` credential variables. `npm exec --yes --package=vercel --
vercel whoami` produced no output and was interrupted; deployment authentication
could not be established. Therefore there is no production URL to test in a
private browser. Production landing, explorer, compare, LIVE NOW, and LIVE ORBITS
checks remain outstanding until a Vercel project/account is linked.

The Vite development server mounts the same-origin `/api/horizons` proxy used by
the app, so the browser does not call JPL cross-origin. Production deployment
uses the included Vercel function in `api/horizons.ts` (`vercel.json` builds the
Vite app and serves that function). The live route is restricted to the five
curated site IDs and the Sun/Earth targets. It sends no API key or user secret.

Live source: [NASA/JPL Horizons API](https://ssd.jpl.nasa.gov/api/horizons.api).
The live panel reports apparent azimuth/elevation and angular diameter at the
site's current UTC minute. It remains distinct from the selected, SPICE-backed
timeline so changing the historical cursor cannot silently change timestamps.
If a live request fails, the panel uses a committed Horizons observer/vector
snapshot with its capture UTC shown and labels it as cached, never as current
telemetry. The observer snapshot covers the five curated sites.

`precompute.py` checks requested interval coverage before generating all five
sites. The validator reads committed 2027 fixtures and makes no network
requests. The separate capture utilities contact Horizons and replace their
fixtures. Kernel download and fresh-environment setup instructions are in
[data/README.md](data/README.md).
