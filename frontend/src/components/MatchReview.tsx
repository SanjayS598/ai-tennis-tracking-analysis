import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  FastForward,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Box,
  Monitor,
  Sparkles,
  ChevronRight,
  Activity,
  Layers,
  Info,
} from 'lucide-react';
import { BounceEvent, SessionReport, SessionSummary, ShotTrajectory } from '../types';
import { Court2DMinimap } from './Court2DMinimap';
import { Tennis3DVisualizer } from './Tennis3DVisualizer';

interface MatchReviewProps {
  session: SessionReport | null;
  sessionsList: SessionSummary[];
  onSelectSession: (sessionId: string) => void;
  onOpenUpload?: () => void;
}

export const MatchReview: React.FC<MatchReviewProps> = ({
  session,
  sessionsList,
  onSelectSession,
  onOpenUpload,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<BounceEvent | null>(null);
  const [activeShotIndex, setActiveShotIndex] = useState<number>(0);
  const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT' | 'UNCERTAIN'>('ALL');
  const [viewMode, setViewMode] = useState<'3D' | 'SPLIT'>('3D');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  if (!session) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', padding: '24px', textAlign: 'center' }}>
        <div
          className="apple-card"
          style={{
            padding: '48px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(48, 209, 88, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#30d158',
            }}
          >
            <Box size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
            No Match Session Selected
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '420px', margin: 0, lineHeight: 1.6 }}>
            Select a session from your session history or upload a video to inspect 3D Hawk-Eye ball trajectories and line call verdicts.
          </p>
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="liquid-glass-btn-primary"
              style={{
                marginTop: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '9999px',
                background: '#30d158',
                color: '#000000',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Upload Tennis Video
            </button>
          )}
        </div>
      </div>
    );
  }

  const width = session.video_metadata?.width ?? 1920;
  const height = session.video_metadata?.height ?? 1080;
  const fps = session.video_metadata?.fps ?? 30.0;
  const duration = session.video_metadata?.duration_sec ?? 0;
  const totalFrames = session.video_metadata?.total_frames ?? 0;
  const sessionId = session.session_id;

  const shots: ShotTrajectory[] = session.shots || [];
  const events: BounceEvent[] = session.events || [];

  const inCount = shots.length > 0
    ? shots.filter((s) => s.call === 'IN').length
    : events.filter((e) => e.call === 'IN').length;
  const outCount = shots.length > 0
    ? shots.filter((s) => s.call === 'OUT').length
    : events.filter((e) => e.call === 'OUT').length;
  const uncertainCount = shots.length > 0
    ? shots.filter((s) => s.call === 'UNCERTAIN').length
    : events.filter((e) => e.call === 'UNCERTAIN').length;

  const filteredEvents = events.filter((e) => {
    if (filter === 'ALL') return true;
    return e.call === filter;
  });

  const handleSelectShot = (idx: number) => {
    setActiveShotIndex(idx);
    const targetShot = shots[idx];
    if (targetShot && videoRef.current) {
      videoRef.current.currentTime = targetShot.timestamp_ms / 1000.0;
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px' }}>
      {/* Session Metrics Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '14px',
          marginBottom: '20px',
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

      {/* Floating Liquid Glass View Switcher & Step Control Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={16} color="#30d158" />
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
            Hawk-Eye Replay Studio
          </span>
          {shots.length > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
              }}
            >
              {shots.length} Shot{shots.length === 1 ? '' : 's'} Detected
            </span>
          )}
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

      {/* Shot Selector Bar (Step-by-Step for Current Session) */}
      {shots.length > 0 && (
        <div
          className="apple-card"
          style={{
            padding: '12px 18px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
            <Activity size={15} color="#0a84ff" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' }}>
              Select Shot:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '2px' }}>
            {shots.map((shot, idx) => {
              const isSelected = idx === activeShotIndex;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectShot(idx)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>Shot #{shot.shot_number || idx + 1}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {shot.stroke_type}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      background:
                        shot.call === 'IN'
                          ? 'rgba(48, 209, 88, 0.25)'
                          : shot.call === 'OUT'
                          ? 'rgba(255, 69, 58, 0.25)'
                          : 'rgba(255, 159, 10, 0.25)',
                      color: shot.call === 'IN' ? '#30d158' : shot.call === 'OUT' ? '#ff453a' : '#ff9f0a',
                    }}
                  >
                    {shot.call}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main View Area */}
      {viewMode === '3D' ? (
        <div style={{ marginBottom: '24px' }}>
          <Tennis3DVisualizer
            session={session}
            shots={shots}
            activeShotIndex={activeShotIndex}
            onSelectShotIndex={setActiveShotIndex}
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={(ev) => setSelectedEvent(ev)}
          />
        </div>
      ) : (
        /* Video + Minimap Split Layout */
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
                ref={videoRef}
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
