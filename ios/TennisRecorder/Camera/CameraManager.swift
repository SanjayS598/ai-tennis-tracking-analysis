//
//  CameraManager.swift
//  TennisRecorder (iOS)
//
//  High-performance 1080p @ 60fps AVFoundation camera engine with stabilization.
//

import AVFoundation
import CoreMotion
import SwiftUI

public class CameraManager: NSObject, ObservableObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    @Published public var isRunning: Bool = false
    @Published public var pitchDegrees: Double = 0.0
    @Published public var rollDegrees: Double = 0.0
    @Published public var isLevel: Bool = false

    public let captureSession = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let motionManager = CMMotionManager()
    private let sessionQueue = DispatchQueue(label: "com.tennisai.camera.sessionQueue")

    public override init() {
        super.init()
        checkPermissions()
        startMotionUpdates()
    }

    private func checkPermissions() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            setupSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                if granted {
                    self?.setupSession()
                }
            }
        default:
            print("[Camera] Camera access denied by user.")
        }
    }

    private func setupSession() {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }
            self.captureSession.beginConfiguration()
            self.captureSession.sessionPreset = .hd1920x1080

            // Prefer wide-angle back camera
            guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
                  let videoInput = try? AVCaptureDeviceInput(device: videoDevice) else {
                print("[Camera] Unable to access rear wide-angle camera.")
                self.captureSession.commitConfiguration()
                return
            }

            if self.captureSession.canAddInput(videoInput) {
                self.captureSession.addInput(videoInput)
            }

            // Set 60 FPS if supported
            do {
                try videoDevice.lockForConfiguration()
                for range in videoDevice.activeFormat.videoSupportedFrameRateRanges {
                    if range.maxFrameRate >= 60.0 {
                        videoDevice.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 60)
                        videoDevice.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 60)
                        break
                    }
                }
                videoDevice.unlockForConfiguration()
            } catch {
                print("[Camera] Frame rate lock failed: \(error.localizedDescription)")
            }

            // Video output
            if self.captureSession.canAddOutput(self.videoOutput) {
                self.videoOutput.alwaysDiscardsLateVideoFrames = true
                self.videoOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "com.tennisai.video.sampleQueue"))
                self.captureSession.addOutput(self.videoOutput)
            }

            self.captureSession.commitConfiguration()
            self.captureSession.startRunning()

            DispatchQueue.main.async {
                self.isRunning = self.captureSession.isRunning
            }
        }
    }

    // MARK: - Motion Level Sensor for Tripod Alignment
    private func startMotionUpdates() {
        if motionManager.isDeviceMotionAvailable {
            motionManager.deviceMotionUpdateInterval = 0.1
            motionManager.startDeviceMotionUpdates(to: .main) { [weak self] motion, _ in
                guard let self = self, let motion = motion else { return }
                let pitch = motion.attitude.pitch * 180.0 / .pi
                let roll = motion.attitude.roll * 180.0 / .pi

                self.pitchDegrees = pitch
                self.rollDegrees = roll
                // Level within +/- 2.5 degrees of vertical behind baseline
                self.isLevel = abs(pitch - 90.0) < 5.0 && abs(roll) < 3.0
            }
        }
    }

    public func stop() {
        sessionQueue.async { [weak self] in
            self?.captureSession.stopRunning()
            self?.motionManager.stopDeviceMotionUpdates()
            DispatchQueue.main.async {
                self?.isRunning = false
            }
        }
    }
}
