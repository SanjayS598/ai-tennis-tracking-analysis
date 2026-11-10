import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  Award,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Activity,
  Zap,
  Info,
} from 'lucide-react';
import { BiomechanicsData, PoseFrame, SessionReport } from '../types';

interface BiomechanicsViewProps {
  session: SessionReport | null;
  activeShotIndex?: number;
  onOpenUpload?: () => void;
}

export const BiomechanicsView: React.FC<BiomechanicsViewProps> = ({
  session,
  activeShotIndex = 0,
  onOpenUpload,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const bio: BiomechanicsData | undefined = session?.biomechanics;
  const frames: PoseFrame[] = bio?.frames || [];
  const totalFrames = frames.length;

  // Reset to first frame if session changes
  useEffect(() => {
    setCurrentFrameIdx(0);
    setIsPlaying(true);
  }, [session?.session_id]);

  // Animation playback loop
  useEffect(() => {
    if (totalFrames === 0) return;

    const loop = (time: number) => {
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (isPlaying && totalFrames > 0) {
        // Assume ~30 FPS source video
        const frameStep = delta * 30 * playbackSpeed;
        setCurrentFrameIdx((prev) => {
          const next = prev + frameStep;
          if (next >= totalFrames) {
            return 0; // loop
          }
          return next;
        });
      }

      animRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, totalFrames, playbackSpeed]);

  // Canvas 2D Skeleton Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || totalFrames === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const frameInt = Math.min(totalFrames - 1, Math.floor(currentFrameIdx));
    const activeFrame = frames[frameInt];
    if (!activeFrame || !activeFrame.landmarks) return;

    const lm = activeFrame.landmarks;

    // Auto-centering helper
    // Reference center around chest (midpoint of shoulders)
    const lSh = lm['left_shoulder'] || { x: 920, y: 656 };
    const rSh = lm['right_shoulder'] || { x: 1000, y: 656 };
    const neck = { x: (lSh.x + rSh.x) / 2, y: (lSh.y + rSh.y) / 2 };

    const toCanvas = (pt: { x: number; y: number }): [number, number] => {
      const scale = Math.min(width, height) / 380;
      const cx = width / 2;
      const cy = height / 2 - 20;
      const x = cx + (pt.x - 960) * scale * 0.95;
      const y = cy + (pt.y - 770) * scale * 0.95;
      return [x, y];
    };

    // Draw court shadow beneath feet
    const lAnk = lm['left_ankle'] ? toCanvas(lm['left_ankle']) : null;
    const rAnk = lm['right_ankle'] ? toCanvas(lm['right_ankle']) : null;
    if (lAnk && rAnk) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse((lAnk[0] + rAnk[0]) / 2, Math.max(lAnk[1], rAnk[1]) + 10, 60, 16, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fill();
      ctx.restore();
    }

    // Bone segments definition
    const bones: Array<{ from: string; to: string; color: string; width: number }> = [
      // Torso core
      { from: 'left_shoulder', to: 'right_shoulder', color: '#0a84ff', width: 4 },
      { from: 'left_shoulder', to: 'left_hip', color: '#0a84ff', width: 3 },
      { from: 'right_shoulder', to: 'right_hip', color: '#0a84ff', width: 3 },
      { from: 'left_hip', to: 'right_hip', color: '#0a84ff', width: 4 },
      // Dominant Right Arm (Racket arm: Neon Green)
      { from: 'right_shoulder', to: 'right_elbow', color: '#30d158', width: 5 },
      { from: 'right_elbow', to: 'right_wrist', color: '#30d158', width: 5 },
      // Non-dominant Left Arm (Subtle Slate/Blue)
      { from: 'left_shoulder', to: 'left_elbow', color: '#64748b', width: 3 },
      { from: 'left_elbow', to: 'left_wrist', color: '#64748b', width: 3 },
      // Legs (Kinetic Base)
      { from: 'left_hip', to: 'left_knee', color: '#38bdf8', width: 4 },
      { from: 'left_knee', to: 'left_ankle', color: '#38bdf8', width: 4 },
      { from: 'right_hip', to: 'right_knee', color: '#38bdf8', width: 4 },
      { from: 'right_knee', to: 'right_ankle', color: '#38bdf8', width: 4 },
    ];

    // Draw glowing bones
    bones.forEach((bone) => {
      const p1 = lm[bone.from];
      const p2 = lm[bone.to];
      if (p1 && p2) {
        const [x1, y1] = toCanvas(p1);
        const [x2, y2] = toCanvas(p2);

        // Glow
        ctx.save();
        ctx.strokeStyle = bone.color;
        ctx.lineWidth = bone.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = bone.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }
    });

    // Draw Neck -> Nose
    if (lm['nose']) {
      const [nx, ny] = toCanvas(neck);
      const [headX, headY] = toCanvas(lm['nose']);
      ctx.save();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      // Head circle
      ctx.beginPath();
      ctx.arc(headX, headY - 12, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw Joint Nodes
    Object.entries(lm).forEach(([name, pt]) => {
      const [x, y] = toCanvas(pt);
      const isDominant = name.includes('right');

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, isDominant ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isDominant ? '#30d158' : '#ffffff';
      ctx.shadowColor = isDominant ? '#30d158' : '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fill();

      // Inner white core
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    });

    // Draw Live Joint Angle Callouts
    if (lm['right_elbow'] && lm['right_shoulder'] && lm['right_wrist']) {
      const [ex, ey] = toCanvas(lm['right_elbow']);
      const angle = activeFrame.elbow_angle_deg.toFixed(1);

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.strokeStyle = 'rgba(48, 209, 88, 0.8)';
      ctx.lineWidth = 1;
      ctx.roundRect(ex + 12, ey - 14, 74, 24, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#30d158';
      ctx.font = 'bold 11px system-ui, -apple-system';
      ctx.fillText(`${angle}° EXT`, ex + 18, ey + 2);
      ctx.restore();
    }

    if (lm['right_knee']) {
      const [kx, ky] = toCanvas(lm['right_knee']);
      const angle = activeFrame.knee_flexion_deg.toFixed(1);

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 1;
      ctx.roundRect(kx + 12, ky - 14, 76, 24, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px system-ui, -apple-system';
      ctx.fillText(`${angle}° FLEX`, kx + 18, ky + 2);
      ctx.restore();
    }

    // Torso separation angle HUD on bottom left of canvas
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect(14, height - 42, 170, 28, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.fillText('SHOULDER-HIP SEP:', 22, height - 24);
    ctx.fillStyle = '#30d158';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText(`${activeFrame.shoulder_hip_separation_deg.toFixed(1)}°`, 130, height - 24);
    ctx.restore();
  }, [currentFrameIdx, frames, totalFrames]);

  if (!session) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', padding: '24px', textAlign: 'center' }}>
        <div className="apple-card" style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(10, 132, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a84ff' }}>
            <Activity size={28} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
            No Session Selected for Biomechanics
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '420px', margin: 0, lineHeight: 1.6 }}>
            Select a match or rally from your session history to inspect MediaPipe 3D joint kinematics, stroke breakdown, and kinetic chain metrics.
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
              Upload Match Video
            </button>
          )}
        </div>
      </div>
    );
  }

  const strokeCounts = bio?.stroke_counts || { Forehand: 0, Backhand: 0, Serve: 0 };
  const totalStrokes = Object.values(strokeCounts).reduce((a, b) => a + b, 0) || 1;
  const forehandPct = Math.round(((strokeCounts['Forehand'] || 0) / totalStrokes) * 100);
  const backhandPct = Math.round(((strokeCounts['Backhand'] || 0) / totalStrokes) * 100);
  const servePct = Math.round(((strokeCounts['Serve'] || 0) / totalStrokes) * 100);

  const activeFrame = frames[Math.min(totalFrames - 1, Math.floor(currentFrameIdx))] || null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: '#ffffff' }}>
            Session Biomechanics & Kinetic Chain
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
            MediaPipe Pose spatial landmarks & PyTorch temporal stroke sequence analysis for{' '}
            <strong style={{ color: '#ffffff' }}>{session.player_name || 'Player'}</strong> ({session.session_id})
          </p>
        </div>

        {bio?.dominant_hand && (
          <div className="liquid-glass-panel" style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 700, color: '#30d158' }}>
            {bio.dominant_hand}-Handed Player
          </div>
        )}
      </div>

      {/* Dynamic Stroke Type Distribution from Real Session */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="apple-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a84ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Forehand Groundstrokes
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '6px', color: '#ffffff' }}>
            {strokeCounts['Forehand'] || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            {forehandPct}% of detected strokes
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${forehandPct}%`, height: '100%', background: '#0a84ff', borderRadius: '9999px' }} />
          </div>
        </div>

        <div className="apple-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Backhand Groundstrokes
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '6px', color: '#ffffff' }}>
            {strokeCounts['Backhand'] || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            {backhandPct}% of detected strokes
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${backhandPct}%`, height: '100%', background: '#bf5af2', borderRadius: '9999px' }} />
          </div>
        </div>

        <div className="apple-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#30d158', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Serve Deliveries
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '6px', color: '#ffffff' }}>
            {strokeCounts['Serve'] || 0}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            {servePct}% of detected strokes
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: `${servePct}%`, height: '100%', background: '#30d158', borderRadius: '9999px' }} />
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Bio Skeleton Player (Left) + Kinematics & Coaching (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '22px' }}>
        {/* Interactive Bio Skeleton Canvas Player */}
        <div className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
              <Zap size={16} color="#30d158" /> 13-Point Skeletal Wireframe
            </h3>
            {activeFrame && (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Frame #{activeFrame.frame_idx} • {activeFrame.timestamp_ms.toFixed(0)} ms
              </span>
            )}
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '380px',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#060a12',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <canvas
              ref={canvasRef}
              width={560}
              height={380}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />

            {totalFrames === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '13px',
                }}
              >
                No skeletal pose frames extracted for this session.
              </div>
            )}
          </div>

          {/* Skeleton Scrubber & Transport Controls */}
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Scrubber slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min="0"
                max={Math.max(0, totalFrames - 1)}
                value={Math.floor(currentFrameIdx)}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentFrameIdx(parseInt(e.target.value, 10));
                }}
                style={{
                  flex: 1,
                  accentColor: '#30d158',
                  height: '4px',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '11px', color: '#cbd5e1', minWidth: '70px', textAlign: 'right' }}>
                {totalFrames > 0 ? `${Math.floor(currentFrameIdx) + 1} / ${totalFrames}` : '0 / 0'}
              </span>
            </div>

            {/* Playback buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentFrameIdx((p) => Math.max(0, p - 1));
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Step Back 1 Frame"
                >
                  <SkipBack size={12} />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    background: isPlaying ? 'rgba(255, 255, 255, 0.12)' : '#30d158',
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
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentFrameIdx((p) => Math.min(totalFrames - 1, p + 1));
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Step Forward 1 Frame"
                >
                  <SkipForward size={12} />
                </button>

                <button
                  onClick={() => setCurrentFrameIdx(0)}
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
                  title="Restart"
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              {/* Speed Buttons */}
              <div className="glass-segmented">
                {[0.5, 1.0, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`glass-segmented-item ${playbackSpeed === s ? 'active' : ''}`}
                    style={{ padding: '3px 8px', fontSize: '10px' }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Measured Joint Kinematics & Kinetic Chain from Session Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="apple-card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
              <TrendingUp size={16} color="#0a84ff" /> Measured Joint Kinematics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Dominant Elbow Extension at Contact</span>
                <strong style={{ color: '#ffffff', fontSize: '13px' }}>
                  {bio?.avg_elbow_extension_deg ? `${bio.avg_elbow_extension_deg.toFixed(1)}°` : '—'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Shoulder-to-Hip Separation Angle</span>
                <strong style={{ color: '#ffffff', fontSize: '13px' }}>
                  {bio?.avg_shoulder_hip_sep_deg ? `${bio.avg_shoulder_hip_sep_deg.toFixed(1)}°` : '—'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Stance Width Ratio (Torso-Normalized)</span>
                <strong style={{ color: '#ffffff', fontSize: '13px' }}>
                  {bio?.stance_width_ratio ? `${bio.stance_width_ratio.toFixed(2)}x` : '—'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Knee Flexion Depth Prior to Drive</span>
                <strong style={{ color: '#30d158', fontSize: '13px' }}>
                  {bio?.avg_knee_flexion_deg ? `${bio.avg_knee_flexion_deg.toFixed(1)}°` : '—'}
                </strong>
              </div>
            </div>
          </div>

          <div className="apple-card" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
              <Sparkles size={16} color="#30d158" /> Kinetic Chain Consistency
            </h3>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px', textTransform: 'uppercase' }}>
                Kinematic Efficiency Score
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#30d158' }}>
                {bio?.kinetic_efficiency_score ? `${bio.kinetic_efficiency_score.toFixed(1)} / 100` : '—'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
                {bio?.coaching_summary || 'Analysis derived from session frame landmark sequence.'}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
              Joint vectors computed with position-invariance to court coordinates, evaluating leg drive, hip rotation, and shoulder release through ball impact.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
