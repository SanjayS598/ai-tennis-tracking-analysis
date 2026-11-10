import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
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
  Trash2,
  Maximize2,
  SkipBack,
  SkipForward,
  Gauge,
  ShieldCheck,
  Zap,
  Columns,
} from 'lucide-react';
import { BounceEvent, SessionReport, SessionSummary, ShotTrajectory } from '../types';
import { Court2DMinimap } from './Court2DMinimap';
import { Tennis3DVisualizer } from './Tennis3DVisualizer';

interface MatchReviewProps {
  session: SessionReport | null;
  sessionsList: SessionSummary[];
  onSelectSession: (sessionId: string) => void;
  onOpenUpload?: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export const MatchReview: React.FC<MatchReviewProps> = ({
  session,
  sessionsList,
  onSelectSession,
  onOpenUpload,
  onDeleteSession,
}) => {
  const [activeShotIndex, setActiveShotIndex] = useState<number>(0);
  const [selectedEvent, setSelectedEvent] = useState<BounceEvent | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT' | 'UNCERTAIN'>('ALL');
  const [viewMode, setViewMode] = useState<'VIDEO' | 'DUAL' | '3D'>('VIDEO');

  // Video playback state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [videoError, setVideoError] = useState<string | null>(null);

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
  const metadataDuration = session.video_metadata?.duration_sec ?? 0;
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

  // Calculate active shot in realtime based on current video time
  const currentTimeMs = currentTimeSec * 1000;
  const realtimeActiveShot: ShotTrajectory | null = React.useMemo(() => {
    if (shots.length === 0) return null;

    // Find shot whose window covers current playback time
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      const startMs = s.timestamp_ms - 600;
      const endMs = s.timestamp_ms + 1000;
      if (currentTimeMs >= startMs && currentTimeMs <= endMs) {
        return s;
      }
    }
    // Otherwise fallback to currently selected shot
    return shots[activeShotIndex] || shots[0] || null;
  }, [currentTimeMs, shots, activeShotIndex]);

  // Sync active shot index when video plays through a shot
  useEffect(() => {
    if (shots.length === 0) return;
    const idx = shots.findIndex((s) => {
      const startMs = s.timestamp_ms - 500;
      const endMs = s.timestamp_ms + 800;
      return currentTimeMs >= startMs && currentTimeMs <= endMs;
    });
    if (idx >= 0 && idx !== activeShotIndex) {
      setActiveShotIndex(idx);
    }
  }, [currentTimeMs, shots]);

  // Handle video element timeupdate
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTimeSec(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDurationSec(videoRef.current.duration || metadataDuration);
      setVideoError(null);
    }
  };

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsVideoPlaying(true)).catch((err) => {
        console.warn('Playback error:', err);
      });
    }
  };

  const handleSeek = (timeSec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeSec;
      setCurrentTimeSec(timeSec);
    }
  };

  const handleSelectShot = (idx: number) => {
    setActiveShotIndex(idx);
    const targetShot = shots[idx];
    if (targetShot && videoRef.current) {
      const targetTimeSec = Math.max(0, (targetShot.timestamp_ms - 300) / 1000.0);
      videoRef.current.currentTime = targetTimeSec;
      setCurrentTimeSec(targetTimeSec);
      videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleStepFrame = (forward: boolean) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsVideoPlaying(false);
    const step = 1.0 / (fps || 30.0);
    const nextTime = forward
      ? Math.min(durationSec || metadataDuration, videoRef.current.currentTime + step)
      : Math.max(0, videoRef.current.currentTime - step);
    videoRef.current.currentTime = nextTime;
    setCurrentTimeSec(nextTime);
  };

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '16px 24px' }}>
      {/* Session Top Bar */}
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

      {/* Floating Liquid Glass View Switcher & Action Header */}
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
            Realtime Match Replay Studio
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
              {shots.length} Shot{shots.length === 1 ? '' : 's'} Tracked
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mode Switcher */}
          <div className="glass-segmented">
            <button
              onClick={() => setViewMode('VIDEO')}
              className={`glass-segmented-item ${viewMode === 'VIDEO' ? 'active' : ''}`}
            >
              <Monitor size={14} /> Video Player
            </button>

            <button
              onClick={() => setViewMode('DUAL')}
              className={`glass-segmented-item ${viewMode === 'DUAL' ? 'active' : ''}`}
            >
              <Columns size={14} /> Dual Studio
            </button>

            <button
              onClick={() => setViewMode('3D')}
              className={`glass-segmented-item ${viewMode === '3D' ? 'active' : ''}`}
            >
              <Box size={14} /> 3D Hawk-Eye
            </button>
          </div>

          {/* Delete Session Button */}
          {onDeleteSession && (
            <button
              onClick={() => {
                if (window.confirm(`Delete session '${sessionId}' permanently?`)) {
                  onDeleteSession(sessionId);
                }
              }}
              style={{
                background: 'rgba(255, 69, 58, 0.1)',
                border: '1px solid rgba(255, 69, 58, 0.25)',
                color: '#ff453a',
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Delete this session from storage"
            >
              <Trash2 size={13} /> Delete Session
            </button>
          )}
        </div>
      </div>

      {/* Shot Selector Bar (Step-by-Step Navigation) */}
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
              Jump to Shot:
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

      {/* Main View Area based on viewMode */}
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
      ) : viewMode === 'DUAL' ? (
        /* Dual Synchronized Layout: Video on Left, 3D on Right */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Left: Video Player */}
          <div className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={16} color="#30d158" /> Actual Footage
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {currentTimeSec.toFixed(2)}s / {(durationSec || metadataDuration).toFixed(2)}s
              </span>
            </div>

            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                background: '#000000',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <video
                ref={videoRef}
                src={`/api/sessions/${sessionId}/video`}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsVideoPlaying(false)}
                onError={() => setVideoError('Video stream unavailable for this session.')}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              {/* Realtime Shot Overlay Badge */}
              {realtimeActiveShot && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: realtimeActiveShot.call === 'IN' ? 'rgba(48, 209, 88, 0.25)' : 'rgba(255, 69, 58, 0.25)',
                      color: realtimeActiveShot.call === 'IN' ? '#30d158' : '#ff453a',
                    }}
                  >
                    {realtimeActiveShot.call}
                  </span>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                    {realtimeActiveShot.stroke_type} • {realtimeActiveShot.speed_mph.toFixed(0)} MPH
                  </div>
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={toggleVideoPlay}
                  style={{
                    background: isVideoPlaying ? 'rgba(255, 255, 255, 0.1)' : '#30d158',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {isVideoPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  onClick={() => handleSeek(0)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Replay from beginning"
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              <div className="glass-segmented">
                {[0.25, 0.5, 1.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`glass-segmented-item ${playbackRate === s ? 'active' : ''}`}
                    style={{ padding: '3px 8px', fontSize: '10px' }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: 3D Hawk-Eye Stadium */}
          <div>
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
        </div>
      ) : (
        /* Full Realtime Video Studio Layout */
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 320px 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Main Video Player with Realtime HUD */}
          <div className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} color="#30d158" /> Actual Court Video with Realtime Tracking
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {currentTimeSec.toFixed(2)}s / {(durationSec || metadataDuration).toFixed(2)}s ({totalFrames} frames)
              </span>
            </div>

            {/* Video Viewport */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                background: '#000000',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <video
                ref={videoRef}
                src={`/api/sessions/${sessionId}/video`}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsVideoPlaying(false)}
                onError={() => setVideoError('Annotated video stream is loading or not generated yet.')}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              {videoError && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#94a3b8',
                    padding: '20px',
                  }}
                >
                  <Info size={32} color="#ff9f0a" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>{videoError}</p>
                </div>
              )}

              {/* Realtime Shot Overlay Banner */}
              {realtimeActiveShot && (
                <div
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(10, 15, 28, 0.88)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '16px',
                    padding: '8px 16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background:
                        realtimeActiveShot.call === 'IN'
                          ? 'rgba(48, 209, 88, 0.25)'
                          : 'rgba(255, 69, 58, 0.25)',
                      color: realtimeActiveShot.call === 'IN' ? '#30d158' : '#ff453a',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {realtimeActiveShot.call === 'IN' ? <ShieldCheck size={14} /> : <Zap size={14} />}
                    {realtimeActiveShot.call}
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                      {realtimeActiveShot.stroke_type}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                      {realtimeActiveShot.speed_mph.toFixed(0)} MPH •{' '}
                      {realtimeActiveShot.margin_cm > 0
                        ? `+${realtimeActiveShot.margin_cm}cm inside line`
                        : `${Math.abs(realtimeActiveShot.margin_cm)}cm out`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Video Interactive Timeline with Shot Markers */}
            <div style={{ marginTop: '14px', position: 'relative' }}>
              {/* Timeline Track */}
              <input
                type="range"
                min="0"
                max={durationSec || metadataDuration || 1}
                step="0.01"
                value={currentTimeSec}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#30d158',
                  height: '6px',
                  cursor: 'pointer',
                  borderRadius: '9999px',
                }}
              />

              {/* Shot Pins on Timeline */}
              {shots.map((s, idx) => {
                const totalD = durationSec || metadataDuration || 1;
                const pct = Math.min(99, Math.max(1, ((s.timestamp_ms / 1000) / totalD) * 100));
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectShot(idx)}
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: '2px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: s.call === 'IN' ? '#30d158' : '#ff453a',
                      border: '1.5px solid #000000',
                      transform: 'translateX(-50%)',
                      cursor: 'pointer',
                      boxShadow: '0 0 6px rgba(0,0,0,0.8)',
                    }}
                    title={`Shot #${s.shot_number}: ${s.stroke_type} (${s.call})`}
                  />
                );
              })}
            </div>

            {/* Video Player Transport Bar */}
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Step Back Frame */}
                <button
                  onClick={() => handleStepFrame(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Step Back 1 Frame"
                >
                  <SkipBack size={13} />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={toggleVideoPlay}
                  style={{
                    background: isVideoPlaying ? 'rgba(255, 255, 255, 0.12)' : '#30d158',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title={isVideoPlaying ? 'Pause Video' : 'Play Realtime Video'}
                >
                  {isVideoPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                {/* Step Forward Frame */}
                <button
                  onClick={() => handleStepFrame(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Step Forward 1 Frame"
                >
                  <SkipForward size={13} />
                </button>

                {/* Restart */}
                <button
                  onClick={() => handleSeek(0)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Restart Video"
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              {/* Speed Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Speed:</span>
                <div className="glass-segmented">
                  {[0.25, 0.5, 1.0, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`glass-segmented-item ${playbackRate === s ? 'active' : ''}`}
                      style={{ padding: '3px 8px', fontSize: '10px' }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Center: 2D Metric Court Minimap */}
          <div className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0', alignSelf: 'flex-start' }}>
              ITF 2D Court Bounce Map
            </h3>
            <Court2DMinimap
              events={events}
              selectedEvent={selectedEvent}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              width={280}
              height={500}
            />
          </div>

          {/* Right: Shots & Bounce Events Log */}
          <div className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                Shots ({shots.length > 0 ? shots.length : events.length})
              </h3>
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

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '520px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {shots.length > 0 ? (
                shots.map((shot, idx) => {
                  if (filter !== 'ALL' && shot.call !== filter) return null;
                  const isSelected = idx === activeShotIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectShot(idx)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid rgba(48, 209, 88, 0.45)' : '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>
                          Shot #{shot.shot_number || idx + 1}: {shot.stroke_type}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: shot.call === 'IN' ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 69, 58, 0.2)',
                            color: shot.call === 'IN' ? '#30d158' : '#ff453a',
                          }}
                        >
                          {shot.call}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                        {shot.speed_mph.toFixed(0)} MPH • Timestamp: {(shot.timestamp_ms / 1000).toFixed(2)}s
                      </div>

                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                        {shot.description}
                      </div>
                    </div>
                  );
                })
              ) : filteredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#6b7280', fontSize: '13px' }}>
                  No bounce events recorded for this session.
                </div>
              ) : (
                filteredEvents.map((ev) => (
                  <div
                    key={ev.event_id}
                    onClick={() => setSelectedEvent(ev)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>{ev.event_id}</span>
                      <span style={{ color: ev.call === 'IN' ? '#30d158' : '#ff453a', fontWeight: 700, fontSize: '11px' }}>
                        {ev.call}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      Frame #{ev.frame_idx} • {ev.timestamp_ms.toFixed(0)} ms
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
