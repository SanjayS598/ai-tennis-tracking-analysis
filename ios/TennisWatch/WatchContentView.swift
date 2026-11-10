//
//  WatchContentView.swift
//  TennisWatch (watchOS)
//
//  High-contrast on-court line call display with instant haptic notification.
//

import SwiftUI
import WatchKit
import WatchConnectivity

public class WatchReceiver: NSObject, ObservableObject, WCSessionDelegate {
    @Published public var currentCall: String = "READY"
    @Published public var confidence: Double = 1.0

    public override init() {
        super.init()
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    public func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        DispatchQueue.main.async {
            if let call = message["call"] as? String {
                self.currentCall = call
                self.confidence = (message["confidence"] as? Double) ?? 1.0
                self.triggerHaptic(for: call)
            }
        }
    }

    public func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        DispatchQueue.main.async {
            if let call = applicationContext["call"] as? String {
                self.currentCall = call
                self.confidence = (applicationContext["confidence"] as? Double) ?? 1.0
                self.triggerHaptic(for: call)
            }
        }
    }

    private func triggerHaptic(for call: String) {
        switch call {
        case "IN":
            WKInterfaceDevice.current().play(.success)
        case "OUT":
            WKInterfaceDevice.current().play(.failure)
        default:
            WKInterfaceDevice.current().play(.retry)
        }
    }
}

struct WatchContentView: View {
    @StateObject private var receiver = WatchReceiver()

    var body: some View {
        ZStack {
            backgroundColor(receiver.currentCall)
                .ignoresSafeArea()

            VStack(spacing: 4) {
                Text(receiver.currentCall)
                    .font(.system(size: 46, weight: .black))
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.5)

                if receiver.currentCall != "READY" {
                    Text(String(format: "%.0f%%", receiver.confidence * 100))
                        .font(.caption2)
                        .foregroundColor(.white.opacity(0.85))
                }
            }
        }
    }

    private func backgroundColor(_ call: String) -> Color {
        switch call {
        case "IN": return .green
        case "OUT": return .red
        case "UNCERTAIN": return .orange
        default: return .black
        }
    }
}
