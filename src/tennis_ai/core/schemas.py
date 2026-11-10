"""Core Pydantic data schemas for sessions, calibration, tracking, and line calls."""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field, field_validator


class CallDecision(str, Enum):
    """Line-call outcome decision."""
    IN = "IN"
    OUT = "OUT"
    UNCERTAIN = "UNCERTAIN"


class CalibrationStatus(str, Enum):
    """Court calibration state."""
    UNCALIBRATED = "uncalibrated"
    MANUAL = "manual"
    AUTOMATIC = "automatic"
    VERIFIED = "verified"


class Point2D(BaseModel):
    """2D point coordinate (image pixel or metric court space)."""
    x: float
    y: float

    def as_tuple(self) -> Tuple[float, float]:
        """Return (x, y) as a float tuple."""
        return (float(self.x), float(self.y))


class CourtCalibration(BaseModel):
    """Court calibration homography and control points."""
    image_points: List[Point2D] = Field(default_factory=list)
    court_points: List[Point2D] = Field(default_factory=list)
    homography: Optional[List[List[float]]] = None
    status: CalibrationStatus = CalibrationStatus.UNCALIBRATED


class VideoMetadata(BaseModel):
    """Metadata describing an ingested video stream or file."""
    source_video: str
    fps: float = Field(gt=0, description="Frames per second")
    width: int = Field(gt=0, description="Frame width in pixels")
    height: int = Field(gt=0, description="Frame height in pixels")
    total_frames: int = Field(ge=0, description="Total frame count")
    duration_sec: float = Field(ge=0, description="Total duration in seconds")

    @property
    def aspect_ratio(self) -> float:
        """Width-to-height aspect ratio."""
        return self.width / self.height


class BallDetection(BaseModel):
    """Per-frame ball candidate observation."""
    frame_idx: int = Field(ge=0)
    timestamp_ms: float = Field(ge=0)
    center: Point2D
    confidence: float = Field(ge=0.0, le=1.0)
    radius: Optional[float] = Field(default=None, ge=0.0)


class BounceEvent(BaseModel):
    """Candidate ball bounce and line-call decision event."""
    event_id: str
    session_id: str
    frame_idx: int = Field(ge=0)
    timestamp_ms: float = Field(ge=0)
    type: str = "bounce_candidate"
    ball_image_xy: Point2D
    estimated_court_xy: Optional[Point2D] = None
    bounce_confidence: float = Field(ge=0.0, le=1.0)
    call: CallDecision
    call_confidence: float = Field(ge=0.0, le=1.0)
    reason: str


class SessionReport(BaseModel):
    """Complete machine-readable session output report."""
    session_id: str
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    video_metadata: VideoMetadata
    camera_position: str = "stationary_behind_baseline"
    calibration: CourtCalibration = Field(default_factory=CourtCalibration)
    events: List[BounceEvent] = Field(default_factory=list)
