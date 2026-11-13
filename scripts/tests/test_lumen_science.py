import numpy as np
import pytest

from scripts.lumen_science import (
    Site,
    bisect_crossing,
    enu_basis,
    observe_vector,
    site_vector_km,
)

SITE = Site("test", "Test", 0.0, 0.0, 1737.4, "MOON_ME_TEST", "fixture")


def test_enu_axes_at_equator_prime_meridian():
    east, north, up = enu_basis(SITE)
    np.testing.assert_allclose(east, [0, 1, 0])
    np.testing.assert_allclose(north, [0, 0, 1])
    np.testing.assert_allclose(up, [1, 0, 0])


def test_surface_vector_and_observation():
    np.testing.assert_allclose(site_vector_km(SITE), [1737.4, 0, 0])
    observation = observe_vector(SITE, np.array([0.0, 1.0, 0.0]))
    assert observation.azimuth_deg == pytest.approx(90)
    assert observation.elevation_deg == pytest.approx(0)


def test_bisection_refines_crossing():
    crossing = bisect_crossing(lambda second: second - 3.25, 0, 10, tolerance_s=0.01)
    assert crossing == pytest.approx(3.25, abs=0.01)


def test_bisection_rejects_non_bracket():
    with pytest.raises(ValueError, match="bracket"):
        bisect_crossing(lambda second: second + 1, 0, 10)
