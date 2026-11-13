"""Generate provenance-rich static JSON from NAIF kernels and cited lunar sites."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from lumen_science import (
    angular_radius_deg,
    bisect_crossing,
    brackets_zero,
    ensure_step,
    iter_epochs,
    load_sites,
    observation_dict,
    observe_vector,
    require_coverage,
    sha256_file,
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
KERNEL_BASE_URL = "https://naif.jpl.nasa.gov/pub/naif/generic_kernels"
KERNEL_SOURCE_PATHS = {
    "naif0012.tls": "lsk/naif0012.tls",
    "de440s.bsp": "spk/planets/de440s.bsp",
    "pck00011.tpc": "pck/pck00011.tpc",
    "moon_pa_de440_200625.bpc": "pck/moon_pa_de440_200625.bpc",
    "moon_de440_250416.tf": "fk/satellites/moon_de440_250416.tf",
}


def load_kernels(kernel_dir: Path, frame_kernel: str) -> list[Path]:
    required = ["naif0012.tls", "de440s.bsp", "pck00011.tpc", "moon_pa_de440_200625.bpc"]
    required.append(frame_kernel)
    missing = [name for name in required if not (kernel_dir / name).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing SPICE kernels in {kernel_dir}: {', '.join(missing)}")
    paths = [kernel_dir / name for name in required]
    for path in paths:
        spice.furnsh(str(path))
    return paths


def validate_kernel_coverage(
    analysis: dict[str, object], kernel_paths: list[Path]
) -> tuple[float, float]:
    """Validate target ephemerides and lunar orientation before computation."""
    start_utc, end_utc = str(analysis["start_utc"]), str(analysis["end_utc"])
    start_et, end_et = spice.str2et(start_utc), spice.str2et(end_utc)
    if end_et <= start_et:
        raise ValueError("analysis end_utc must be later than start_utc")

    planetary_spk = next(path for path in kernel_paths if path.name == "de440s.bsp")
    for body_id, label in ((10, "Sun SPK"), (399, "Earth SPK"), (301, "Moon SPK")):
        coverage = spice.spkcov(str(planetary_spk), body_id)
        intervals = [
            spice.wnfetd(coverage, index)
            for index in range(spice.wncard(coverage))
        ]
        require_coverage(start_et, end_et, intervals, label)

    binary_pck = next(
        path for path in kernel_paths if path.name == "moon_pa_de440_200625.bpc"
    )
    frame_ids = spice.cell_int(1000)
    spice.pckfrm(str(binary_pck), frame_ids)
    frame_id = spice.namfrm(str(analysis["frame"]))
    if frame_id <= 0:
        raise ValueError(f"Configured SPICE frame is unknown: {analysis['frame']}")
    center_id, _, _ = spice.frinfo(frame_id)
    if center_id != 301:
        raise ValueError(
            f"Configured frame {analysis['frame']} is not centered on the Moon"
        )
    pck_frame_ids = [int(frame_ids[index]) for index in range(spice.card(frame_ids))]
    if not pck_frame_ids:
        raise ValueError(f"No lunar orientation frames found in {binary_pck.name}")
    for pck_frame_id in pck_frame_ids:
        orientation_coverage = spice.cell_double(20000)
        spice.pckcov(str(binary_pck), pck_frame_id, orientation_coverage)
        intervals = [
            spice.wnfetd(orientation_coverage, index)
            for index in range(spice.wncard(orientation_coverage))
        ]
        require_coverage(
            start_et,
            end_et,
            intervals,
            f"Lunar orientation PCK frame {spice.frmnam(pck_frame_id)}",
        )

    # Validate that the configured frame transform is evaluable at both endpoints.
    for epoch_et in (start_et, end_et):
        spice.pxform(str(analysis["frame"]), "J2000", epoch_et)
    return start_et, end_et


def algorithm_revision() -> tuple[str, bool]:
    commit = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=False
    )
    status = subprocess.run(
        ["git", "status", "--porcelain", "--", "scripts/precompute.py", "scripts/lumen_science.py"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return commit.stdout.strip() or "unavailable", bool(status.stdout.strip())


def write_kernel_manifest(kernel_paths: list[Path], analysis: dict[str, object]) -> None:
    manifest = {
        "schema_version": "1.0",
        "frame": str(analysis["frame"]),
        "load_order": [path.name for path in kernel_paths],
        "coverage": {
            "dataset_interval_utc": {
                "start": str(analysis["start_utc"]),
                "end": str(analysis["end_utc"]),
            },
            "note": (
                "Sun, Earth, Moon SPK and lunar orientation PCK coverage were checked "
                "across this configured interval before generation. The loaded LSK "
                "uses the latest known leap-second offset; future updates cannot be predicted."
            ),
        },
        "kernels": [
            {
                "name": path.name,
                "source_url": f"{KERNEL_BASE_URL}/{KERNEL_SOURCE_PATHS[path.name]}",
                "sha256": sha256_file(path),
            }
            for path in kernel_paths
        ],
    }
    manifest_path = ROOT / "data" / "kernel_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")


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
            left_elevation = elevation_at(left_et, target)
            right_elevation = elevation_at(right_et, target)
            if not brackets_zero(left_elevation, right_elevation):
                continue
            crossing = bisect_crossing(
                lambda et, target_name=target: elevation_at(et, target_name),
                left_et,
                right_et,
            )
            event_type = rise_name if right_elevation > left_elevation else set_name
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
    algorithm_commit, algorithm_dirty = algorithm_revision()
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
                {
                    "name": path.name,
                    "path": str(path.relative_to(ROOT)),
                    "sha256": sha256_file(path),
                }
                for path in kernel_paths
            ],
            "algorithm_commit": algorithm_commit,
            "algorithm_dirty": algorithm_dirty,
            "algorithm_sources": [
                {
                    "path": f"scripts/{name}",
                    "sha256": sha256_file(ROOT / "scripts" / name),
                }
                for name in ("precompute.py", "lumen_science.py")
            ],
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
    selected = [site for site in sites if site.id == args.site] if args.site else [
        site for site in sites if site.verified
    ]
    if not selected:
        raise ValueError(f"Unknown site: {args.site}")
    paths = load_kernels(KERNEL_DIR, str(analysis["frame_kernel"]))
    output_dir = ROOT / "frontend" / "public" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        validate_kernel_coverage(analysis, paths)
        for site in selected:
            output_path = output_dir / f"{site.id}.json"
            payload = build_site_dataset(site, analysis, paths)
            output_path.write_text(json.dumps(payload, indent=2) + "\n")
        write_kernel_manifest(paths, analysis)
    finally:
        spice.kclear()
    return 0


if __name__ == "__main__":
    sys.exit(main())
