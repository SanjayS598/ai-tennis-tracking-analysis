"""Bounce candidate detection using vertical trajectory inflection and parabolic curve fitting."""

from dataclasses import dataclass
from typing import List, Optional, Tuple
import numpy as np

from tennis_ai.core.schemas import BallDetection, Point2D


@dataclass
class BounceCandidate:
    """Localized bounce candidate observation in image space."""
    frame_idx: int
    timestamp_ms: float
    center: Point2D
    confidence: float
    sub_frame_offset: float = 0.0


class BounceDetector:
    """Detects ball bounces from 2D pixel trajectory by finding parabolic downward peaks."""

    def __init__(
        self,
        window_size: int = 5,
        min_vertical_reversal: float = 4.0,  # pixels
        min_confidence: float = 0.5,
        min_curvature: float = 1.0,
    ):
        self.window_size = window_size
        self.min_vertical_reversal = min_vertical_reversal
        self.min_confidence = min_confidence
        self.min_curvature = min_curvature

    def detect_bounces(self, detections: List[BallDetection]) -> List[BounceCandidate]:
        """Analyze trajectory sequence and return list of detected bounce candidates."""
        if len(detections) < self.window_size:
            return []

        # Sort by frame index
        sorted_dets = sorted(detections, key=lambda d: d.frame_idx)
        k = self.window_size // 2

        candidates: List[BounceCandidate] = []

        for i in range(k, len(sorted_dets) - k):
            window = sorted_dets[i - k : i + k + 1]

            # Verify consecutive or near-consecutive frames
            frames = np.array([d.frame_idx for d in window], dtype=np.float32)
            if np.max(np.diff(frames)) > 2:
                continue  # gap too large for reliable parabolic fit

            ys = np.array([d.center.y for d in window], dtype=np.float32)
            xs = np.array([d.center.x for d in window], dtype=np.float32)

            center_y = ys[k]

            # In image space, the ground is at the bottom (maximum y).
            # A bounce corresponds to reaching a local maximum in y before rebounding up.
            if center_y <= ys[k - 1] or center_y <= ys[k + 1]:
                continue

            # Check minimum vertical reversal
            reversal_left = center_y - np.min(ys[:k])
            reversal_right = center_y - np.min(ys[k + 1 :])
            if reversal_left < self.min_vertical_reversal or reversal_right < self.min_vertical_reversal:
                continue

            # Parabolic polynomial fit: y(t) = a * t^2 + b * t + c
            t = frames - frames[k]  # centered at current frame
            try:
                poly_y = np.polyfit(t, ys, deg=2)
                a, b, c = poly_y
            except (np.linalg.LinAlgError, ValueError):
                continue

            # Curvature a must be negative (inverted parabola peaking at bottom of image)
            if a >= -self.min_curvature:
                continue

            # Compute R^2 goodness of fit
            y_pred = np.polyval(poly_y, t)
            ss_tot = np.sum((ys - np.mean(ys)) ** 2)
            ss_res = np.sum((ys - y_pred) ** 2)
            r_squared = 1.0 - (ss_res / max(ss_tot, 1e-6))

            if r_squared < 0.70:
                continue

            # Sub-frame vertex peak: t* = -b / (2 * a)
            sub_frame_t = -b / (2.0 * a)
            if abs(sub_frame_t) > 1.2:
                continue  # peak should be close to center frame

            # Linear horizontal trajectory fit x(t) = m * t + x0
            poly_x = np.polyfit(t, xs, deg=1)
            peak_x = float(np.polyval(poly_x, sub_frame_t))
            peak_y = float(np.polyval(poly_y, sub_frame_t))

            # Confidence calculation based on fit quality and detector confidence
            mean_det_conf = float(np.mean([d.confidence for d in window]))
            conf = float(min(0.99, max(0.1, 0.5 * r_squared + 0.5 * mean_det_conf)))

            if conf >= self.min_confidence:
                target_det = window[k]
                candidates.append(
                    BounceCandidate(
                        frame_idx=target_det.frame_idx,
                        timestamp_ms=target_det.timestamp_ms + (sub_frame_t * (1000.0 / 30.0)),
                        center=Point2D(x=peak_x, y=peak_y),
                        confidence=conf,
                        sub_frame_offset=float(sub_frame_t),
                    )
                )

        return candidates
