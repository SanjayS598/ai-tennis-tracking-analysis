"""End-to-end integration test for the full Tennis AI vision and line-calling pipeline."""

import json
from pathlib import Path
import pytest

from tennis_ai.court.calibrate import calibrate_video_court
from tennis_ai.video.process import process_video
from tests.fixtures.synthetic_video import create_synthetic_tennis_video


def test_full_pipeline_end_to_end(tmp_path: Path):
    video_path = tmp_path / "match.mp4"
    # Create synthetic clip with ball bouncing in middle of court
    create_synthetic_tennis_video(video_path, num_frames=30, fps=30.0, width=640, height=360)

    # 1. Calibrate court
    calib_json = tmp_path / "calibration.json"
    img_pts = [(80.0, 270.0), (560.0, 270.0), (80.0, 108.0), (560.0, 108.0)]
    calibrate_video_court(video_path, img_pts, output_json=calib_json)
    assert calib_json.exists()

    # 2. Process video end-to-end with rendering
    output_dir = tmp_path / "session_out"
    report = process_video(
        input_path=video_path,
        output_dir=output_dir,
        calibration_path=calib_json,
        weights_path=None,  # Use fast synthetic detector
        render_video=True,
        num_preview_samples=2,
    )

    # 3. Verify session report
    assert report.calibration.status.value == "manual"
    assert (output_dir / "session.json").exists()
    assert (output_dir / "annotated_match.mp4").exists()
    assert (output_dir / "annotated_match.mp4").stat().st_size > 0
    assert len(list((output_dir / "previews").glob("*.jpg"))) == 2

    # Verify event structure if bounce occurred
    with open(output_dir / "session.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["calibration"]["status"] == "manual"
    assert "events" in data
