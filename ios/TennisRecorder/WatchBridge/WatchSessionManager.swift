//
//  WatchSessionManager.swift
//  TennisRecorder (iOS)
//
//  Relays received line call events to the paired Apple Watch via WatchConnectivity.
//

import Foundation
import WatchConnectivity

public class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {
    public static let shared = WatchSessionManager()

    @Published public var isWatchPaired: Bool = false
    @Published public var isWatchAppInstalled: Bool = false

    private override init() {
        super.init()
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    public func forwardCallToWatch(_ payload: LineCallPayload) {
        guard WCSession.isSupported(), WCSession.default.isReachable else {
            print("[WatchBridge] Watch not reachable. Storing in application context.")
            try? WCSession.default.updateApplicationContext([
                "call": payload.event.call,
                "confidence": payload.event.callConfidence,
                "haptic": payload.haptic,
                "timestamp": payload.timestampMs
            ])
            return
        }

        let message: [String: Any] = [
            "call": payload.event.call,
            "confidence": payload.event.callConfidence,
            "haptic": payload.haptic,
            "timestamp": payload.timestampMs
        ]

        WCSession.default.sendMessage(message, replyHandler: nil) { error in
            print("[WatchBridge] Delivery error: \(error.localizedDescription)")
        }
    }

    public func forwardChallengeVerdictToWatch(verdict: String, marginCm: Double, speedMph: Int) {
        let message: [String: Any] = [
            "type": "CHALLENGE_VERDICT",
            "call": verdict,
            "verdict": verdict,
            "margin_cm": marginCm,
            "speed": speedMph,
            "confidence": 0.98,
            "timestamp": Date().timeIntervalSince1970 * 1000.0
        ]

        if WCSession.isSupported() && WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: nil) { err in
                print("[WatchBridge] Challenge forward error: \(err.localizedDescription)")
            }
        } else if WCSession.isSupported() {
            try? WCSession.default.updateApplicationContext(message)
        }
    }

    // MARK: - WCSessionDelegate
    public func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        if let action = message["action"] as? String, action == "CHALLENGE" {
            DispatchQueue.main.async {
                CircularVideoBuffer.shared.triggerChallenge()
            }
        }
    }

    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isWatchPaired = session.isPaired
            self.isWatchAppInstalled = session.isWatchAppInstalled
        }
    }

    public func sessionDidBecomeInactive(_ session: WCSession) {}
    public func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
}
