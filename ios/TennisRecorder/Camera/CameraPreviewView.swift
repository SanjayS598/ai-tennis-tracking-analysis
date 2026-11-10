//
//  CameraPreviewView.swift
//  TennisRecorder (iOS)
//
//  UIKit AVFoundation video preview layer bridge for SwiftUI.
//

import AVFoundation
import SwiftUI

public struct CameraPreviewView: UIViewRepresentable {
    public let captureSession: AVCaptureSession

    public init(captureSession: AVCaptureSession) {
        self.captureSession = captureSession
    }

    public func makeUIView(context: Context) -> PreviewUIView {
        let view = PreviewUIView()
        view.previewLayer.session = captureSession
        view.previewLayer.videoGravity = .resizeAspectFill
        return view
    }

    public func updateUIView(_ uiView: PreviewUIView, context: Context) {}

    public class PreviewUIView: UIView {
        public override class var layerClass: AnyClass {
            return AVCaptureVideoPreviewLayer.self
        }

        public var previewLayer: AVCaptureVideoPreviewLayer {
            return layer as! AVCaptureVideoPreviewLayer
        }
    }
}
