"""Unit tests for pose landmark extraction and temporal stroke classification."""

import numpy as np
import pytest
import torch

from tennis_ai.pose.extractor import PlayerPose, compute_joint_angle
from tennis_ai.strokes.classifier import StrokeType, TemporalStrokeClassifier, StrokeFeatureExtractor


def test_compute_joint_angle():
    # 90-degree right angle: p1=(0, 1), p2=(0, 0), p3=(1, 0)
    angle = compute_joint_angle(
        p1=(0.0, 1.0),
        p2=(0.0, 0.0),
        p3=(1.0, 0.0),
    )
    assert angle == pytest.approx(90.0, abs=1e-2)

    # 180-degree straight line: p1=(-1, 0), p2=(0, 0), p3=(1, 0)
    straight = compute_joint_angle(
        p1=(-1.0, 0.0),
        p2=(0.0, 0.0),
        p3=(1.0, 0.0),
    )
    assert straight == pytest.approx(180.0, abs=1e-2)


def test_temporal_stroke_classifier_forward():
    model = TemporalStrokeClassifier(input_dim=24, hidden_dim=64, num_classes=3)
    model.eval()

    # Batch of 4 sequences, 30 frames each, 24 kinetic features per frame
    dummy_input = torch.randn(4, 30, 24)
    with torch.no_grad():
        logits = model(dummy_input)
        probs = torch.softmax(logits, dim=-1)

    assert logits.shape == (4, 3)
    assert probs.shape == (4, 3)
    # Probabilities sum to 1.0
    for p in probs:
        assert float(torch.sum(p)) == pytest.approx(1.0, abs=1e-4)


def test_stroke_feature_extractor_invariance():
    extractor = StrokeFeatureExtractor()

    # Construct two identical poses at different absolute pixel locations
    # (e.g. player 1 at (200, 300) vs player 2 at (800, 600))
    pose1 = PlayerPose(
        left_wrist=(200.0, 310.0),
        right_wrist=(250.0, 290.0),
        left_elbow=(190.0, 330.0),
        right_elbow=(240.0, 320.0),
        left_shoulder=(180.0, 350.0),
        right_shoulder=(220.0, 350.0),
        left_hip=(185.0, 420.0),
        right_hip=(215.0, 420.0),
        left_knee=(185.0, 470.0),
        right_knee=(215.0, 470.0),
        left_ankle=(185.0, 520.0),
        right_ankle=(215.0, 520.0),
        confidence=0.9,
    )

    offset_x, offset_y = 600.0, 300.0
    pose2 = PlayerPose(
        left_wrist=(pose1.left_wrist[0] + offset_x, pose1.left_wrist[1] + offset_y),
        right_wrist=(pose1.right_wrist[0] + offset_x, pose1.right_wrist[1] + offset_y),
        left_elbow=(pose1.left_elbow[0] + offset_x, pose1.left_elbow[1] + offset_y),
        right_elbow=(pose1.right_elbow[0] + offset_x, pose1.right_elbow[1] + offset_y),
        left_shoulder=(pose1.left_shoulder[0] + offset_x, pose1.left_shoulder[1] + offset_y),
        right_shoulder=(pose1.right_shoulder[0] + offset_x, pose1.right_shoulder[1] + offset_y),
        left_hip=(pose1.left_hip[0] + offset_x, pose1.left_hip[1] + offset_y),
        right_hip=(pose1.right_hip[0] + offset_x, pose1.right_hip[1] + offset_y),
        left_knee=(pose1.left_knee[0] + offset_x, pose1.left_knee[1] + offset_y),
        right_knee=(pose1.right_knee[0] + offset_x, pose1.right_knee[1] + offset_y),
        left_ankle=(pose1.left_ankle[0] + offset_x, pose1.left_ankle[1] + offset_y),
        right_ankle=(pose1.right_ankle[0] + offset_x, pose1.right_ankle[1] + offset_y),
        confidence=0.9,
    )

    feats1 = extractor.extract_frame_features(pose1)
    feats2 = extractor.extract_frame_features(pose2)

    # Features must be normalized and invariant to absolute screen position
    np.testing.assert_allclose(feats1, feats2, atol=1e-3)
