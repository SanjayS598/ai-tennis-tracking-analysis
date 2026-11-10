"""Unit tests for tennis_ai core schemas and data contracts."""

import pytest
from pydantic import ValidationError

from tennis_ai.core.schemas import (
    CallDecision,
    CalibrationStatus,
    Point2D,
    CourtCalibration,
    VideoMetadata,
    BallDetection,
    BounceEvent,
    SessionReport,
)


def test_point2d_creation():
    pt = Point2D(x=100.5, y=200.25)
    assert pt.x == 100.5
    assert pt.y == 200.25
    assert pt.as_tuple() == (100.5, 200.25)


def test_video_metadata_validation():
    meta = VideoMetadata(
        source_video="/path/to/match.mp4",
        fps=30.0,
        width=1920,
        height=1080,
        total_frames=900,
        duration_sec=30.0,
    )
    assert meta.aspect_ratio == pytest.approx(1920 / 1080)
    assert meta.fps == 30.0

    # Validation failure: negative FPS
    with pytest.raises(ValidationError):
        VideoMetadata(
            source_video="/path/to/match.mp4",
            fps=-1.0,
            width=1920,
            height=1080,
            total_frames=900,
            duration_sec=30.0,
        )


def test_court_calibration_defaults():
    calib = CourtCalibration()
    assert calib.status == CalibrationStatus.UNCALIBRATED
    assert calib.homography is None
    assert len(calib.image_points) == 0
    assert len(calib.court_points) == 0


def test_ball_detection_schema():
    det = BallDetection(
        frame_idx=42,
        timestamp_ms=1400.0,
        center=Point2D(x=960.0, y=540.0),
        confidence=0.88,
        radius=4.5,
    )
    assert det.frame_idx == 42
    assert det.confidence == 0.88
    assert det.center.x == 960.0

    with pytest.raises(ValidationError):
        # Confidence out of [0, 1] range
        BallDetection(
            frame_idx=1,
            timestamp_ms=33.3,
            center=Point2D(x=0.0, y=0.0),
            confidence=1.5,
        )


def test_bounce_event_schema():
    event = BounceEvent(
        event_id="bounce-0001",
        session_id="session-test",
        frame_idx=120,
        timestamp_ms=4000.0,
        ball_image_xy=Point2D(x=960.0, y=850.0),
        estimated_court_xy=Point2D(x=4.11, y=11.88),  # baseline
        bounce_confidence=0.92,
        call=CallDecision.IN,
        call_confidence=0.95,
        reason="clear_inside_baseline",
    )
    assert event.call == CallDecision.IN
    assert event.estimated_court_xy is not None
    assert event.estimated_court_xy.x == 4.11

    # Uncertain call schema
    uncertain_event = BounceEvent(
        event_id="bounce-0002",
        session_id="session-test",
        frame_idx=150,
        timestamp_ms=5000.0,
        ball_image_xy=Point2D(x=10.0, y=20.0),
        estimated_court_xy=None,
        bounce_confidence=0.4,
        call=CallDecision.UNCERTAIN,
        call_confidence=0.3,
        reason="occluded_by_player",
    )
    assert uncertain_event.call == CallDecision.UNCERTAIN
    assert uncertain_event.estimated_court_xy is None


def test_session_report_serialization():
    meta = VideoMetadata(
        source_video="/path/to/match.mp4",
        fps=30.0,
        width=1920,
        height=1080,
        total_frames=100,
        duration_sec=3.33,
    )
    report = SessionReport(
        session_id="session-001",
        video_metadata=meta,
        camera_position="stationary_behind_baseline",
        calibration=CourtCalibration(),
        events=[],
    )
    json_data = report.model_dump_json()
    assert "session-001" in json_data
    assert "stationary_behind_baseline" in json_data

    # Test roundtrip deserialization
    reloaded = SessionReport.model_validate_json(json_data)
    assert reloaded.session_id == report.session_id
    assert reloaded.video_metadata.fps == 30.0
