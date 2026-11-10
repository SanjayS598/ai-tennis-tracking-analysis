"""High-speed tennis ball detector combining TrackNet deep neural network and fallback baseline."""

from pathlib import Path
from typing import List, Optional, Tuple, Union
import cv2
import numpy as np
import torch

from tennis_ai.ball.model import BallTrackerNet
from tennis_ai.core.schemas import BallDetection, Point2D
from tennis_ai.video.reader import VideoReader


class HSVBaselineDetector:
    """Color-blob and motion-differencing detector for baseline ball tracking."""

    def __init__(
        self,
        lower_hsv: Tuple[int, int, int] = (20, 50, 70),
        upper_hsv: Tuple[int, int, int] = (65, 255, 255),
        min_radius: float = 2.0,
        max_radius: float = 25.0,
    ):
        self.lower_hsv = np.array(lower_hsv, dtype=np.uint8)
        self.upper_hsv = np.array(upper_hsv, dtype=np.uint8)
        self.min_radius = min_radius
        self.max_radius = max_radius

    def detect(
        self, frame_bgr: np.ndarray, frame_idx: int, timestamp_ms: float
    ) -> Optional[BallDetection]:
        hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, self.lower_hsv, self.upper_hsv)

        # Morphological opening to remove small noise
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None

        # Sort contours by circularity and area
        best_candidate: Optional[Tuple[float, float, float, float]] = None
        best_score = 0.0

        for c in contours:
            area = cv2.contourArea(c)
            perimeter = cv2.arcLength(c, True)
            if perimeter <= 0:
                continue
            circularity = 4 * np.pi * (area / (perimeter * perimeter))
            (x, y), radius = cv2.minEnclosingCircle(c)

            if self.min_radius <= radius <= self.max_radius and circularity > 0.3:
                score = circularity * min(1.0, area / 20.0)
                if score > best_score:
                    best_score = score
                    best_candidate = (x, y, radius, score)

        if best_candidate is not None:
            x, y, radius, score = best_candidate
            return BallDetection(
                frame_idx=frame_idx,
                timestamp_ms=timestamp_ms,
                center=Point2D(x=float(x), y=float(y)),
                confidence=float(min(1.0, score)),
                radius=float(radius),
            )
        return None


class TrackNetDetector:
    """Deep neural network detector evaluating 3-frame temporal heatmaps."""

    INPUT_WIDTH: int = 640
    INPUT_HEIGHT: int = 360

    def __init__(
        self,
        weights_path: Union[str, Path],
        device: Optional[torch.device] = None,
        heatmap_threshold: int = 100,
    ):
        if device is None:
            if torch.backends.mps.is_available():
                self.device = torch.device("mps")
            elif torch.cuda.is_available():
                self.device = torch.device("cuda")
            else:
                self.device = torch.device("cpu")
        else:
            self.device = device

        self.heatmap_threshold = heatmap_threshold
        self.model = BallTrackerNet.from_pretrained(weights_path, device=self.device)

    def _preprocess_triplet(
        self, f_prev: np.ndarray, f_curr: np.ndarray, f_next: np.ndarray
    ) -> torch.Tensor:
        """Resize, stack, and normalize 3 BGR frames into [1, 9, 360, 640] PyTorch float tensor."""
        resized = [
            cv2.resize(f, (self.INPUT_WIDTH, self.INPUT_HEIGHT), interpolation=cv2.INTER_AREA)
            for f in (f_prev, f_curr, f_next)
        ]
        # Transpose from (H, W, C) to (C, H, W) and normalize [0, 1]
        tensors = [
            torch.from_numpy(img).permute(2, 0, 1).float() / 255.0 for img in resized
        ]
        stacked = torch.cat(tensors, dim=0).unsqueeze(0)  # [1, 9, H, W]
        return stacked.to(self.device)

    def detect_triplet(
        self,
        f_prev: np.ndarray,
        f_curr: np.ndarray,
        f_next: np.ndarray,
        frame_idx: int,
        timestamp_ms: float,
        orig_w: int,
        orig_h: int,
    ) -> Optional[BallDetection]:
        inp = self._preprocess_triplet(f_prev, f_curr, f_next)
        with torch.no_grad():
            output = self.model(inp)  # [1, 256, 360, 640]

        # Argmax over the 256 quantization levels gives heatmap intensity
        heatmap = output.argmax(dim=1).squeeze(0).cpu().numpy().astype(np.uint8)

        # Threshold heatmap to identify candidate peak
        _, thresh = cv2.threshold(heatmap, self.heatmap_threshold, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return None

        # Find largest contour in heatmap
        largest = max(contours, key=cv2.contourArea)
        (x_640, y_360), radius_640 = cv2.minEnclosingCircle(largest)

        # Scale coordinates back to original video resolution
        scale_x = orig_w / float(self.INPUT_WIDTH)
        scale_y = orig_h / float(self.INPUT_HEIGHT)

        real_x = float(x_640 * scale_x)
        real_y = float(y_360 * scale_y)
        real_radius = float(radius_640 * max(scale_x, scale_y))

        # Peak intensity as proxy for confidence
        mask = np.zeros_like(heatmap)
        cv2.drawContours(mask, [largest], -1, 255, -1)
        mean_val = cv2.mean(heatmap, mask=mask)[0]
        confidence = float(min(1.0, mean_val / 255.0))

        return BallDetection(
            frame_idx=frame_idx,
            timestamp_ms=timestamp_ms,
            center=Point2D(x=real_x, y=real_y),
            confidence=confidence,
            radius=real_radius,
        )


class BallDetectorPipeline:
    """Unified detector pipeline utilizing TrackNet with HSV baseline fallback."""

    def __init__(
        self,
        weights_path: Optional[Union[str, Path]] = None,
        confidence_threshold: float = 0.25,
    ):
        self.confidence_threshold = confidence_threshold
        self.tracknet: Optional[TrackNetDetector] = None
        self.hsv_detector = HSVBaselineDetector()

        if weights_path is not None and Path(weights_path).exists():
            try:
                self.tracknet = TrackNetDetector(weights_path)
            except Exception as exc:
                print(f"[Warning] Failed to initialize TrackNet: {exc}. Falling back to baseline.")

    def process_video(self, video_path: Union[str, Path]) -> List[BallDetection]:
        """Process an entire video stream, returning sorted list of detected ball observations."""
        detections: List[BallDetection] = []
        with VideoReader(video_path) as reader:
            frames_meta = list(reader.iter_frames())
            if not frames_meta:
                return detections

            orig_w = reader.metadata.width
            orig_h = reader.metadata.height

            if self.tracknet is not None and len(frames_meta) >= 3:
                # Sliding window of 3 frames for TrackNet
                for i in range(1, len(frames_meta) - 1):
                    f_prev = frames_meta[i - 1][2]
                    curr_idx, curr_ts, f_curr = frames_meta[i]
                    f_next = frames_meta[i + 1][2]

                    det = self.tracknet.detect_triplet(
                        f_prev, f_curr, f_next, curr_idx, curr_ts, orig_w, orig_h
                    )
                    if det is not None and det.confidence >= self.confidence_threshold:
                        detections.append(det)
                    else:
                        # Fallback check
                        fallback_det = self.hsv_detector.detect(f_curr, curr_idx, curr_ts)
                        if fallback_det is not None and fallback_det.confidence >= self.confidence_threshold:
                            detections.append(fallback_det)
            else:
                # Baseline detector per frame
                for frame_idx, timestamp_ms, frame_bgr in frames_meta:
                    det = self.hsv_detector.detect(frame_bgr, frame_idx, timestamp_ms)
                    if det is not None and det.confidence >= self.confidence_threshold:
                        detections.append(det)

        return detections
