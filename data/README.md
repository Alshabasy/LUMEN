# Data

`data/kernels/` is intentionally ignored. Run `./fetch_data.sh` to download the
NAIF kernels and generate checksums. The precompute script refuses to run when
required kernels are absent and records the exact loaded-kernel metadata in each
output file.

Horizons responses used for validation belong in `data/fixtures/`; tests and the
demo must never make a live Horizons request.
