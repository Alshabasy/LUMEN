# Scientific method

LUMEN's v1 numbers are computed offline with NAIF SPICE and serialized as static
JSON. UTC is accepted at the edges; SPICE ET/TDB is used internally. Positions
are computed from the lunar surface site, not the Moon centre, using the explicit
`MOON_ME_DE440_ME421` frame and `LT+S` aberration setting.

For each sample, the target vector is rotated into a local East-North-Up basis.
Azimuth is clockwise from North and elevation is measured from the flat,
reference-sphere horizon. Sun visibility uses the Sun centre above zero degrees.
Earth visibility in the current pipeline uses the Earth centre above zero degrees;
the apparent Earth-disc radius is still emitted for transparent future
partial-disc rules.

Terrain is not modelled. The resulting label is **geometric screening only** and
must not be interpreted as landing approval or a communications guarantee.
Candidate coordinates are not scientifically releasable until their source
citation is verified; the UI leaves those datasets unavailable rather than
showing placeholders as results.
