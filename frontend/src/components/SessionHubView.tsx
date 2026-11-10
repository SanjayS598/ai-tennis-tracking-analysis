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
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Filter,
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

  // Default demo items if list is empty
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
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '28px' }}>
      {/* Top Banner & Quick Upload Action */}
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
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Session Library
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
            Review your matches, rally consistency, and serve practice with 3D Hawk-Eye tracking.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
          }}
        >
          <Upload size={16} /> Upload Video Session
        </button>
      </div>

      {/* Filter Tabs Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#0b0f19',
          padding: '10px 18px',
          borderRadius: '14px',
          border: '1px solid #1f2937',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  background: isSelected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#111827',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                <span
                  style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#1f2937',
                    color: isSelected ? '#ffffff' : '#6b7280',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search by session name or player..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            color: '#f3f4f6',
            width: '280px',
            outline: 'none',
          }}
        />
      </div>

      {/* Sessions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
        {filtered.map((s) => {
          const sType = s.session_type || 'match';
          let badgeColor = '#10b981';
          let badgeLabel = '🏆 Match';
          if (sType === 'rally') {
            badgeColor = '#38bdf8';
            badgeLabel = '🎾 Rally';
          } else if (sType === 'serve') {
            badgeColor = '#f59e0b';
            badgeLabel = '⚡ Serve';
          }

          return (
            <div
              key={s.session_id}
              onClick={() => onSelectSession(s.session_id)}
              style={{
                background: '#0b0f19',
                border: '1px solid #1f2937',
                borderRadius: '16px',
                padding: '22px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = badgeColor;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 12px 30px rgba(0, 0, 0, 0.5)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1f2937';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: `${badgeColor}22`,
                    color: badgeColor,
                    border: `1px solid ${badgeColor}55`,
                    textTransform: 'uppercase',
                  }}
                >
                  {badgeLabel}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontSize: '12px' }}>
                  <Calendar size={13} />
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Title & Player */}
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                {s.display_id || s.session_id}
              </h3>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                Player: <strong style={{ color: '#e2e8f0' }}>{s.player_name || 'Sanjay Shankar'}</strong>
              </div>

              {/* Video & Shot Metrics Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  background: '#111827',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Duration</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f3f4f6', marginTop: '2px' }}>
                    {s.duration_sec.toFixed(1)}s
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Bounces</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
                    {s.total_events} shots
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Frame Rate</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#f3f4f6', marginTop: '2px' }}>
                    {s.fps.toFixed(0)} FPS
                  </div>
                </div>
              </div>

              {/* Line Calls Distribution Pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>
                    ✓ {s.in_calls} IN
                  </span>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>
                    ✗ {s.out_calls} OUT
                  </span>
                  {s.uncertain_calls > 0 && (
                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                      ? {s.uncertain_calls} UNCERTAIN
                    </span>
                  )}
                </div>

                {s.has_annotated_video && (
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                    1080p HD Ready
                  </span>
                )}
              </div>

              {/* Action Button */}
              <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: badgeColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Replay in 3D Studio <ArrowRight size={14} />
                </span>
                <Play size={16} color="#94a3b8" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
