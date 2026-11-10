"""Unit tests for TrackNet ball detection architecture and baseline detector."""

from pathlib import Path
import numpy as np
import pytest
import torch

from tennis_ai.ball.detector import BallDetectorPipeline
from tennis_ai.ball.model import BallTrackerNet
from tests.fixtures.synthetic_video import create_synthetic_tennis_video


def test_ball_tracker_net_forward():
    model = BallTrackerNet(in_channels=9, out_channels=256)
    model.eval()
    dummy_input = torch.zeros((1, 9, 360, 640), dtype=torch.float32)
    with torch.no_grad():
        out = model(dummy_input)
    assert out.shape == (1, 256, 360, 640)


def test_ball_detector_pipeline_on_synthetic_video(tmp_path: Path):
    video_path = tmp_path / "ball_flight.mp4"
    # Create video with moving yellow tennis ball
    create_synthetic_tennis_video(video_path, num_frames=15, fps=30.0, width=640, height=360)

    weights_path = Path("weights/tracknet_tennis.pt")
    pipeline = BallDetectorPipeline(
        weights_path=weights_path if weights_path.exists() else None,
        confidence_threshold=0.3,
    )

    detections = pipeline.process_video(video_path)
    # Pipeline should return detection records
    assert len(detections) > 0
    # Center coordinates should be within 640x360 frame
    for det in detections:
        assert 0.0 <= det.center.x <= 640.0
        assert 0.0 <= det.center.y <= 360.0
        assert 0.0 <= det.confidence <= 1.0
