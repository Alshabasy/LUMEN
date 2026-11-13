"""Stitch NASA Moon Trek LRO WAC equirectangular tiles into one texture for the 3D Moon.

UNTESTED against the live server (no network access where this was written).
Before running: open one tile URL in a browser to confirm it loads, e.g.
  https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/0/0/0.jpg
Layout assumed from the Trek docs: zoom Z has 2**(Z+1) columns and 2**Z rows.
Zoom 2 = 32 tiles, zoom 3 = 128 tiles. Check the real tile size in the layer's WMTSCapabilities.xml.
Credit: NASA/GSFC/Arizona State University (LRO WAC) via NASA Moon Trek.

Usage: python scripts/build_moon_texture.py 2
Needs:  pip install requests pillow
"""
import io
import sys
from pathlib import Path

import requests
from PIL import Image

Z = int(sys.argv[1]) if len(sys.argv) > 1 else 2
BASE = ("https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/"
        "1.0.0/default/default028mm")
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "frontend/public/moon_wac.webp"

cols, rows = 2 ** (Z + 1), 2 ** Z
sheet, tw, th = None, 0, 0
for r in range(rows):
    for c in range(cols):
        url = f"{BASE}/{Z}/{r}/{c}.jpg"
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        tile = Image.open(io.BytesIO(resp.content)).convert("RGB")
        if sheet is None:
            tw, th = tile.size
            sheet = Image.new("RGB", (tw * cols, th * rows))
        sheet.paste(tile, (c * tw, r * th))
    print(f"row {r + 1}/{rows} done")

sheet.save(OUT, quality=85)
print("saved", OUT, sheet.size, "-> check longitude orientation on the 3D sphere")
