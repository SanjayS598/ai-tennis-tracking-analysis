"""FastAPI backend server exposing REST endpoints and WebSocket stream for Tennis AI."""

import asyncio
from contextlib import asynccontextmanager
import json
from pathlib import Path
import time
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from tennis_ai.core.schemas import CalibrationStatus, CourtCalibration, Point2D
from tennis_ai.court.geometry import CourtCalibrator, CourtKeypoints
from tennis_ai.transport.server import EventBroadcaster, LiveEventServer
from tennis_ai.video.process import process_video
from fastapi.staticfiles import StaticFiles

transport_server = LiveEventServer(host="0.0.0.0", port=8765)
broadcaster = transport_server.broadcaster


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: starts background WebSocket transport server on port 8765."""
    try:
        await transport_server.start()
    except Exception as e:
        print(f"[Transport] Standalone server on port 8765 startup skipped: {e}")
    yield
    try:
        await transport_server.stop()
    except Exception:
        pass


app = FastAPI(title="Tennis AI API", version="0.1.0", lifespan=lifespan)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUTS_DIR = Path("outputs").resolve()
SAMPLES_DIR = Path("data/samples").resolve()


class CalibrateRequest(BaseModel):
    points: List[Point2D]  # 4 corners in order: near-left, near-right, far-left, far-right


class ProcessRequest(BaseModel):
    video_path: str
    session_id: Optional[str] = None
    calibration_points: Optional[List[Point2D]] = None
    render_video: bool = True
    is_doubles: bool = False


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    return {"status": "healthy", "version": "0.1.0", "time_ms": time.time() * 1000.0}


@app.get("/api/samples")
def list_samples() -> List[Dict[str, Any]]:
    """List sample tennis videos available on the system."""
    samples = []
    if SAMPLES_DIR.exists():
        for p in sorted(SAMPLES_DIR.glob("*.mp4")):
            samples.append({
                "filename": p.name,
                "path": str(p),
                "size_mb": round(p.stat().st_size / (1024 * 1024), 2),
            })
    return samples


def _find_session_dir(session_id: str) -> Optional[Path]:
    """Find session directory by directory name or matching internal session_id."""
    direct = OUTPUTS_DIR / session_id
    if direct.is_dir() and (direct / "session.json").exists():
        return direct
    if OUTPUTS_DIR.exists():
        for d in OUTPUTS_DIR.iterdir():
            if d.is_dir() and (d / "session.json").exists():
                try:
                    with open(d / "session.json", "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    if meta.get("session_id") == session_id:
                        return d
                except Exception:
                    continue
    return None


@app.get("/api/sessions")
def list_sessions() -> List[Dict[str, Any]]:
    """List all analyzed match sessions."""
    sessions = []
    if OUTPUTS_DIR.exists():
        for session_dir in sorted(OUTPUTS_DIR.iterdir()):
            if session_dir.is_dir():
                json_path = session_dir / "session.json"
                if json_path.exists():
                    try:
                        with open(json_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        events = data.get("events", [])
                        in_count = sum(1 for e in events if e.get("call") == "IN")
                        out_count = sum(1 for e in events if e.get("call") == "OUT")
                        uncertain_count = sum(1 for e in events if e.get("call") == "UNCERTAIN")

                        sessions.append({
                            "session_id": session_dir.name,
                            "display_id": data.get("session_id", session_dir.name),
                            "created_at": data.get("created_at"),
                            "source_video": data.get("video_metadata", {}).get("source_video"),
                            "duration_sec": data.get("video_metadata", {}).get("duration_sec"),
                            "total_frames": data.get("video_metadata", {}).get("total_frames"),
                            "fps": data.get("video_metadata", {}).get("fps"),
                            "has_annotated_video": (session_dir / "annotated_match.mp4").exists(),
                            "total_events": len(events),
                            "in_calls": in_count,
                            "out_calls": out_count,
                            "uncertain_calls": uncertain_count,
                        })
                    except Exception:
                        continue
    return sessions


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str) -> Dict[str, Any]:
    """Retrieve full session report JSON."""
    s_dir = _find_session_dir(session_id)
    if not s_dir:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    with open(s_dir / "session.json", "r", encoding="utf-8") as f:
        data = json.load(f)
        data["session_id"] = session_id
        return data


@app.get("/api/sessions/{session_id}/video")
def get_session_video(session_id: str) -> FileResponse:
    """Stream annotated match video."""
    s_dir = _find_session_dir(session_id)
    if not s_dir:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    video_path = s_dir / "annotated_match.mp4"
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Annotated video not available for this session")

    return FileResponse(str(video_path), media_type="video/mp4")


@app.post("/api/calibrate")
def calibrate_court(req: CalibrateRequest) -> Dict[str, Any]:
    """Compute homography and error from 4 corner pixel coordinates."""
    if len(req.points) != 4:
        raise HTTPException(status_code=400, detail="Exactly 4 corner points required")

    img_pts = [(p.x, p.y) for p in req.points]
    court_pts = [
        CourtKeypoints.NEAR_LEFT_SINGLES,
        CourtKeypoints.NEAR_RIGHT_SINGLES,
        CourtKeypoints.FAR_LEFT_SINGLES,
        CourtKeypoints.FAR_RIGHT_SINGLES,
    ]

    calibrator = CourtCalibrator()
    calibrator.fit(img_pts, court_pts, method=CalibrationStatus.MANUAL)
    rmse = calibrator.compute_reprojection_error(img_pts, court_pts)

    schema = calibrator.to_schema()
    return {
        "status": schema.status.value,
        "homography": schema.homography,
        "reprojection_error_px": round(rmse, 3),
        "court_points": court_pts,
        "image_points": img_pts,
    }


@app.post("/api/process")
def process_match(req: ProcessRequest) -> Dict[str, Any]:
    """Trigger pipeline processing on a video file."""
    video_p = Path(req.video_path)
    if not video_p.exists():
        raise HTTPException(status_code=404, detail=f"Video file not found: {req.video_path}")

    session_id = req.session_id or f"session_{int(time.time())}"
    output_dir = OUTPUTS_DIR / session_id

    calib_json = None
    if req.calibration_points and len(req.calibration_points) == 4:
        img_pts = [(p.x, p.y) for p in req.calibration_points]
        court_pts = [
            CourtKeypoints.NEAR_LEFT_SINGLES,
            CourtKeypoints.NEAR_RIGHT_SINGLES,
            CourtKeypoints.FAR_LEFT_SINGLES,
            CourtKeypoints.FAR_RIGHT_SINGLES,
        ]
        calibrator = CourtCalibrator()
        calibrator.fit(img_pts, court_pts)
        calib_json = output_dir / "calibration.json"
        output_dir.mkdir(parents=True, exist_ok=True)
        with open(calib_json, "w", encoding="utf-8") as f:
            f.write(calibrator.to_schema().model_dump_json(indent=2))

    report = process_video(
        input_path=video_p,
        output_dir=output_dir,
        session_id=session_id,
        calibration_path=calib_json,
        render_video=req.render_video,
        is_doubles=req.is_doubles,
    )

    return report.model_dump()


@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket) -> None:
    """Real-time WebSocket endpoint for on-court live line calls."""
    await websocket.accept()
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    broadcaster.subscribe(queue)
    try:
        # Welcome message
        await websocket.send_text(
            json.dumps({"type": "CONNECTED", "server_time_ms": time.time() * 1000.0})
        )
        while True:
            # Wait for event to broadcast
            msg = await queue.get()
            await websocket.send_text(msg)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    finally:
        broadcaster.unsubscribe(queue)


# Mount built React frontend if available
FRONTEND_DIST = Path("frontend/dist").resolve()
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    print("\n🎾 Tennis AI Full-Stack Platform starting on http://localhost:8000\n")
    uvicorn.run("tennis_ai.api.app:app", host="0.0.0.0", port=8000, reload=False)


