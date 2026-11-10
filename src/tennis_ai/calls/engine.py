"""Line call decision engine combining bounce coordinates, court calibration, and uncertainty scoring."""

from typing import Any, Dict, List, Optional
from tennis_ai.bounce.detector import BounceCandidate
from tennis_ai.core.schemas import BounceEvent, CallDecision, Point2D
from tennis_ai.court.geometry import CourtCalibrator


class LineCallEngine:
    """Evaluates bounce candidates against calibrated court geometry and outputs robust line calls."""

    def __init__(
        self,
        calibrator: Optional[CourtCalibrator] = None,
        is_doubles: bool = False,
        uncertainty_m: float = 0.025,  # 2.5 cm uncertainty tolerance
    ):
        self.calibrator = calibrator
        self.is_doubles = is_doubles
        self.uncertainty_m = uncertainty_m

    def evaluate_bounce(
        self,
        candidate: BounceCandidate,
        session_id: str,
        event_idx: int = 1,
    ) -> BounceEvent:
        """Evaluate a single bounce candidate, projecting to metric court space and deciding IN/OUT/UNCERTAIN."""
        event_id = f"bounce-{event_idx:04d}"

        # If calibrator is missing or uncalibrated
        if self.calibrator is None or not self.calibrator.is_calibrated:
            return BounceEvent(
                event_id=event_id,
                session_id=session_id,
                frame_idx=candidate.frame_idx,
                timestamp_ms=candidate.timestamp_ms,
                ball_image_xy=candidate.center,
                estimated_court_xy=None,
                bounce_confidence=candidate.confidence,
                call=CallDecision.UNCERTAIN,
                call_confidence=0.0,
                reason="court_uncalibrated",
            )

        # Reject calls with very low bounce confidence
        if candidate.confidence < 0.40:
            return BounceEvent(
                event_id=event_id,
                session_id=session_id,
                frame_idx=candidate.frame_idx,
                timestamp_ms=candidate.timestamp_ms,
                ball_image_xy=candidate.center,
                estimated_court_xy=None,
                bounce_confidence=candidate.confidence,
                call=CallDecision.UNCERTAIN,
                call_confidence=candidate.confidence,
                reason="low_bounce_confidence",
            )

        # Project 2D ground contact to metric court space (X, Y) in meters
        try:
            court_x, court_y = self.calibrator.image_to_court(
                candidate.center.x, candidate.center.y
            )
            court_pt = Point2D(x=float(court_x), y=float(court_y))
        except Exception as exc:
            return BounceEvent(
                event_id=event_id,
                session_id=session_id,
                frame_idx=candidate.frame_idx,
                timestamp_ms=candidate.timestamp_ms,
                ball_image_xy=candidate.center,
                estimated_court_xy=None,
                bounce_confidence=candidate.confidence,
                call=CallDecision.UNCERTAIN,
                call_confidence=0.0,
                reason=f"homography_projection_failed: {exc}",
            )

        call, call_conf, reason = self.calibrator.evaluate_line_call(
            court_x=court_x,
            court_y=court_y,
            is_doubles=self.is_doubles,
            uncertainty_m=self.uncertainty_m,
        )

        # Combined confidence from bounce detection quality and spatial certainty
        overall_call_conf = float(call_conf * candidate.confidence)

        return BounceEvent(
            event_id=event_id,
            session_id=session_id,
            frame_idx=candidate.frame_idx,
            timestamp_ms=candidate.timestamp_ms,
            ball_image_xy=candidate.center,
            estimated_court_xy=court_pt,
            bounce_confidence=candidate.confidence,
            call=call,
            call_confidence=overall_call_conf,
            reason=reason,
        )

    def process_candidates(
        self,
        candidates: List[BounceCandidate],
        session_id: str,
    ) -> List[BounceEvent]:
        """Process all bounce candidates in session."""
        events: List[BounceEvent] = []
        for idx, cand in enumerate(candidates, start=1):
            ev = self.evaluate_bounce(cand, session_id=session_id, event_idx=idx)
            events.append(ev)
        return events


def evaluate_line_calls_against_ground_truth(
    predicted_events: List[Any],
    ground_truth_events: List[Any],
    tolerance_frames: int = 3,
) -> Dict[str, Any]:
    """Calculate agreement metrics between predicted bounce line calls and human-annotated ground truth."""
    total_gt = len(ground_truth_events)
    if total_gt == 0:
        return {
            "total_ground_truth": 0,
            "matched_events": 0,
            "correct_calls": 0,
            "accuracy": 0.0,
            "uncertain_calls": 0,
            "missed_bounces": 0,
        }

    matched_gt = set()
    correct_calls = 0
    uncertain_count = 0

    for pred in predicted_events:
        p_frame = pred["frame_idx"] if isinstance(pred, dict) else pred.frame_idx
        p_call = pred["call"] if isinstance(pred, dict) else pred.call

        # Find closest ground truth within tolerance
        best_gt_idx = None
        min_dist = float("inf")

        for idx, gt in enumerate(ground_truth_events):
            if idx in matched_gt:
                continue
            gt_frame = gt["frame_idx"] if isinstance(gt, dict) else gt.frame_idx
            dist = abs(p_frame - gt_frame)
            if dist <= tolerance_frames and dist < min_dist:
                min_dist = dist
                best_gt_idx = idx

        if best_gt_idx is not None:
            matched_gt.add(best_gt_idx)
            gt_call = ground_truth_events[best_gt_idx]["call"] if isinstance(ground_truth_events[best_gt_idx], dict) else ground_truth_events[best_gt_idx].call

            if p_call == CallDecision.UNCERTAIN or (isinstance(p_call, str) and p_call == "UNCERTAIN"):
                uncertain_count += 1
            elif p_call == gt_call or (hasattr(p_call, "value") and p_call.value == getattr(gt_call, "value", gt_call)):
                correct_calls += 1

    matched_count = len(matched_gt)
    missed_count = total_gt - matched_count
    accuracy = correct_calls / float(total_gt) if total_gt > 0 else 0.0

    return {
        "total_ground_truth": total_gt,
        "matched_events": matched_count,
        "correct_calls": correct_calls,
        "uncertain_calls": uncertain_count,
        "missed_bounces": missed_count,
        "accuracy": accuracy,
    }
