# Validation

## Status

The first live Horizons request was successful for the Apollo 11 reference
coordinates at `2026-01-01T00:00:00Z`. Horizons returned Sun azimuth
`102.591013°` and elevation `80.731115°`; the SPICE dataset returns
`102.59°` and `80.73°` for the same epoch. This is a spot check, not the
required release validation set.

The release gate remains:

- at least three epochs for each of two cited sites;
- Sun and Earth azimuth/elevation comparisons;
- saved raw Horizons responses under `data/fixtures/`;
- documented tolerances and mismatch causes;
- no test that compares two outputs from the same implementation.

The second site is intentionally blocked until its published coordinate source
is verified. Do not populate this document with guessed coordinates or claim
that the validation gate has passed.
