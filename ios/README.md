# Tennis AI: iOS & Apple Watch Companion (SwingVision Experience)

This folder contains the complete native iOS and watchOS application targets replicating the **SwingVision** on-court tracking and line-calling experience.

## App Capabilities

### iPhone Target (`ios/TennisRecorder/`)
- **1080p @ 60 FPS AVFoundation Camera Engine:** Optimized for fast-moving tennis balls with low motion blur.
- **SwingVision Court Alignment Guide:** On-screen trapezoidal court wireframe guide with integrated device motion pitch/roll level sensor to guarantee proper tripod alignment behind the baseline.
- **Live On-Court HUD:**
  - Real-time match timer and stream connection indicator.
  - Interactive on-court scorekeeping widget (User vs. Opponent points/games).
  - Immediate audio voice call synthesis (`AVSpeechSynthesizer`) announcing `"OUT!"`, `"IN!"`, or `"Check Mark"`.
- **High-Speed WebSocket Client:** Connects to Mac backend (`ws://<mac_ip>:8765` or `:8000/ws/live`).
- **Apple Watch Relay:** Forwards live call events to Apple Watch using `WatchConnectivity` with $<100\text{ ms}$ latency.

### Apple Watch Target (`ios/TennisWatch/`)
- **SwingVision Instant Line Call Flash:**
  - Full-screen high-contrast color cards:
    - **Bright Green:** `IN`
    - **Bright Crimson:** `OUT`
    - **Vivid Amber:** `CHALLENGE / UNCERTAIN`
- **Immediate Distinctive Haptics (`WKInterfaceDevice`):**
  - Crisp single tap for `IN`
  - Harsh double buzz for `OUT`
  - Staccato vibration for `UNCERTAIN`
- **Wrist Scoring & Shot Speed:** Tap top half to score point for User, bottom half for Opponent. Live shot speed (e.g. `82 MPH`).
- **HealthKit Workout:** Tracks active tennis session, keeps the watch display active during play, and monitors heart rate.

---

## On-Court Setup for Dry Run

1. **Mounting:** Mount the iPhone on a tripod or fence mount **~2 meters directly behind the baseline at ~1.5–2m height**, angled slightly down to capture the entire singles/doubles boundary lines.
2. **Alignment:** Open the app and adjust the tripod until the top badge reads `"CAMERA ALIGNED & LEVEL"` (green indicator).
3. **Connectivity:** Ensure your iPhone and Mac are on the same Wi-Fi network (or use your iPhone Personal Hotspot). Enter the Mac IP in Settings.
4. **Start Match:** Tap `"START MATCH"`. Line calls will be spoken aloud by the iPhone and vibrated onto your Apple Watch companion!
