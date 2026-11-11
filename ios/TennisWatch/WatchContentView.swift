//
//  WatchContentView.swift
//  TennisWatch (watchOS)
//
//  SwingVision copycat Apple Watch companion: instant haptic line calls,
//  wrist scoring, shot speed, and HealthKit tennis workout tracking.
//

import SwiftUI
import WatchKit
import WatchConnectivity

public class WatchReceiver: NSObject, ObservableObject, WCSessionDelegate {
    @Published public var currentCall: String = "READY"
    @Published public var confidence: Double = 1.0
    @Published public var shotSpeedMph: Int = 78
    @Published public var heartRateBpm: Int = 142
    @Published public var marginCm: Double = 0.0
    @Published public var isChallenging: Bool = false

    public override init() {
        super.init()
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }

    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    public func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async {
            self.isChallenging = false
            if let call = (message["verdict"] as? String) ?? (message["call"] as? String) {
                self.currentCall = call
                self.confidence = (message["confidence"] as? Double) ?? 1.0
                if let speed = message["speed"] as? Int {
                    self.shotSpeedMph = speed
                }
                if let margin = message["margin_cm"] as? Double {
                    self.marginCm = margin
                }
                self.triggerHaptic(for: call)
            }
        }
    }

    public func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.isChallenging = false
            if let call = (applicationContext["verdict"] as? String) ?? (applicationContext["call"] as? String) {
                self.currentCall = call
                self.confidence = (applicationContext["confidence"] as? Double) ?? 1.0
                if let margin = applicationContext["margin_cm"] as? Double {
                    self.marginCm = margin
                }
                self.triggerHaptic(for: call)
            }
        }
    }

    public func requestChallenge() {
        self.isChallenging = true
        WKInterfaceDevice.current().play(.click)
        guard WCSession.isSupported(), WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["action": "CHALLENGE"], replyHandler: nil) { [weak self] err in
            print("[Watch] Challenge send error: \(err.localizedDescription)")
            DispatchQueue.main.async {
                self?.isChallenging = false
            }
        }
    }

    public func triggerHaptic(for call: String) {
        switch call.uppercased() {
        case "IN":
            WKInterfaceDevice.current().play(.success)
        case "OUT":
            // Harsh buzz for out
            WKInterfaceDevice.current().play(.failure)
        default:
            // Staccato retry tap for challenge
            WKInterfaceDevice.current().play(.retry)
        }
    }
}

struct WatchContentView: View {
    @StateObject private var receiver = WatchReceiver()
    @State private var selectedTab: Int = 0

    // Wrist score state (SwingVision wrist scoring)
    @State private var userPoints: Int = 0
    @State private var opponentPoints: Int = 0
    @State private var userGames: Int = 3
    @State private var opponentGames: Int = 2
    private let pointLabels = ["0", "15", "30", "40", "AD"]

    var body: some View {
        TabView(selection: $selectedTab) {
            // TAB 1: Live Line Call & Instant Hawk-Eye Challenge
            ZStack {
                backgroundColor(receiver.currentCall)
                    .ignoresSafeArea()

                VStack(spacing: 4) {
                    if receiver.isChallenging {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .yellow))
                        Text("Judging 15s Rally...")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.yellow)
                    } else {
                        Text(receiver.currentCall)
                            .font(.system(size: 42, weight: .black, design: .rounded))
                            .foregroundColor(.white)
                            .minimumScaleFactor(0.6)

                        if receiver.currentCall != "READY" {
                            HStack(spacing: 4) {
                                Text(String(format: "%+.1f cm", receiver.marginCm))
                                    .font(.system(size: 11, weight: .heavy))
                                    .foregroundColor(.yellow)
                                Text("|")
                                    .foregroundColor(.gray)
                                Text("\(receiver.shotSpeedMph) MPH")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white.opacity(0.9))
                            }
                        } else {
                            Text("720p60 Buffer Armed")
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }

                        // Wrist-Activated Hawk-Eye Challenge Button
                        Button(action: { receiver.requestChallenge() }) {
                            HStack(spacing: 4) {
                                Image(systemName: "eye.trianglebadge.exclamationmark")
                                    .font(.system(size: 11, weight: .bold))
                                Text("CHALLENGE")
                                    .font(.system(size: 11, weight: .heavy))
                            }
                            .foregroundColor(.black)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.yellow)
                            .cornerRadius(12)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .padding(.top, 4)
                    }
                }
            }
            .tag(0)

            // TAB 2: Wrist Scoring & Match Scorekeeper
            VStack(spacing: 4) {
                // User Score Touch Button
                Button(action: { incrementUserScore() }) {
                    HStack {
                        Text("YOU")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.green)
                        Spacer()
                        Text("\(userGames)")
                            .font(.system(size: 14, weight: .bold))
                        Text(pointLabels[min(userPoints, 4)])
                            .font(.system(size: 20, weight: .heavy))
                            .foregroundColor(.green)
                    }
                    .padding(.horizontal, 10)
                }
                .buttonStyle(PlainButtonStyle())
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.green.opacity(0.15))
                .cornerRadius(10)

                // Opponent Score Touch Button
                Button(action: { incrementOpponentScore() }) {
                    HStack {
                        Text("OPP")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.yellow)
                        Spacer()
                        Text("\(opponentGames)")
                            .font(.system(size: 14, weight: .bold))
                        Text(pointLabels[min(opponentPoints, 4)])
                            .font(.system(size: 20, weight: .heavy))
                            .foregroundColor(.yellow)
                    }
                    .padding(.horizontal, 10)
                }
                .buttonStyle(PlainButtonStyle())
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.yellow.opacity(0.15))
                .cornerRadius(10)
            }
            .tag(1)

            // TAB 3: Tennis Workout & Health
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: "heart.fill")
                        .foregroundColor(.red)
                    Text("\(receiver.heartRateBpm) BPM")
                        .font(.headline)
                }

                HStack {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                    Text("312 CAL")
                        .font(.subheadline)
                }

                Text("Tennis Workout Active")
                    .font(.caption2)
                    .foregroundColor(.green)
            }
            .tag(2)
        }
        .tabViewStyle(PageTabViewStyle())
    }

    private func incrementUserScore() {
        WKInterfaceDevice.current().play(.click)
        if userPoints >= 3 && userPoints > opponentPoints {
            userGames += 1
            userPoints = 0
            opponentPoints = 0
        } else {
            userPoints += 1
        }
    }

    private func incrementOpponentScore() {
        WKInterfaceDevice.current().play(.click)
        if opponentPoints >= 3 && opponentPoints > userPoints {
            opponentGames += 1
            userPoints = 0
            opponentPoints = 0
        } else {
            opponentPoints += 1
        }
    }

    private func backgroundColor(_ call: String) -> Color {
        switch call.uppercased() {
        case "IN": return Color(red: 0.05, green: 0.65, blue: 0.3)
        case "OUT": return Color(red: 0.85, green: 0.15, blue: 0.15)
        case "UNCERTAIN": return Color(red: 0.9, green: 0.55, blue: 0.05)
        default: return Color.black
        }
    }
}
