# AI Tennis Tracking and Analysis System

> Implementation specification for an AI coding agent, adapted from the original project plan by Sanjay Shankar.
>
> **Status:** Proposed implementation plan. The original PDF describes goals and technologies, not an existing codebase or proven model accuracy. Choices identified below as *implementation suggestions* should be validated during development.

## 1. Mission

Build a prototype tennis tracking system similar in purpose to SwingVision, using consumer devices rather than expensive tracking hardware. A stationary iPhone behind the baseline records play. A vision pipeline tracks the ball and court, estimates whether a ball lands in or out, and sends a timely indication to an Apple Watch. After the session, users can inspect recordings, shot placement, stroke types, and selected body-movement patterns.

**Central research question:** Can lightweight machine learning models provide accurate tennis tracking and useful performance analysis on consumer hardware?

**Primary development machine:** M4 MacBook Air.

**Primary user:** Recreational or competitive amateur tennis player. Secondary user: tennis coach.

**Product principle:** Keep the live experience simple: position phone, calibrate, start recording, play, receive watch feedback. Reserve detailed analysis for after the session.

## 2. Scope and Success Criteria

### MVP: prioritize first

1. Import an existing tennis video and process it locally on the Mac.
2. Detect or manually specify the court lines and establish a court calibration.
3. Detect and temporally track the tennis ball, including confidence estimates.
4. Identify plausible bounces and estimate their positions relative to the calibrated court.
5. Produce **IN**, **OUT**, or **UNCERTAIN** results instead of inventing a confident call.
6. Save a session with a video reference, event timestamps, detections, and line-call results.
7. Provide a simple way to review the video with ball trajectory and call overlays.

### Live/watch prototype: next priority

1. Record on iPhone from a fixed position behind the baseline.
2. Send video or an appropriate real-time frame stream to the local processing service, if needed.
3. Deliver generated line-call events to an Apple Watch companion app with an on-screen indication and haptic feedback.
4. Test whether the latency is usable and measure connection failures. Do not claim real-time reliability until measured.

### Post-session analysis: subsequent features

1. Detect player body landmarks with MediaPipe or a suitable pose model.
2. Classify forehands, backhands, and serves from temporal movement sequences using a lightweight model trained for the project.
3. Summarize shot locations and stroke counts when underlying detections are reliable.
4. Show player movement patterns and technique-consistency comparisons; avoid presenting approximate landmarks as medically or biomechanically precise measurements.
5. Let the user revisit sessions to compare progress.

### Explicit non-goals for the first iteration

- Professional-grade or officiating-certified line-call precision.
- Guaranteed accurate calls from any angle, lighting condition, or phone position.
- Full autonomous analysis for every player simultaneously.
- Prescriptive declarations that a player's technique is universally right or wrong.
- Cloud-scale infrastructure, user accounts, or payments.

## 3. Proposed Technical Stack

| Component | Technology | Purpose |
|---|---|---|
| Local processing | Python | Computer vision orchestration and ML experiments |
| Video/image operations | OpenCV | Decoding, frame processing, court geometry, overlays |
| Modeling | PyTorch | Lightweight stroke classifier and optional ball detection model |
| Human pose | MediaPipe | Body landmarks and movement sequences |
| iPhone app | Swift and SwiftUI | Capture, setup, calibration UX, session controls |
| Watch app | Swift and SwiftUI | Receive/display calls and trigger haptic feedback |
| iPhone–Watch messaging | WatchConnectivity | Device-to-device communication |
| Local API/stream transport | To be selected and verified | Bridge between iPhone capture and Mac inference |
| Persistence | Local JSON/SQLite and video files (suggested) | Store runs, events, model outputs, and recordings |

**Important engineering distinction:** WatchConnectivity is not the same thing as arbitrary network communication from the Mac to a watch. Prototype the actual message path (for example, Mac processing -> iPhone -> Watch) and verify its responsiveness and platform constraints before relying on it. Avoid assuming notifications or background messaging are instantaneous.

## 4. Suggested Architecture

```text
Stationary iPhone behind baseline
  |-- Camera recording and session controls
  |-- Optional stream to Mac on local network
  |-- Receives call events from Mac
  `-- Forwards user-visible call events to Apple Watch
                              |
                              v
                    Apple Watch companion
                    - IN / OUT / UNCERTAIN
                    - Haptic feedback

Mac vision pipeline
  Video source -> Frame decoder -> Court calibration
                              -> Ball detections + tracking
                              -> Bounce candidate detection
                              -> Court-coordinate estimate
                              -> Call decision + confidence
                              -> Timed event stream / session log
                              -> Annotated video / review outputs

Post-session analysis
  Recorded video -> Player pose estimation
                 -> Temporal stroke classifier
                 -> Shot / body movement summaries
                 -> Session review
```

Treat this as a proposed modular architecture, not a claim that all components already exist.

## 5. Core Data Contracts (Suggested)

Use explicit, inspectable schemas so that different models can be replaced without rewriting the application.

```json
{
  "session_id": "example-session",
  "source_video": "path/or/source/reference",
  "fps": 30,
  "resolution": [1920, 1080],
  "camera_position": "stationary_behind_baseline",
  "calibration": {
    "image_points": [],
    "court_points": [],
    "homography": null,
    "status": "uncalibrated"
  }
}
```

```json
{
  "event_id": "bounce-0001",
  "session_id": "example-session",
  "timestamp_ms": 12345,
  "type": "bounce_candidate",
  "ball_image_xy": [0, 0],
  "estimated_court_xy": null,
  "bounce_confidence": 0.0,
  "call": "UNCERTAIN",
  "call_confidence": 0.0,
  "reason": "insufficient_evidence"
}
```

Coordinates, conventions, and confidence semantics must be documented before actual inference is integrated. The values above are placeholders, not results.

## 6. Workstreams and Implementation Order

### Phase 0: Repository and evaluation setup

- [ ] Create a clean Python project with reproducible dependencies and a documented startup command.
- [ ] Define directories for inputs, outputs, configuration, source code, tests, and experiments.
- [ ] Add basic logging and CPU/Apple Silicon runtime checks.
- [ ] Define frame, calibration, track, bounce, and call data structures.
- [ ] Add a small permitted test-video set and a method for recording ground-truth annotations.
- [ ] Establish metrics and a way to run repeatable evaluations.

**Deliverable:** A project that accepts a video path, reads metadata, iterates frames, and saves a basic machine-readable session report.

### Phase 1: Court and ball tracking

- [ ] Implement a manual court-line calibration tool first; evaluate automatic detection later.
- [ ] Map image coordinates to a defined court coordinate system, documenting geometric assumptions.
- [ ] Implement a ball detector baseline and visualize detections frame-by-frame.
- [ ] Track ball observations temporally, handling missed detections and implausible jumps.
- [ ] Export an annotated playback or video showing court geometry and ball trail.
- [ ] Record detector confidence and per-frame processing latency.

**Acceptance check:** Process at least one representative tennis recording end-to-end with inspectable court calibration, tracked ball positions, and timestamped output. This is not yet evidence of reliable line-call accuracy.

### Phase 2: Bounce detection and line calls

- [ ] Detect bounce candidates using temporal evidence, not a single isolated frame.
- [ ] Estimate landing position and uncertainty from surrounding frames.
- [ ] Compare the estimated landing location with the calibrated court and relevant boundaries.
- [ ] Implement configurable decision thresholds and `IN`, `OUT`, `UNCERTAIN` outputs.
- [ ] Flag occlusion, bad calibration, missing frames, and ambiguous contacts.
- [ ] Produce event timelines and an overlay of decisions for manual review.
- [ ] Compare calls against human-labeled ground truth and document failure cases.

**Acceptance check:** A repeatable evaluation script reports line-call agreement, uncertain-call frequency, failure examples, and per-event latency. Do not assign an accuracy percentage without data.

### Phase 3: Live iPhone and Apple Watch integration

- [ ] Build minimal iPhone UI for camera positioning, recording, and session state.
- [ ] Select and prototype a feasible transport for iPhone-to-Mac video/frames and Mac-to-iPhone event messages.
- [ ] Build minimal Watch UI for call events and haptics.
- [ ] Test the end-to-end Mac -> iPhone -> Watch path using **synthetic call events before connecting the vision model**.
- [ ] Handle dropped connections, retries, stale calls, duplicate events, and disconnection UI.
- [ ] Connect actual line-call event output only after the communication path is working.
- [ ] Measure capture-to-watch latency on real devices, including under realistic conditions.

**Acceptance check:** A live session can create a call event and display it on a paired Apple Watch with haptic feedback. Report measured end-to-end latency and delivery reliability, not merely successful isolated tests.

### Phase 4: Shot classification and biomechanics

- [ ] Extract pose landmarks from recorded sessions.
- [ ] Build or collect labeled examples of forehand, backhand, and serve sequences.
- [ ] Train a lightweight temporal classifier with PyTorch.
- [ ] Split evaluation data by video/session/player where possible, preventing near-duplicate frames leaking into test sets.
- [ ] Report per-class precision, recall, confusion matrix, and generalization limitations.
- [ ] Visualize selected movement patterns with confidence flags.
- [ ] Add post-session summaries for reliable events and measurements.

**Acceptance check:** A model evaluates on held-out footage and produces a basic review summarizing labeled strokes and relevant pose/shot observations.

### Phase 5: Reliability, performance, and demo

- [ ] Profile model runtime and memory on the M4 MacBook Air.
- [ ] Check accuracy under different lighting, players, and camera placement.
- [ ] Test calibration sensitivity to camera movement.
- [ ] Document known errors, uncertain cases, and minimum setup requirements.
- [ ] Package reproducible commands and a clear demo walkthrough.
- [ ] Compare completed work to the central research question and distinguish successes from limitations.

## 7. Key Risks and Required Mitigations

| Risk from original plan | Required mitigation |
|---|---|
| Ball is tiny and moves quickly | Evaluate suitable detectors and temporal tracking |
| Inaccurate single-camera line calls | Calibrate court, model trajectories, expose uncertainty |
| Slow multi-model inference | Measure throughput, select lightweight models, simplify processing |
| Delayed/unreliable watch events | Test messaging separately and instrument end-to-end latency |
| Camera angles vary | Require fixed behind-baseline setup; support manual calibration |
| Too little labeled data | Use suitable public data plus self-recorded and labeled footage |
| Pose occlusion / poor body estimates | Restrict claims to reliable, confidence-qualified measurements |
| Classifier overfits | Evaluate held-out videos, players, and conditions |
| Laptop compute constraints | Profile memory/compute; scale model size and resolution appropriately |
| Project scope is too broad | Finish an offline recording/line-call prototype before advanced analysis |

## 8. Evaluation Plan

The project needs measurements, not just a convincing demo.

- **Ball tracking:** Detection quality against annotated frames, missed detections, track continuity, and failures during motion blur/occlusion.
- **Court calibration:** Reprojection or mapped-point error and sensitivity to camera placement.
- **Bounce and line calls:** Accuracy/agreement on human-labeled bounce events, false calls, uncertain percentage, and results for close-to-line cases.
- **Live performance:** Frames per second, model runtime, end-to-end capture-to-watch event latency, dropped/duplicated messages.
- **Shot recognition:** Per-class precision/recall and confusion matrix on held-out footage.
- **Pose analysis:** Landmark confidence and explicit caveats where results are unreliable.

Avoid cherry-picking clips. Save failures and explain limitations, especially if one camera cannot resolve marginal line contacts.

## 9. UX Requirements

- Minimal actions to start a session.
- Clear guidance for behind-baseline camera placement and calibration.
- Recording status must always be visible.
- Watch notifications/haptics should be concise and distinguish uncertainty.
- Detailed stroke/pose information should be presented after the session.
- User should be able to inspect evidence for a given decision: timestamp, frame/clip, trajectory, and confidence.
- Respect that techniques vary by player; present patterns rather than categorical judgments.

## 10. Suggested Repository Layout

```text
tennis-ai/
  README.md
  PROJECT_SPEC.md
  pyproject.toml
  configs/
  data/
    samples/
    annotations/
  src/tennis_ai/
    video/
    court/
    ball/
    bounce/
    calls/
    pose/
    strokes/
    evaluation/
    reporting/
    transport/
  scripts/
  tests/
  outputs/
  ios/
    TennisRecorder/          # Future SwiftUI iPhone project
    TennisWatch/             # Future SwiftUI Watch project
```

This structure is a suggestion. Create only what is useful in the current phase; don't scaffold dozens of empty placeholder modules.

## 11. Coding Agent Operating Instructions

1. **Start with Phase 0, followed by an offline video-processing MVP.** Do not begin with the iOS/watch application or attempt all phases at once.
2. Inspect any existing repository before changing files. Preserve useful existing code and conventions.
3. Briefly describe the implementation approach and files to be changed, then implement the smallest end-to-end working vertical slice.
4. Prefer simple, testable baselines before introducing complex custom models.
5. Make modules modular: video decoding, court calibration, ball detection, tracking, bounce inference, and call decisions must have clear contracts.
6. Build CLI entry points and automated tests for functionality that can be tested without real video or Apple hardware.
7. Make key thresholds, paths, and model choices configurable.
8. Never manufacture accuracy figures, measured latencies, trained checkpoints, or sample detections.
9. If real datasets, pretrained weights, Xcode, an Apple Watch, or an iPhone are unavailable, state the blocker and keep development moving using honest synthetic/test fixtures.
10. After each phase, report exactly what runs, what was tested, what failed, and the next concrete task.
11. Keep a short `README.md` with setup, example commands, current limitations, and expected outputs.
12. Treat all model outputs, especially line calls, as estimates subject to verification.

## 12. Immediate First Assignment for Coding Agent

**Implement Phase 0 and the first offline video-processing vertical slice.**

The minimum requested outcome is a command such as:

```bash
python -m tennis_ai.video.process --input path/to/tennis.mp4 --output outputs/session_001
```

The implementation should:

1. Read the input video and validate that it is accessible.
2. Extract frame rate, resolution, duration, and frame count where available.
3. Sample or iterate frames in a predictable way.
4. Save a valid JSON session report with source information and timing metadata.
5. Produce a brief preview output or representative frames for visual inspection.
6. Include unit tests for metadata/schema handling and clear errors for missing/corrupted input.
7. Document installation and run commands on an M4 MacBook Air.
8. Explicitly list the next steps to add manual court calibration and baseline ball tracking.

**Definition of done:** A developer can clone the repo, install dependencies, run the CLI on a real tennis recording, inspect generated artifacts, and run tests successfully. Do not claim that ball detection or line calling works until actually implemented.

## 13. Source Alignment and Research Framing

This build should ultimately answer the original project's research question about useful tennis tracking on consumer devices. The original plan also emphasizes three critiques:

- **Fei-Fei Li (simulated critique):** Measure visual-model performance across conditions rather than relying on successful demos.
- **Roger Federer (simulated critique):** Prioritize feedback that actually helps players improve, not a flood of superficial metrics.
- **Steve Jobs (simulated critique):** Prioritize the simple recording + watch line-call workflow before accumulating features.

These were simulated perspectives in the original assignment, not authentic statements by those individuals.
