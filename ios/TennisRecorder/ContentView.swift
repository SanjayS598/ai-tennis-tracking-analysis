//
//  ContentView.swift
//  TennisRecorder (iOS)
//
//  Main on-court view combining live camera viewfinder and SwingVision HUD.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var cameraManager = CameraManager()
    @StateObject private var client = WebSocketClient()
    @State private var serverAddress: String = "192.168.1.100:8765"
    @State private var showSettings: Bool = false

    var body: some View {
        ZStack {
            // Live Camera Viewfinder
            CameraPreviewView(captureSession: cameraManager.captureSession)
                .ignoresSafeArea()

            // SwingVision On-Court HUD Overlay
            LiveSessionHUD(cameraManager: cameraManager, client: client)

            // Settings Sheet Toggle Button (Top Right)
            VStack {
                HStack {
                    Spacer()
                    Button(action: { showSettings.toggle() }) {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.black.opacity(0.6))
                            .clipShape(Circle())
                    }
                }
                .padding(.top, 50)
                .padding(.trailing, 20)
                Spacer()
            }
        }
        .sheet(isPresented: $showSettings) {
            NavigationView {
                Form {
                    Section(header: Text("Inference Server Connection")) {
                        TextField("Host:Port (e.g. 192.168.1.100:8765)", text: $serverAddress)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)

                        Button(action: toggleConnection) {
                            Text(client.isConnected ? "Disconnect" : "Connect to Mac Server")
                                .foregroundColor(client.isConnected ? .red : .blue)
                        }
                    }

                    Section(header: Text("Match Configuration")) {
                        Text("Singles Line Calls: Active")
                        Text("Camera Position: Stationary Behind Baseline")
                        Text("Target Frame Rate: 1080p @ 60 FPS")
                    }
                }
                .navigationTitle("Session Settings")
                .navigationBarItems(trailing: Button("Done") { showSettings = false })
            }
        }
        .onAppear {
            if let url = URL(string: "ws://\(serverAddress)") {
                client.connect(to: url)
            }
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
}
