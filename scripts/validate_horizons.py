"""Compare saved Horizons CSV rows against generated LUMEN samples."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROW = re.compile(
    r"\s*(\d{4}-\w{3}-\d{2} \d{2}:\d{2}),\*,\w,\s*"
    r"([-+]?\d+\.\d+),\s*([-+]?\d+\.\d+),"
)


def parse_fixture(path: Path) -> list[tuple[str, float, float]]:
    rows = []
    for line in path.read_text().splitlines():
        match = ROW.match(line)
        if match:
            rows.append((match.group(1), float(match.group(2)), float(match.group(3))))
    return rows


def validate(site_id: str) -> list[str]:
    dataset = json.loads((ROOT / "frontend/public/data" / f"{site_id}.json").read_text())
    report: list[str] = []
    for target, azimuth_key, elevation_key in (
        ("sun", "sun_az_deg", "sun_el_deg"),
        ("earth", "earth_az_deg", "earth_el_deg"),
    ):
        fixture_rows = parse_fixture(ROOT / "data/fixtures" / f"{site_id}-{target}-2026-01.txt")
        if len(fixture_rows) < 3:
            raise ValueError(f"{target} fixture has fewer than three rows")
        fixture_start = datetime.strptime(fixture_rows[0][0], "%Y-%b-%d %H:%M")
        for utc, expected_az, expected_el in fixture_rows[:3]:
            samples_per_day = 86400 // dataset["time"]["step_s"]
            row_time = datetime.strptime(utc, "%Y-%b-%d %H:%M")
            day_offset = int((row_time - fixture_start).total_seconds() // 86400)
            sample_index = day_offset * samples_per_day
            actual_az = dataset["series"][azimuth_key][sample_index]
            actual_el = dataset["series"][elevation_key][sample_index]
            az_error = abs(actual_az - expected_az)
            el_error = abs(actual_el - expected_el)
            report.append(
                f"{target} {utc}: az error {az_error:.3f} deg, elevation error {el_error:.3f} deg"
            )
            if az_error > 0.1 or el_error > 0.1:
                raise AssertionError(report[-1])
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", default="apollo-11")
    args = parser.parse_args()
    print("\n".join(validate(args.site)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
