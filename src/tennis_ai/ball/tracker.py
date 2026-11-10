"""Kalman filter temporal tracking and trajectory smoothing for tennis ball observations."""

from typing import List, Optional, Tuple
import numpy as np

from tennis_ai.core.schemas import BallDetection, Point2D


class BallKalmanTracker:
    """Constant-velocity 2D Kalman filter for smooth ball trajectory estimation and outlier rejection."""

    def __init__(
        self,
        dt: float = 1.0 / 30.0,
        process_noise_std: float = 10.0,
        measurement_noise_std: float = 4.0,
        max_jump_distance: float = 120.0,
        max_missing_frames: int = 3,
    ):
        self.dt = dt
        self.max_jump_distance = max_jump_distance
        self.max_missing_frames = max_missing_frames

        # State transition matrix F (constant velocity model)
        self.F = np.array([
            [1.0, 0.0, dt, 0.0],
            [0.0, 1.0, 0.0, dt],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0],
        ], dtype=np.float32)

        # Measurement matrix H (we measure x and y position)
        self.H = np.array([
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0],
        ], dtype=np.float32)

        # Process noise covariance Q
        q = process_noise_std ** 2
        self.Q = np.eye(4, dtype=np.float32) * q
        self.Q[2:, 2:] *= 2.0  # higher velocity uncertainty

        # Measurement noise covariance R
        r = measurement_noise_std ** 2
        self.R = np.eye(2, dtype=np.float32) * r

        # Current state and covariance
        self.x: Optional[np.ndarray] = None  # [x, y, vx, vy]^T
        self.P: Optional[np.ndarray] = None
        self.missing_count: int = 0

    @property
    def is_tracking(self) -> bool:
        return self.x is not None

    @property
    def current_velocity(self) -> Tuple[float, float]:
        """Return (vx, vy) in pixels per second."""
        if self.x is None:
            return 0.0, 0.0
        return float(self.x[2]), float(self.x[3])

    def _init_state(self, det: BallDetection) -> None:
        self.x = np.array([det.center.x, det.center.y, 0.0, 0.0], dtype=np.float32)
        self.P = np.eye(4, dtype=np.float32) * 50.0
        self.missing_count = 0

    def predict(self) -> Tuple[float, float]:
        """Predict next state ahead by 1 time step."""
        if self.x is None or self.P is None:
            return 0.0, 0.0
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        return float(self.x[0]), float(self.x[1])

    def update(self, det: BallDetection) -> BallDetection:
        """Incorporate detection measurement and return smoothed detection."""
        if self.x is None or self.P is None:
            self._init_state(det)
            return det

        # Compute predicted measurement
        z_pred = self.H @ self.x
        z = np.array([det.center.x, det.center.y], dtype=np.float32)
        innovation = z - z_pred
        dist = float(np.linalg.norm(innovation))

        # Check for wild jump / outlier
        if dist > self.max_jump_distance:
            # Outlier: reject measurement, retain predicted state
            self.missing_count += 1
            return BallDetection(
                frame_idx=det.frame_idx,
                timestamp_ms=det.timestamp_ms,
                center=Point2D(x=float(self.x[0]), y=float(self.x[1])),
                confidence=float(max(0.2, det.confidence * 0.7)),
                radius=det.radius,
            )

        # Kalman gain computation
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)

        # State and covariance update
        self.x = self.x + K @ innovation
        I = np.eye(4, dtype=np.float32)
        self.P = (I - K @ self.H) @ self.P
        self.missing_count = 0

        return BallDetection(
            frame_idx=det.frame_idx,
            timestamp_ms=det.timestamp_ms,
            center=Point2D(x=float(self.x[0]), y=float(self.x[1])),
            confidence=det.confidence,
            radius=det.radius,
        )

    def track(self, raw_detections: List[BallDetection]) -> List[BallDetection]:
        """Track and smooth a sequence of ball detections across frames."""
        if not raw_detections:
            return []

        # Sort by frame index
        sorted_dets = sorted(raw_detections, key=lambda d: d.frame_idx)
        tracked: List[BallDetection] = []

        last_frame_idx = -1
        last_ts = 0.0

        for det in sorted_dets:
            # Impute missing frames if gap is small
            if last_frame_idx >= 0 and det.frame_idx > last_frame_idx + 1:
                gap = det.frame_idx - last_frame_idx
                if gap <= self.max_missing_frames + 1:
                    dt_impute = (det.timestamp_ms - last_ts) / float(gap)
                    for step in range(1, gap):
                        f_idx = last_frame_idx + step
                        ts = last_ts + step * dt_impute
                        self.predict()
                        if self.x is not None:
                            imputed = BallDetection(
                                frame_idx=f_idx,
                                timestamp_ms=ts,
                                center=Point2D(x=float(self.x[0]), y=float(self.x[1])),
                                confidence=0.4,
                            )
                            tracked.append(imputed)

            self.predict()
            filtered = self.update(det)
            tracked.append(filtered)
            last_frame_idx = det.frame_idx
            last_ts = det.timestamp_ms

        return tracked
