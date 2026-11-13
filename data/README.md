# Data

`data/kernels/` is intentionally ignored. Run `./fetch_data.sh` to download the
NAIF kernels. The precompute script uses the explicit frame kernel in
`config/analysis.json`, records each kernel's SHA-256 in generated datasets, and
writes `data/kernel_manifest.json` with source URLs, load order, and the
configured interval exercised by generation. That interval is not a statement
of each kernel's full intrinsic coverage.

Horizons responses used for validation belong in `data/fixtures/`; tests and the
demo must never make a live Horizons request.
