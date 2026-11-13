"""Capture dated, real Horizons snapshots for labelled offline UI fallback."""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
SITE_CONFIG = json.loads((ROOT / "config/sites.json").read_text())
MONTHS = dict(
    zip(
        ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"),
        (f"{i:02}" for i in range(1, 13)),
        strict=True,
    )
)


def request_horizons(parameters: dict[str, str]) -> dict[str, Any]:
    url = f"{HORIZONS_URL}?{urllib.parse.urlencode(parameters)}"
    with urllib.request.urlopen(url, timeout=25) as response:
        payload = json.load(response)
    if payload.get("error"):
        raise RuntimeError(str(payload["error"]))
    return payload


def observer_point(site: dict[str, Any], target: str, epoch: datetime) -> dict[str, float]:
    end = epoch + timedelta(minutes=1)
    parameters = {
        "format": "json",
        "COMMAND": target,
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": "coord@301",
        "COORD_TYPE": "GEODETIC",
        "SITE_COORD": f"{site['longitude_deg_east']},{site['latitude_deg']},0",
        "START_TIME": epoch.strftime("%Y-%m-%d %H:%M"),
        "STOP_TIME": end.strftime("%Y-%m-%d %H:%M"),
        "STEP_SIZE": "1m",
        "TIME_TYPE": "UT",
        "QUANTITIES": "4,13",
        "ANG_FORMAT": "DEG",
    }
    result = request_horizons(parameters)["result"]
    table = result.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    row = next(
        (
            line
            for line in table.splitlines()
            if re.match(r"^\s*\d{4}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}", line)
        ),
        None,
    )
    if row is None:
        raise ValueError(f"Could not parse {target} observer row for {site['id']}")
    azimuth, elevation, diameter_arcsec = map(float, row.split()[-3:])
    return {
        "azimuthDeg": azimuth,
        "elevationDeg": elevation,
        "angularDiameterDeg": diameter_arcsec / 3600,
    }


def vectors(
    target: str, center: str, now: datetime, span_days: int, step: str
) -> list[dict[str, Any]]:
    start = now - timedelta(days=span_days)
    stop = now + timedelta(days=span_days)
    parameters = {
        "format": "json",
        "COMMAND": target,
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "VECTORS",
        "CENTER": center,
        "START_TIME": start.strftime("%Y-%m-%d %H:%M"),
        "STOP_TIME": stop.strftime("%Y-%m-%d %H:%M"),
        "STEP_SIZE": step,
        "TIME_TYPE": "UT",
        "REF_PLANE": "ECLIPTIC",
        "REF_SYSTEM": "ICRF",
        "VEC_TABLE": "1",
        "VEC_CORR": "NONE",
        "OUT_UNITS": "AU-D",
        "CSV_FORMAT": "YES",
    }
    result = request_horizons(parameters)["result"]
    table = result.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    points = []
    row_pattern = re.compile(
        r"^\s*\d+(?:\.\d+)?,\s*A\.D\.\s+(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2}):\d+(?:\.\d+)?,\s*([-+\d.E]+),\s*([-+\d.E]+),\s*([-+\d.E]+)",
        re.M,
    )
    for match in row_pattern.finditer(table):
        year, month, day, hour, minute = match.groups()[:5]
        x, y, z = map(float, match.groups()[5:])
        points.append(
            {
                "utc": f"{year}-{MONTHS[month]}-{day}T{hour}:{minute}:00Z",
                "xAu": x,
                "yAu": y,
                "zAu": z,
            }
        )
    if len(points) < 3:
        raise ValueError(f"Could not parse vector table for target {target}")
    return points


def main() -> None:
    now = datetime.now(UTC).replace(second=0, microsecond=0)
    result = {
        "capturedAtUtc": now.isoformat().replace("+00:00", "Z"),
        "source": "NASA/JPL Horizons API · DE441",
        "sites": {},
    }
    for site in SITE_CONFIG["sites"]:
        sun = observer_point(site, "10", now)
        earth = observer_point(site, "399", now)
        result["sites"][site["id"]] = {
            "siteId": site["id"],
            "asOfUtc": now.isoformat().replace("+00:00", "Z"),
            "fetchedAtUtc": now.isoformat().replace("+00:00", "Z"),
            "sun": sun,
            "earth": earth,
            "source": "NASA/JPL Horizons API",
        }
        print(f"Captured {site['id']} at {result['capturedAtUtc']} UTC")
        time.sleep(0.15)
    output = ROOT / "frontend/src/data/fixtures/live-fallback.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(f"Wrote {output.relative_to(ROOT)}")

    orbit_result = {
        "epochUtc": result["capturedAtUtc"],
        "frame": "Ecliptic J2000 / ICRF axes",
        "units": "AU",
        "correction": "Geometric vectors (VEC_CORR=NONE)",
        "earthHeliocentric": vectors("399", "500@10", now, 180, "5 d"),
        "moonGeocentric": vectors("301", "500@399", now, 15, "12 h"),
        "source": "NASA/JPL Horizons API · DE441",
        "capturedAtUtc": result["capturedAtUtc"],
    }
    orbit_path = ROOT / "frontend/src/data/fixtures/orbits-fallback.json"
    orbit_path.write_text(json.dumps(orbit_result, indent=2) + "\n")
    print(f"Wrote {orbit_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
