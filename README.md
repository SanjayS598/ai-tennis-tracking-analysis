# AI Tennis Tracking and Analysis System

AI-powered tennis tracking application similar in concept to SwingVision, designed to record tennis sessions from a stationary iPhone behind the baseline, provide reliable line calls (`IN`, `OUT`, `UNCERTAIN`), track shots, and analyze player biomechanics using consumer hardware (MacBook Air M4 + iPhone/Watch).

## 1. Quick Start (Apple Silicon M4 macOS)

This project uses [`uv`](https://docs.astral.sh/uv/) for Python environment and dependency management.

### Prerequisites
- macOS 14+ (tested on M4 MacBook Air, macOS 15)
- Python 3.11 or 3.12 (managed via `uv`)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ai-tennis-tracking-analysis

# Create virtual environment with Python 3.11
uv venv --python 3.11
source .venv/bin/activate

# Install package and dependencies in editable mode
uv pip install -e ".[dev]"
```

### Running Tests

```bash
pytest --cov=tennis_ai --cov-report=term-missing
```

### Ingesting a Tennis Video (Phase 0 CLI Slice)

```bash
python -m tennis_ai.video.process --input data/samples/sample_tennis.mp4 --output outputs/session_001 --samples 5
```

This command:
1. Validates the video file accessibility and decodes stream metadata (FPS, resolution, duration).
2. Generates an initial machine-readable `session.json` conforming to the project data contracts.
3. Samples representative keyframes with time/frame stamps into `outputs/session_001/previews/` for visual inspection.

## 2. Core Data Contracts

The pipeline is built on explicit schemas:
- `VideoMetadata`: stream characteristics (dimensions, frame count, FPS).
- `CourtCalibration`: pixel-to-court homography mapping and corner points.
- `BallDetection`: frame-by-frame ball bounding box/center and confidence.
- `BounceEvent`: temporal landing candidate, court coordinates, and three-state line call (`IN`, `OUT`, `UNCERTAIN`).
- `SessionReport`: persistent session summary.

## 3. Implementation Status

- [x] **Phase 0:** Repository setup, data contracts, OpenCV video reader, CLI video processor, and automated tests.
- [ ] **Phase 1:** Court line calibration (manual + homography) and baseline ball detection/tracking.
- [ ] **Phase 2:** Parabolic trajectory modeling, bounce detection, and line-call decision engine.
- [ ] **Phase 3:** Local network event stream and Apple Watch companion app.
- [ ] **Phase 4:** MediaPipe Pose tracking and temporal stroke classifier.
- [ ] **Phase 5:** System profiling, accuracy benchmarks, and evaluation report.

## 4. Current Limitations & Honest Engineering Notes

- Line calling and ball tracking are not yet connected to inference models.
- Detections and calls are never fabricated or simulated; accuracy benchmarks will only be reported once real labeled ground-truth sets are evaluated.
