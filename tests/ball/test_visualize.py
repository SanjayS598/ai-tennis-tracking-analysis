"""Unit tests for tracking overlay and video renderer."""

from pathlib import Path
import cv2
import pytest

from tennis_ai.ball.visualize import render_tracking_video
from tennis_ai.core.schemas import BallDetection, Point2D
from tennis_ai.court.geometry import CourtCalibrator, COURT_LENGTH_M, SINGLES_WIDTH_M
from tests.fixtures.synthetic_video import create_synthetic_tennis_video


def test_render_tracking_video(tmp_path: Path):
    in_video = tmp_path / "in.mp4"
    out_video = tmp_path / "out_annotated.mp4"
    create_synthetic_tennis_video(in_video, num_frames=15, fps=30.0, width=640, height=360)

    calibrator = CourtCalibrator()
    calibrator.fit(
        [(80.0, 270.0), (560.0, 270.0), (80.0, 108.0), (560.0, 108.0)],
        [(0.0, 0.0), (SINGLES_WIDTH_M, 0.0), (0.0, COURT_LENGTH_M), (SINGLES_WIDTH_M, COURT_LENGTH_M)],
    )

    dets = [
        BallDetection(frame_idx=i, timestamp_ms=float(i * 33.3), center=Point2D(x=100.0 + i * 20.0, y=200.0), confidence=0.9)
        for i in range(15)
    ]

    rendered_path = render_tracking_video(
        input_video_path=in_video,
        output_video_path=out_video,
        tracked_detections=dets,
        calibrator=calibrator,
        trail_length=5,
    )

    assert rendered_path.exists()
    assert rendered_path.stat().st_size > 0

    # Verify output video is readable
    cap = cv2.VideoCapture(str(rendered_path))
    assert cap.isOpened()
    ret, frame = cap.read()
    assert ret and frame is not None
    cap.release()
