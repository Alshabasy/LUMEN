# Independent Horizons validation

## Generated SPICE interval

The validated datasets cover 2027-01-01T00:00:00Z through
2027-03-02T00:00:00Z inclusive at 900-second spacing. The SPICE kernel
coverage was checked before generation; see `data/kernel_manifest.json`.
Results remain geometric screening on a flat reference-sphere horizon.

UTC-to-ET conversion uses the latest offset in the loaded LSK. Horizons states
that TDB-to-UTC conversion after 2027-01-01 uses the last known leap-second
offset. The independent sample epochs below are within Horizons' reported
Earth-orientation prediction range, which extended through 2027-02-07 in the
saved responses. Later future time tags may be affected by updated Earth
orientation or leap-second information.

## Observer-table comparisons

For every site, Sun (`10`) and Earth (`399`) airless apparent azimuth,
elevation, and angular diameter were requested from JPL Horizons. The observer
was `coord@301`, `COORD_TYPE=GEODETIC`, with the cited east-positive longitude,
latitude, and zero height; output used UTC, quantities `4,13`, and CSV format.
The saved response header records the exact site coordinates and Horizons
ephemeris source (DE441). LUMEN uses the pinned DE440 SPICE kernels and
`MOON_ME_DE440_ME421`.

The three fixture epochs are **2027-01-02 00:00 UTC**, **2027-01-20 00:00
UTC**, and **2027-02-06 00:00 UTC** for all five sites and both targets. Each
Horizons epoch is on the generated 15-minute SPICE sample grid. The independent
acceptance tolerance is 0.1° for azimuth and elevation; azimuth differences
wrap across 0°/360°.

| Site | Sun max Δ azimuth | Sun max Δ elevation | Earth max Δ azimuth | Earth max Δ elevation | Result |
|---|---:|---:|---:|---:|---|
| Apollo 11 reference | 0.004° | 0.003° | 0.004° | 0.002° | Within tolerance |
| Apollo 12 reference | 0.005° | 0.004° | 0.003° | 0.003° | Within tolerance |
| Shackleton rim | 0.005° | 0.005° | 0.001° | 0.003° | Within tolerance |
| de Gerlache Rim 1 | 0.003° | 0.003° | 0.003° | 0.003° | Within tolerance |
| Malapert Massif | 0.005° | 0.005° | 0.004° | 0.005° | Within tolerance |

Largest absolute differences across all 30 target/epoch comparisons were
0.005° in azimuth and 0.005° in elevation, below the 0.1° tolerance. These
residuals do not prove a cause. The DE440/DE441 ephemeris difference and the
future UTC conversion convention are possible contributors, not established
explanations.

## Refined event checks

LUMEN refines Sun and Earth **center** elevation crossings at 0° by bisection.
Horizons RAD rise/set markers ordinarily refer to the target limb. To compare
the same center-crossing event, each event fixture sets the Horizons geometric
RTS elevation cutoff to the target's Horizons angular semidiameter measured at
the approximate event epoch. That puts the apparent target center at the 0°
geometric horizon crossing. Horizons was queried with `R_T_S_ONLY=YES`,
`STEP_SIZE='1m RAD'`, `APPARENT='AIRLESS'`, and `CSV_FORMAT=YES`. The requested
acceptance tolerance is 120 seconds; Horizons returns event times to the
minute at this search resolution.

| Site | Event | LUMEN refined UTC | Horizons RAD UTC | Absolute difference |
|---|---|---|---|---:|
| Apollo 11 reference | Sunrise | 2027-01-13 06:51:02.329 | 2027-01-13 06:52 | 57.7 s |
| Apollo 11 reference | Sunset | 2027-01-28 02:39:30.629 | 2027-01-28 02:40 | 29.4 s |
| de Gerlache Rim 1 | Sunrise | 2027-01-18 09:13:02.006 | 2027-01-18 09:14 | 58.0 s |
| de Gerlache Rim 1 | Sunset | 2027-01-09 10:29:55.825 | 2027-01-09 10:30 | 4.2 s |
| de Gerlache Rim 1 | Earthrise | 2027-01-10 11:35:15.307 | 2027-01-10 11:36 | 44.7 s |
| de Gerlache Rim 1 | Earthset | 2027-01-23 19:27:25.971 | 2027-01-23 19:28 | 34.0 s |

Every checked event is within the 120-second tolerance; the largest absolute
difference is 58.0 seconds. The individual event fixtures preserve the Horizons
query settings, threshold, event marker, and reported time. Apollo 11 has no
Earthrise or Earthset in this generated interval: its full-window Horizons RAD
fixture contains no Earth rise/set marker, matching the generated dataset.

This check covers the listed events only. It does not independently verify
every transition over the complete window, model terrain, or establish landing
suitability. No mismatch exceeded tolerance; therefore no residual event
mismatch remains to explain. The use of a semidiameter cutoff is required to
compare Horizons limb events to LUMEN center events, rather than evidence that
the two default event definitions are identical.

## Fixtures and reproduction

Observer-table fixtures are committed under `data/fixtures/*-2027-validation.txt`.
Event fixtures are `data/fixtures/*-event-2027.txt` plus
`apollo-11-earth-no-crossings-2027.txt`. Routine validation is offline:

```bash
PYTHONPATH=scripts .venv/bin/python scripts/validate_horizons.py
```

To make a fresh set of independent requests and replace the fixtures, run:

```bash
.venv/bin/python scripts/capture_horizons_fixtures.py
```

That capture command requires network access. The validator and product do not.
Horizons setup is documented in the [API reference](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
and [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html).
