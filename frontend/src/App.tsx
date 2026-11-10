import React, { useState, useEffect } from 'react';
import { Activity, Target, UserCheck, Eye, Layers, Sparkles } from 'lucide-react';
import { SessionReport, SessionSummary } from './types';
import { MatchReview } from './components/MatchReview';
import { CourtCalibratorView } from './components/CourtCalibratorView';
import { LiveMonitorView } from './components/LiveMonitorView';
import { BiomechanicsView } from './components/BiomechanicsView';
import { ErrorBoundary } from './components/ErrorBoundary';

const DEMO_FALLBACK_SESSION: SessionReport = {
  session_id: 'session_demo_match',
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
  const [activeTab, setActiveTab] = useState<'MATCH' | 'CALIBRATE' | 'LIVE' | 'BIOMECHANICS'>('MATCH');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('session_demo_match');
  const [currentSession, setCurrentSession] = useState<SessionReport>(DEMO_FALLBACK_SESSION);

  const loadFallbackMock = () => {
    setCurrentSession(DEMO_FALLBACK_SESSION);
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

  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* Top Navbar */}
        <header
          style={{
            height: '64px',
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
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#ffffff',
                fontSize: '20px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.45)',
              }}
            >
              🎾
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.3px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Tennis AI
                <span
                  style={{
                    color: '#10b981',
                    fontSize: '10px',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    letterSpacing: '0.5px',
                  }}
                >
                  PRO 3D
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Tracking, Line Calls & Biomechanics</div>
            </div>
          </div>

          {/* View Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('MATCH')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'MATCH' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'MATCH' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: activeTab === 'MATCH' ? '0 0 16px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Eye size={16} /> Match Analytics & 3D
            </button>

            <button
              onClick={() => setActiveTab('CALIBRATE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'CALIBRATE' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'CALIBRATE' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: activeTab === 'CALIBRATE' ? '0 0 16px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Target size={16} /> Court Calibrator
            </button>

            <button
              onClick={() => setActiveTab('LIVE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'LIVE' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'LIVE' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: activeTab === 'LIVE' ? '0 0 16px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Activity size={16} /> Live Watch Monitor
            </button>

            <button
              onClick={() => setActiveTab('BIOMECHANICS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: activeTab === 'BIOMECHANICS' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: activeTab === 'BIOMECHANICS' ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
                boxShadow: activeTab === 'BIOMECHANICS' ? '0 0 16px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <UserCheck size={16} /> Biomechanics Studio
            </button>
          </nav>

          {/* Session Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="#94a3b8" />
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{
                background: '#111827',
                color: '#f3f4f6',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {sessions.length === 0 ? (
                <option value="session_demo_match">Demo Session (Court Clip 1)</option>
              ) : (
                sessions.map((s) => (
                  <option key={s.session_id} value={s.session_id}>
                    {s.session_id} ({s.total_events} bounces)
                  </option>
                ))
              )}
            </select>
          </div>
        </header>

        {/* Main Tab Content */}
        <main style={{ flex: 1, paddingBottom: '32px' }}>
          {activeTab === 'MATCH' && (
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
      </div>
    </ErrorBoundary>
  );
};
