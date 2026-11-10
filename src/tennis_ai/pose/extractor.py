"""Human pose extraction and joint kinematics using MediaPipe."""

from dataclasses import dataclass
from typing import Optional, Tuple
import cv2
import numpy as np


def compute_joint_angle(
    p1: Tuple[float, float], p2: Tuple[float, float], p3: Tuple[float, float]
) -> float:
    """Compute interior angle at vertex p2 formed by (p1 - p2) and (p3 - p2) in degrees [0, 180]."""
    v1 = np.array([p1[0] - p2[0], p1[1] - p2[1]], dtype=np.float32)
    v2 = np.array([p3[0] - p2[0], p3[1] - p2[1]], dtype=np.float32)

    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)

    if norm1 < 1e-6 or norm2 < 1e-6:
        return 0.0

    cosine = np.dot(v1, v2) / (norm1 * norm2)
    cosine = np.clip(cosine, -1.0, 1.0)
    angle_rad = np.arccos(cosine)
    return float(np.degrees(angle_rad))


@dataclass
class PlayerPose:
    """2D landmark coordinates of key tennis joints and biomechanical properties."""
    left_wrist: Tuple[float, float]
    right_wrist: Tuple[float, float]
    left_elbow: Tuple[float, float]
    right_elbow: Tuple[float, float]
    left_shoulder: Tuple[float, float]
    right_shoulder: Tuple[float, float]
    left_hip: Tuple[float, float]
    right_hip: Tuple[float, float]
    left_knee: Tuple[float, float]
    right_knee: Tuple[float, float]
    left_ankle: Tuple[float, float]
    right_ankle: Tuple[float, float]
    confidence: float

    @property
    def hip_center(self) -> Tuple[float, float]:
        return (
            (self.left_hip[0] + self.right_hip[0]) * 0.5,
            (self.left_hip[1] + self.right_hip[1]) * 0.5,
        )

    @property
    def torso_height(self) -> float:
        shoulder_center_y = (self.left_shoulder[1] + self.right_shoulder[1]) * 0.5
        hip_center_y = (self.left_hip[1] + self.right_hip[1]) * 0.5
        return float(max(10.0, abs(hip_center_y - shoulder_center_y)))

    @property
    def right_elbow_angle(self) -> float:
        return compute_joint_angle(self.right_shoulder, self.right_elbow, self.right_wrist)

    @property
    def left_elbow_angle(self) -> float:
        return compute_joint_angle(self.left_shoulder, self.left_elbow, self.left_wrist)

    @property
    def stance_width(self) -> float:
        return float(np.hypot(self.left_ankle[0] - self.right_ankle[0], self.left_ankle[1] - self.right_ankle[1]))


class PoseEstimator:
    """MediaPipe Pose pipeline extractor for tennis players."""

    def __init__(self, min_detection_confidence: float = 0.5, min_tracking_confidence: float = 0.5):
        import mediapipe as mp
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )

    def extract_pose(self, frame_bgr: np.ndarray) -> Optional[PlayerPose]:
        """Process RGB frame and extract PlayerPose if player is visible."""
        h, w = frame_bgr.shape[:2]
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self.pose.process(frame_rgb)

        if not results.pose_landmarks:
            return None

        lm = results.pose_landmarks.landmark
        mp_lm = self.mp_pose.PoseLandmark

        def _pt(idx: int) -> Tuple[float, float]:
            return (float(lm[idx].x * w), float(lm[idx].y * h))

        confidences = [
            lm[mp_lm.LEFT_WRIST].visibility,
            lm[mp_lm.RIGHT_WRIST].visibility,
            lm[mp_lm.LEFT_SHOULDER].visibility,
            lm[mp_lm.RIGHT_SHOULDER].visibility,
            lm[mp_lm.LEFT_HIP].visibility,
            lm[mp_lm.RIGHT_HIP].visibility,
        ]
        mean_conf = float(np.mean(confidences))

        if mean_conf < 0.35:
            return None

        return PlayerPose(
            left_wrist=_pt(mp_lm.LEFT_WRIST),
            right_wrist=_pt(mp_lm.RIGHT_WRIST),
            left_elbow=_pt(mp_lm.LEFT_ELBOW),
            right_elbow=_pt(mp_lm.RIGHT_ELBOW),
            left_shoulder=_pt(mp_lm.LEFT_SHOULDER),
            right_shoulder=_pt(mp_lm.RIGHT_SHOULDER),
            left_hip=_pt(mp_lm.LEFT_HIP),
            right_hip=_pt(mp_lm.RIGHT_HIP),
            left_knee=_pt(mp_lm.LEFT_KNEE),
            right_knee=_pt(mp_lm.RIGHT_KNEE),
            left_ankle=_pt(mp_lm.LEFT_ANKLE),
            right_ankle=_pt(mp_lm.RIGHT_ANKLE),
            confidence=mean_conf,
        )

    def close(self) -> None:
        if self.pose:
            self.pose.close()
            self.pose = None
