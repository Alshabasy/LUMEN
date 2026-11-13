from pathlib import Path

from scripts.validate_horizons import (
    EVENT_TOLERANCE_SECONDS,
    FIXTURES,
    parse_event_rows,
    parse_observer_rows,
    validate_apollo11_earth_no_crossings,
    validate_event,
    validate_site,
)


def test_all_saved_observer_fixtures_validate_offline() -> None:
    site_ids = sorted(path.stem for path in Path("frontend/public/data").glob("*.json"))
    assert len(site_ids) == 5
    for site_id in site_ids:
        lines, max_azimuth, max_elevation = validate_site(site_id)
        assert len(lines) == 6
        assert max_azimuth <= 0.1
        assert max_elevation <= 0.1


def test_saved_event_fixtures_meet_two_minute_tolerance() -> None:
    assert EVENT_TOLERANCE_SECONDS == 120
    assert "no Horizons RAD rise/set markers" in validate_apollo11_earth_no_crossings()
    for site_id, event_type in (
        ("apollo-11", "sunrise"),
        ("apollo-11", "sunset"),
        ("de-gerlache-rim", "sunrise"),
        ("de-gerlache-rim", "sunset"),
        ("de-gerlache-rim", "earthrise"),
        ("de-gerlache-rim", "earthset"),
    ):
        result = validate_event(site_id, event_type)
        assert "|Δt|=" in result


def test_fixture_parsers_read_saved_csv_tables() -> None:
    observer = parse_observer_rows(FIXTURES / "malapert-massif-sun-2027-validation.txt")
    event = parse_event_rows(FIXTURES / "de-gerlache-rim-earthrise-event-2027.txt")
    assert len(observer) == 3
    assert len(event) == 1
    assert event[0][1] == "r"
