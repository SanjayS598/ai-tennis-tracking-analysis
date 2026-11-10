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
} from 'lucide-react';
import { SessionSummary, SessionType } from '../types';

interface SessionHubViewProps {
  sessions: SessionSummary[];
  onSelectSession: (sessionId: string) => void;
  onOpenUpload: () => void;
}

export const SessionHubView: React.FC<SessionHubViewProps> = ({
  sessions,
  onSelectSession,
  onOpenUpload,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | SessionType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const displaySessions: SessionSummary[] = sessions.length > 0
    ? sessions
    : [
        {
          session_id: 'match_clip_1_full',
          display_id: 'US Open Final Warmup',
          session_type: 'match',
          player_name: 'Sanjay Shankar',
          created_at: new Date().toISOString(),
          source_video: 'data/samples/match_clip_1.mp4',
          duration_sec: 3.1,
          total_frames: 93,
          fps: 30.0,
          has_annotated_video: true,
          total_events: 2,
          in_calls: 1,
          out_calls: 1,
          uncertain_calls: 0,
        },
        {
          session_id: 'rally_baseline_crosscourt',
          display_id: 'Heavy Topspin Cross-Court Drills',
          session_type: 'rally',
          player_name: 'Sanjay Shankar',
          created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          source_video: 'data/samples/match_clip_2.mp4',
          duration_sec: 4.2,
          total_frames: 125,
          fps: 30.0,
          has_annotated_video: true,
          total_events: 4,
          in_calls: 3,
          out_calls: 1,
          uncertain_calls: 0,
        },
        {
          session_id: 'serve_speed_calibration',
          display_id: 'Flat First Serve Radar Calibration',
          session_type: 'serve',
          player_name: 'Sanjay Shankar',
          created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
          source_video: 'data/samples/sample_tennis.mp4',
          duration_sec: 2.0,
          total_frames: 60,
          fps: 30.0,
          has_annotated_video: true,
          total_events: 1,
          in_calls: 1,
          out_calls: 0,
          uncertain_calls: 0,
        },
      ];

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
            Structured breakdown of your tournament sets, groundstroke rallies, and serve practices.
          </p>
        </div>

        <button onClick={onOpenUpload} className="glass-btn-prominent">
          <Upload size={15} /> Upload Video Session
        </button>
      </div>

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

      {/* Grid of Apple Content Cards */}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '12px' }}>
                  <Calendar size={13} />
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Title & Player */}
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
                {s.display_id || s.session_id}
              </h3>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
                Player: <strong style={{ color: '#e2e8f0' }}>{s.player_name || 'Sanjay Shankar'}</strong>
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
    </div>
  );
};
