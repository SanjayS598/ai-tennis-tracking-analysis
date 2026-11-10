"""Visualization tools to render ball trails, court geometry, and bounce annotations on video."""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import cv2
import numpy as np

from tennis_ai.core.schemas import BallDetection, BounceEvent, CallDecision
from tennis_ai.court.detector import draw_court_overlay
from tennis_ai.court.geometry import CourtCalibrator
from tennis_ai.video.reader import VideoReader


def render_tracking_video(
    input_video_path: Union[str, Path],
    output_video_path: Union[str, Path],
    tracked_detections: List[BallDetection],
    calibrator: Optional[CourtCalibrator] = None,
    events: Optional[List[BounceEvent]] = None,
    trail_length: int = 12,
) -> Path:
    """Render annotated output video with court wireframe, ball trajectory trail, and call overlays."""
    input_path = Path(input_video_path).resolve()
    output_path = Path(output_video_path).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Index detections and bounce events by frame index
    det_map: Dict[int, BallDetection] = {d.frame_idx: d for d in tracked_detections}
    event_map: Dict[int, BounceEvent] = {}
    if events is not None:
        for ev in events:
            event_map[ev.frame_idx] = ev

    with VideoReader(input_path) as reader:
        meta = reader.metadata
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(
            str(output_path),
            fourcc,
            meta.fps,
            (meta.width, meta.height),
        )

        trail_buffer: List[Tuple[int, int]] = []

        for frame_idx, timestamp_ms, frame_bgr in reader.iter_frames():
            canvas = frame_bgr.copy()

            # 1. Court overlay
            if calibrator is not None and calibrator.is_calibrated:
                canvas = draw_court_overlay(canvas, calibrator, color=(0, 220, 220), thickness=2)

            # 2. Track ball
            if frame_idx in det_map:
                det = det_map[frame_idx]
                pt = (int(round(det.center.x)), int(round(det.center.y)))
                trail_buffer.append(pt)
                if len(trail_buffer) > trail_length:
                    trail_buffer.pop(0)

                # Draw glowing current ball
                cv2.circle(canvas, pt, 7, (0, 255, 255), -1, cv2.LINE_AA)
                cv2.circle(canvas, pt, 11, (0, 200, 255), 2, cv2.LINE_AA)

            # 3. Draw fading trajectory trail
            if len(trail_buffer) >= 2:
                for k in range(len(trail_buffer) - 1):
                    alpha = (k + 1) / float(len(trail_buffer))
                    thickness = max(1, int(round(alpha * 4)))
                    # Gradient from cyan to yellow
                    color = (int(255 * (1 - alpha)), int(255 * alpha), 255)
                    cv2.line(canvas, trail_buffer[k], trail_buffer[k + 1], color, thickness, cv2.LINE_AA)

            # 4. Bounce event annotation
            if frame_idx in event_map:
                ev = event_map[frame_idx]
                b_pt = (int(round(ev.ball_image_xy.x)), int(round(ev.ball_image_xy.y)))

                if ev.call == CallDecision.IN:
                    call_color = (0, 255, 0)
                elif ev.call == CallDecision.OUT:
                    call_color = (0, 0, 255)
                else:
                    call_color = (0, 165, 255)  # Orange

                # Ring flash
                cv2.circle(canvas, b_pt, 24, call_color, 3, cv2.LINE_AA)
                # Label box
                label = f"{ev.call.value} ({ev.call_confidence*100:.0f}%)"
                cv2.putText(
                    canvas,
                    label,
                    (b_pt[0] + 15, b_pt[1] - 15),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    call_color,
                    2,
                    cv2.LINE_AA,
                )

            # HUD text
            cv2.putText(
                canvas,
                f"Tennis AI | Frame {frame_idx:05d} ({timestamp_ms:.0f}ms)",
                (20, 35),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2,
                cv2.LINE_AA,
            )

            writer.write(canvas)

        writer.release()

    return output_path
