import React, { useState, useEffect } from 'react';
import {
  Activity,
  Target,
  UserCheck,
  Eye,
  Layers,
  Sparkles,
  Smartphone,
  Watch,
  Upload,
  ArrowLeft,
  Box,
} from 'lucide-react';
import { DeviceStatusResponse, SessionReport, SessionSummary } from './types';
import { LandingPage } from './components/LandingPage';
import { SessionHubView } from './components/SessionHubView';
import { MatchReview } from './components/MatchReview';
import { CourtCalibratorView } from './components/CourtCalibratorView';
import { LiveMonitorView } from './components/LiveMonitorView';
import { BiomechanicsView } from './components/BiomechanicsView';
import { UploadSessionModal } from './components/UploadSessionModal';
import { DeviceStatusModal } from './components/DeviceStatusModal';
import { ErrorBoundary } from './components/ErrorBoundary';

const DEMO_FALLBACK_SESSION: SessionReport = {
  session_id: 'session_demo_match',
  session_type: 'match',
  player_name: 'Sanjay Shankar',
  created_at: new Date().toISOString(),
  video_metadata: {
    source_video: 'data/samples/match_clip_1.mp4',
    fps: 30.0,
    width: 1920,
    height: 1080,
    total_frames: 93,
    duration_sec: 3.1,
  },
  camera_position: 'stationary_behind_baseline',
  calibration: {
    image_points: [
      { x: 467, y: 821 },
      { x: 1453, y: 821 },
      { x: 714, y: 268 },
      { x: 1206, y: 268 },
    ],
    court_points: [
      { x: 0, y: 0 },
      { x: 8.23, y: 0 },
      { x: 0, y: 23.77 },
      { x: 8.23, y: 23.77 },
    ],
    homography: null,
    status: 'manual',
  },
  events: [
    {
      event_id: 'bounce-0001',
      session_id: 'session_demo_match',
      frame_idx: 45,
      timestamp_ms: 1500,
      type: 'bounce_candidate',
      ball_image_xy: { x: 960, y: 780 },
      estimated_court_xy: { x: 4.12, y: 6.2 },
      bounce_confidence: 0.94,
      call: 'IN',
      call_confidence: 0.96,
      reason: 'cleanly_inside_court',
    },
    {
      event_id: 'bounce-0002',
      session_id: 'session_demo_match',
      frame_idx: 82,
      timestamp_ms: 2733,
      type: 'bounce_candidate',
      ball_image_xy: { x: 1550, y: 830 },
      estimated_court_xy: { x: 9.1, y: 0.2 },
      bounce_confidence: 0.88,
      call: 'OUT',
      call_confidence: 0.91,
      reason: 'past_singles_sideline (margin=12.4cm)',
    },
  ],
};

export const App: React.FC = () => {
  const [view, setView] = useState<'LANDING' | 'APP'>('LANDING');
  const [activeTab, setActiveTab] = useState<'SESSIONS' | 'REPLAY' | 'CALIBRATE' | 'LIVE' | 'BIOMECHANICS'>('SESSIONS');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('session_demo_match');
  const [currentSession, setCurrentSession] = useState<SessionReport>(DEMO_FALLBACK_SESSION);
  const [devices, setDevices] = useState<DeviceStatusResponse | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);

  const loadFallbackMock = () => {
    setCurrentSession(DEMO_FALLBACK_SESSION);
  };

  // Poll device status
  useEffect(() => {
    const fetchDevices = () => {
      fetch('/api/devices')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setDevices(data);
        })
        .catch(() => {});
    };

    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleDeviceSimulation = (device: string, connected: boolean) => {
    fetch(`/api/devices/simulate?device=${device}&connected=${connected}`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => setDevices(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetch('/api/sessions')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: SessionSummary[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setSessions(data);
          setSelectedSessionId(data[0].session_id);
        } else {
          loadFallbackMock();
        }
      })
      .catch((err) => {
        console.warn('API /api/sessions not available, running in standalone demo mode:', err);
        loadFallbackMock();
      });
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    fetch(`/api/sessions/${selectedSessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((report: SessionReport) => {
        if (report && report.video_metadata && report.video_metadata.fps) {
          setCurrentSession(report);
        } else {
          loadFallbackMock();
        }
      })
      .catch((err) => {
        console.warn(`Could not load report for ${selectedSessionId}:`, err);
        loadFallbackMock();
      });
  }, [selectedSessionId]);

  const handleSelectSessionAndReplay = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActiveTab('REPLAY');
  };

  const handleSessionCreated = (newSession: SessionReport) => {
    setCurrentSession(newSession);
    setSelectedSessionId(newSession.session_id);
    setActiveTab('REPLAY');

    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data: SessionSummary[]) => {
        if (Array.isArray(data)) setSessions(data);
      })
      .catch(() => {});
  };

  if (view === 'LANDING') {
    return (
      <ErrorBoundary>
        <LandingPage
          onLaunchApp={() => setView('APP')}
          devices={devices}
        />
      </ErrorBoundary>
    );
  }

  const isIPhoneConnected = devices?.iphone?.connected ?? true;
  const isWatchConnected = devices?.watch?.connected ?? true;

  return (
    <ErrorBoundary>
      <div className="app-container" style={{ minHeight: '100vh', background: '#000000', paddingBottom: '60px' }}>
        {/* Floating Liquid Glass Navigation Bar (Apple Style) */}
        <div
          style={{
            position: 'sticky',
            top: '16px',
            zIndex: 50,
            maxWidth: '1280px',
            margin: '0 auto',
            width: 'calc(100% - 32px)',
          }}
        >
          <header
            className="liquid-glass-capsule"
            style={{
              height: '62px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 20px',
            }}
          >
            {/* Brand & Home */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setView('LANDING')}
                className="glass-btn"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                title="Return to Product Showcase"
              >
                <ArrowLeft size={13} /> Home
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.25) 0%, rgba(48, 209, 88, 0.05) 100%)',
                    border: '1px solid rgba(48, 209, 88, 0.4)',
                    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  🎾
                </div>
                <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px', color: '#ffffff' }}>
                  Tennis AI
                </span>
              </div>
            </div>

            {/* Apple Native Glass Segmented Picker */}
            <div className="glass-segmented">
              <button
                onClick={() => setActiveTab('SESSIONS')}
                className={`glass-segmented-item ${activeTab === 'SESSIONS' ? 'active' : ''}`}
              >
                <Layers size={14} /> Library
              </button>

              <button
                onClick={() => setActiveTab('REPLAY')}
                className={`glass-segmented-item ${activeTab === 'REPLAY' ? 'active' : ''}`}
              >
                <Box size={14} /> 3D Replay
              </button>

              <button
                onClick={() => setActiveTab('CALIBRATE')}
                className={`glass-segmented-item ${activeTab === 'CALIBRATE' ? 'active' : ''}`}
              >
                <Target size={14} /> Calibrate
              </button>

              <button
                onClick={() => setActiveTab('LIVE')}
                className={`glass-segmented-item ${activeTab === 'LIVE' ? 'active' : ''}`}
              >
                <Activity size={14} /> Live Monitor
              </button>

              <button
                onClick={() => setActiveTab('BIOMECHANICS')}
                className={`glass-segmented-item ${activeTab === 'BIOMECHANICS' ? 'active' : ''}`}
              >
                <UserCheck size={14} /> Biomechanics
              </button>
            </div>

            {/* Right Actions: Hardware Pill & Upload Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                onClick={() => setIsDeviceModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  transition: 'background 0.2s',
                }}
                title="Apple Watch & iPhone companion telemetry"
              >
                <Smartphone size={13} color={isIPhoneConnected ? '#30d158' : '#6b7280'} />
                <Watch size={13} color={isWatchConnected ? '#30d158' : '#6b7280'} />
                <span style={{ fontSize: '11px', color: '#30d158' }}>Connected</span>
              </div>

              <button onClick={() => setIsUploadOpen(true)} className="glass-btn-prominent" style={{ padding: '8px 18px', fontSize: '13px' }}>
                <Upload size={14} /> Upload Video
              </button>
            </div>
          </header>
        </div>

        {/* Main Content Area */}
        <main style={{ marginTop: '24px' }}>
          {activeTab === 'SESSIONS' && (
            <SessionHubView
              sessions={sessions}
              onSelectSession={handleSelectSessionAndReplay}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {activeTab === 'REPLAY' && (
            <MatchReview
              session={currentSession}
              sessionsList={sessions}
              onSelectSession={(id) => setSelectedSessionId(id)}
            />
          )}

          {activeTab === 'CALIBRATE' && (
            <CourtCalibratorView
              onCalibrationSaved={(pts) => console.log('Saved calibration points:', pts)}
            />
          )}

          {activeTab === 'LIVE' && <LiveMonitorView />}

          {activeTab === 'BIOMECHANICS' && <BiomechanicsView />}
        </main>

        {/* Upload Modal */}
        <UploadSessionModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSessionCreated={handleSessionCreated}
        />

        {/* Device Status Modal */}
        <DeviceStatusModal
          isOpen={isDeviceModalOpen}
          onClose={() => setIsDeviceModalOpen(false)}
          devices={devices}
          onToggleDeviceSimulation={handleToggleDeviceSimulation}
        />
      </div>
    </ErrorBoundary>
  );
};
