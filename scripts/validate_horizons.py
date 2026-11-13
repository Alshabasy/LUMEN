"""Validate current generated site data against saved JPL Horizons fixtures."""

from __future__ import annotations

import argparse
import json
import re
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "data/fixtures"
DATASETS = ROOT / "frontend/public/data"
ROW = re.compile(
    r"^\s*(\d{4}-[A-Za-z]{3}-\d{2} \d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?,"
    r"\s*([^,]*),\s*([^,]*),\s*([-+]?\d+(?:\.\d+)?),"
    r"\s*([-+]?\d+(?:\.\d+)?),\s*([-+]?\d+(?:\.\d+)?)"
)
EVENT_CASES = (
    ("apollo-11", "sunrise"),
    ("apollo-11", "sunset"),
    ("de-gerlache-rim", "sunrise"),
    ("de-gerlache-rim", "sunset"),
    ("de-gerlache-rim", "earthrise"),
    ("de-gerlache-rim", "earthset"),
)
ANGLE_TOLERANCE_DEG = 0.1
EVENT_TOLERANCE_SECONDS = 120


def parse_observer_rows(path: Path) -> list[tuple[datetime, float, float, float]]:
    rows = []
    in_table = False
    for line in path.read_text().splitlines():
        if "$$SOE" in line:
            in_table = True
            continue
        if "$$EOE" in line:
            break
        if not in_table:
            continue
        match = ROW.match(line)
        if not match:
            continue
        timestamp = datetime.strptime(match.group(1), "%Y-%b-%d %H:%M").replace(tzinfo=UTC)
        rows.append(
            (timestamp, float(match.group(4)), float(match.group(5)), float(match.group(6)))
        )
    return rows


def fixture_epochs() -> tuple[datetime, ...]:
    return tuple(
        datetime.strptime(value, "%Y-%b-%d %H:%M").replace(tzinfo=UTC)
        for value in ("2027-Jan-02 00:00", "2027-Jan-20 00:00", "2027-Feb-06 00:00")
    )


def validate_site(site_id: str) -> tuple[list[str], float, float]:
    dataset_path = DATASETS / f"{site_id}.json"
    dataset = json.loads(dataset_path.read_text())
    report: list[str] = []
    max_azimuth_error = 0.0
    max_elevation_error = 0.0
    for target, target_id, azimuth_key, elevation_key in (
        ("sun", "10", "sun_az_deg", "sun_el_deg"),
        ("earth", "399", "earth_az_deg", "earth_el_deg"),
    ):
        fixture_path = FIXTURES / f"{site_id}-{target}-2027-validation.txt"
        raw = fixture_path.read_text()
        if f"Target body name: {'Sun' if target_id == '10' else 'Earth'} ({target_id})" not in raw:
            raise ValueError(f"Target ID mismatch in {fixture_path.name}")
        rows = parse_observer_rows(fixture_path)
        if len(rows) != 3:
            raise ValueError(
                f"Expected three Horizons epochs in {fixture_path.name}; found {len(rows)}"
            )
        if tuple(row[0] for row in rows) != fixture_epochs():
            raise ValueError(f"Unexpected Horizons epochs in {fixture_path.name}")
        start_utc = datetime.fromisoformat(dataset["time"]["start_utc"].replace("Z", "+00:00"))
        step_s = dataset["time"]["step_s"]
        for timestamp, expected_azimuth, expected_elevation, _ in rows:
            elapsed_s = (timestamp - start_utc).total_seconds()
            sample_index = round(elapsed_s / step_s)
            if elapsed_s < 0 or sample_index >= len(dataset["series"][azimuth_key]):
                raise ValueError(
                    f"{target} fixture epoch {timestamp.isoformat()} is outside generated data"
                )
            if abs(sample_index * step_s - elapsed_s) > 1:
                raise ValueError(
                    f"{timestamp.isoformat()} does not align with the configured sample grid"
                )
            azimuth = dataset["series"][azimuth_key][sample_index]
            elevation = dataset["series"][elevation_key][sample_index]
            raw_delta = abs(azimuth - expected_azimuth) % 360
            azimuth_error = min(raw_delta, 360 - raw_delta)
            elevation_error = abs(elevation - expected_elevation)
            max_azimuth_error = max(max_azimuth_error, azimuth_error)
            max_elevation_error = max(max_elevation_error, elevation_error)
            line = (
                f"{site_id} {target} {timestamp:%Y-%m-%d %H:%M} UTC: "
                f"azimuth Δ={azimuth_error:.3f}°, elevation Δ={elevation_error:.3f}°"
            )
            report.append(line)
            if azimuth_error > ANGLE_TOLERANCE_DEG or elevation_error > ANGLE_TOLERANCE_DEG:
                raise AssertionError(f"{line} exceeds {ANGLE_TOLERANCE_DEG:.3f}° tolerance")
    return report, max_azimuth_error, max_elevation_error


def parse_event_rows(path: Path) -> list[tuple[datetime, str]]:
    rows = []
    in_table = False
    for line in path.read_text().splitlines():
        if "$$SOE" in line:
            in_table = True
            continue
        if "$$EOE" in line:
            break
        if not in_table:
            continue
        match = ROW.match(line)
        if not match:
            continue
        marker = match.group(3).strip()
        if marker in ("r", "s", "t", "e"):
            timestamp = datetime.strptime(match.group(1), "%Y-%b-%d %H:%M").replace(tzinfo=UTC)
            rows.append((timestamp, marker))
    return rows


def validate_event(site_id: str, event_type: str) -> str:
    target = "sun" if event_type.startswith("sun") else "earth"
    marker = "r" if event_type.endswith("rise") else "s"
    path = FIXTURES / f"{site_id}-{event_type}-event-2027.txt"
    dataset = json.loads((DATASETS / f"{site_id}.json").read_text())
    expected = [event for event in dataset["events"] if event["type"] == event_type]
    if not expected:
        raise ValueError(
            f"No generated {event_type} exists at {site_id}; fixture cannot be compared"
        )
    rows = parse_event_rows(path)
    horizons = [timestamp for timestamp, code in rows if code == marker]
    if len(horizons) != 1:
        raise ValueError(
            f"Expected one Horizons {marker} marker in {path.name}; found {len(horizons)}"
        )
    # Fixture query is centered on the first in-window refined LUMEN event of this type.
    event_utc = datetime.fromisoformat(expected[0]["utc"].replace("Z", "+00:00"))
    horizons_utc = horizons[0]
    delta_seconds = abs((horizons_utc - event_utc).total_seconds())
    raw = path.read_text()
    if "RTS mode turned ON" not in raw or "RTS elevation" not in raw or "RAD" not in raw:
        raise ValueError(f"Horizons geometric RAD rise/set mode is not recorded in {path.name}")
    result = (
        f"{site_id} {event_type}: LUMEN {event_utc:%Y-%m-%d %H:%M:%S} UTC; "
        f"Horizons {horizons_utc:%Y-%m-%d %H:%M} UTC; |Δt|={delta_seconds:.1f} s"
    )
    if delta_seconds > EVENT_TOLERANCE_SECONDS:
        raise AssertionError(
            f"{result}; exceeds {EVENT_TOLERANCE_SECONDS}-second tolerance. "
            "Check event semantics, angular-radius cutoff, and time tags."
        )
    if target not in ("sun", "earth"):
        raise AssertionError("Unexpected target mapping")
    return result


def validate_apollo11_earth_no_crossings() -> str:
    dataset = json.loads((DATASETS / "apollo-11.json").read_text())
    if any(event["type"].startswith("earth") for event in dataset["events"]):
        raise AssertionError("LUMEN has an Earth horizon event at Apollo 11 in this interval")
    path = FIXTURES / "apollo-11-earth-no-crossings-2027.txt"
    rows = parse_event_rows(path)
    if any(marker in ("r", "s") for _, marker in rows):
        raise AssertionError(f"Horizons reports Earth rise/set at Apollo 11 in {path.name}")
    if "RTS mode turned ON" not in path.read_text() or "RAD" not in path.read_text():
        raise ValueError(f"Horizons geometric RAD mode is not recorded in {path.name}")
    return (
        "apollo-11 Earth: no LUMEN Earthrise/Earthset and no Horizons RAD "
        "rise/set markers in the generated interval"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", action="append", help="Site ID; repeat to select multiple sites")
    args = parser.parse_args()
    sites = args.site or sorted(path.stem for path in DATASETS.glob("*.json"))
    for site_id in sites:
        lines, max_az, max_el = validate_site(site_id)
        print("\n".join(lines))
        print(
            f"{site_id} maxima: azimuth Δ={max_az:.3f}°, "
            f"elevation Δ={max_el:.3f}°; tolerance={ANGLE_TOLERANCE_DEG:.3f}°"
        )
    if "apollo-11" in sites and "de-gerlache-rim" in sites:
        print(validate_apollo11_earth_no_crossings())
        for site_id, event_type in EVENT_CASES:
            print(validate_event(site_id, event_type))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
