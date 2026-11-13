# Decisions

| Date | Decision | Alternatives | Why | Owner |
|---|---|---|---|---|
| 2026-11-13 | Lean static v1; terrain deferred | Full terrain engine | Validate the geometry and ship a usable explorer within the build window | Amr |
| 2026-11-13 | Explicit `MOON_ME_DE440_ME421` frame | Generic `MOON_ME` alias | The loaded DE440 FK defines the explicit frame and prevents alias drift | Amr |
| 2026-11-13 | Fixture-backed validation, no live browser requests | Browser-side Horizons calls | Reproducibility and offline demo behavior | Amr |
| 2026-11-13 | Unverified candidate sites remain unavailable | Display guessed coordinates | The honesty contract forbids invented scientific inputs | Amr |
