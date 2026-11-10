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
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* Session Header Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ background: '#0b0f19', padding: '14px 18px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session ID</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f3f4f6', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sessionId}
          </div>
        </div>

        <div style={{ background: '#0b0f19', padding: '14px 18px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Video Source</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f3f4f6', marginTop: '2px' }}>
            {width}x{height} @ {fps.toFixed(0)} FPS
          </div>
        </div>

        <div style={{ background: '#0b0f19', padding: '14px 18px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <div style={{ fontSize: '11px', color: '#34d399', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> IN Calls
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
            {inCount}
          </div>
        </div>

        <div style={{ background: '#0b0f19', padding: '14px 18px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <div style={{ fontSize: '11px', color: '#f87171', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={12} /> OUT Calls
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
            {outCount}
          </div>
        </div>

        <div style={{ background: '#0b0f19', padding: '14px 18px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <div style={{ fontSize: '11px', color: '#fbbf24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HelpCircle size={12} /> UNCERTAIN
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
            {uncertainCount}
          </div>
        </div>
      </div>

      {/* View Mode Toggle Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          background: '#0b0f19',
          padding: '10px 18px',
          borderRadius: '12px',
          border: '1px solid #1f2937',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#10b981" />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Display Mode</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('3D')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: viewMode === '3D' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#1f2937',
              color: viewMode === '3D' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              boxShadow: viewMode === '3D' ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
            }}
          >
            <Box size={16} /> 3D Hawk-Eye Stadium (Three.js)
          </button>

          <button
            onClick={() => setViewMode('SPLIT')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: viewMode === 'SPLIT' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#1f2937',
              color: viewMode === 'SPLIT' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              boxShadow: viewMode === 'SPLIT' ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
            }}
          >
            <Monitor size={16} /> Video & 2D Minimap
          </button>
        </div>
      </div>

      {/* Dynamic View Area */}
      {viewMode === '3D' ? (
        <div style={{ marginBottom: '24px' }}>
          <Tennis3DVisualizer
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
          />
        </div>
      ) : (
        /* Video + Minimap Split Layout */
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 320px 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Left: Video Player */}
          <div style={{ background: '#0b0f19', padding: '16px', borderRadius: '14px', border: '1px solid #1f2937' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={18} color="#10b981" /> Annotated Match Playback
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
                borderRadius: '8px',
                overflow: 'hidden',
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
              Video overlay includes: (1) TrackNet deep neural network ball trajectory trail, (2) Calibrated court wireframe, (3) Sub-frame bounce location ring.
            </div>
          </div>

          {/* Center: 2D Metric Court Minimap */}
          <div style={{ background: '#0b0f19', padding: '16px', borderRadius: '14px', border: '1px solid #1f2937', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0', alignSelf: 'flex-start' }}>
              ITF 2D Metric Court
            </h3>
            <Court2DMinimap
              events={events}
              selectedEvent={selectedEvent}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              width={280}
              height={520}
            />
          </div>

          {/* Right: Bounce Events Log */}
          <div style={{ background: '#0b0f19', padding: '16px', borderRadius: '14px', border: '1px solid #1f2937', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Bounce Events ({events.length})</h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['ALL', 'IN', 'OUT', 'UNCERTAIN'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilter(mode)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      background: filter === mode ? '#10b981' : '#1f2937',
                      color: filter === mode ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '520px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(16, 185, 129, 0.15)' : '#111827',
                        border: isSelected ? '1px solid #10b981' : '1px solid #1f2937',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#f3f4f6' }}>{ev.event_id}</span>
                        <span className={badgeClass} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                          {ev.call}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                        Frame #{ev.frame_idx} | {ev.timestamp_ms.toFixed(0)} ms
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
