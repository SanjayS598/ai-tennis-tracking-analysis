"""Unit tests for Tennis AI FastAPI REST and WebSocket backend."""

import pytest
from fastapi.testclient import TestClient

from tennis_ai.api.app import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_api_health(client: TestClient):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_api_list_sessions(client: TestClient):
    res = client.get("/api/sessions")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_api_list_samples(client: TestClient):
    res = client.get("/api/samples")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_api_calibrate_court(client: TestClient):
    payload = {
        "points": [
            {"x": 400.0, "y": 900.0},
            {"x": 1520.0, "y": 900.0},
            {"x": 700.0, "y": 300.0},
            {"x": 1220.0, "y": 300.0},
        ]
    }
    res = client.post("/api/calibrate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "manual"
    assert data["homography"] is not None
    assert data["reprojection_error_px"] >= 0.0


def test_api_devices(client: TestClient):
    res = client.get("/api/devices")
    assert res.status_code == 200
    data = res.json()
    assert "iphone" in data
    assert "watch" in data
    assert "name" in data["iphone"]
    assert "name" in data["watch"]
    assert "status" in data["iphone"]
    assert "discovery_active" in data
    assert data["discovery_active"] is True


def test_api_devices_scan_and_simulate(client: TestClient):
    # Test active hardware scan
    scan_res = client.post("/api/devices/scan")
    assert scan_res.status_code == 200
    scan_data = scan_res.json()
    assert "hardware_found" in scan_data

    # Test explicit simulation toggle
    sim_res = client.post("/api/devices/simulate?device=iphone&connected=true")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["iphone"]["connected"] is True
    assert sim_data["iphone"]["is_simulated"] is True

    # Test companion pairing web interface
    comp_res = client.get("/companion")
    assert comp_res.status_code == 200
    assert "Tennis AI Companion" in comp_res.text


def test_api_user_profile_crud(client: TestClient):
    profile_data = {
        "id": "user_test_player",
        "name": "Test Player",
        "handedness": "Left",
        "play_style": "All-Court",
        "utr_rating": "10.2",
    }
    # Save profile
    save_res = client.post("/api/users/user_test_player/profile", json=profile_data)
    assert save_res.status_code == 200
    saved = save_res.json()
    assert saved["name"] == "Test Player"
    assert saved["handedness"] == "Left"

    # Get profile
    get_res = client.get("/api/users/user_test_player/profile")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == "user_test_player"
    assert fetched["name"] == "Test Player"


def test_api_sessions_user_filter(client: TestClient):
    # Query with specific user_id
    res = client.get("/api/sessions?user_id=user_sanjay_shankar")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    for s in data:
        assert s["user_id"] == "user_sanjay_shankar" or "sanjay" in s.get("player_name", "").lower()


def test_api_session_enrichment_shots_and_biomechanics(client: TestClient):
    # Test session detail endpoint enrichment
    list_res = client.get("/api/sessions")
    assert list_res.status_code == 200
    sessions = list_res.json()
    if sessions:
        sid = sessions[0]["session_id"]
        detail_res = client.get(f"/api/sessions/{sid}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert "shots" in detail
        assert "biomechanics" in detail
        assert isinstance(detail["shots"], list)
        if detail["biomechanics"]:
            assert "frames" in detail["biomechanics"]
            assert "stroke_counts" in detail["biomechanics"]


def test_api_delete_session_not_found(client: TestClient):
    res = client.delete("/api/sessions/nonexistent_session_123")
    assert res.status_code == 404


def test_api_upload_sample_clip(client: TestClient):
    # Test uploading a session from an available court sample
    data = {
        "sample_filename": "sample_tennis.mp4",
        "session_type": "rally",
        "player_name": "Sanjay Shankar",
        "user_id": "user_sanjay_shankar",
        "render_video": "false",
    }
    res = client.post("/api/upload", data=data)
    assert res.status_code == 200
    result = res.json()
    assert result["user_id"] == "user_sanjay_shankar"
    assert result["player_name"] == "Sanjay Shankar"
    assert "shots" in result
    assert "session_id" in result

    # Test that delete works on this newly created session
    sid = result["session_id"]
    del_res = client.delete(f"/api/sessions/{sid}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"


def test_api_challenge_endpoint(client: TestClient):
    # Test high-speed Hawk-Eye challenge on a short rolling buffer clip
    data = {
        "sample_filename": "sample_tennis.mp4",
        "player_name": "Sanjay Shankar",
        "user_id": "user_sanjay_shankar",
    }
    res = client.post("/api/challenge", data=data)
    assert res.status_code == 200
    result = res.json()
    assert result["status"] == "success"
    assert "verdict" in result
    assert result["verdict"] in ["IN", "OUT", "UNCERTAIN"]
    assert "margin_cm" in result
    assert "audio_announcement" in result
    assert "haptic_pattern" in result
    assert "bounce_pos" in result
    assert "shots" in result

    # Cleanup challenge session
    sid = result["session_id"]
    del_res = client.delete(f"/api/sessions/{sid}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"



