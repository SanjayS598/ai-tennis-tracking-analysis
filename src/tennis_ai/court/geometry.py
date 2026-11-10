"""ITF standard tennis court geometry, homography calibration, and boundary decision logic."""

from typing import Dict, List, Optional, Tuple
import cv2
import numpy as np

from tennis_ai.core.schemas import CalibrationStatus, CallDecision, CourtCalibration, Point2D

# International Tennis Federation (ITF) Official Dimensions (meters)
COURT_LENGTH_M: float = 23.77
SINGLES_WIDTH_M: float = 8.23
DOUBLES_WIDTH_M: float = 10.97
DOUBLES_ALLEY_M: float = 1.37  # (10.97 - 8.23) / 2
SERVICE_LINE_DIST_M: float = 5.485  # from baseline
NET_DIST_M: float = 11.885  # court center
BALL_RADIUS_M: float = 0.0335  # 3.35 cm standard tennis ball radius
LINE_WIDTH_M: float = 0.05  # 5 cm standard line width


class CourtKeypoints:
    """Standard 2D metric coordinates (meters) with (0,0) at near-left singles corner."""

    NEAR_LEFT_SINGLES = (0.0, 0.0)
    NEAR_RIGHT_SINGLES = (SINGLES_WIDTH_M, 0.0)
    FAR_LEFT_SINGLES = (0.0, COURT_LENGTH_M)
    FAR_RIGHT_SINGLES = (SINGLES_WIDTH_M, COURT_LENGTH_M)

    NEAR_LEFT_DOUBLES = (-DOUBLES_ALLEY_M, 0.0)
    NEAR_RIGHT_DOUBLES = (SINGLES_WIDTH_M + DOUBLES_ALLEY_M, 0.0)
    FAR_LEFT_DOUBLES = (-DOUBLES_ALLEY_M, COURT_LENGTH_M)
    FAR_RIGHT_DOUBLES = (SINGLES_WIDTH_M + DOUBLES_ALLEY_M, COURT_LENGTH_M)

    NEAR_SERVICE_LEFT = (0.0, SERVICE_LINE_DIST_M)
    NEAR_SERVICE_RIGHT = (SINGLES_WIDTH_M, SERVICE_LINE_DIST_M)
    NEAR_SERVICE_T = (SINGLES_WIDTH_M / 2.0, SERVICE_LINE_DIST_M)

    FAR_SERVICE_LEFT = (0.0, COURT_LENGTH_M - SERVICE_LINE_DIST_M)
    FAR_SERVICE_RIGHT = (SINGLES_WIDTH_M, COURT_LENGTH_M - SERVICE_LINE_DIST_M)
    FAR_SERVICE_T = (SINGLES_WIDTH_M / 2.0, COURT_LENGTH_M - SERVICE_LINE_DIST_M)

    NET_LEFT = (-DOUBLES_ALLEY_M, NET_DIST_M)
    NET_RIGHT = (SINGLES_WIDTH_M + DOUBLES_ALLEY_M, NET_DIST_M)
    NET_CENTER = (SINGLES_WIDTH_M / 2.0, NET_DIST_M)


class CourtCalibrator:
    """Manages perspective transformation between image pixels (u, v) and metric court space (X, Y)."""

    def __init__(self):
        self._h_img_to_court: Optional[np.ndarray] = None
        self._h_court_to_img: Optional[np.ndarray] = None
        self.image_points: List[Tuple[float, float]] = []
        self.court_points: List[Tuple[float, float]] = []
        self.status: CalibrationStatus = CalibrationStatus.UNCALIBRATED

    @property
    def is_calibrated(self) -> bool:
        return self._h_img_to_court is not None and self.status != CalibrationStatus.UNCALIBRATED

    def fit(
        self,
        image_points: List[Tuple[float, float]],
        court_points: List[Tuple[float, float]],
        method: CalibrationStatus = CalibrationStatus.MANUAL,
    ) -> None:
        """Fit a homography matrix from corresponding point pairs (minimum 4 points)."""
        if len(image_points) < 4 or len(court_points) < 4:
            raise ValueError(f"At least 4 point correspondences required, got {len(image_points)}")
        if len(image_points) != len(court_points):
            raise ValueError("image_points and court_points must have identical length")

        src = np.array(image_points, dtype=np.float32).reshape(-1, 1, 2)
        dst = np.array(court_points, dtype=np.float32).reshape(-1, 1, 2)

        # Compute Homography: Image -> Court
        h_matrix, _ = cv2.findHomography(src, dst)
        if h_matrix is None:
            raise RuntimeError("Failed to compute homography matrix from given points")

        self._h_img_to_court = h_matrix
        self._h_court_to_img = np.linalg.inv(h_matrix)
        self.image_points = list(image_points)
        self.court_points = list(court_points)
        self.status = method

    def image_to_court(self, u: float, v: float) -> Tuple[float, float]:
        """Project image coordinates (u, v) to metric court coordinates (X, Y) in meters."""
        if not self.is_calibrated or self._h_img_to_court is None:
            raise RuntimeError("Calibrator is not calibrated. Call fit() first.")

        pt = np.array([[[float(u), float(v)]]], dtype=np.float32)
        transformed = cv2.perspectiveTransform(pt, self._h_img_to_court)
        court_x = float(transformed[0, 0, 0])
        court_y = float(transformed[0, 0, 1])
        return court_x, court_y

    def court_to_image(self, court_x: float, court_y: float) -> Tuple[float, float]:
        """Project metric court coordinates (X, Y) to image coordinates (u, v) in pixels."""
        if not self.is_calibrated or self._h_court_to_img is None:
            raise RuntimeError("Calibrator is not calibrated. Call fit() first.")

        pt = np.array([[[float(court_x), float(court_y)]]], dtype=np.float32)
        transformed = cv2.perspectiveTransform(pt, self._h_court_to_img)
        u = float(transformed[0, 0, 0])
        v = float(transformed[0, 0, 1])
        return u, v

    def compute_reprojection_error(
        self,
        image_points: List[Tuple[float, float]],
        court_points: List[Tuple[float, float]],
    ) -> float:
        """Compute Root Mean Square Error (RMSE) in image pixels."""
        if not self.is_calibrated or self._h_court_to_img is None:
            return float("inf")

        errors = []
        for (img_u, img_v), (cx, cy) in zip(image_points, court_points):
            proj_u, proj_v = self.court_to_image(cx, cy)
            err = np.hypot(img_u - proj_u, img_v - proj_v)
            errors.append(err ** 2)

        return float(np.sqrt(np.mean(errors))) if errors else 0.0

    def evaluate_line_call(
        self,
        court_x: float,
        court_y: float,
        is_doubles: bool = False,
        ball_radius_m: float = BALL_RADIUS_M,
        line_width_m: float = LINE_WIDTH_M,
        uncertainty_m: float = 0.02,
    ) -> Tuple[CallDecision, float, str]:
        """Determine whether a ball landing at (court_x, court_y) is IN, OUT, or UNCERTAIN.

        In official tennis rules, a ball that touches any part of the boundary line is IN.
        Line contact occurs if the ball cylinder/sphere footprint intersects the outer edge
        of the line boundary.
        """
        if not self.is_calibrated:
            return CallDecision.UNCERTAIN, 0.0, "uncalibrated_court"

        # Define court boundary limits (inclusive of outer edge of lines)
        min_x = -DOUBLES_ALLEY_M if is_doubles else 0.0
        max_x = (SINGLES_WIDTH_M + DOUBLES_ALLEY_M) if is_doubles else SINGLES_WIDTH_M
        min_y = 0.0
        max_y = COURT_LENGTH_M

        # Distance to outer boundary edges
        # Negative inside, positive outside
        dx = max(min_x - court_x, 0.0, court_x - max_x)
        dy = max(min_y - court_y, 0.0, court_y - max_y)
        dist_outside = np.hypot(dx, dy)

        # The ball is considered IN if its center is within ball_radius + line_tolerance of the boundary
        # i.e., any part of the ball sphere touches the line.
        touching_threshold = ball_radius_m + (line_width_m * 0.5)

        # Distance from the edge of contact:
        # margin > 0 means ball center is past touching contact threshold (OUT)
        # margin < 0 means ball center is within touching contact (IN)
        contact_margin = dist_outside - touching_threshold

        # If the margin is within the measurement uncertainty interval, reject false certainty
        if abs(contact_margin) <= uncertainty_m:
            return (
                CallDecision.UNCERTAIN,
                0.5,
                f"marginal_call_within_uncertainty (margin={contact_margin*100:.1f}cm, tolerance=+/-{uncertainty_m*100:.1f}cm)",
            )

        if contact_margin < 0:
            # Ball landed inside or touched line
            if dist_outside <= 0.0:
                conf = 0.98
                reason = "cleanly_inside_court"
            else:
                conf = 0.92
                reason = f"touching_boundary_line (contact_margin={contact_margin*100:.1f}cm)"
            return CallDecision.IN, conf, reason
        else:
            conf = min(0.99, 0.85 + (contact_margin / 0.20) * 0.14)
            reason = f"cleanly_outside_court (margin={contact_margin*100:.1f}cm)"
            return CallDecision.OUT, conf, reason

    def to_schema(self) -> CourtCalibration:
        """Export state to Pydantic CourtCalibration model."""
        homography_list = None
        if self._h_img_to_court is not None:
            homography_list = self._h_img_to_court.tolist()

        return CourtCalibration(
            image_points=[Point2D(x=p[0], y=p[1]) for p in self.image_points],
            court_points=[Point2D(x=p[0], y=p[1]) for p in self.court_points],
            homography=homography_list,
            status=self.status,
        )
