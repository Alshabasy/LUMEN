#!/usr/bin/env bash
# LUMEN data fetch (Mac/Linux).
# NOTE: written without network access to NAIF/PGDA, so it is UNTESTED against the live servers.
# If a download fails, open the printed URL in a browser and fix the file name.
#
# Usage:
#   ./scripts/fetch_data.sh              # SPICE kernels (about 35 MB) + checksums
#   ./scripts/fetch_data.sh pgda Site04  # optional: one PGDA 5 m terrain tile (asks before downloading)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
K="$ROOT/data/kernels"; mkdir -p "$K"
N="https://naif.jpl.nasa.gov/pub/naif/generic_kernels"

get() { # get URL DEST
  local url="$1" dest="$2"
  if [ -s "$dest" ]; then echo "have  $(basename "$dest")"; return 0; fi
  echo "get   $url"
  curl -fL --retry 3 -o "$dest" "$url"
}

if [ "${1:-}" = "pgda" ]; then
  S="${2:?usage: fetch_data.sh pgda Site04}"
  D="$ROOT/data/pgda"; mkdir -p "$D"
  U="https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/$S/${S}_final_adj_5mpp_surf.tif"
  echo "Checking size of $U"
  curl -sIL "$U" | grep -i '^content-length' || echo "(size not reported)"
  read -r -p "Download this file? [y/N] " a
  [ "$a" = "y" ] && get "$U" "$D/${S}_surf.tif"
  exit 0
fi

get "$N/lsk/naif0012.tls"                 "$K/naif0012.tls"
get "$N/spk/planets/de440s.bsp"           "$K/de440s.bsp"
get "$N/pck/pck00011.tpc"                 "$K/pck00011.tpc"
get "$N/pck/moon_pa_de440_200625.bpc"     "$K/moon_pa_de440_200625.bpc"
get "$N/fk/satellites/moon_de440_250416.tf" "$K/moon_de440_250416.tf" \
  || echo "!! FK name may have changed: open $N/fk/satellites/ and take the newest moon_de440_*.tf"

# Record checksums for data/kernel_manifest.json
( cd "$K" && if command -v shasum >/dev/null 2>&1; then shasum -a 256 *; else sha256sum *; fi ) > "$ROOT/data/kernel_checksums.txt"
echo "Done. Checksums in data/kernel_checksums.txt"
