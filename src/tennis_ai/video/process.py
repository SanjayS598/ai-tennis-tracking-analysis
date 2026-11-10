"""CLI entry point and pipeline for tennis video ingestion, ball tracking, bounce detection, and line calling."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import List, Optional, Union
import cv2

from tennis_ai.ball.detector import BallDetectorPipeline
from tennis_ai.ball.tracker import BallKalmanTracker
from tennis_ai.ball.visualize import render_tracking_video
from tennis_ai.bounce.detector import BounceDetector
from tennis_ai.calls.engine import LineCallEngine
from tennis_ai.core.schemas import SessionReport
from tennis_ai.court.geometry import CourtCalibrator
from tennis_ai.video.reader import VideoReader


def process_video(
    input_path: Union[str, Path],
    output_dir: Union[str, Path],
    num_preview_samples: int = 5,
    session_id: Optional[str] = None,
    calibration_path: Optional[Union[str, Path]] = None,
    weights_path: Optional[Union[str, Path]] = "weights/tracknet_tennis.pt",
    render_video: bool = False,
    is_doubles: bool = False,
) -> SessionReport:
    """Run full end-to-end tennis tracking pipeline: ingestion, ball tracking, bounce detection, and line calls.

    Args:
        input_path: Path to source tennis video.
        output_dir: Directory where session artifacts will be stored.
        num_preview_samples: Number of keyframe previews to save.
        session_id: Optional custom session ID.
        calibration_path: Optional path to pre-computed court calibration JSON.
        weights_path: Path to PyTorch TrackNet weights.
        render_video: Whether to export full annotated review video.
        is_doubles: Whether line calls evaluate doubles boundaries instead of singles.

    Returns:
        The generated SessionReport schema object.
    """
    input_path = Path(input_path).resolve()
    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if session_id is None:
        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        session_id = f"session_{timestamp_str}"

    preview_dir = output_dir / "previews"
    preview_dir.mkdir(parents=True, exist_ok=True)

    # 1. Court Calibration
    calibrator: Optional[CourtCalibrator] = None
    if calibration_path is not None and Path(calibration_path).exists():
        with open(calibration_path, "r", encoding="utf-8") as f:
            calib_data = json.load(f)
        if "image_points" in calib_data and "court_points" in calib_data:
            calibrator = CourtCalibrator()
            img_pts = [(p["x"], p["y"]) for p in calib_data["image_points"]]
            court_pts = [(p["x"], p["y"]) for p in calib_data["court_points"]]
            calibrator.fit(img_pts, court_pts)

    with VideoReader(input_path) as reader:
        metadata = reader.metadata

        # Save preview keyframes
        samples = reader.sample_frames(num_samples=num_preview_samples)
        for frame_idx, timestamp_ms, frame_bgr in samples:
            annotated_frame = frame_bgr.copy()
            label = f"Frame {frame_idx:06d} | {timestamp_ms:.1f}ms"
            cv2.putText(
                annotated_frame,
                label,
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 255),
                2,
                cv2.LINE_AA,
            )
            preview_filename = f"frame_{frame_idx:06d}.jpg"
            preview_path = preview_dir / preview_filename
            cv2.imwrite(str(preview_path), annotated_frame)

    # 2. Ball Detection
    actual_weights = Path(weights_path) if weights_path and Path(weights_path).exists() else None
    detector_pipeline = BallDetectorPipeline(weights_path=actual_weights)
    raw_detections = detector_pipeline.process_video(input_path)

    # 3. Kalman Tracking & Trajectory Smoothing
    tracker = BallKalmanTracker()
    tracked_detections = tracker.track(raw_detections)

    # 4. Bounce Detection
    bounce_detector = BounceDetector()
    bounce_candidates = bounce_detector.detect_bounces(tracked_detections)

    # 5. Line Call Decision Engine
    call_engine = LineCallEngine(calibrator=calibrator, is_doubles=is_doubles)
    events = call_engine.process_candidates(bounce_candidates, session_id=session_id)

    # 6. Optional Video Render
    if render_video:
        rendered_output_path = output_dir / "annotated_match.mp4"
        render_tracking_video(
            input_video_path=input_path,
            output_video_path=rendered_output_path,
            tracked_detections=tracked_detections,
            calibrator=calibrator,
            events=events,
        )

    # 7. Construct and Save SessionReport
    calib_schema = calibrator.to_schema() if calibrator else None
    report = SessionReport(
        session_id=session_id,
        video_metadata=metadata,
        camera_position="stationary_behind_baseline",
        calibration=calib_schema or CourtCalibrator().to_schema(),
        events=events,
    )

    session_json_path = output_dir / "session.json"
    with open(session_json_path, "w", encoding="utf-8") as f:
        f.write(report.model_dump_json(indent=2))

    return report


def main(argv: Optional[List[str]] = None) -> int:
    """CLI entry point for video processing."""
    parser = argparse.ArgumentParser(
        description="Tennis AI Video Ingestion, Ball Tracking, and Line Calling Pipeline"
    )
    parser.add_argument(
        "-i",
        "--input",
        required=True,
        type=str,
        help="Path to source tennis video file",
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        type=str,
        help="Path to output directory for session artifacts",
    )
    parser.add_argument(
        "-c",
        "--calibration",
        type=str,
        default=None,
        help="Path to precomputed court calibration JSON",
    )
    parser.add_argument(
        "-w",
        "--weights",
        type=str,
        default="weights/tracknet_tennis.pt",
        help="Path to TrackNet model weights",
    )
    parser.add_argument(
        "--render",
        action="store_true",
        help="Render full annotated video with ball trail and bounce overlays",
    )
    parser.add_argument(
        "--doubles",
        action="store_true",
        help="Evaluate line calls against doubles boundaries instead of singles",
    )
    parser.add_argument(
        "-s",
        "--samples",
        type=int,
        default=5,
        help="Number of representative preview keyframes to export (default: 5)",
    )
    parser.add_argument(
        "--session-id",
        type=str,
        default=None,
        help="Custom session identifier (default: auto-generated)",
    )

    args = parser.parse_args(argv)

    try:
        print(f"--> Ingesting & processing tennis match: {args.input}")
        report = process_video(
            input_path=args.input,
            output_dir=args.output,
            num_preview_samples=args.samples,
            session_id=args.session_id,
            calibration_path=args.calibration,
            weights_path=args.weights,
            render_video=args.render,
            is_doubles=args.doubles,
        )

        in_calls = sum(1 for e in report.events if e.call.value == "IN")
        out_calls = sum(1 for e in report.events if e.call.value == "OUT")
        uncertain_calls = sum(1 for e in report.events if e.call.value == "UNCERTAIN")

        print("\n================ Tennis AI Session Initialized ================")
        print(f"Session ID:         {report.session_id}")
        print(f"Source Video:       {report.video_metadata.source_video}")
        print(f"Resolution:         {report.video_metadata.width}x{report.video_metadata.height}")
        print(f"FPS:                {report.video_metadata.fps:.2f}")
        print(f"Total Frames:       {report.video_metadata.total_frames}")
        print(f"Duration:           {report.video_metadata.duration_sec:.2f} seconds")
        print(f"Calibration Status: {report.calibration.status.value}")
        print(f"Bounce Events:      {len(report.events)} total (IN: {in_calls}, OUT: {out_calls}, UNCERTAIN: {uncertain_calls})")
        print(f"Session Report:     {Path(args.output).resolve() / 'session.json'}")
        print(f"Preview Frames:     {Path(args.output).resolve() / 'previews'}")
        if args.render:
            print(f"Annotated Video:    {Path(args.output).resolve() / 'annotated_match.mp4'}")
        print("===============================================================\n")
        return 0

    except Exception as exc:
        print(f"Error processing video: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
