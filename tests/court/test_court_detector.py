"""Unit tests for automatic court line detection and visualizer."""

from pathlib import Path
import cv2
import numpy as np
import pytest

from tennis_ai.court.detector import CourtLineDetector, draw_court_overlay
from tennis_ai.court.geometry import CourtCalibrator, SINGLES_WIDTH_M, COURT_LENGTH_M
from tests.fixtures.synthetic_video import create_synthetic_tennis_video


@pytest.fixture
def sample_tennis_frame(tmp_path: Path) -> np.ndarray:
    video_path = tmp_path / "synthetic.mp4"
    create_synthetic_tennis_video(video_path, num_frames=5, fps=30.0, width=640, height=360)
    cap = cv2.VideoCapture(str(video_path))
    ret, frame = cap.read()
    cap.release()
    assert ret and frame is not None
    return frame


def test_court_line_detector(sample_tennis_frame: np.ndarray):
    detector = CourtLineDetector()
    lines = detector.detect_lines(sample_tennis_frame)
    # The synthetic tennis frame has white court lines on green grass
    assert len(lines) > 0


def test_draw_court_overlay(sample_tennis_frame: np.ndarray):
    calibrator = CourtCalibrator()
    img_pts = [
        (80.0, 270.0),
        (560.0, 270.0),
        (80.0, 108.0),
        (560.0, 108.0),
    ]
    court_pts = [
        (0.0, 0.0),
        (SINGLES_WIDTH_M, 0.0),
        (0.0, COURT_LENGTH_M),
        (SINGLES_WIDTH_M, COURT_LENGTH_M),
    ]
    calibrator.fit(img_pts, court_pts)

    annotated = draw_court_overlay(sample_tennis_frame, calibrator)
    assert annotated.shape == sample_tennis_frame.shape
    # Check that overlay modified some pixel values
    assert not np.array_equal(annotated, sample_tennis_frame)
