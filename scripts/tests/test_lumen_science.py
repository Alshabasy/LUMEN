import numpy as np
import pytest

from scripts.lumen_science import (
    Site,
    bisect_crossing,
    brackets_zero,
    enu_basis,
    longest_below_horizon_run,
    observe_vector,
    require_coverage,
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


def test_east_longitude_normalization_is_periodic():
    wrapped = Site("wrapped", "Wrapped", 0.0, 359.76422, 1737.4, "ME", "fixture")
    west = Site("west", "West", 0.0, -0.23578, 1737.4, "ME", "fixture")
    np.testing.assert_allclose(site_vector_km(wrapped), site_vector_km(west), atol=1e-9)


def test_bisection_refines_crossing():
    crossing = bisect_crossing(lambda second: second - 3.25, 0, 10, tolerance_s=0.01)
    assert crossing == pytest.approx(3.25, abs=0.01)


def test_bisection_rejects_non_bracket():
    with pytest.raises(ValueError, match="bracket"):
        bisect_crossing(lambda second: second + 1, 0, 10)


def test_crossing_bracket_uses_continuous_values_not_rounded_zero():
    assert round(-0.004, 2) == 0
    assert round(-0.002, 2) == 0
    assert not brackets_zero(-0.004, -0.002)
    assert brackets_zero(-0.004, 0.006)


def test_kernel_coverage_requires_one_interval_to_cover_full_window():
    require_coverage(10, 20, [(0, 30)], "test kernel")
    with pytest.raises(ValueError, match="does not cover"):
        require_coverage(10, 20, [(0, 15), (15, 30)], "test kernel")


def test_longest_below_horizon_run_reports_hours_and_window_clipping():
    assert longest_below_horizon_run([1, -1, -2, 1, -1], 3600) == (2.0, False)
    assert longest_below_horizon_run([-1, -2, 1], 900) == (0.5, True)
    assert longest_below_horizon_run([1, 1], 900) == (0.0, False)


def test_longest_below_horizon_run_rejects_invalid_input():
    with pytest.raises(ValueError, match="positive"):
        longest_below_horizon_run([-1], 0)
    with pytest.raises(ValueError, match="finite"):
        longest_below_horizon_run([float("nan")], 1)
