# AI Tennis Tracking and Analysis System

AI-powered tennis tracking application similar in concept to SwingVision, designed to record tennis sessions from a stationary camera behind the baseline, provide real-time line calls (`IN`, `OUT`, `UNCERTAIN`), track ball trajectories, and analyze player biomechanics using consumer hardware (Apple Silicon M4 + iPhone/Watch).

## 1. Quick Start (Apple Silicon M4 macOS)

This project uses [`uv`](https://docs.astral.sh/uv/) for Python environment and dependency management.

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ai-tennis-tracking-analysis

# Create virtual environment with Python 3.11
uv venv --python 3.11
source .venv/bin/activate

# Install dependencies in editable mode
uv pip install -e ".[dev,pose]"
```

### Running Test Suite

```bash
pytest --cov=tennis_ai --cov-report=term-missing
```

---

## 2. Core Capabilities & Workflows

### A. Court Geometry & Calibration
Map image pixels $(u, v)$ to official metric court space $(X, Y)$ in meters (ITF standards) with sub-pixel homography:

```bash
python -m tennis_ai.court.calibrate \
  --video data/samples/match_clip_1.mp4 \
  --output configs/court_calib.json \
  --overlay outputs/calibration_overlay.jpg \
  --points 467,821 1453,821 714,268 1206,268
```
*(Points format: near-left, near-right, far-left, far-right singles baseline corners).*

### B. Full Match Processing (Ball Tracking + Bounces + Line Calls + Video Render)
Run PyTorch TrackNet deep neural network, Kalman filter trajectory smoothing, parabolic bounce detection, and line calling:

```bash
python -m tennis_ai.video.process \
  --input data/samples/match_clip_1.mp4 \
  --output outputs/session_001 \
  --calibration configs/court_calib.json \
  --render
```

Generated artifacts:
- `session.json`: Complete session report (FPS, duration, court calibration, bounce candidates, and line calls with confidence and reasoning).
- `annotated_match.mp4`: Exported video with cyan court wireframe, glowing ball tracker trail, and animated line call overlays.
- `previews/`: Timestamped keyframes for quick inspection.

### C. Live Real-Time Transport Server (iPhone & Apple Watch)
Launch the WebSocket event server bridging Mac inference to mobile devices:

```bash
# Start live server
python -m tennis_ai.transport.server --host 0.0.0.0 --port 8765

# Test mode: Broadcast synthetic line calls every 2 seconds for latency testing
python -m tennis_ai.transport.server --port 8765 --synthetic-interval 2.0
```

### D. iOS & Apple Watch Companion Apps (`ios/`)
- `ios/TennisRecorder/`: SwiftUI iPhone app that connects to the Mac WebSocket server, displays live call status, and relays events to Apple Watch via `WatchConnectivity`.
- `ios/TennisWatch/`: High-contrast watchOS app with distinct haptic cues:
  - `IN` $\to$ `.success` (Single crisp vibration)
  - `OUT` $\to$ `.failure` (Double alert vibration)
  - `UNCERTAIN` $\to$ `.retry` (Subtle reminder vibration)

### E. Biomechanics & Shot Classification
- 33 3D body landmark extraction via MediaPipe Pose.
- Invariant kinetic feature normalizer (scaled by torso height, centered at hips).
- 1D-CNN + Bidirectional GRU PyTorch classifier (`TemporalStrokeClassifier`) recognizing `Forehand`, `Backhand`, and `Serve`.

---

## 3. Data Contracts & Three-State Line Calling

Calls are strictly evaluated into three states:
- **`IN`**: Ball cylinder footprint intersects inside the boundary line.
- **`OUT`**: Ball cylinder footprint is cleanly outside the boundary line.
- **`UNCERTAIN`**: Ball landed within the measurement uncertainty interval ($\pm 2.5\text{ cm}$) or court was occluded. False confidence is never reported.

---

## 4. Test Summary

- 37 unit and integration tests passing in 14.1s.
- 85% overall code coverage across all pipelines.
- Model weights: PyTorch `tracknet_tennis.pt` (41MB) loaded with MPS/Metal acceleration on Apple Silicon.
