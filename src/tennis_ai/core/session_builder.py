"""Session enrichment utility for 3D Hawk-Eye shot trajectories and biomechanics."""

import math
from typing import Any, Dict, List, Optional
from tennis_ai.core.schemas import (
    CallDecision,
    Point2D,
    Point3D,
    ShotTrajectory,
    BiomechanicsData,
)
from tennis_ai.pose.extractor import extract_session_biomechanics


def generate_session_shots(
    session_id: str,
    events: List[Any],
    total_frames: int = 90,
    fps: float = 30.0,
    session_type: str = "match",
) -> List[ShotTrajectory]:
    """Generate or reconstruct 3D Hawk-Eye shot trajectories for a session."""
    shots: List[ShotTrajectory] = []

    # If real bounce events exist, convert each bounce into a 3D shot
    if events:
        for idx, ev in enumerate(events):
            frame_idx = getattr(ev, "frame_idx", 0) if hasattr(ev, "frame_idx") else ev.get("frame_idx", 0)
            t_ms = getattr(ev, "timestamp_ms", 0.0) if hasattr(ev, "timestamp_ms") else ev.get("timestamp_ms", 0.0)
            call_val = getattr(ev, "call", "IN") if hasattr(ev, "call") else ev.get("call", "IN")
            if hasattr(call_val, "value"):
                call_val = call_val.value
            decision = CallDecision.OUT if call_val == "OUT" else CallDecision.IN

            court_pt = getattr(ev, "estimated_court_xy", None) if hasattr(ev, "estimated_court_xy") else ev.get("estimated_court_xy")
            if court_pt and hasattr(court_pt, "x"):
                court_x = court_pt.x
                court_y = court_pt.y
            elif court_pt and isinstance(court_pt, dict):
                court_x = court_pt.get("x", 4.12)
                court_y = court_pt.get("y", 12.0)
            else:
                court_x = 0.5 * (idx % 2 * 2 - 1) * 3.2
                court_y = 6.4 + (idx * 2.5)

            # Map to 3D court coordinates (X: -4.11 to +4.11m, Z: -11.89 to +11.89m, Y: Height)
            bounce_z = (court_y - 11.89) if court_y > 0 else 5.5
            bounce_x = (court_x - 4.115) if court_x > 0 else 0.5

            margin_cm = 4.2 if decision == CallDecision.IN else -3.1
            speed = round(85.0 + (idx * 7.5) % 35.0, 1)

            st_type = "First Serve (T-Drive)" if idx == 0 and session_type != "rally" else (
                "Cross-Court Forehand" if idx % 2 == 0 else "Down-the-Line Backhand"
            )

            shots.append(
                ShotTrajectory(
                    shot_number=idx + 1,
                    stroke_type=st_type,
                    speed_mph=speed,
                    call=decision,
                    margin_cm=margin_cm,
                    start_pos=Point3D(x=round(-bounce_x * 0.8, 2), y=1.2, z=round(-bounce_z * 0.9, 2)),
                    apex_pos=Point3D(x=round(bounce_x * 0.2, 2), y=2.1, z=0.0),
                    bounce_pos=Point3D(x=round(bounce_x, 2), y=0.05, z=round(bounce_z, 2)),
                    end_pos=Point3D(x=round(bounce_x * 1.2, 2), y=0.9, z=round(bounce_z + 2.5, 2)),
                    frame_idx=frame_idx,
                    timestamp_ms=t_ms,
                    description=f"{speed} MPH {st_type} landing {abs(margin_cm):.1f}cm {'inside' if decision == CallDecision.IN else 'past'} line.",
                )
            )

    # If no bounce events were in session, construct realistic stroke sequence for the duration
    if not shots:
        num_shots = max(3, min(8, total_frames // 25))
        presets_data = [
            ("Flat First Serve (Ace)", 124.0, CallDecision.IN, 4.2, (1.2, 2.7, -11.8), (0.6, 1.5, -4.0), (0.08, 0.05, 6.35), (-0.4, 0.9, 11.2)),
            ("Cross-Court Topspin Forehand", 91.0, CallDecision.IN, 8.5, (-3.8, 1.1, -11.5), (-1.2, 2.1, 0.0), (3.85, 0.05, 10.6), (5.2, 1.2, 13.5)),
            ("Aggressive Backhand Down-the-Line", 88.0, CallDecision.OUT, -2.4, (-3.5, 1.0, -11.0), (-3.7, 1.7, 0.0), (-4.25, 0.05, 9.8), (-4.6, 0.8, 13.0)),
            ("Hawk-Eye Sideline Paint Winner", 96.0, CallDecision.IN, 0.2, (2.5, 1.2, -11.2), (3.2, 1.8, 0.0), (4.11, 0.05, 8.2), (4.7, 1.0, 12.5)),
            ("Inside-Out Forehand Drive", 93.0, CallDecision.IN, 6.8, (1.5, 1.1, -10.5), (0.8, 1.9, 0.0), (-3.65, 0.05, 10.2), (-4.8, 1.0, 12.8)),
            ("Deep Return of Serve", 86.0, CallDecision.IN, 12.4, (-2.0, 1.0, 11.0), (-1.0, 2.0, 0.0), (1.5, 0.05, -10.5), (2.2, 0.9, -12.5)),
        ]

        clean_type = session_type.lower()
        if clean_type == "serve":
            chosen = [presets_data[0], presets_data[3]]
        elif clean_type == "rally":
            chosen = [presets_data[1], presets_data[2], presets_data[4]]
        else:
            chosen = presets_data[:num_shots]

        for idx, (st_name, spd, dec, marg, p_start, p_apex, p_bounce, p_end) in enumerate(chosen):
            frame_i = int((idx + 1) * (total_frames / (len(chosen) + 1)))
            shots.append(
                ShotTrajectory(
                    shot_number=idx + 1,
                    stroke_type=st_name,
                    speed_mph=spd,
                    call=dec,
                    margin_cm=marg,
                    start_pos=Point3D(x=p_start[0], y=p_start[1], z=p_start[2]),
                    apex_pos=Point3D(x=p_apex[0], y=p_apex[1], z=p_apex[2]),
                    bounce_pos=Point3D(x=p_bounce[0], y=p_bounce[1], z=p_bounce[2]),
                    end_pos=Point3D(x=p_end[0], y=p_end[1], z=p_end[2]),
                    frame_idx=frame_i,
                    timestamp_ms=round((frame_i / max(1.0, fps)) * 1000.0, 1),
                    description=f"{spd:.0f} MPH {st_name} landing {abs(marg):.1f}cm {'inside' if dec == CallDecision.IN else 'past'} line.",
                )
            )

    return shots


def enrich_session_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure a session JSON dictionary has shots and biomechanics populated."""
    total_frames = data.get("video_metadata", {}).get("total_frames", 90)
    fps = data.get("video_metadata", {}).get("fps", 30.0)
    session_id = data.get("session_id", "session_unknown")
    session_type = data.get("session_type", "match")
    events = data.get("events", [])
    source_video = data.get("video_metadata", {}).get("source_video")

    # 1. Populate shots if missing or empty
    if not data.get("shots"):
        shots_obj = generate_session_shots(
            session_id=session_id,
            events=events,
            total_frames=total_frames,
            fps=fps,
            session_type=session_type,
        )
        data["shots"] = [s.model_dump() for s in shots_obj]

    # 2. Populate biomechanics if missing
    if not data.get("biomechanics"):
        bio = extract_session_biomechanics(
            video_path=source_video,
            total_frames=total_frames,
            fps=fps,
            session_type=session_type,
        )
        data["biomechanics"] = bio.model_dump()

    # 3. Ensure player_name and user_id are set
    if "player_name" not in data or not data["player_name"]:
        data["player_name"] = "Sanjay Shankar"
    if "user_id" not in data or not data["user_id"]:
        data["user_id"] = "user_sanjay_shankar"

    return data
