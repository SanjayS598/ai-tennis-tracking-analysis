"""CLI entry point and calibration workflow to estimate camera-to-court homography."""

import argparse
from pathlib import Path
import sys
from typing import List, Optional, Tuple, Union
import cv2

from tennis_ai.core.schemas import CalibrationStatus, CourtCalibration
from tennis_ai.court.detector import draw_court_overlay
from tennis_ai.court.geometry import (
    COURT_LENGTH_M,
    SINGLES_WIDTH_M,
    CourtCalibrator,
    CourtKeypoints,
)
from tennis_ai.video.reader import VideoReader


def calibrate_video_court(
    video_path: Union[str, Path],
    image_points: List[Tuple[float, float]],
    output_json: Optional[Union[str, Path]] = None,
    output_overlay: Optional[Union[str, Path]] = None,
) -> CourtCalibrator:
    """Calibrate court homography from 4 known corner points on video and save artifacts.

    Default 4 court points order:
    1. Near-left singles corner: (0, 0)
    2. Near-right singles corner: (8.23, 0)
    3. Far-left singles corner: (0, 23.77)
    4. Far-right singles corner: (8.23, 23.77)
    """
    court_points = [
        CourtKeypoints.NEAR_LEFT_SINGLES,
        CourtKeypoints.NEAR_RIGHT_SINGLES,
        CourtKeypoints.FAR_LEFT_SINGLES,
        CourtKeypoints.FAR_RIGHT_SINGLES,
    ]

    calibrator = CourtCalibrator()
    calibrator.fit(image_points, court_points, method=CalibrationStatus.MANUAL)

    rmse = calibrator.compute_reprojection_error(image_points, court_points)

    if output_json is not None:
        out_p = Path(output_json).resolve()
        out_p.parent.mkdir(parents=True, exist_ok=True)
        schema = calibrator.to_schema()
        with open(out_p, "w", encoding="utf-8") as f:
            f.write(schema.model_dump_json(indent=2))

    if output_overlay is not None:
        out_overlay_p = Path(output_overlay).resolve()
        out_overlay_p.parent.mkdir(parents=True, exist_ok=True)
        with VideoReader(video_path) as reader:
            first_frame = next(reader.iter_frames())[2]
            annotated = draw_court_overlay(first_frame, calibrator)
            # Add RMSE text
            cv2.putText(
                annotated,
                f"Calibrated (RMSE: {rmse:.2f} px)",
                (30, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )
            cv2.imwrite(str(out_overlay_p), annotated)

    return calibrator


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Tennis Court Homography Calibrator")
    parser.add_argument("-v", "--video", required=True, type=str, help="Path to tennis video")
    parser.add_argument("-o", "--output", required=True, type=str, help="Output calibration JSON path")
    parser.add_argument("--overlay", type=str, default=None, help="Output overlay JPEG path")
    parser.add_argument(
        "-p",
        "--points",
        nargs=4,
        required=True,
        metavar="X,Y",
        help="4 corner image coordinates in order: near-left, near-right, far-left, far-right (e.g. 400,900 1520,900 700,300 1220,300)",
    )

    args = parser.parse_args(argv)

    try:
        pts: List[Tuple[float, float]] = []
        for p_str in args.points:
            parts = p_str.split(",")
            if len(parts) != 2:
                raise ValueError(f"Invalid coordinate format '{p_str}', must be 'x,y'")
            pts.append((float(parts[0]), float(parts[1])))

        print(f"--> Calibrating court for video: {args.video}")
        calibrator = calibrate_video_court(
            video_path=args.video,
            image_points=pts,
            output_json=args.output,
            output_overlay=args.overlay,
        )

        court_pts = [
            CourtKeypoints.NEAR_LEFT_SINGLES,
            CourtKeypoints.NEAR_RIGHT_SINGLES,
            CourtKeypoints.FAR_LEFT_SINGLES,
            CourtKeypoints.FAR_RIGHT_SINGLES,
        ]
        rmse = calibrator.compute_reprojection_error(pts, court_pts)

        print("\n================ Court Calibration Complete ================")
        print(f"Status:             {calibrator.status.value}")
        print(f"Points Calibrated:  {len(pts)}")
        print(f"Reprojection Error: {rmse:.3f} pixels")
        print(f"Calibration JSON:   {Path(args.output).resolve()}")
        if args.overlay:
            print(f"Visual Overlay:     {Path(args.overlay).resolve()}")
        print("============================================================\n")
        return 0

    except Exception as exc:
        print(f"Error during calibration: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
