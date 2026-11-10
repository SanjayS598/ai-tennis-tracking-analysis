"""Unit tests for parabolic trajectory bounce detector."""

import pytest
from tennis_ai.bounce.detector import BounceDetector
from tennis_ai.core.schemas import BallDetection, Point2D


def test_bounce_detector_parabolic_flight():
    detector = BounceDetector(min_confidence=0.5, window_size=5)

    # Simulate parabolic bounce peaking at frame 5 (x=300, y=850)
    # y(t) = 850 - 10 * (t - 5)^2
    # frames 0 to 10
    detections = []
    for t in range(11):
        y = float(850 - 10 * ((t - 5) ** 2))
        x = float(200 + 20 * t)
        dets = BallDetection(
            frame_idx=t,
            timestamp_ms=float(t * 33.3),
            center=Point2D(x=x, y=y),
            confidence=0.9,
            radius=4.0,
        )
        detections.append(dets)

    candidates = detector.detect_bounces(detections)
    assert len(candidates) == 1
    bounce = candidates[0]
    assert bounce.frame_idx == 5
    assert bounce.center.x == pytest.approx(300.0, abs=2.0)
    assert bounce.center.y == pytest.approx(850.0, abs=2.0)
    assert bounce.confidence > 0.8


def test_bounce_detector_no_bounce_during_flat_motion():
    detector = BounceDetector()
    # Ball flying strictly horizontally across court (no vertical rebound)
    flat_dets = [
        BallDetection(
            frame_idx=i,
            timestamp_ms=float(i * 33.3),
            center=Point2D(x=float(100 + i * 20), y=400.0),
            confidence=0.9,
        )
        for i in range(15)
    ]
    candidates = detector.detect_bounces(flat_dets)
    assert len(candidates) == 0
