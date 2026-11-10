//
//  ContentView.swift
//  TennisRecorder (iOS)
//
//  Main iPhone camera positioning, stream connection, and live call monitor.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var client = WebSocketClient()
    @StateObject private var watchBridge = WatchSessionManager.shared
    @State private var serverAddress: String = "192.168.1.100:8765"

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Connection Status Card
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Circle()
                            .fill(client.isConnected ? Color.green : Color.red)
                            .frame(width: 12, height: 12)
                        Text(client.isConnected ? "Connected to Mac Inference" : "Disconnected")
                            .font(.headline)
                    }

                    TextField("Server Host:Port", text: $serverAddress)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                        .disableAutocorrection(true)

                    Button(action: toggleConnection) {
                        Text(client.isConnected ? "Disconnect" : "Connect")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(client.isConnected ? Color.gray : Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                }
                .padding()
                .background(Color(UIColor.secondarySystemBackground))
                .cornerRadius(12)

                // Latest Line Call Banner
                if let call = client.latestCall {
                    VStack(spacing: 8) {
                        Text(call.event.call)
                            .font(.system(size: 64, weight: .black))
                            .foregroundColor(callColor(call.event.call))

                        Text(String(format: "Confidence: %.0f%% | Latency: %.0f ms", call.event.callConfidence * 100, client.measuredLatencyMs))
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        Text(call.event.reason)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(UIColor.tertiarySystemBackground))
                    .cornerRadius(16)
                    .onChange(of: call.eventId) { _ in
                        watchBridge.forwardCallToWatch(call)
                    }
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "tennis.racket")
                            .font(.system(size: 48))
                            .foregroundColor(.gray)
                        Text("Waiting for ball bounce events...")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: 180)
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Tennis AI Live")
        }
    }

    private func toggleConnection() {
        if client.isConnected {
            client.disconnect()
        } else {
            if let url = URL(string: "ws://\(serverAddress)") {
                client.connect(to: url)
            }
        }
    }

    private func callColor(_ call: String) -> Color {
        switch call {
        case "IN": return .green
        case "OUT": return .red
        default: return .orange
        }
    }
}
