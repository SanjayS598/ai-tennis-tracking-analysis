//
//  WebSocketClient.swift
//  TennisRecorder (iOS)
//
//  Subscribes to Mac Tennis AI real-time event stream.
//

import Foundation
import Combine

public struct LineCallPayload: Codable, Identifiable {
    public var id: String { eventId }
    public let type: String
    public let eventId: String
    public let sessionId: String
    public let timestampMs: Double
    public let serverTimeMs: Double
    public let haptic: String
    public let event: EventDetails

    enum CodingKeys: String, CodingKey {
        case type
        case eventId = "event_id"
        case sessionId = "session_id"
        case timestampMs = "timestamp_ms"
        case serverTimeMs = "server_time_ms"
        case haptic
        case event
    }

    public struct EventDetails: Codable {
        public let call: String
        public let callConfidence: Double
        public let reason: String

        enum CodingKeys: String, CodingKey {
            case call
            case callConfidence = "call_confidence"
            case reason
        }
    }
}

public class WebSocketClient: ObservableObject {
    @Published public var isConnected: Bool = false
    @Published public var latestCall: LineCallPayload?
    @Published public var measuredLatencyMs: Double = 0.0

    private var webSocketTask: URLSessionWebSocketTask?
    private let urlSession = URLSession(configuration: .default)

    public init() {}

    public func connect(to serverURL: URL) {
        disconnect()
        webSocketTask = urlSession.webSocketTask(with: serverURL)
        webSocketTask?.resume()
        isConnected = true
        listen()
    }

    public func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
    }

    private func listen() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .failure(let error):
                print("[WebSocket] Error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.isConnected = false
                }
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                // Continue listening
                self.listen()
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }
        let now = Date().timeIntervalSince1970 * 1000.0

        if let payload = try? JSONDecoder().decode(LineCallPayload.self, from: data) {
            DispatchQueue.main.async {
                self.latestCall = payload
                self.measuredLatencyMs = max(0.0, now - payload.serverTimeMs)
            }
        }
    }
}
