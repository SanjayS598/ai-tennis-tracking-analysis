"""Temporal sequence classifier and feature extractor for tennis strokes (Forehand, Backhand, Serve)."""

from enum import Enum
from typing import List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn

from tennis_ai.pose.extractor import PlayerPose


class StrokeType(str, Enum):
    FOREHAND = "FOREHAND"
    BACKHAND = "BACKHAND"
    SERVE = "SERVE"


class StrokeFeatureExtractor:
    """Extracts position- and scale-invariant kinematic features from PlayerPose landmarks."""

    NUM_FEATURES: int = 24

    def extract_frame_features(self, pose: PlayerPose) -> np.ndarray:
        """Extract 24 normalized joint coordinate features centered on player hip and scaled by torso."""
        hip_x, hip_y = pose.hip_center
        torso = max(10.0, pose.torso_height)

        joints = [
            pose.left_wrist,
            pose.right_wrist,
            pose.left_elbow,
            pose.right_elbow,
            pose.left_shoulder,
            pose.right_shoulder,
            pose.left_hip,
            pose.right_hip,
            pose.left_knee,
            pose.right_knee,
            pose.left_ankle,
            pose.right_ankle,
        ]

        features: List[float] = []
        for x, y in joints:
            norm_x = (x - hip_x) / torso
            norm_y = (y - hip_y) / torso
            features.extend([norm_x, norm_y])

        return np.array(features, dtype=np.float32)

    def extract_sequence_features(self, pose_sequence: List[PlayerPose]) -> np.ndarray:
        """Extract (T, 24) feature matrix from a temporal sequence of poses."""
        return np.array([self.extract_frame_features(p) for p in pose_sequence], dtype=np.float32)


class TemporalStrokeClassifier(nn.Module):
    """Lightweight 1D-CNN + Bidirectional GRU model classifying strokes from temporal pose sequences."""

    CLASSES = [StrokeType.FOREHAND, StrokeType.BACKHAND, StrokeType.SERVE]

    def __init__(
        self,
        input_dim: int = 24,
        hidden_dim: int = 64,
        num_classes: int = 3,
        num_layers: int = 1,
    ):
        super().__init__()
        self.conv1 = nn.Conv1d(in_channels=input_dim, out_channels=hidden_dim, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.relu = nn.ReLU(inplace=True)

        self.gru = nn.GRU(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
        )

        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 32),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(32, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Args:

        x: Tensor of shape [batch, seq_len, input_dim]

        Returns:
            Logits of shape [batch, num_classes]
        """
        # Transpose for 1D convolution: [batch, input_dim, seq_len]
        x_conv = x.permute(0, 2, 1)
        x_conv = self.relu(self.bn1(self.conv1(x_conv)))

        # Transpose back for GRU: [batch, seq_len, hidden_dim]
        x_gru = x_conv.permute(0, 2, 1)
        out, _ = self.gru(x_gru)

        # Global average pooling over time dimension
        pooled = torch.mean(out, dim=1)  # [batch, hidden_dim * 2]
        logits = self.classifier(pooled)
        return logits

    def predict(self, feature_sequence: np.ndarray) -> Tuple[StrokeType, float]:
        """Predict stroke class and probability confidence for a (T, 24) sequence."""
        self.eval()
        tensor_in = torch.from_numpy(feature_sequence).unsqueeze(0).float()
        with torch.no_grad():
            logits = self.forward(tensor_in)
            probs = torch.softmax(logits, dim=-1).squeeze(0).numpy()

        best_idx = int(np.argmax(probs))
        return self.CLASSES[best_idx], float(probs[best_idx])
