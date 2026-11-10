"""Court line detection and perspective overlay projection."""

from typing import List, Optional, Tuple
import cv2
import numpy as np

from tennis_ai.court.geometry import (
    COURT_LENGTH_M,
    DOUBLES_ALLEY_M,
    DOUBLES_WIDTH_M,
    NET_DIST_M,
    SERVICE_LINE_DIST_M,
    SINGLES_WIDTH_M,
    CourtCalibrator,
    CourtKeypoints,
)


class CourtLineDetector:
    """Detects white court line segments from video frames using color thresholding and Hough transform."""

    def __init__(
        self,
        canny_thresh1: int = 50,
        canny_thresh2: int = 150,
        hough_threshold: int = 40,
        min_line_length: int = 50,
        max_line_gap: int = 10,
    ):
        self.canny_thresh1 = canny_thresh1
        self.canny_thresh2 = canny_thresh2
        self.hough_threshold = hough_threshold
        self.min_line_length = min_line_length
        self.max_line_gap = max_line_gap

    def detect_lines(self, frame_bgr: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect line segments (x1, y1, x2, y2) in frame."""
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        
        # White line mask (high intensity)
        _, mask = cv2.threshold(gray, 190, 255, cv2.THRESH_BINARY)

        edges = cv2.Canny(mask, self.canny_thresh1, self.canny_thresh2)
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=self.hough_threshold,
            minLineLength=self.min_line_length,
            maxLineGap=self.max_line_gap,
        )

        detected = []
        if lines is not None:
            for line in lines:
                coords = line.ravel()
                if len(coords) >= 4:
                    x1, y1, x2, y2 = coords[:4]
                    detected.append((int(x1), int(y1), int(x2), int(y2)))
        return detected


def draw_court_overlay(
    frame_bgr: np.ndarray,
    calibrator: CourtCalibrator,
    color: Tuple[int, int, int] = (0, 255, 255),  # Yellow/Cyan
    thickness: int = 2,
) -> np.ndarray:
    """Draw calibrated court wireframe (baselines, sidelines, service boxes, net) on image frame."""
    if not calibrator.is_calibrated:
        return frame_bgr.copy()

    overlay = frame_bgr.copy()
    h, w = frame_bgr.shape[:2]

    # Define line segments in metric court coordinates [(start_X, start_Y), (end_X, end_Y)]
    court_segments = [
        # Near & Far Singles Baselines
        ((0.0, 0.0), (SINGLES_WIDTH_M, 0.0)),
        ((0.0, COURT_LENGTH_M), (SINGLES_WIDTH_M, COURT_LENGTH_M)),
        # Singles Sidelines
        ((0.0, 0.0), (0.0, COURT_LENGTH_M)),
        ((SINGLES_WIDTH_M, 0.0), (SINGLES_WIDTH_M, COURT_LENGTH_M)),
        # Doubles Sidelines & Baselines
        ((-DOUBLES_ALLEY_M, 0.0), (-DOUBLES_ALLEY_M, COURT_LENGTH_M)),
        ((SINGLES_WIDTH_M + DOUBLES_ALLEY_M, 0.0), (SINGLES_WIDTH_M + DOUBLES_ALLEY_M, COURT_LENGTH_M)),
        ((-DOUBLES_ALLEY_M, 0.0), (0.0, 0.0)),
        ((SINGLES_WIDTH_M, 0.0), (SINGLES_WIDTH_M + DOUBLES_ALLEY_M, 0.0)),
        ((-DOUBLES_ALLEY_M, COURT_LENGTH_M), (0.0, COURT_LENGTH_M)),
        ((SINGLES_WIDTH_M, COURT_LENGTH_M), (SINGLES_WIDTH_M + DOUBLES_ALLEY_M, COURT_LENGTH_M)),
        # Service Lines
        ((0.0, SERVICE_LINE_DIST_M), (SINGLES_WIDTH_M, SERVICE_LINE_DIST_M)),
        ((0.0, COURT_LENGTH_M - SERVICE_LINE_DIST_M), (SINGLES_WIDTH_M, COURT_LENGTH_M - SERVICE_LINE_DIST_M)),
        # Center Service Line
        (
            (SINGLES_WIDTH_M / 2.0, SERVICE_LINE_DIST_M),
            (SINGLES_WIDTH_M / 2.0, COURT_LENGTH_M - SERVICE_LINE_DIST_M),
        ),
        # Net Line
        ((-DOUBLES_ALLEY_M, NET_DIST_M), (SINGLES_WIDTH_M + DOUBLES_ALLEY_M, NET_DIST_M)),
    ]

    for (p1_x, p1_y), (p2_x, p2_y) in court_segments:
        try:
            u1, v1 = calibrator.court_to_image(p1_x, p1_y)
            u2, v2 = calibrator.court_to_image(p2_x, p2_y)
            pt1 = (int(round(u1)), int(round(v1)))
            pt2 = (int(round(u2)), int(round(v2)))

            # Clip lines roughly to frame bounds with tolerance
            if -w <= pt1[0] <= 2 * w and -h <= pt1[1] <= 2 * h and -w <= pt2[0] <= 2 * w and -h <= pt2[1] <= 2 * h:
                cv2.line(overlay, pt1, pt2, color, thickness, cv2.LINE_AA)
        except Exception:
            continue

    return overlay
