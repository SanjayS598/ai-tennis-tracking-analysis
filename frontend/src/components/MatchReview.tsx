import React, { useState } from 'react';
import { Play, Pause, FastForward, CheckCircle2, XCircle, HelpCircle, Eye, Box, Monitor, Sparkles } from 'lucide-react';
import { BounceEvent, SessionReport, SessionSummary } from '../types';
import { Court2DMinimap } from './Court2DMinimap';
import { Tennis3DVisualizer } from './Tennis3DVisualizer';

interface MatchReviewProps {
  session: SessionReport | null;
  sessionsList: SessionSummary[];
  onSelectSession: (sessionId: string) => void;
}

export const MatchReview: React.FC<MatchReviewProps> = ({
  session,
  sessionsList,
  onSelectSession,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<BounceEvent | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT' | 'UNCERTAIN'>('ALL');
  const [viewMode, setViewMode] = useState<'3D' | 'SPLIT'>('3D');

  const width = session?.video_metadata?.width ?? 1920;
  const height = session?.video_metadata?.height ?? 1080;
  const fps = session?.video_metadata?.fps ?? 30.0;
  const duration = session?.video_metadata?.duration_sec ?? 3.1;
  const totalFrames = session?.video_metadata?.total_frames ?? 93;
  const sessionId = session?.session_id ?? 'session_demo_match';

  const events = session?.events || [];
  const filteredEvents = events.filter((e) => {
    if (filter === 'ALL') return true;
    return e.call === filter;
  });

  const inCount = events.filter((e) => e.call === 'IN').length;
  const outCount = events.filter((e) => e.call === 'OUT').length;
  const uncertainCount = events.filter((e) => e.call === 'UNCERTAIN').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px' }}>
      {/* Session Metrics Bar (Apple Minimalist Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div className="apple-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session ID</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f3f4f6', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sessionId}
          </div>
        </div>

        <div className="apple-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Video Source</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f3f4f6', marginTop: '4px' }}>
            {width}x{height} @ {fps.toFixed(0)} FPS
          </div>
        </div>

        <div className="apple-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: '#30d158', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> IN Calls
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#30d158', marginTop: '2px' }}>
            {inCount}
          </div>
        </div>

        <div className="apple-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: '#ff453a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={12} /> OUT Calls
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#ff453a', marginTop: '2px' }}>
            {outCount}
          </div>
        </div>

        <div className="apple-card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', color: '#ff9f0a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HelpCircle size={12} /> UNCERTAIN
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#ff9f0a', marginTop: '2px' }}>
            {uncertainCount}
          </div>
        </div>
      </div>

      {/* Floating Liquid Glass View Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#30d158" />
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>Hawk-Eye Replay Studio</span>
        </div>

        <div className="glass-segmented">
          <button
            onClick={() => setViewMode('3D')}
            className={`glass-segmented-item ${viewMode === '3D' ? 'active' : ''}`}
          >
            <Box size={14} /> 3D Hawk-Eye Stadium
          </button>

          <button
            onClick={() => setViewMode('SPLIT')}
            className={`glass-segmented-item ${viewMode === 'SPLIT' ? 'active' : ''}`}
          >
            <Monitor size={14} /> Video & 2D Minimap
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === '3D' ? (
        <div style={{ marginBottom: '24px' }}>
          <Tennis3DVisualizer
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
          />
        </div>
      ) : (
        /* Video + Minimap Split Layout (Apple Style) */
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 310px 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Left: Video Player */}
          <div className="apple-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={16} color="#30d158" /> Annotated Match Playback
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {duration.toFixed(1)}s ({totalFrames} frames)
              </span>
            </div>

            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                background: '#000000',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <video
                src={`/api/sessions/${sessionId}/video`}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as any).style.display = 'none';
                }}
              />
            </div>

            <div style={{ marginTop: '14px', fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
              1080p overlay showing TrackNet deep neural network ball trajectory trail and sub-frame bounce contact circles.
            </div>
          </div>

          {/* Center: 2D Metric Court Minimap */}
          <div className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0', alignSelf: 'flex-start' }}>
              ITF 2D Metric Court
            </h3>
            <Court2DMinimap
              events={events}
              selectedEvent={selectedEvent}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              width={270}
              height={500}
            />
          </div>

          {/* Right: Bounce Events Log */}
          <div className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Bounces ({events.length})</h3>
              <div className="glass-segmented" style={{ padding: '2px' }}>
                {(['ALL', 'IN', 'OUT', 'UNCERTAIN'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilter(mode)}
                    className={`glass-segmented-item ${filter === mode ? 'active' : ''}`}
                    style={{ padding: '4px 8px', fontSize: '10px' }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#6b7280', fontSize: '13px' }}>
                  No bounce events recorded for this session.
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const isSelected = selectedEvent?.event_id === ev.event_id;
                  let badgeClass = 'badge-in';
                  if (ev.call === 'OUT') badgeClass = 'badge-out';
                  if (ev.call === 'UNCERTAIN') badgeClass = 'badge-uncertain';

                  return (
                    <div
                      key={ev.event_id}
                      onClick={() => setSelectedEvent(ev)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid rgba(48, 209, 88, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#f3f4f6' }}>{ev.event_id}</span>
                        <span className={badgeClass} style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                          {ev.call}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                        Frame #{ev.frame_idx} • {ev.timestamp_ms.toFixed(0)} ms
                      </div>

                      {ev.estimated_court_xy && (
                        <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                          Court: ({ev.estimated_court_xy.x.toFixed(2)}m, {ev.estimated_court_xy.y.toFixed(2)}m)
                        </div>
                      )}

                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                        {ev.reason} ({(ev.call_confidence * 100).toFixed(0)}% conf)
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
