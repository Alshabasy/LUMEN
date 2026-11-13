# Submission pack draft

## Judges quick start

Production URL is **not available yet**. The release checklist cannot be
completed until a Vercel project and deployment are available; see the
[deployment record](../README.md#deployment-status). Do not submit a placeholder
URL.

For a 30-second tour, start at the landing page, open Mission Control, choose a
generated site, and move the shared time cursor. Point out the local Sun/Earth
horizon readouts and next in-window refined transition. Turn on Compare mode and
choose a second site to compare both at the shared cursor. Then use Schedule
Slip to choose one polar site and two UTC start dates; the panel recomputes
fractions and longest below-horizon runs from each seven-day slice of the saved
series. Finish at Method and Credits to show provenance and limitations.

## Current generated full-window fractions

Values below are the four-decimal summary fractions serialized in each site's
generated JSON, formatted as percentages. They cover 2027-01-01T00:00:00Z
through 2027-03-02T00:00:00Z at 900-second sampling. They are flat-reference-
sphere geometric screening results, not site recommendations.

| Site | Sunlit fraction | Earth-centre-visible fraction |
|---|---:|---:|
| Apollo 11 reference | 49.38% | 100.00% |
| Apollo 12 reference | 50.74% | 100.00% |
| Shackleton rim | 70.56% | 41.68% |
| de Gerlache Rim 1 | 59.21% | 44.80% |
| Malapert Massif | 51.21% | 60.67% |

Exact validation epochs, angular differences, event differences, and tolerances
are in [validation.md](validation.md). The Schedule Slip panel derives its
interval metrics from the generated elevation arrays; it does not use live
ephemeris or extrapolate beyond available samples.

## Limits to state in the submission

- Results use the `MOON_ME_DE440_ME421` frame, UTC at the input/output edges,
  ET/TDB inside SPICE, `LT+S`, and observer geometry from the surface site.
- The local horizon is a flat reference sphere. Terrain is not modelled.
- The 0–5° horizon offset is labeled **Illustrative sensitivity, not terrain
  data**. It masks stored center-elevation samples; it contains no terrain
  elevation or azimuth-dependent horizon profile.
- Geometric Earth-centre visibility does not guarantee a communications link.
- The GO / CAUTION / NO-GO indicator uses transparent placeholder thresholds,
  not NASA mission criteria or landing guidance.
- The timeline and summary use precomputed SPICE JSON. LIVE NOW and LIVE ORBITS
  are separate NASA/JPL Horizons requests; failure shows a labeled, dated
  committed snapshot rather than current telemetry.
- The 3D Moon, Earth, Sun, starfield, textures, and hero animation are visual
  references. They are not geometry inputs, date-matched imagery, or terrain.
- The future-window UTC conversion uses the last known leap-second offset. The
  uncertainty is discussed in `docs/scientific-method.md` and `docs/validation.md`.

## AI-use disclosure draft

> OpenAI Codex was used as a code assistant to implement and revise application
> code, help prepare tests, and draft or edit project documentation and interface
> copy. AI tools did not calculate the lunar geometry or create the scientific
> results. All precomputed landing-site geometry is generated with NASA SPICE
> using the documented kernels and conventions, and was independently
> cross-checked against JPL Horizons at three epochs for the Sun and Earth at all
> five sites. The live panels query JPL Horizons directly. No AI-generated voice
> or AI-generated video assembly is present in this repository. The hero video
> is NASA Goddard Scientific Visualization Studio media; its poster is a still
> extracted from that clip. The team should add any AI voice, media assembly, or
> other AI tools used outside this repository before submitting.

This disclosure describes only the work evidenced in this repository and the
Codex-assisted work in this session. Confirm it against the full team's
production workflow before submission.

## Space Apps judging criteria evidence map

| Criterion | In-product evidence | Supporting files / limits |
|---|---|---|
| **Impact** | Schedule Slip compares two date windows for one polar site using generated Sun/Earth elevation samples. | `frontend/src/data/scheduleSlip.ts`, `docs/usability-test.md` (script only; results intentionally blank). Do not claim measured usability impact until testers complete it. |
| **Creativity** | Shared time cursor, local sky readout, interactive 3D site view, Compare mode, and the Schedule Slip walkthrough. | `frontend/src/App.tsx`, `frontend/src/features/OrbitalScene.tsx`. Art is identified as illustrative. |
| **Validity** | Reproducible SPICE series, saved Horizons observer/event fixtures, bounded API inputs, coverage checks, and automated tests. | `config/analysis.json`, `data/kernel_manifest.json`, `data/fixtures/`, `scripts/`, `docs/validation.md`, `frontend/src/data/*test.ts`. All results remain flat-horizon screening. |
| **Relevance** | Moon-site Sun power screening and geometric direct-to-Earth visibility with NASA/JPL/LRO source attribution. | `docs/scientific-method.md`, `docs/asset-credits.md`, `frontend/src/App.tsx`. No terrain, link budget, or mission approval. |
| **Presentation** | Cinematic landing page, guided Explorer/Compare flow, Method and Credits sections, and the judges' 30-second tour. | `README.md`, `frontend/src/App.tsx`, `docs/quality-pass.md`. Production deployment and private-browser verification are still outstanding. |

## Marketing statement audit for the team

The repository scan found no PowerPoint/deck file, final submission video, or
submission-description file. This inventory therefore lists claims to check in
the team's external materials; it does not assert that each claim appears in a
deck or video. No marketing file was edited.

| Claim to search for in external materials | Current evidence-based wording |
|---|---|
| Any sunlit / Earth-visible percentages from the former 2026-01-01–2026-01-20 window | Replace with the current full-window generated JSON values above, or label a result as a Schedule Slip interval and show its UTC bounds. |
| Terrain-aware, terrain included, LOLA horizon, or terrain-validated result | Terrain is not modelled. The optional elevation offset is illustrative sensitivity only. |
| “Live” precomputed timeline or real-time landing simulation | The timeline is precomputed SPICE geometry for the configured interval. LIVE NOW / LIVE ORBITS are separate Horizons snapshots. |
| Live universe/starfield as measured astronomy | The starfield is illustrative. Only the labeled Sun/Earth local-sky markers or orbit vectors come from the corresponding SPICE/Horizons data source. |
| Earth visibility guarantees communications | Say “geometric direct-to-Earth visibility”; no link budget, relay schedule, or communications guarantee is computed. |
| All samples independently validated against Horizons | Three spot-check epochs per target at each of five sites are recorded; six event checks cover Apollo 11 and de Gerlache Rim 1. Do not imply every sample or every event was independently checked. |
| Hero video is the previously supplied “Animation of the Moon (Web Optimized).mp4” | That unverified asset was removed. The current hero is NASA SVS “The Moon’s Rotation”; cite it and retain its visual-only meaning. |
| Lighthouse targets, successful production deployment, or completed user tests | No production URL/Lighthouse result is available, and the three-person usability table is blank. Describe these as outstanding, not passed. |
| NASA endorsement, guidance, or mission criteria | LUMEN is a team project; thresholds are placeholders and NASA does not sponsor or endorse it. |
