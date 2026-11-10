//
//  AudioAnnouncementService.swift
//  TennisRecorder (iOS)
//
//  SwingVision-style real-time voice announcements on court.
//

import AVFoundation

public class AudioAnnouncementService: ObservableObject {
    public static let shared = AudioAnnouncementService()
    @Published public var isVoiceEnabled: Bool = true

    private let synthesizer = AVSpeechSynthesizer()

    private init() {
        configureAudioSession()
    }

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("[Audio] Session configuration error: \(error.localizedDescription)")
        }
    }

    public func announceCall(_ call: String) {
        guard isVoiceEnabled else { return }

        let textToSpeak: String
        switch call.uppercased() {
        case "OUT":
            textToSpeak = "Out!"
        case "IN":
            textToSpeak = "In!"
        case "UNCERTAIN":
            textToSpeak = "Check mark"
        default:
            return
        }

        let utterance = AVSpeechUtterance(string: textToSpeak)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 1.15
        utterance.pitchMultiplier = call == "OUT" ? 0.9 : 1.1
        utterance.volume = 1.0
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")

        synthesizer.stopSpeaking(at: .immediate)
        synthesizer.speak(utterance)
    }
}
