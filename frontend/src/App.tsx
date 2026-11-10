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
  User,
} from 'lucide-react';
import { DeviceStatusResponse, SessionReport, SessionSummary, UserProfile } from './types';
import {
  loadUserProfiles,
  getActiveUserProfile,
  setActiveUserId,
  saveUserProfiles,
} from './utils/userStorage';
import { LandingPage } from './components/LandingPage';
import { SessionHubView } from './components/SessionHubView';
import { MatchReview } from './components/MatchReview';
import { CourtCalibratorView } from './components/CourtCalibratorView';
import { LiveMonitorView } from './components/LiveMonitorView';
import { BiomechanicsView } from './components/BiomechanicsView';
import { UploadSessionModal } from './components/UploadSessionModal';
import { DeviceStatusModal } from './components/DeviceStatusModal';
import { UserProfileModal } from './components/UserProfileModal';
import { ErrorBoundary } from './components/ErrorBoundary';

export const App: React.FC = () => {
  const [view, setView] = useState<'LANDING' | 'APP'>('LANDING');
  const [activeTab, setActiveTab] = useState<'SESSIONS' | 'REPLAY' | 'CALIBRATE' | 'LIVE' | 'BIOMECHANICS'>('SESSIONS');

  // User Profile State (Local per-user storage)
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => loadUserProfiles());
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => getActiveUserProfile());
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);

  // Session Data State (Filtered by current user)
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<SessionReport | null>(null);

  // Hardware Status State
  const [devices, setDevices] = useState<DeviceStatusResponse | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);

  const fetchDevices = () => {
    fetch('/api/devices')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setDevices(data);
      })
      .catch(() => {});
  };

  // Poll device telemetry
  useEffect(() => {
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

  // Fetch sessions for active user
  const fetchSessionsForUser = (userId: string) => {
    fetch(`/api/sessions?user_id=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: SessionSummary[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setSessions(data);
          setSelectedSessionId(data[0].session_id);
        } else {
          setSessions([]);
          setSelectedSessionId('');
          setCurrentSession(null);
        }
      })
      .catch((err) => {
        console.warn('API /api/sessions error:', err);
        setSessions([]);
        setSelectedSessionId('');
        setCurrentSession(null);
      });
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchSessionsForUser(currentUser.id);
    }
  }, [currentUser?.id]);

  // Fetch detailed session report when selected session changes
  useEffect(() => {
    if (!selectedSessionId) {
      setCurrentSession(null);
      return;
    }
    fetch(`/api/sessions/${selectedSessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((report: SessionReport) => {
        if (report && report.video_metadata) {
          setCurrentSession(report);
        }
      })
      .catch((err) => {
        console.warn(`Could not load report for ${selectedSessionId}:`, err);
      });
  }, [selectedSessionId]);

  const handleSelectUser = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveUserId(user.id);
  };

  const handleSelectSessionAndReplay = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActiveTab('REPLAY');
  };

  const handleSessionCreated = (newSession: SessionReport) => {
    setCurrentSession(newSession);
    setSelectedSessionId(newSession.session_id);
    setActiveTab('REPLAY');
    if (currentUser?.id) {
      fetchSessionsForUser(currentUser.id);
    }
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

  const isIPhoneConnected = devices?.iphone?.connected ?? false;
  const isWatchConnected = devices?.watch?.connected ?? false;
  const isSearching = !isIPhoneConnected && !isWatchConnected;

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

            {/* Right Actions: Local User Profile, Hardware Pill & Upload Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Local User Profile Capsule */}
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="glass-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  color: '#ffffff',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer',
                }}
                title="Switch player profile (stored locally on this device)"
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0a84ff, #30d158)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#ffffff',
                  }}
                >
                  {currentUser.name[0]}
                </div>
                <span style={{ fontWeight: 600 }}>{currentUser.name}</span>
              </button>

              {/* Hardware Telemetry Capsule */}
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
                <Smartphone size={13} color={isIPhoneConnected ? '#30d158' : '#ff9f0a'} />
                <Watch size={13} color={isWatchConnected ? '#30d158' : '#86868b'} />
                <span style={{ fontSize: '11px', color: isSearching ? '#ff9f0a' : '#30d158' }}>
                  {isSearching ? 'Searching...' : (devices?.simulated_mode ? 'Demo Hardware' : 'Connected')}
                </span>
              </div>

              <button
                onClick={() => setIsUploadOpen(true)}
                className="glass-btn-prominent"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
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
              currentUser={currentUser}
              onSelectSession={handleSelectSessionAndReplay}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {activeTab === 'REPLAY' && (
            <MatchReview
              session={currentSession}
              sessionsList={sessions}
              onSelectSession={(id) => setSelectedSessionId(id)}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {activeTab === 'CALIBRATE' && (
            <CourtCalibratorView
              onCalibrationSaved={(pts) => console.log('Saved calibration points:', pts)}
            />
          )}

          {activeTab === 'LIVE' && <LiveMonitorView />}

          {activeTab === 'BIOMECHANICS' && (
            <BiomechanicsView
              session={currentSession}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}
        </main>

        {/* Upload Modal */}
        <UploadSessionModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSessionCreated={handleSessionCreated}
          currentUser={currentUser}
        />

        {/* Device Status Modal */}
        <DeviceStatusModal
          isOpen={isDeviceModalOpen}
          onClose={() => setIsDeviceModalOpen(false)}
          devices={devices}
          onRefreshDevices={fetchDevices}
          onToggleDeviceSimulation={handleToggleDeviceSimulation}
        />

        {/* User Profile Modal */}
        <UserProfileModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          currentUser={currentUser}
          allUsers={allUsers}
          onSelectUser={handleSelectUser}
          onUsersUpdated={(updated) => {
            setAllUsers(updated);
            saveUserProfiles(updated);
          }}
        />
      </div>
    </ErrorBoundary>
  );
};
