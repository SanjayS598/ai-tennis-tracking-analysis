"""CLI entry point and pipeline for offline tennis video ingestion and preview generation."""

import argparse
from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import List, Optional, Union
import cv2

from tennis_ai.core.schemas import SessionReport
from tennis_ai.video.reader import VideoReader


def process_video(
    input_path: Union[str, Path],
    output_dir: Union[str, Path],
    num_preview_samples: int = 5,
    session_id: Optional[str] = None,
) -> SessionReport:
    """Ingest a tennis video, extract metadata, generate preview keyframes, and save session report.

    Args:
        input_path: Path to the input video file (.mp4, .mov, etc.).
        output_dir: Path to directory where session.json and preview frames are stored.
        num_preview_samples: Number of evenly spaced keyframes to export.
        session_id: Optional identifier for the session (defaults to timestamp-derived ID).

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

    with VideoReader(input_path) as reader:
        metadata = reader.metadata
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

        report = SessionReport(
            session_id=session_id,
            video_metadata=metadata,
            camera_position="stationary_behind_baseline",
            events=[],
        )

        session_json_path = output_dir / "session.json"
        with open(session_json_path, "w", encoding="utf-8") as f:
            f.write(report.model_dump_json(indent=2))

    return report


def main(argv: Optional[List[str]] = None) -> int:
    """CLI entry point for video processing."""
    parser = argparse.ArgumentParser(
        description="Tennis AI Video Ingestion and Session Initializer"
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
        print(f"--> Ingesting video: {args.input}")
        report = process_video(
            input_path=args.input,
            output_dir=args.output,
            num_preview_samples=args.samples,
            session_id=args.session_id,
        )

        print("\n================ Tennis AI Session Initialized ================")
        print(f"Session ID:      {report.session_id}")
        print(f"Source Video:    {report.video_metadata.source_video}")
        print(f"Resolution:      {report.video_metadata.width}x{report.video_metadata.height}")
        print(f"FPS:             {report.video_metadata.fps:.2f}")
        print(f"Total Frames:    {report.video_metadata.total_frames}")
        print(f"Duration:        {report.video_metadata.duration_sec:.2f} seconds")
        print(f"Session Report:  {Path(args.output).resolve() / 'session.json'}")
        print(f"Preview Frames:  {Path(args.output).resolve() / 'previews'}")
        print("===============================================================\n")
        return 0

    except Exception as exc:
        print(f"Error processing video: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
