import React, { useState } from 'react';
import {
  Award,
  Activity,
  Zap,
  Layers,
  Calendar,
  Clock,
  Play,
  Upload,
  ArrowRight,
  Search,
  Video,
  FileQuestion,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { SessionSummary, SessionType, UserProfile } from '../types';

interface SessionHubViewProps {
  sessions: SessionSummary[];
  currentUser?: UserProfile;
  onSelectSession: (sessionId: string) => void;
  onOpenUpload: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export const SessionHubView: React.FC<SessionHubViewProps> = ({
  sessions,
  currentUser,
  onSelectSession,
  onOpenUpload,
  onDeleteSession,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | SessionType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const displaySessions: SessionSummary[] = sessions;

  const filtered = displaySessions.filter((s) => {
    const sType = s.session_type || 'match';
    if (filterType !== 'ALL' && sType !== filterType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.session_id.toLowerCase().includes(q) ||
        (s.display_id && s.display_id.toLowerCase().includes(q)) ||
        (s.player_name && s.player_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const matchCount = displaySessions.filter((s) => (s.session_type || 'match') === 'match').length;
  const rallyCount = displaySessions.filter((s) => s.session_type === 'rally').length;
  const serveCount = displaySessions.filter((s) => s.session_type === 'serve').length;
  const challengeCount = displaySessions.filter((s) => s.session_type === 'challenge').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 24px' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.8px' }}>
            Session Library
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0 }}>
            Structured breakdown of tournament sets, groundstroke rallies, and serve practices for{' '}
            <strong style={{ color: '#ffffff' }}>{currentUser?.name || 'Local Player'}</strong>.
          </p>
        </div>

        <button onClick={onOpenUpload} className="glass-btn-prominent">
          <Upload size={15} /> Upload Video Session
        </button>
      </div>

      {displaySessions.length === 0 ? (
        /* Empty State */
        <div
          className="apple-card"
          style={{
            padding: '56px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            marginTop: '12px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(48, 209, 88, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#30d158',
            }}
          >
            <Video size={32} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
            No Sessions Recorded for {currentUser?.name || 'You'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '440px', margin: 0, lineHeight: 1.6 }}>
            Upload your first tennis match, rally clip, or serve practice video to generate sub-millimeter Hawk-Eye line calls, step-by-step 3D trajectories, and MediaPipe biomechanics.
          </p>
          <button
            onClick={onOpenUpload}
            style={{
              marginTop: '8px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 700,
              borderRadius: '9999px',
              background: '#30d158',
              color: '#000000',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Upload size={16} /> Upload Video Footage
          </button>
        </div>
      ) : (
        <>
          {/* Liquid Glass Filter Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '28px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div className="glass-segmented">
              {(
                [
                  { id: 'ALL', label: 'All Sessions', count: displaySessions.length, icon: Layers },
                  { id: 'match', label: 'Matches', count: matchCount, icon: Award },
                  { id: 'rally', label: 'Rallies', count: rallyCount, icon: Activity },
                  { id: 'serve', label: 'Serve Practice', count: serveCount, icon: Zap },
                  { id: 'challenge', label: 'Challenges', count: challengeCount, icon: Sparkles },
                ] as const
              ).map((tab) => {
                const isSelected = filterType === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`glass-segmented-item ${isSelected ? 'active' : ''}`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                    <span
                      style={{
                        background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '9999px',
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Liquid Glass Search Capsule */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '9999px',
                padding: '7px 16px',
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.15)',
              }}
            >
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search sessions or players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  color: '#ffffff',
                  outline: 'none',
                  width: '220px',
                }}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
              <FileQuestion size={32} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
              <p style={{ margin: 0, fontSize: '15px' }}>
                No sessions matched your filter or search query.
              </p>
            </div>
          ) : (
            /* Grid of Apple Content Cards */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '22px' }}>
              {filtered.map((s) => {
                const sType = s.session_type || 'match';
                let accentColor = '#30d158';
                let badgeLabel = 'Tournament Match';
                if (sType === 'rally') {
                  accentColor = '#0a84ff';
                  badgeLabel = 'Baseline Rally';
                } else if (sType === 'serve') {
                  accentColor = '#ff9f0a';
                  badgeLabel = 'Serve Practice';
                } else if (sType === 'challenge') {
                  accentColor = '#ffd60a';
                  badgeLabel = 'Hawk-Eye Challenge';
                }

                return (
                  <div
                    key={s.session_id}
                    onClick={() => onSelectSession(s.session_id)}
                    className="apple-card"
                    style={{
                      padding: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Category & Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background: `${accentColor}18`,
                          color: accentColor,
                          border: `1px solid ${accentColor}35`,
                        }}
                      >
                        {badgeLabel}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '12px' }}>
                          <Calendar size={13} />
                          <span>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                        {onDeleteSession && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete session '${s.display_id || s.session_id}'?`)) {
                                onDeleteSession(s.session_id);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Delete session"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title & Player */}
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
                      {s.display_id || s.session_id}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
                      Player: <strong style={{ color: '#e2e8f0' }}>{s.player_name || currentUser?.name || 'Player'}</strong>
                    </div>

                    {/* Metrics Pill */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '20px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Duration</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                          {s.duration_sec.toFixed(1)}s
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Bounces</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: accentColor, marginTop: '2px' }}>
                          {s.total_events} shots
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Frame Rate</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                          {s.fps.toFixed(0)} FPS
                        </div>
                      </div>
                    </div>

                    {/* Line Calls Breakdown */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ color: '#30d158', fontWeight: 600 }}>✓ {s.in_calls} IN</span>
                        <span style={{ color: '#ff453a', fontWeight: 600 }}>✗ {s.out_calls} OUT</span>
                        {s.uncertain_calls > 0 && (
                          <span style={{ color: '#ff9f0a', fontWeight: 600 }}>? {s.uncertain_calls} UNCERTAIN</span>
                        )}
                      </div>

                      {s.has_annotated_video && (
                        <span style={{ fontSize: '11px', color: '#30d158', fontWeight: 600 }}>1080p Video</span>
                      )}
                    </div>

                    {/* Card Footer Button */}
                    <div
                      style={{
                        marginTop: 'auto',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: accentColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Replay in 3D Studio <ArrowRight size={14} />
                      </span>
                      <Play size={14} color="#6b7280" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
