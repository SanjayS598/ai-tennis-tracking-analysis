"""Video reader module providing frame iteration, sampling, and metadata extraction."""

from pathlib import Path
from typing import Generator, List, Optional, Tuple, Union
import cv2
import numpy as np

from tennis_ai.core.schemas import VideoMetadata


class VideoReader:
    """Robust video reader wrapping OpenCV VideoCapture with validation and clean iteration."""

    def __init__(self, video_path: Union[str, Path]):
        self.path = Path(video_path).resolve()
        if not self.path.is_file():
            raise FileNotFoundError(f"Video file not found: {self.path}")

        self._cap: Optional[cv2.VideoCapture] = cv2.VideoCapture(str(self.path))
        if not self._cap.isOpened():
            raise ValueError(f"Unable to decode video file: {self.path}")

        fps = float(self._cap.get(cv2.CAP_PROP_FPS))
        width = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(self._cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Check if file has decodeable frames
        ret, test_frame = self._cap.read()
        if not ret or test_frame is None or width <= 0 or height <= 0:
            self.close()
            raise ValueError(f"Unable to decode video (empty or corrupted): {self.path}")

        # Reset capture position to the first frame
        self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        # Fallback or correction for FPS
        if fps <= 0.0 or np.isnan(fps):
            fps = 30.0

        duration_sec = total_frames / fps if total_frames > 0 else 0.0

        self.metadata = VideoMetadata(
            source_video=str(self.path),
            fps=fps,
            width=width,
            height=height,
            total_frames=total_frames,
            duration_sec=duration_sec,
        )

    def iter_frames(self) -> Generator[Tuple[int, float, np.ndarray], None, None]:
        """Yield (frame_index, timestamp_ms, frame_bgr) for each frame in the video."""
        if self._cap is None or not self._cap.isOpened():
            raise RuntimeError("VideoCapture is closed.")

        self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        frame_idx = 0
        fps = self.metadata.fps

        while True:
            ret, frame = self._cap.read()
            if not ret or frame is None:
                break

            timestamp_ms = (frame_idx / fps) * 1000.0
            yield frame_idx, timestamp_ms, frame
            frame_idx += 1

    def sample_frames(self, num_samples: int = 5) -> List[Tuple[int, float, np.ndarray]]:
        """Sample evenly spaced frames across the video for preview or inspection."""
        if self._cap is None or not self._cap.isOpened():
            raise RuntimeError("VideoCapture is closed.")

        total = self.metadata.total_frames
        if total <= 0:
            return []

        num_samples = min(num_samples, total)
        if num_samples == 1:
            indices = [0]
        else:
            step = (total - 1) / (num_samples - 1)
            indices = [int(round(i * step)) for i in range(num_samples)]

        sampled = []
        for idx in indices:
            self._cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = self._cap.read()
            if ret and frame is not None:
                ts_ms = (idx / self.metadata.fps) * 1000.0
                sampled.append((idx, ts_ms, frame))

        return sampled

    def close(self) -> None:
        """Release underlying OpenCV VideoCapture."""
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    def __enter__(self) -> "VideoReader":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()
