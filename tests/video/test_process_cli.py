"""Integration tests for the tennis_ai video processing CLI slice."""

import json
from pathlib import Path
import pytest
from tests.fixtures.synthetic_video import create_synthetic_tennis_video
from tennis_ai.video.process import process_video, main


@pytest.fixture
def synthetic_mp4(tmp_path: Path) -> Path:
    video_path = tmp_path / "match.mp4"
    return create_synthetic_tennis_video(video_path, num_frames=30, fps=30.0, width=640, height=360)


def test_process_video_programmatic(synthetic_mp4: Path, tmp_path: Path):
    output_dir = tmp_path / "output_session"
    report = process_video(
        input_path=synthetic_mp4,
        output_dir=output_dir,
        num_preview_samples=3,
        session_id="test-session-123",
    )

    # Check returned report
    assert report.session_id == "test-session-123"
    assert report.video_metadata.total_frames == 30
    assert report.video_metadata.fps == pytest.approx(30.0)

    # Check files created on disk
    session_json_path = output_dir / "session.json"
    assert session_json_path.exists()

    with open(session_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["session_id"] == "test-session-123"
    assert data["video_metadata"]["width"] == 640
    assert data["video_metadata"]["height"] == 360

    # Check preview frames
    preview_dir = output_dir / "previews"
    assert preview_dir.exists()
    preview_files = sorted(preview_dir.glob("*.jpg"))
    assert len(preview_files) == 3


def test_process_cli_success(synthetic_mp4: Path, tmp_path: Path):
    output_dir = tmp_path / "cli_output"
    exit_code = main(["--input", str(synthetic_mp4), "--output", str(output_dir), "--samples", "2"])
    assert exit_code == 0
    assert (output_dir / "session.json").exists()
    assert len(list((output_dir / "previews").glob("*.jpg"))) == 2


def test_process_cli_missing_input(tmp_path: Path, capsys):
    output_dir = tmp_path / "cli_output"
    exit_code = main(["--input", str(tmp_path / "ghost.mp4"), "--output", str(output_dir)])
    assert exit_code != 0
    captured = capsys.readouterr()
    assert "Error" in captured.err or "Error" in captured.out
