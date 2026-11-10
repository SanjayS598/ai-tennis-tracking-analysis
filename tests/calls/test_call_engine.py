"""Unit tests for line call decision engine and ground-truth evaluation metrics."""

import pytest
from tennis_ai.bounce.detector import BounceCandidate
from tennis_ai.calls.engine import LineCallEngine, evaluate_line_calls_against_ground_truth
from tennis_ai.core.schemas import CallDecision, Point2D
from tennis_ai.court.geometry import CourtCalibrator, SINGLES_WIDTH_M, COURT_LENGTH_M


@pytest.fixture
def calibrated_court() -> CourtCalibrator:
    calib = CourtCalibrator()
    # Synthetic 4 corners: 1920x1080
    img_pts = [(400.0, 900.0), (1520.0, 900.0), (700.0, 300.0), (1220.0, 300.0)]
    court_pts = [(0.0, 0.0), (SINGLES_WIDTH_M, 0.0), (0.0, COURT_LENGTH_M), (SINGLES_WIDTH_M, COURT_LENGTH_M)]
    calib.fit(img_pts, court_pts)
    return calib


def test_line_call_engine_in_event(calibrated_court: CourtCalibrator):
    engine = LineCallEngine(calibrator=calibrated_court)
    # Court center (4.115, 11.885)
    u_center, v_center = calibrated_court.court_to_image(4.115, 11.885)

    candidate = BounceCandidate(
        frame_idx=50,
        timestamp_ms=1666.0,
        center=Point2D(x=u_center, y=v_center),
        confidence=0.95,
    )

    event = engine.evaluate_bounce(candidate, session_id="test_sess", event_idx=1)
    assert event.call == CallDecision.IN
    assert event.estimated_court_xy is not None
    assert event.estimated_court_xy.x == pytest.approx(4.115, abs=0.05)
    assert event.estimated_court_xy.y == pytest.approx(11.885, abs=0.05)
    assert event.call_confidence > 0.9


def test_line_call_engine_out_event(calibrated_court: CourtCalibrator):
    engine = LineCallEngine(calibrator=calibrated_court)
    # Out past baseline: (4.115, 25.0)
    u_out, v_out = calibrated_court.court_to_image(4.115, 25.0)

    candidate = BounceCandidate(
        frame_idx=70,
        timestamp_ms=2333.0,
        center=Point2D(x=u_out, y=v_out),
        confidence=0.92,
    )

    event = engine.evaluate_bounce(candidate, session_id="test_sess", event_idx=2)
    assert event.call == CallDecision.OUT
    assert event.call_confidence > 0.85


def test_evaluate_line_calls_against_ground_truth():
    ground_truth = [
        {"frame_idx": 50, "call": CallDecision.IN},
        {"frame_idx": 80, "call": CallDecision.OUT},
    ]

    pred_events = [
        # Match within 2 frames
        {"frame_idx": 51, "call": CallDecision.IN},
        {"frame_idx": 80, "call": CallDecision.OUT},
    ]

    metrics = evaluate_line_calls_against_ground_truth(pred_events, ground_truth, tolerance_frames=2)
    assert metrics["accuracy"] == 1.0
    assert metrics["total_ground_truth"] == 2
    assert metrics["correct_calls"] == 2
    assert metrics["missed_bounces"] == 0
