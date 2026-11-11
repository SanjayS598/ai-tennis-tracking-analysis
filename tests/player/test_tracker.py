"""Unit tests for Computer Vision Player Identity & Court Side Tracking."""

import pytest
import numpy as np
from tennis_ai.player.tracker import (
    PlayerIdentityTracker,
    PlayerAppearanceSignature,
    hsv_to_color_name,
    tag_shots_with_player_side,
)
from tennis_ai.core.schemas import PlayerTrackingInfo, SideChangeEvent, ShotTrajectory


def test_hsv_to_color_name():
    # Test hue ranges and saturation/value bounds
    assert hsv_to_color_name(110, 180, 200) == "Navy Blue"
    assert hsv_to_color_name(60, 180, 200) == "Forest Green"
    assert hsv_to_color_name(175, 180, 200) == "Crimson Red"
    assert hsv_to_color_name(5, 180, 200) == "Crimson Red"
    assert hsv_to_color_name(20, 180, 200) == "Neon Orange"
    assert hsv_to_color_name(30, 180, 200) == "Volt Yellow"
    assert hsv_to_color_name(0, 10, 240) == "Crisp White"
    assert hsv_to_color_name(0, 10, 20) == "Midnight Black"


def test_player_appearance_signature():
    sig1 = PlayerAppearanceSignature(
        shirt_hsv=(110.0, 150.0, 200.0),
        color_name="Navy Blue",
        court_side="near",
        centroid=(0.5, 0.8),
        confidence=0.95,
    )
    assert sig1.color_name == "Navy Blue"
    assert sig1.court_side == "near"
    assert sig1.centroid == (0.5, 0.8)


def test_tag_shots_with_player_side_no_side_change():
    shots = [
        {"shot_number": 1, "frame_idx": 30, "speed_mph": 115.0},
        {"shot_number": 2, "frame_idx": 60, "speed_mph": 75.0},
        {"shot_number": 3, "frame_idx": 90, "speed_mph": 82.0},
    ]
    tracking_info = PlayerTrackingInfo(
        user_name="Sanjay Shankar",
        current_court_side="near",
        user_shirt_color="Navy Blue",
        opponent_shirt_color="White / Silver",
        side_changes=[],
    )

    tag_shots_with_player_side(shots, tracking_info)

    # In singles without side change, shot 1 is near (user), shot 2 is far (opponent), shot 3 is near (user)
    assert shots[0]["hitter"] == "user"
    assert shots[0]["court_side"] == "near"
    assert shots[0]["is_user_shot"] is True
    assert shots[0]["hitter_name"] == "Sanjay Shankar"

    assert shots[1]["hitter"] == "opponent"
    assert shots[1]["court_side"] == "far"
    assert shots[1]["is_user_shot"] is False
    assert shots[1]["hitter_name"] == "Opponent"

    assert shots[2]["hitter"] == "user"
    assert shots[2]["court_side"] == "near"
    assert shots[2]["is_user_shot"] is True


def test_tag_shots_with_player_side_with_side_change():
    shots = [
        {"shot_number": 1, "frame_idx": 30},
        {"shot_number": 2, "frame_idx": 60},
        # Side change happens at frame 100: user moves to far end
        {"shot_number": 3, "frame_idx": 120},
        {"shot_number": 4, "frame_idx": 150},
    ]
    tracking_info = {
        "user_name": "Sanjay Shankar",
        "current_court_side": "far",
        "user_shirt_color": "Navy Blue",
        "opponent_shirt_color": "Crimson Red",
        "side_changes": [
            {
                "frame_idx": 100,
                "timestamp_ms": 3333.3,
                "user_court_side": "far",
                "opponent_court_side": "near",
                "confidence": 0.98,
                "reason": "Net crossing",
            }
        ],
    }

    tag_shots_with_player_side(shots, tracking_info)

    # Before side change: shot 1 is near -> user
    assert shots[0]["hitter"] == "user"
    assert shots[0]["court_side"] == "near"

    # After side change: user is at 'far' end.
    # shot 3 (odd) originates from 'near' end -> Opponent!
    # shot 4 (even) originates from 'far' end -> User!
    assert shots[2]["court_side"] == "near"
    assert shots[2]["hitter"] == "opponent"
    assert shots[2]["is_user_shot"] is False

    assert shots[3]["court_side"] == "far"
    assert shots[3]["hitter"] == "user"
    assert shots[3]["is_user_shot"] is True


def test_player_identity_tracker_synthetic_or_fallback():
    tracker = PlayerIdentityTracker()
    info = tracker.track_session_players(
        video_path=None,
        total_frames=300,
        fps=30.0,
        user_name="Sanjay Shankar",
        session_type="match",
    )
    assert info.user_name == "Sanjay Shankar"
    assert info.current_court_side in ["near", "far"]
    assert len(info.user_shirt_color) > 0
