"""Unit tests for tennis_ai VideoReader."""

from pathlib import Path
import pytest

from tests.fixtures.synthetic_video import create_synthetic_tennis_video
from tennis_ai.video.reader import VideoReader


@pytest.fixture
def sample_video(tmp_path: Path) -> Path:
    video_path = tmp_path / "test_tennis.mp4"
    return create_synthetic_tennis_video(video_path, num_frames=30, fps=30.0, width=640, height=360)


def test_video_reader_metadata(sample_video: Path):
    with VideoReader(sample_video) as reader:
        meta = reader.metadata
        assert meta.width == 640
        assert meta.height == 360
        assert meta.fps == pytest.approx(30.0, rel=1e-2)
        assert meta.total_frames == 30
        assert meta.duration_sec == pytest.approx(1.0, rel=1e-2)


def test_video_reader_iteration(sample_video: Path):
    with VideoReader(sample_video) as reader:
        frames = list(reader.iter_frames())
        assert len(frames) == 30

        first_idx, first_ts, first_frame = frames[0]
        assert first_idx == 0
        assert first_ts == pytest.approx(0.0)
        assert first_frame.shape == (360, 640, 3)

        last_idx, last_ts, last_frame = frames[-1]
        assert last_idx == 29
        assert last_ts > 0.0


def test_video_reader_sample_frames(sample_video: Path):
    with VideoReader(sample_video) as reader:
        sampled = reader.sample_frames(num_samples=3)
        assert len(sampled) == 3
        indices = [s[0] for s in sampled]
        assert indices == [0, 14, 29]


def test_video_reader_missing_file(tmp_path: Path):
    non_existent = tmp_path / "does_not_exist.mp4"
    with pytest.raises(FileNotFoundError):
        VideoReader(non_existent)


def test_video_reader_empty_corrupt_file(tmp_path: Path):
    empty_file = tmp_path / "empty.mp4"
    empty_file.write_bytes(b"not a valid video stream")
    with pytest.raises(ValueError, match="Unable to decode video"):
        VideoReader(empty_file)
