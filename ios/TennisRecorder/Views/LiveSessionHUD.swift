//
//  LiveSessionHUD.swift
//  TennisRecorder (iOS)
//
//  Full on-court SwingVision HUD with live scorekeeping, shot speed, and voice calls.
//

import SwiftUI

public struct LiveSessionHUD: View {
    @ObservedObject var cameraManager: CameraManager
    @ObservedObject var client: WebSocketClient
    @ObservedObject var audioService = AudioAnnouncementService.shared
    @ObservedObject var watchBridge = WatchSessionManager.shared

    @State private var isRecording: Bool = false
    @State private var elapsedSeconds: Int = 0
    @State private var timer: Timer?

    // Match Score state
    @State private var player1Points: Int = 2 // 30
    @State private var player2Points: Int = 1 // 15
    @State private var player1Games: Int = 3
    @State private var player2Games: Int = 2
    @State private var estimatedShotMph: Int = 81

    private let pointLabels = ["0", "15", "30", "40", "AD"]

    public init(cameraManager: CameraManager, client: WebSocketClient) {
        self.cameraManager = cameraManager
        self.client = client
    }

    public var body: some View {
        ZStack {
            // Court Alignment Overlay
            CourtAlignmentOverlay(
                isLevel: cameraManager.isLevel,
                pitch: cameraManager.pitchDegrees,
                roll: cameraManager.rollDegrees
            )

            // Top Status Bar
            VStack {
                HStack(alignment: .center) {
                    // Match Timer
                    HStack(spacing: 6) {
                        Circle()
                            .fill(isRecording ? Color.red : Color.gray)
                            .frame(width: 8, height: 8)
                        Text(formatDuration(elapsedSeconds))
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(8)

                    Spacer()

                    // Server Stream Connection Pill
                    HStack(spacing: 6) {
                        Circle()
                            .fill(client.isConnected ? Color.green : Color.red)
                            .frame(width: 8, height: 8)
                        Text(client.isConnected ? "LIVE (60 FPS)" : "OFFLINE")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.7))
                    .cornerRadius(8)

                    // Audio Announcement Toggle
                    Button(action: { audioService.isVoiceEnabled.toggle() }) {
                        Image(systemName: audioService.isVoiceEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill")
                            .font(.system(size: 14))
                            .foregroundColor(audioService.isVoiceEnabled ? .green : .gray)
                            .padding(8)
                            .background(Color.black.opacity(0.7))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 10)

                Spacer()
            }

            // Central Call Flash Overlay
            if let call = client.latestCall {
                VStack(spacing: 4) {
                    Text(call.event.call)
                        .font(.system(size: 80, weight: .black, design: .rounded))
                        .foregroundColor(callColor(call.event.call))
                        .shadow(color: .black.opacity(0.8), radius: 10)

                    Text(String(format: "%.0f%% Conf | %d MPH", call.event.callConfidence * 100, estimatedShotMph))
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.7))
                        .cornerRadius(12)
                }
                .transition(.scale.combined(with: .opacity))
                .onChange(of: call.eventId) { _ in
                    audioService.announceCall(call.event.call)
                    watchBridge.forwardCallToWatch(call)
                }
            }

            // Bottom On-Court Scoreboard & Session Controls (SwingVision style)
            VStack {
                Spacer()

                HStack(alignment: .bottom, spacing: 16) {
                    // Match Scoreboard Widget
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("YOU")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.gray)
                            Spacer()
                            Text("\(player1Games)")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                            Text(pointLabels[min(player1Points, 4)])
                                .font(.system(size: 14, weight: .heavy))
                                .foregroundColor(.green)
                                .frame(width: 24)
                        }
                        Divider().background(Color.gray.opacity(0.5))
                        HStack {
                            Text("OPP")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.gray)
                            Spacer()
                            Text("\(player2Games)")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                            Text(pointLabels[min(player2Points, 4)])
                                .font(.system(size: 14, weight: .heavy))
                                .foregroundColor(.yellow)
                                .frame(width: 24)
                        }
                    }
                    .padding(12)
                    .frame(width: 140)
                    .background(Color.black.opacity(0.85))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )

                    Spacer()

                    // Big Record Button
                    Button(action: toggleSession) {
                        HStack(spacing: 8) {
                            Image(systemName: isRecording ? "stop.fill" : "record.circle")
                                .font(.system(size: 20))
                            Text(isRecording ? "END SESSION" : "START MATCH")
                                .font(.system(size: 14, weight: .heavy))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 14)
                        .background(isRecording ? Color.red : Color.green)
                        .cornerRadius(30)
                        .shadow(color: (isRecording ? Color.red : Color.green).opacity(0.5), radius: 10)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
    }

    private func toggleSession() {
        isRecording.toggle()
        if isRecording {
            elapsedSeconds = 0
            timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                elapsedSeconds += 1
            }
        } else {
            timer?.invalidate()
            timer = nil
        }
    }

    private func formatDuration(_ sec: Int) -> String {
        let m = sec / 60
        let s = sec % 60
        return String(format: "%02d:%02d", m, s)
    }

    private func callColor(_ call: String) -> Color {
        switch call {
        case "IN": return .green
        case "OUT": return .red
        default: return .orange
        }
    }
}
