# Scientific method

LUMEN's v1 numbers are computed offline with NAIF SPICE and serialized as static
JSON. UTC is accepted at the edges; SPICE ET/TDB is used internally. Positions
are computed from the lunar surface site, not the Moon centre, using the explicit
`MOON_ME_DE440_ME421` frame and `LT+S` aberration setting.

For each sample, the target vector is rotated into a local East-North-Up basis.
Azimuth is clockwise from North and elevation is measured from the flat,
reference-sphere horizon. The original center-based metrics remain: Sun-centre
above zero degrees and Earth-centre above zero degrees. The generated series now
also carries angular radii for both bodies. Solar angular radius uses the NASA
Goddard Sun fact-sheet volumetric mean radius of 695,700 km and the SPICE
surface-site distance. The UI separately indicates whether the Sun's upper limb
clears the horizon or the full disk clears it; these disk states do not replace
the center-based validated fractions or center-crossing events. Earth-limb
visibility is also displayed separately from Earth-centre visibility and is not
a communications link assessment.

Longest dark and Earth-centre outage durations are the longest sampled runs at
or below zero degrees, with duration equal to sample count times the sampling
step. A run that touches either generated-window edge is marked as
window-bounded, so its reported duration is only a lower bound on the full
physical interval.

Terrain is not modelled. The resulting label is **geometric screening only** and
must not be interpreted as landing approval or a communications guarantee.
The generated interval is 2027-01-01T00:00:00Z through 2027-03-02T00:00:00Z
inclusive at 900-second spacing. Dataset summary fractions cover all samples in
that interval. Before generation, the precompute script checks that the Sun,
Earth, Moon, and lunar orientation PCK cover the full requested interval and
that the configured lunar frame transforms at both endpoints. UTC-to-ET uses
the latest leap-second offset in the loaded LSK; a future leap second cannot be
predicted, and Horizons documents that its UTC conversion after 2027-01-01
holds the last known offset.
South-pole candidate coordinates for Shackleton Rim, de Gerlache Rim 1, and
Malapert Massif come from the NASA Lunar Surface Data Book and PGDA. All five
site datasets have three-epoch Sun/Earth Horizons spot checks, and rise/set
events have separate checks for Apollo 11 and de Gerlache Rim 1. The precompute
pipeline refuses to generate datasets for any site without a verified
coordinate citation. Apollo 11 and Apollo 12 reference coordinates are also
sourced in `config/sites.json`. Results and limits are recorded in
`docs/validation.md`.

The optional horizon sensitivity control applies a user-selected 0–5° elevation
threshold to the saved Sun and Earth centre elevation samples. It recomputes
sample fractions in the browser and rounds them to the same four decimal places
as the generated summary. At 0° it reproduces each site's stored summary
fractions. This is an illustrative mask only: it contains no terrain elevations,
azimuth-dependent obstruction, or landform data, and the default result remains
the validated flat-reference-sphere screening.
