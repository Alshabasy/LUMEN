"""Deterministic lunar surface geometry helpers used by the precompute script."""

from __future__ import annotations

import hashlib
import json
import math
from collections.abc import Callable, Iterable
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class Site:
    id: str
    name: str
    latitude_deg: float
    longitude_deg_east: float
    radius_km: float
    frame: str
    source: str
    verified: bool = True


@dataclass(frozen=True)
class VectorObservation:
    azimuth_deg: float
    elevation_deg: float
    distance_km: float


def _unit(vector: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(vector))
    if norm == 0:
        raise ValueError("Cannot normalize a zero-length vector")
    return vector / norm


def site_vector_km(site: Site) -> np.ndarray:
    """Return a planetocentric ME-frame surface vector for a spherical Moon."""
    lat = math.radians(site.latitude_deg)
    lon = math.radians(site.longitude_deg_east)
    return site.radius_km * np.array(
        [math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)]
    )


def enu_basis(site: Site) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return east, north, up unit vectors in the site's body-fixed frame."""
    lat = math.radians(site.latitude_deg)
    lon = math.radians(site.longitude_deg_east)
    east = np.array([-math.sin(lon), math.cos(lon), 0.0])
    north = np.array(
        [-math.sin(lat) * math.cos(lon), -math.sin(lat) * math.sin(lon), math.cos(lat)]
    )
    up = np.array([math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)])
    return east, north, up


def observe_vector(site: Site, target_relative_site_km: np.ndarray) -> VectorObservation:
    """Convert a body-fixed target vector into clockwise-from-north ENU angles."""
    east, north, up = enu_basis(site)
    direction = _unit(target_relative_site_km)
    east_component = float(np.dot(east, direction))
    north_component = float(np.dot(north, direction))
    up_component = float(np.clip(np.dot(up, direction), -1.0, 1.0))
    elevation_deg = math.degrees(math.asin(up_component))
    azimuth_deg = math.degrees(math.atan2(east_component, north_component)) % 360.0
    distance_km = float(np.linalg.norm(target_relative_site_km))
    return VectorObservation(azimuth_deg, elevation_deg, distance_km)


def angular_radius_deg(body_radius_km: float, distance_km: float) -> float:
    if body_radius_km <= 0 or distance_km <= 0:
        raise ValueError("Body radius and distance must be positive")
    return math.degrees(math.asin(min(1.0, body_radius_km / distance_km)))


def brackets_zero(left: float, right: float) -> bool:
    """Return whether continuous endpoint values include or straddle zero."""
    return left == 0 or right == 0 or (left < 0 < right) or (right < 0 < left)


def bisect_crossing(
    function: Callable[[float], float],
    left: float,
    right: float,
    *,
    tolerance_s: float = 0.5,
    max_iterations: int = 80,
) -> float:
    """Refine a sign-changing crossing in seconds using bisection."""
    left_value, right_value = function(left), function(right)
    if left_value == 0:
        return left
    if right_value == 0:
        return right
    if left_value * right_value > 0:
        raise ValueError("Bisection interval does not bracket a crossing")
    for _ in range(max_iterations):
        middle = (left + right) / 2
        if right - left <= tolerance_s:
            return middle
        middle_value = function(middle)
        if middle_value == 0:
            return middle
        if left_value * middle_value <= 0:
            right, right_value = middle, middle_value
        else:
            left, left_value = middle, middle_value
    return (left + right) / 2


def quantize_angle(value: float) -> float:
    return round(value, 2)


def utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_sites(path: Path) -> list[Site]:
    payload = json.loads(path.read_text())
    return [Site(**raw) for raw in payload["sites"]]


def validate_site(site: Site) -> None:
    if not site.verified:
        raise ValueError(
            f"{site.id}: site coordinates are not verified; refusing to compute results"
        )
    if not -90 <= site.latitude_deg <= 90:
        raise ValueError(f"{site.id}: latitude must be between -90 and 90 degrees")
    if not -360 <= site.longitude_deg_east <= 360:
        raise ValueError(f"{site.id}: longitude must be east-positive degrees")
    if site.radius_km <= 0:
        raise ValueError(f"{site.id}: radius must be positive")
    if not site.frame:
        raise ValueError(f"{site.id}: frame is required")
    if not site.source:
        raise ValueError(f"{site.id}: source citation is required")


def ensure_step(step_s: int) -> None:
    if step_s <= 0 or step_s > 86400:
        raise ValueError("step_s must be greater than zero and no more than one day")


def require_coverage(
    start_et: float,
    end_et: float,
    intervals: Iterable[tuple[float, float]],
    label: str,
) -> None:
    """Fail unless one kernel coverage interval contains the full ET window."""
    if not any(left <= start_et and right >= end_et for left, right in intervals):
        raise ValueError(
            f"{label} does not cover requested ET interval "
            f"[{start_et:.3f}, {end_et:.3f}]"
        )


def iter_epochs(start_et: float, end_et: float, step_s: int) -> Iterable[float]:
    ensure_step(step_s)
    if end_et < start_et:
        raise ValueError("end_et must not precede start_et")
    current = start_et
    while current <= end_et:
        yield current
        current += step_s


def observation_dict(observation: VectorObservation) -> dict[str, float]:
    return {
        "azimuth_deg": quantize_angle(observation.azimuth_deg),
        "elevation_deg": quantize_angle(observation.elevation_deg),
        "distance_km": round(observation.distance_km, 3),
    }


def site_dict(site: Site) -> dict[str, object]:
    return asdict(site)
