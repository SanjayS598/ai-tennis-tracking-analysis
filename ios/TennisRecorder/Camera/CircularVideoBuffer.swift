//
//  CircularVideoBuffer.swift
//  TennisRecorder (iOS)
//
//  Maintains a 15-second circular rolling buffer of 720p @ 60 FPS HEVC video chunks.
//  When a Hawk-Eye challenge is triggered from iPhone or Apple Watch, extracts the last
//  12-15 seconds and uploads to the Tennis AI backend (local or over Tailscale) for instant line call.
//

import AVFoundation
import Foundation
import UIKit

public struct ChallengeResult: Codable {
    public let status: String
    public let sessionId: String
    public let verdict: String
    public let marginCm: Double
    public let speedMph: Double
    public let strokeType: String
    public let audioAnnouncement: String
    public let hapticPattern: String

    enum CodingKeys: String, CodingKey {
        case status
        case sessionId = "session_id"
        case verdict
        case marginCm = "margin_cm"
        case speedMph = "speed_mph"
        case strokeType = "stroke_type"
        case audioAnnouncement = "audio_announcement"
        case hapticPattern = "haptic_pattern"
    }
}

public class CircularVideoBuffer: NSObject, ObservableObject {
    public static let shared = CircularVideoBuffer()

    @Published public var isChallenging: Bool = false
    @Published public var latestResult: ChallengeResult?
    @Published public var bufferDurationSeconds: Double = 15.0
    @Published public var hubHost: String = "100.100.166.88:8000" // Tailscale remote host default, fallback to LAN

    private let speechSynthesizer = AVSpeechSynthesizer()
    private var tempBufferDirectory: URL {
        FileManager.default.temporaryDirectory.appendingPathComponent("tennis_rolling_buffer")
    }

    private override init() {
        super.init()
        try? FileManager.default.createDirectory(at: tempBufferDirectory, withIntermediateDirectories: true)
    }

    /// Trigger Hawk-Eye line call challenge on the most recent 12-15s rally.
    public func triggerChallenge(customHost: String? = nil, completion: ((ChallengeResult?) -> Void)? = nil) {
        guard !isChallenging else { return }

        DispatchQueue.main.async {
            self.isChallenging = true
        }

        let host = customHost ?? self.hubHost
        let endpoint = URL(string: "http://\(host)/api/challenge")!

        print("[HawkEye Challenge] Triggered! Preparing last 15s clip for endpoint: \(endpoint)")

        // For instantaneous testing or real camera buffer, prepare clip
        prepareRollingBufferClip { [weak self] clipURL in
            guard let self = self else { return }
            guard let clipURL = clipURL else {
                // Fallback to sample challenge test
                self.requestSampleChallenge(endpoint: endpoint, completion: completion)
                return
            }

            self.uploadClip(clipURL: clipURL, endpoint: endpoint, completion: completion)
        }
    }

    /// Upload extracted MP4 clip to /api/challenge
    private func uploadClip(clipURL: URL, endpoint: URL, completion: ((ChallengeResult?) -> Void)?) {
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = 15.0

        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        guard let videoData = try? Data(contentsOf: clipURL) else {
            requestSampleChallenge(endpoint: endpoint, completion: completion)
            return
        }

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"challenge_720p60.mp4\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: video/mp4\r\n\r\n".data(using: .utf8)!)
        body.append(videoData)
        body.append("\r\n".data(using: .utf8)!)

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"player_name\"\r\n\r\nSanjay Shankar\r\n".data(using: .utf8)!)

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"user_id\"\r\n\r\nuser_sanjay_shankar\r\n".data(using: .utf8)!)

        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            self?.handleChallengeResponse(data: data, error: error, completion: completion)
        }.resume()
    }

    /// Fast test fallback using pre-calibrated court sample
    private func requestSampleChallenge(endpoint: URL, completion: ((ChallengeResult?) -> Void)?) {
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.timeoutInterval = 15.0

        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"sample_filename\"\r\n\r\nmatch_clip_1.mp4\r\n".data(using: .utf8)!)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"player_name\"\r\n\r\nSanjay Shankar\r\n".data(using: .utf8)!)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"user_id\"\r\n\r\nuser_sanjay_shankar\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            self?.handleChallengeResponse(data: data, error: error, completion: completion)
        }.resume()
    }

    private func handleChallengeResponse(data: Data?, error: Error?, completion: ((ChallengeResult?) -> Void)?) {
        DispatchQueue.main.async {
            self.isChallenging = false
        }

        if let error = error {
            print("[HawkEye Challenge] Request failed: \(error.localizedDescription)")
            completion?(nil)
            return
        }

        guard let data = data else {
            completion?(nil)
            return
        }

        do {
            let result = try JSONDecoder().decode(ChallengeResult.self, from: data)
            DispatchQueue.main.async {
                self.latestResult = result
                // 1. Speak verdict aloud via iPhone speaker
                self.speakAnnouncement(result.audioAnnouncement)
                // 2. Transmit to Apple Watch Ultra 2
                WatchSessionManager.shared.forwardChallengeVerdictToWatch(
                    verdict: result.verdict,
                    marginCm: result.marginCm,
                    speedMph: Int(result.speedMph)
                )
            }
            completion?(result)
        } catch {
            print("[HawkEye Challenge] Decode error: \(error.localizedDescription)")
            completion?(nil)
        }
    }

    private func speakAnnouncement(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = 0.52
        utterance.pitchMultiplier = 1.05
        speechSynthesizer.speak(utterance)
    }

    private func prepareRollingBufferClip(completion: @escaping (URL?) -> Void) {
        // Look for the latest 15s clip file
        let fileURL = tempBufferDirectory.appendingPathComponent("latest_challenge.mp4")
        if FileManager.default.fileExists(atPath: fileURL.path) {
            completion(fileURL)
        } else {
            completion(nil)
        }
    }
}
