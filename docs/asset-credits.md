# Shipped asset sources and usage notes

The in-app **Credits** section mirrors this inventory. All image and video
materials are visual references only; they do not supply LUMEN's SPICE geometry
or terrain model.

## NASA visual references

| Shipped file | Exact source | Terms and use |
|---|---|---|
| `frontend/public/videos/moon-rotation-svs-720p.mp4` | NASA Goddard Scientific Visualization Studio, [The Moon's Rotation](https://svs.gsfc.nasa.gov/4709/), 720p MP4 (`orbit_720p30.mp4`). The page credits NASA's Scientific Visualization Studio and visualization by Ernie Wright. | NASA SVS says its visualizations are public domain unless the individual page marks an exception. The page has no third-party music credit. Used only as a looping hero visual; the animation is not the site's modeled Sun direction or site terrain. |
| `frontend/public/videos/moon-surface-poster.webp` | A WebP still generated from the credited NASA SVS clip above using FFmpeg. | Fallback still for the same visual; no independent imagery source. |
| `frontend/public/textures/moon-lroc-wac-2k.webp` | NASA Goddard SVS [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), `lroc_color_2k.jpg`, based on the LROC WAC natural-color mosaic; polar holes use lower-resolution laser-altimeter albedo. | NASA media guidance applies. Used as global appearance only; NASA calls the map aesthetic-optimized and directs scientific applications to source data. No terrain is represented by this texture. |
| `frontend/public/textures/earth-blue-marble-4k.webp` | NASA Earth Observatory [Blue Marble: Next Generation — Base Map](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/), January global image, `world.200401.3x5400x2700.jpg`, based on MODIS/Terra observations from 2004. | NASA media guidance applies. Resized to 4096×2048 for a static Earth appearance; it is neither current nor a live ephemeris observation. |
| `frontend/public/textures/sun-sdo-aia-171-equirect.webp` | NASA Solar Dynamics Observatory / Atmospheric Imaging Assembly, [171 Å image](https://sdo.gsfc.nasa.gov/assets/img/browse/2026/09/01/20260901_000610_4096_0171.jpg), 2026-09-01 00:06:10 UT. | NASA media guidance applies. Reprojected to an equirectangular appearance map and mirrored across the unobserved hemisphere; false-color ultraviolet, not visible-light photography. |

NASA's [media usage guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/)
says NASA material may generally be used for educational/informational purposes
with source credit, while third-party-marked content needs its rights checked
with its copyright holder. NASA does not endorse LUMEN. No NASA insignia,
logotype, employee likeness, or endorsement language is used.

The Sun's 695,700 km volumetric mean radius used for its computed angular-radius
series comes from the [NASA Goddard Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html).

## Fonts, icons, and sound

| Asset | Source and terms | Use |
|---|---|---|
| Bebas Neue, Manrope, DM Mono | [Google Fonts](https://fonts.google.com/); each family metadata lists the SIL Open Font License 1.1. Sources: [Bebas Neue](https://github.com/google/fonts/tree/main/ofl/bebasneue), [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), [DM Mono](https://github.com/google/fonts/tree/main/ofl/dmmono). | Requested through Google Fonts CSS, with system fallbacks. The font software is OFL-licensed. |
| Lucide React icons | [Lucide](https://github.com/lucide-icons/lucide), ISC License. | UI controls and navigation symbols. |
| LUMEN favicon | Authored for this project as `frontend/public/favicon.svg`. | Original project mark; contains no NASA logo. |
| Sound cues | Generated at runtime by `frontend/src/features/useLumenAudio.ts` using the browser [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). | Optional synthesized interface tones; no external music, recording, or audio file is bundled. |

`frontend/public/icons.svg` and the previously supplied generic Moon animation
copies were unused or lacked a verifiable original asset record, so they were
removed. The hero now uses the directly credited NASA SVS download above.
