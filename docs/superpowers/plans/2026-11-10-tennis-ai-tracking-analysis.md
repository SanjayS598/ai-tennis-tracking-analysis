# AI Tennis Tracking and Analysis System: Architecture & Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust, offline-first and live-extensible AI tennis tracking and analysis system on consumer hardware (M4 MacBook Air + iPhone/Watch), featuring court calibration, ball tracking, bounce/line-call determination with uncertainty modeling, and post-match biomechanics.

**Architecture:** A modular decoupled pipeline: (1) Python Computer Vision engine on macOS (OpenCV, PyTorch, MediaPipe) processing video or streamed frames, (2) JSON schema-based contract for sessions, calibration, ball tracks, bounce events, and line calls, (3) Local network transport server (FastAPI/WebSocket) for live event broadcast, and (4) SwiftUI iOS/watchOS client for capture and haptic line-call notifications.

**Tech Stack:** Python 3.11/3.12 (uv), OpenCV, PyTorch, MediaPipe, NumPy, Pydantic, Pytest, Swift/SwiftUI (iOS + watchOS, Phase 3).

**Spec:** `/Users/sanjays/Desktop/Projects/ai-tennis-tracking-analysis/Tennis_AI_Project_Spec.md`

---

## 1. Manual Action Items Required from You (The User)

To ensure this project is grounded in real-world accuracy without synthetic illusions, here is the complete checklist of manual tasks you will need to perform:

| Category | Manual Action Item | When Needed | Why Only You Can Do It |
|---|---|---|---|
| **Sample Footage** | Provide 1–3 sample video clips (`.mp4` or `.mov`) recorded on an iPhone on a tripod placed ~2m behind the baseline at ~1.5–2m height. | Start of Phase 1 | Accurate vision tracking requires real footage showing perspective, lens distortion, court lines, and ball motion blur. |
| **Ground Truth Labeling** | For 1 evaluation clip: note frame numbers and ground-truth call (`IN`, `OUT`, `TOUCHING_LINE`) for 5–10 ball bounces. | Phase 2 Benchmark | We cannot claim or measure accuracy without human-verified ground-truth labels. |
| **Court Calibration Click** | Run the interactive calibration script (or review auto-detected court corners) to click 4–6 baseline & sideline intersection points on your court setup. | Phase 1 & 2 | Verifies perspective homography against your specific camera mount angle. |
| **Apple Dev Tools** | Install full **Xcode** from the Mac App Store (currently only Apple Command Line Tools are active). | Start of Phase 3 | Building iOS and Apple Watch companion apps requires Xcode and iOS/watchOS SDKs. |
| **Device Deployment** | Connect physical iPhone and paired Apple Watch, configure your Apple ID in Xcode for code signing. | Phase 3 | Apple Watch haptics and WatchConnectivity cannot be tested on standard simulators. |
| **Stroke Footage** | Record 10–20 repetitions each of Forehand, Backhand, and Serve strokes (or provide unedited hitting session). | Phase 4 | Needed to train and validate the temporal PyTorch stroke classifier without data leakage. |

---

## 2. Phased Architecture & Verification Roadmap

### Phase 0: Project Foundation, Data Contracts & Video Ingestion MVP
- **Objective:** Establish reproducible environment with `uv`, clean directory structure, Pydantic data schemas for session metadata, calibration, ball tracks, and line calls, plus an offline video-processing CLI slice with unit tests.
- **Accuracy & Reliability Tests:**
  - Video stream validation: Test on valid MP4s, corrupted files, zero-byte files, and non-existent paths.
  - Schema serialization/deserialization idempotence tests.
  - Exact frame sampling and timestamp extraction tests against OpenCV reader.

### Phase 1: Court Geometry & Ball Tracking
- **Objective:** Manual & semi-automatic court corner calibration (homography matrix mapping pixel $(u, v)$ to real-world metric court coordinates $(X, Y)$ in meters). Baseline ball detection (TrackNet or fine-tuned lightweight CNN / frame-differencing + color blob detector baseline) with Kalman filter / temporal trajectory association.
- **Accuracy & Reliability Tests:**
  - Calibration reprojection error test: Mapped court dimensions (78ft x 27ft singles) must have < 5cm error on key calibration markers.
  - Ball detection recall & precision on annotated frames.
  - Track continuity test: Ensure tracker handles temporary occlusion (e.g. ball crossing player body or net) without id switching or wild coordinate jumps.
  - Per-frame throughput benchmark on M4 Apple Silicon (target >= 30 FPS).

### Phase 2: Trajectory Analysis, Bounce Detection & Line Calls
- **Objective:** Temporal parabolic trajectory fitting and vertical velocity reversal ($v_y$) detection for bounce candidate identification. Intersection of 3D-to-2D landing points with court boundary polygons. Configurable confidence scoring and three-state decision engine: `IN`, `OUT`, `UNCERTAIN` (rejecting false confidence).
- **Accuracy & Reliability Tests:**
  - Bounce temporal localization test: Detected bounce frame within $\pm 2$ frames of human ground truth.
  - Line call confusion matrix evaluation against labeled ground-truth set.
  - Boundary stress tests: Synthetic and real balls landing within 5cm of baseline/sidelines must output explicit confidence intervals or `UNCERTAIN` when camera resolution limit is reached.
  - Zero-false-positive safety: Occluded bounces or bad homography must reliably trigger `UNCERTAIN` with an explicit reason code.

### Phase 3: Live iPhone & Apple Watch Companion
- **Objective:** Lightweight local server (FastAPI/WebSocket) on Mac. Minimal SwiftUI iPhone camera streamer & event relay. Minimal watchOS companion app receiving line-call events with distinct haptic patterns (e.g. success buzz for `IN`, double sharp tap for `OUT`, subtle warning for `UNCERTAIN`).
- **Accuracy & Reliability Tests:**
  - End-to-end latency measurement: Frame capture on iPhone -> Mac inference -> Watch haptic notification (target < 800ms for usable on-court feedback).
  - Network drop & reconnection stress test: Simulating Wi-Fi packet drops, phone lock, and watch screen-dimming without crashing or queuing stale calls.
  - Synthetic event test suite prior to live vision model connection.

### Phase 4: Biomechanical Analysis & Stroke Classification
- **Objective:** Player detection and pose landmark extraction via MediaPipe Pose (33 3D landmarks). Temporal stroke sequence segmentation (swing start, contact, follow-through). Lightweight PyTorch LSTM/1D-CNN classifying Forehand, Backhand, and Serve.
- **Accuracy & Reliability Tests:**
  - Cross-player / cross-session validation: Split training and test sets strictly by player/session to prevent near-identical frame leakage.
  - Precision, Recall, and Confusion Matrix across shot classes.
  - Landmark confidence thresholding: Reject biomechanical metrics if key landmarks (wrist, shoulder, hip) are occluded.

### Phase 5: Reliability Hardening, Performance Profiling & Demo System
- **Objective:** Memory profiling and Apple Silicon MPS (Metal Performance Shaders) optimization. End-to-end report generator (annotated video review with slow-motion bounce replays, court heatmaps, and JSON export).
- **Accuracy & Reliability Tests:**
  - Long-duration stability: Process a full 1-hour continuous recording without memory leaks or frame drift.
  - Sensitivity analysis: Accuracy degradation curves under varying lighting and camera jitter.
  - End-to-end automated regression suite.

---

## 3. Global Constraints
- Target Machine: Apple Silicon M4 MacBook Air (macOS 15+).
- Python: 3.11 or 3.12 managed via `uv`.
- Line Call States: Strictly `IN`, `OUT`, or `UNCERTAIN` (never guess when uncertainty > threshold).
- Model outputs must be treated as estimates with explicit confidence intervals.
- Modular decoupled boundaries: Video I/O, Court Calibration, Ball Tracking, Bounce Inference, and Transport must have standalone interfaces and unit tests.

---

## 4. Phase 0 Detailed Tasks Breakdown

### Task 0.1: Project Environment & Dependency Setup (`uv`)
**Files:**
- Create: `pyproject.toml`
- Create: `.python-version`
- Create: `README.md`
- Test: `tests/test_environment.py`

**Interfaces:**
- Produces: Working isolated virtual environment with OpenCV, Pydantic, Pytest, NumPy, PyTorch.

- [ ] **Step 1: Write test verifying environment and package imports**
- [ ] **Step 2: Run pytest to verify missing environment fails**
- [ ] **Step 3: Create `pyproject.toml` and configure dependencies with `uv`**
- [ ] **Step 4: Run `uv sync` and run pytest to confirm pass**
- [ ] **Step 5: Commit changes**

### Task 0.2: Core Schemas and Data Contracts
**Files:**
- Create: `src/tennis_ai/core/schemas.py`
- Test: `tests/core/test_schemas.py`

**Interfaces:**
- Produces: `VideoMetadata`, `Point2D`, `CourtCalibration`, `BallDetection`, `BallTrack`, `BounceEvent`, `LineCallResult`, `SessionReport`.

- [ ] **Step 1: Write failing schema serialization and validation tests**
- [ ] **Step 2: Run pytest to verify failure**
- [ ] **Step 3: Implement Pydantic models in `src/tennis_ai/core/schemas.py`**
- [ ] **Step 4: Run pytest to verify all schema validations pass**
- [ ] **Step 5: Commit changes**

### Task 0.3: Video Reader & Frame Ingestion Engine
**Files:**
- Create: `src/tennis_ai/video/reader.py`
- Create: `tests/fixtures/synthetic_video.py`
- Test: `tests/video/test_reader.py`

**Interfaces:**
- Consumes: Video file path.
- Produces: `VideoReader` class providing iterator of `(frame_idx, timestamp_ms, frame_bgr)` and `VideoMetadata`.

- [ ] **Step 1: Write synthetic video generator fixture and tests for `VideoReader`**
- [ ] **Step 2: Run pytest to verify failure**
- [ ] **Step 3: Implement `VideoReader` with OpenCV in `src/tennis_ai/video/reader.py`**
- [ ] **Step 4: Run pytest to verify pass with valid, missing, and corrupt files**
- [ ] **Step 5: Commit changes**

### Task 0.4: Session Processor CLI Vertical Slice
**Files:**
- Create: `src/tennis_ai/video/process.py`
- Test: `tests/video/test_process_cli.py`

**Interfaces:**
- CLI entrypoint: `python -m tennis_ai.video.process --input <path> --output <dir>`
- Produces: Valid `session.json` report and preview keyframes in output directory.

- [ ] **Step 1: Write CLI execution integration tests**
- [ ] **Step 2: Run pytest to verify failure**
- [ ] **Step 3: Implement `process.py` CLI pipeline**
- [ ] **Step 4: Run pytest and run CLI on synthetic video to verify output artifacts**
- [ ] **Step 5: Commit changes**
