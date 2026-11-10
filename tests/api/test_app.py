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
