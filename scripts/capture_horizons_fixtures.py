"""Capture independent Horizons observer-table fixtures for the configured sites."""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
EPOCHS_UTC = ("2027-Jan-02 00:00", "2027-Jan-20 00:00", "2027-Feb-06 00:00")
EVENT_SITES = ("apollo-11", "de-gerlache-rim")
EVENT_ROW = re.compile(
    r"^\s*(\d{4}-[A-Za-z]{3}-\d{2} \d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?,"
    r"\s*([^,]*),\s*([^,]*),"
)


def request_result(params: dict[str, str]) -> str:
    request = urllib.request.Request(
        f"{HORIZONS_URL}?{urllib.parse.urlencode(params)}",
        headers={"Accept": "application/json", "User-Agent": "LUMEN validation fixture capture"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    if payload.get("error"):
        raise RuntimeError(str(payload["error"]))
    result = payload.get("result")
    if not isinstance(result, str):
        raise RuntimeError("Horizons returned no result text")
    return result.strip() + "\n"


def capture(site: dict[str, object], target: str) -> str:
    tlist = " ".join(f"'{epoch}'" for epoch in EPOCHS_UTC)
    params = {
        "format": "json",
        "COMMAND": target,
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": "coord@301",
        "COORD_TYPE": "GEODETIC",
        "SITE_COORD": f"{site['longitude_deg_east']},{site['latitude_deg']},0",
        "TLIST": tlist,
        "TLIST_TYPE": "CAL",
        "TIME_TYPE": "UT",
        "QUANTITIES": "4,13",
        "ANG_FORMAT": "DEG",
        "APPARENT": "AIRLESS",
        "CSV_FORMAT": "YES",
    }
    try:
        result = request_result(params)
    except Exception as error:
        raise RuntimeError(f"Horizons {target} for {site['id']}: {error}") from error
    if "$$SOE" not in result or "$$EOE" not in result:
        raise RuntimeError(f"Horizons returned no observer table for {site['id']} target {target}")
    return result


def observer_params(site: dict[str, object], target: str) -> dict[str, str]:
    return {
        "format": "json",
        "COMMAND": target,
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": "coord@301",
        "COORD_TYPE": "GEODETIC",
        "SITE_COORD": f"{site['longitude_deg_east']},{site['latitude_deg']},0",
        "TIME_TYPE": "UT",
        "QUANTITIES": "4,13",
        "ANG_FORMAT": "DEG",
        "APPARENT": "AIRLESS",
        "CSV_FORMAT": "YES",
    }


def angular_semidiameter_deg(site: dict[str, object], target: str, event_utc: str) -> float:
    epoch = datetime.fromisoformat(event_utc.replace("Z", "+00:00"))
    tlist_epoch = epoch.strftime("%Y-%b-%d %H:%M:%S")
    params = observer_params(site, target)
    params.update({
        "TLIST": f"'{tlist_epoch}'",
        "TLIST_TYPE": "CAL",
        "QUANTITIES": "13",
        "TIME_DIGITS": "SECONDS",
    })
    result = request_result(params)
    row = next((line for line in result.splitlines() if EVENT_ROW.match(line)), None)
    if row is None:
        raise RuntimeError(f"No Horizons angular-diameter row at {event_utc}")
    columns = row.split(",")
    diameter_arcsec = float(columns[-2])
    return diameter_arcsec / 7200


def capture_event(site: dict[str, object], event: dict[str, str]) -> str:
    target = "10" if event["type"].startswith("sun") else "399"
    event_time = datetime.fromisoformat(event["utc"].replace("Z", "+00:00"))
    radius_deg = angular_semidiameter_deg(site, target, event["utc"])
    params = observer_params(site, target)
    params.update({
        "START_TIME": (event_time - timedelta(days=2)).strftime("%Y-%m-%d %H:%M"),
        "STOP_TIME": (event_time + timedelta(days=2)).strftime("%Y-%m-%d %H:%M"),
        "STEP_SIZE": "1m RAD",
        "R_T_S_ONLY": "YES",
        "ELEV_CUT": f"{radius_deg:.9f}",
    })
    result = request_result(params)
    event_rows = [
        EVENT_ROW.match(line)
        for line in result.splitlines()
        if EVENT_ROW.match(line)
    ]
    expected_marker = "r" if event["type"].endswith("rise") else "s"
    if not any(row and row.group(3).strip() == expected_marker for row in event_rows):
        raise RuntimeError(
            f"Horizons returned no {expected_marker} event near {event['utc']} for {site['id']}"
        )
    return result


def capture_event_fixtures(sites: list[dict[str, object]], fixture_dir: Path) -> None:
    by_id = {str(site["id"]): site for site in sites}
    for site_id in EVENT_SITES:
        site = by_id[site_id]
        dataset = json.loads((ROOT / "frontend/public/data" / f"{site_id}.json").read_text())
        selected = [
            event for event in dataset["events"]
            if event["type"] in ("sunrise", "sunset", "earthrise", "earthset")
        ]
        if site_id == "apollo-11":
            selected = [
                next(event for event in selected if event["type"] == event_type)
                for event_type in ("sunrise", "sunset")
            ]
        else:
            selected = [
                next(event for event in selected if event["type"] == event_type)
                for event_type in ("sunrise", "sunset", "earthrise", "earthset")
            ]
        for event in selected:
            path = fixture_dir / f"{site_id}-{event['type']}-event-2027.txt"
            path.write_text(capture_event(site, event))
            print(f"Saved {path.relative_to(ROOT)}")

    site = by_id["apollo-11"]
    dataset = json.loads((ROOT / "frontend/public/data/apollo-11.json").read_text())
    midpoint_utc = "2027-01-31T00:00:00Z"
    earth_radius_deg = angular_semidiameter_deg(site, "399", midpoint_utc)
    params = observer_params(site, "399")
    params.update({
        "START_TIME": dataset["time"]["start_utc"].replace("T", " ").removesuffix("Z"),
        "STOP_TIME": dataset["time"]["end_utc"].replace("T", " ").removesuffix("Z"),
        "STEP_SIZE": "1m RAD",
        "R_T_S_ONLY": "YES",
        "ELEV_CUT": f"{earth_radius_deg:.9f}",
    })
    result = request_result(params)
    markers = [
        match.group(3).strip()
        for line in result.splitlines()
        if (match := EVENT_ROW.match(line))
    ]
    if any(marker in ("r", "s") for marker in markers):
        raise RuntimeError("Horizons reported an Earth horizon crossing at Apollo 11")
    path = fixture_dir / "apollo-11-earth-no-crossings-2027.txt"
    path.write_text(result)
    print(f"Saved {path.relative_to(ROOT)}")


def main() -> None:
    sites = json.loads((ROOT / "config/sites.json").read_text())["sites"]
    fixture_dir = ROOT / "data/fixtures"
    fixture_dir.mkdir(parents=True, exist_ok=True)
    for site in sites:
        if not site.get("verified"):
            raise ValueError(f"Refusing to request unverified site coordinates: {site['id']}")
        for target, label in (("10", "sun"), ("399", "earth")):
            output = fixture_dir / f"{site['id']}-{label}-2027-validation.txt"
            output.write_text(capture(site, target))
            print(f"Saved {output.relative_to(ROOT)}")
    capture_event_fixtures(sites, fixture_dir)


if __name__ == "__main__":
    main()
