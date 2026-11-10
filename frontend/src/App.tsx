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

  // Toggle device simulation
  const handleToggleDeviceSimulation = (device: string, connected: boolean) => {
    fetch(`/api/devices/simulate?device=${device}&connected=${connected}`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => setDevices(data))
      .catch(() => {});
  };

  // Load available sessions from API
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

  // When selectedSessionId changes, load full report
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

    // Refresh sessions list
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data: SessionSummary[]) => {
        if (Array.isArray(data)) setSessions(data);
      })
      .catch(() => {});
  };

  // If user is on landing page, display 3D tennis ball scroll experience
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
      <div className="app-container">
        {/* Top Navbar */}
        <header
          style={{
            height: '66px',
            background: 'rgba(11, 15, 25, 0.95)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid #1f2937',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          {/* Logo & Return to Landing */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => setView('LANDING')}
              style={{
                background: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Return to Product Showcase"
            >
              <ArrowLeft size={14} /> Home
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  color: '#ffffff',
                  fontSize: '18px',
                  boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)',
                }}
              >
                🎾
              </div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#ffffff' }}>
                Tennis AI <span style={{ color: '#10b981', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>PRO</span>
              </div>
            </div>
          </div>

          {/* View Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('SESSIONS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'SESSIONS' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'SESSIONS' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: activeTab === 'SESSIONS' ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
              }}
            >
              <Layers size={15} /> Session Library
            </button>

            <button
              onClick={() => setActiveTab('REPLAY')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'REPLAY' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'REPLAY' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: activeTab === 'REPLAY' ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
              }}
            >
              <Box size={15} /> 3D Hawk-Eye Replay
            </button>

            <button
              onClick={() => setActiveTab('CALIBRATE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'CALIBRATE' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'CALIBRATE' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: activeTab === 'CALIBRATE' ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
              }}
            >
              <Target size={15} /> Court Calibrator
            </button>

            <button
              onClick={() => setActiveTab('LIVE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'LIVE' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'LIVE' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: activeTab === 'LIVE' ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
              }}
            >
              <Activity size={15} /> Live Watch Monitor
            </button>

            <button
              onClick={() => setActiveTab('BIOMECHANICS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'BIOMECHANICS' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'BIOMECHANICS' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: activeTab === 'BIOMECHANICS' ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
              }}
            >
              <UserCheck size={15} /> Biomechanics
            </button>
          </nav>

          {/* Right Header Actions: Device Status & Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Device Hardware Pills (Clickable to open Device Modal) */}
            <div
              onClick={() => setIsDeviceModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '20px',
                padding: '5px 12px',
                cursor: 'pointer',
              }}
              title="Click to view Apple Watch & iPhone connection details"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#cbd5e1' }}>
                <Smartphone size={13} color={isIPhoneConnected ? '#34d399' : '#6b7280'} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isIPhoneConnected ? '#10b981' : '#6b7280' }} />
              </div>
              <div style={{ width: 1, height: 12, background: '#374151' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#cbd5e1' }}>
                <Watch size={13} color={isWatchConnected ? '#34d399' : '#6b7280'} />
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isWatchConnected ? '#10b981' : '#6b7280' }} />
              </div>
            </div>

            {/* Upload Button */}
            <button
              onClick={() => setIsUploadOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 0 14px rgba(16, 185, 129, 0.4)',
              }}
            >
              <Upload size={14} /> Upload Video
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, paddingBottom: '32px' }}>
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
