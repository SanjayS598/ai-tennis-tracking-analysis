"""Unit tests for temporal Kalman filter ball tracker."""

import pytest
from tennis_ai.ball.tracker import BallKalmanTracker
from tennis_ai.core.schemas import BallDetection, Point2D


def test_tracker_smooth_trajectory():
    tracker = BallKalmanTracker(max_missing_frames=3, max_jump_distance=150.0)

    # Simulated ball moving linearly across screen: (100 + 10*i, 200 + 5*i)
    detections = [
        BallDetection(
            frame_idx=i,
            timestamp_ms=float(i * 33.3),
            center=Point2D(x=float(100 + 10 * i), y=float(200 + 5 * i)),
            confidence=0.9,
            radius=4.0,
        )
        for i in range(10)
    ]

    tracks = tracker.track(detections)
    assert len(tracks) == 10
    # Velocity estimates should be positive
    vx, vy = tracker.current_velocity
    assert vx > 0.0
    assert vy > 0.0


def test_tracker_handles_missing_detections():
    tracker = BallKalmanTracker(max_missing_frames=2)

    # Frame 0, 1 present, Frame 2 missing, Frame 3, 4 present
    dets = [
        BallDetection(frame_idx=0, timestamp_ms=0.0, center=Point2D(x=100.0, y=100.0), confidence=0.9),
        BallDetection(frame_idx=1, timestamp_ms=33.3, center=Point2D(x=110.0, y=110.0), confidence=0.9),
        # Frame 2 is skipped
        BallDetection(frame_idx=3, timestamp_ms=100.0, center=Point2D(x=130.0, y=130.0), confidence=0.9),
        BallDetection(frame_idx=4, timestamp_ms=133.3, center=Point2D(x=140.0, y=140.0), confidence=0.9),
    ]

    tracks = tracker.track(dets)
    # Tracker should fill in or connect across frame 2
    assert len(tracks) >= 4
    # Jump from 110 to 130 should be smoothly connected
    frame_indices = [t.frame_idx for t in tracks]
    assert 3 in frame_indices
    assert 4 in frame_indices


def test_tracker_rejects_wild_outlier():
    tracker = BallKalmanTracker(max_jump_distance=50.0)
    d1 = BallDetection(frame_idx=0, timestamp_ms=0.0, center=Point2D(x=100.0, y=100.0), confidence=0.9)
    d2 = BallDetection(frame_idx=1, timestamp_ms=33.3, center=Point2D(x=105.0, y=105.0), confidence=0.9)
    # Wild jump of 800 pixels (e.g. spectator or white logo mistaken for ball)
    wild = BallDetection(frame_idx=2, timestamp_ms=66.6, center=Point2D(x=900.0, y=900.0), confidence=0.9)

    tracks = tracker.track([d1, d2, wild])
    # The wild point should not abruptly snap the trajectory
    filtered_pos = tracks[-1].center
    assert filtered_pos.x < 300.0  # Should be near the predicted position ~110, not 900
