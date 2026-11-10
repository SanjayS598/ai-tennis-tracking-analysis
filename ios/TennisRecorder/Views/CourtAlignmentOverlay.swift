//
//  CourtAlignmentOverlay.swift
//  TennisRecorder (iOS)
//
//  SwingVision-style camera positioning guide and tripod leveling indicator.
//

import SwiftUI

public struct CourtAlignmentOverlay: View {
    public let isLevel: Bool
    public let pitch: Double
    public let roll: Double

    public init(isLevel: Bool, pitch: Double, roll: Double) {
        self.isLevel = isLevel
        self.pitch = pitch
        self.roll = roll
    }

    public var body: some View {
        ZStack {
            // Perspective Court Alignment Wireframe Guide
            GeometryReader { geo in
                let w = geo.size.width
                let h = geo.size.height

                Path { path in
                    // Near baseline guide (bottom)
                    path.move(to: CGPoint(x: w * 0.15, y: h * 0.82))
                    path.addLine(to: CGPoint(x: w * 0.85, y: h * 0.82))

                    // Left sideline guide
                    path.addLine(to: CGPoint(x: w * 0.65, y: h * 0.30))

                    // Far baseline guide (top)
                    path.addLine(to: CGPoint(x: w * 0.35, y: h * 0.30))

                    // Right sideline guide
                    path.closeSubpath()

                    // Service line guide
                    path.move(to: CGPoint(x: w * 0.23, y: h * 0.62))
                    path.addLine(to: CGPoint(x: w * 0.77, y: h * 0.62))

                    // Net line guide
                    path.move(to: CGPoint(x: w * 0.28, y: h * 0.48))
                    path.addLine(to: CGPoint(x: w * 0.72, y: h * 0.48))
                }
                .stroke(
                    isLevel ? Color.green.opacity(0.8) : Color.yellow.opacity(0.6),
                    style: StrokeStyle(lineWidth: 2, dash: [6, 4])
                )
            }

            // Tripod Level & Alignment Badge (Top Center)
            VStack {
                HStack(spacing: 8) {
                    Circle()
                        .fill(isLevel ? Color.green : Color.orange)
                        .frame(width: 10, height: 10)

                    Text(isLevel ? "CAMERA ALIGNED & LEVEL" : "ALIGN TO COURT BASELINE")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(Color.black.opacity(0.75))
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(isLevel ? Color.green : Color.orange, lineWidth: 1)
                )

                Spacer()
            }
            .padding(.top, 16)
        }
    }
}
