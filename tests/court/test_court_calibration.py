"""Unit tests for court geometry, homography calibration, and boundary decision logic."""

import numpy as np
import pytest

from tennis_ai.core.schemas import CallDecision
from tennis_ai.court.geometry import (
    COURT_LENGTH_M,
    SINGLES_WIDTH_M,
    DOUBLES_WIDTH_M,
    CourtCalibrator,
    CourtKeypoints,
)


def test_court_constants():
    assert COURT_LENGTH_M == 23.77
    assert SINGLES_WIDTH_M == 8.23
    assert DOUBLES_WIDTH_M == 10.97


def test_homography_exact_projection():
    # Define 4 synthetic corners in pixel space
    # (e.g. 1920x1080 camera view with perspective)
    img_pts = [
        (400.0, 900.0),   # Near-left singles corner
        (1520.0, 900.0),  # Near-right singles corner
        (700.0, 300.0),   # Far-left singles corner
        (1220.0, 300.0),  # Far-right singles corner
    ]
    court_pts = [
        (0.0, 0.0),
        (SINGLES_WIDTH_M, 0.0),
        (0.0, COURT_LENGTH_M),
        (SINGLES_WIDTH_M, COURT_LENGTH_M),
    ]

    calibrator = CourtCalibrator()
    calibrator.fit(img_pts, court_pts)

    # Test round-trip projection for corners
    for (u, v), (X, Y) in zip(img_pts, court_pts):
        pred_X, pred_Y = calibrator.image_to_court(u, v)
        assert pred_X == pytest.approx(X, abs=1e-2)
        assert pred_Y == pytest.approx(Y, abs=1e-2)

        pred_u, pred_v = calibrator.court_to_image(X, Y)
        assert pred_u == pytest.approx(u, abs=1e-1)
        assert pred_v == pytest.approx(v, abs=1e-1)

    # Reprojection error should be near zero for 4 points
    rmse = calibrator.compute_reprojection_error(img_pts, court_pts)
    assert rmse < 0.1


def test_line_call_decisions():
    img_pts = [
        (400.0, 900.0),
        (1520.0, 900.0),
        (700.0, 300.0),
        (1220.0, 300.0),
    ]
    court_pts = [
        (0.0, 0.0),
        (SINGLES_WIDTH_M, 0.0),
        (0.0, COURT_LENGTH_M),
        (SINGLES_WIDTH_M, COURT_LENGTH_M),
    ]
    calibrator = CourtCalibrator()
    calibrator.fit(img_pts, court_pts)

    # 1. Cleanly inside court
    call, conf, reason = calibrator.evaluate_line_call(
        court_x=4.115, court_y=11.885, is_doubles=False
    )
    assert call == CallDecision.IN
    assert conf > 0.9

    # 2. Cleanly outside baseline (far past baseline: Y = 25.0)
    call, conf, reason = calibrator.evaluate_line_call(
        court_x=4.115, court_y=25.0, is_doubles=False
    )
    assert call == CallDecision.OUT
    assert conf > 0.9

    # 3. Cleanly outside singles sideline (X = -0.50)
    call, conf, reason = calibrator.evaluate_line_call(
        court_x=-0.50, court_y=10.0, is_doubles=False
    )
    assert call == CallDecision.OUT

    # 4. Touching baseline within ball radius (ball radius = 0.0335m = 3.35cm)
    # Ball center 2cm past baseline (Y = 23.79), touching line!
    call, conf, reason = calibrator.evaluate_line_call(
        court_x=4.115, court_y=23.785, is_doubles=False, ball_radius_m=0.0335, uncertainty_m=0.01
    )
    assert call == CallDecision.IN
    assert "touching" in reason or "inside" in reason

    # 5. High uncertainty margin right on the edge
    call, conf, reason = calibrator.evaluate_line_call(
        court_x=4.115, court_y=23.82, is_doubles=False, ball_radius_m=0.0335, uncertainty_m=0.05
    )
    assert call == CallDecision.UNCERTAIN
    assert "uncertainty" in reason.lower()
