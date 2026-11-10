"""Unit and integration tests for Court Calibration CLI tool."""

import json
from pathlib import Path
import pytest

from tennis_ai.court.calibrate import calibrate_video_court, main
from tests.fixtures.synthetic_video import create_synthetic_tennis_video


@pytest.fixture
def test_video(tmp_path: Path) -> Path:
    vid = tmp_path / "tennis_court.mp4"
    return create_synthetic_tennis_video(vid, num_frames=10, fps=30.0, width=640, height=360)


def test_calibrate_video_court(test_video: Path, tmp_path: Path):
    out_json = tmp_path / "calib.json"
    out_overlay = tmp_path / "overlay.jpg"
    img_pts = [(80.0, 270.0), (560.0, 270.0), (80.0, 108.0), (560.0, 108.0)]

    calibrator = calibrate_video_court(
        video_path=test_video,
        image_points=img_pts,
        output_json=out_json,
        output_overlay=out_overlay,
    )
    assert calibrator.is_calibrated
    assert out_json.exists()
    assert out_overlay.exists()

    with open(out_json, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["status"] == "manual"
    assert len(data["image_points"]) == 4
    assert len(data["court_points"]) == 4


def test_calibrate_cli_main(test_video: Path, tmp_path: Path):
    out_json = tmp_path / "cli_calib.json"
    exit_code = main([
        "--video", str(test_video),
        "--output", str(out_json),
        "--points", "80,270", "560,270", "80,108", "560,108",
    ])
    assert exit_code == 0
    assert out_json.exists()
