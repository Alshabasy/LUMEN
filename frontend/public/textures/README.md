# Visual asset provenance

These assets support appearance only. They do not provide scientific geometry,
illumination results, or landing-site terrain. The complete source and usage
notes are in [`docs/asset-credits.md`](../../../docs/asset-credits.md).

| File | Source and processing | Display note |
|---|---|---|
| `moon-lroc-wac-2k.webp` | NASA Goddard Scientific Visualization Studio, [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), `lroc_color_2k.jpg`; converted to 2048×1024 WebP. | LROC WAC natural-color appearance map. NASA documents that polar gaps are filled with lower-resolution albedo. Not a terrain model. |
| `earth-blue-marble-4k.webp` | NASA Earth Observatory, [Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/), January global map `world.200401.3x5400x2700.jpg`; resized to 4096×2048 WebP. | Static 2004 MODIS/Terra appearance reference, not live or date-matched imagery. |
| `sun-sdo-aia-171-equirect.webp` | NASA SDO/AIA [171 Å image, 2026-09-01 00:06:10 UT](https://sdo.gsfc.nasa.gov/assets/img/browse/2026/09/01/20260901_000610_4096_0171.jpg); remapped to a 2048×1024 equirectangular texture and mirrored on the unseen hemisphere. | False-color ultraviolet solar-atmosphere imagery, not a visible-light photosphere image. |

NASA imagery is attributed and used under NASA media guidance without implying
NASA sponsorship or endorsement. See [`docs/asset-credits.md`](../../../docs/asset-credits.md).
