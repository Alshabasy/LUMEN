"""Generate provenance-rich static JSON from NAIF kernels and cited lunar sites."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from lumen_science import (
    angular_radius_deg,
    bisect_crossing,
    ensure_step,
    iter_epochs,
    load_sites,
    observation_dict,
    observe_vector,
    site_dict,
    site_vector_km,
    utc_now,
    validate_site,
)

try:
    import spiceypy as spice
except ImportError as error:  # pragma: no cover - exercised by CLI environment
    raise SystemExit("SpiceyPy is required. Install requirements.txt first.") from error


ROOT = Path(__file__).resolve().parents[1]
KERNEL_DIR = ROOT / "data" / "kernels"


def load_kernels(kernel_dir: Path) -> list[Path]:
    required = ["naif0012.tls", "de440s.bsp", "pck00011.tpc", "moon_pa_de440_200625.bpc"]
    missing = [name for name in required if not (kernel_dir / name).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing SPICE kernels in {kernel_dir}: {', '.join(missing)}")
    fk_files = sorted(kernel_dir.glob("moon_de440_*.tf"))
    if not fk_files:
        raise FileNotFoundError("Missing explicit DE440 lunar frame FK (moon_de440_*.tf)")
    paths = [kernel_dir / name for name in required] + [fk_files[-1]]
    for path in paths:
        spice.furnsh(str(path))
    return paths


def refined_events(
    site,
    frame: str,
    aberration: str,
    epochs: list[float],
    sun_elevations: list[float],
    earth_elevations: list[float],
) -> list[dict[str, str]]:
    """Refine center-horizon crossings between adjacent samples."""
    surface = site_vector_km(site)

    def elevation_at(et: float, target: str) -> float:
        vector, _ = spice.spkpos(target, et, frame, aberration, "MOON")
        return observe_vector(site, np.asarray(vector) - surface).elevation_deg

    events: list[dict[str, str]] = []
    for target, values, rise_name, set_name in (
        ("SUN", sun_elevations, "sunrise", "sunset"),
        ("EARTH", earth_elevations, "earthrise", "earthset"),
    ):
        for left_et, right_et, left_value, right_value in zip(
            epochs, epochs[1:], values, values[1:], strict=False
        ):
            if left_value * right_value > 0:
                continue
            crossing = bisect_crossing(
                lambda et, target_name=target: elevation_at(et, target_name),
                left_et,
                right_et,
            )
            event_type = rise_name if right_value > left_value else set_name
            events.append({"type": event_type, "utc": spice.et2utc(crossing, "ISOC", 3) + "Z"})
    return sorted(events, key=lambda event: event["utc"])


def build_site_dataset(
    site, analysis: dict[str, object], kernel_paths: list[Path]
) -> dict[str, object]:
    validate_site(site)
    frame = str(analysis["frame"])
    start_utc, end_utc = str(analysis["start_utc"]), str(analysis["end_utc"])
    step_s = int(analysis["step_s"])
    ensure_step(step_s)
    start_et, end_et = spice.str2et(start_utc), spice.str2et(end_utc)
    surface = site_vector_km(site)
    sun_el, sun_az, earth_el, earth_az, earth_radius = [], [], [], [], []
    epochs = list(iter_epochs(start_et, end_et, step_s))
    for et in epochs:
        sun_from_moon, _ = spice.spkpos("SUN", et, frame, str(analysis["aberration"]), "MOON")
        earth_from_moon, _ = spice.spkpos("EARTH", et, frame, str(analysis["aberration"]), "MOON")
        sun = observation_dict(observe_vector(site, np.asarray(sun_from_moon) - surface))
        earth = observation_dict(observe_vector(site, np.asarray(earth_from_moon) - surface))
        sun_az.append(sun["azimuth_deg"])
        sun_el.append(sun["elevation_deg"])
        earth_az.append(earth["azimuth_deg"])
        earth_el.append(earth["elevation_deg"])
        earth_radius.append(round(angular_radius_deg(6378.1366, earth["distance_km"]), 2))
    sunlit = [value > 0 for value in sun_el]
    earth_visible = [value > 0 for value in earth_el]
    events = refined_events(site, frame, str(analysis["aberration"]), epochs, sun_el, earth_el)
    return {
        "schema_version": "1.0",
        "site": site_dict(site),
        "time": {
            "start_utc": start_utc,
            "end_utc": end_utc,
            "step_s": step_s,
            "scale_in": "UTC",
            "scale_calc": "ET/TDB",
        },
        "horizon": {"model": "flat-reference-sphere", "terrain_included": False, "mask": None},
        "series": {
            "sun_el_deg": sun_el,
            "sun_az_deg": sun_az,
            "earth_el_deg": earth_el,
            "earth_az_deg": earth_az,
            "earth_radius_deg": earth_radius,
        },
        "events": events,
        "summary": {
            "sunlit_fraction": round(sum(sunlit) / len(sunlit), 4),
            "earth_center_visible_fraction": round(sum(earth_visible) / len(earth_visible), 4),
            "longest_dark_h": None,
            "longest_earth_outage_h": None
        },
        "provenance": {
            "kernels": [
                {"name": path.name, "path": str(path.relative_to(ROOT))}
                for path in kernel_paths
            ],
            "algorithm_commit": "working-tree",
            "generated_utc": utc_now(),
            "aberration": str(analysis["aberration"])
        },
        "warnings": [],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", help="Generate only one site id")
    args = parser.parse_args()
    analysis_path = ROOT / "config" / "analysis.json"
    analysis = json.loads(analysis_path.read_text())
    sites = load_sites(ROOT / "config" / "sites.json")
    selected = [site for site in sites if not args.site or site.id == args.site]
    if not selected:
        raise ValueError(f"Unknown site: {args.site}")
    paths = load_kernels(KERNEL_DIR)
    output_dir = ROOT / "frontend" / "public" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        for site in selected:
            output_path = output_dir / f"{site.id}.json"
            payload = build_site_dataset(site, analysis, paths)
            output_path.write_text(json.dumps(payload, indent=2) + "\n")
    finally:
        spice.kclear()
    return 0


if __name__ == "__main__":
    sys.exit(main())
