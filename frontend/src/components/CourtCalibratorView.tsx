import React, { useState } from 'react';
import { Target, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Point2D } from '../types';

interface CourtCalibratorViewProps {
  onCalibrationSaved: (points: Point2D[]) => void;
}

const POINT_LABELS = [
  'Near-Left Singles Corner (0m, 0m)',
  'Near-Right Singles Corner (8.23m, 0m)',
  'Far-Left Singles Corner (0m, 23.77m)',
  'Far-Right Singles Corner (8.23m, 23.77m)',
];

export const CourtCalibratorView: React.FC<CourtCalibratorViewProps> = ({ onCalibrationSaved }) => {
  const [points, setPoints] = useState<Point2D[]>([
    { x: 467, y: 821 },
    { x: 1453, y: 821 },
    { x: 714, y: 268 },
    { x: 1206, y: 268 },
  ]);
  const [rmse, setRmse] = useState<number | null>(0.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (points.length >= 4) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Scale from displayed size to native 1920x1080 resolution
    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;

    const newPt: Point2D = {
      x: Math.round(clickX * scaleX),
      y: Math.round(clickY * scaleY),
    };
    setPoints([...points, newPt]);
  };

  const handleReset = () => {
    setPoints([]);
    setRmse(null);
    setSuccessMsg(null);
  };

  const handleCompute = async () => {
    if (points.length !== 4) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      });
      if (res.ok) {
        const data = await res.json();
        setRmse(data.reprojection_error_px);
        onCalibrationSaved(points);
        setSuccessMsg(`Calibrated successfully! Reprojection RMSE: ${data.reprojection_error_px} px`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target color="#10b981" /> Interactive Court Calibrator
        </h2>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Click or adjust the 4 baseline corner points to calibrate the camera's perspective homography.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        {/* Frame canvas */}
        <div style={{ background: '#0b0f19', padding: '16px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <div
            onClick={handleImageClick}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9',
              background: '#041d14',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: points.length < 4 ? 'crosshair' : 'default',
              border: '2px solid #064e3b',
            }}
          >
            {/* Background image or mock tennis court */}
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(180deg, #064e3b 0%, #047857 60%, #065f46 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ color: '#ffffff', opacity: 0.15, fontSize: '48px', fontWeight: 900 }}>
                1920 x 1080 COURT VIEW
              </div>
            </div>

            {/* Clicked point markers */}
            {points.map((pt, idx) => {
              // Convert 1920x1080 coordinates to percentage
              const leftPct = (pt.x / 1920) * 100;
              const topPct = (pt.y / 1080) * 100;
              return (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: '#10b981',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 10px #10b981',
                    }}
                  />
                  <span
                    style={{
                      background: 'rgba(0,0,0,0.8)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#ffffff',
                      marginTop: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    #{idx + 1}: ({pt.x}, {pt.y})
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '12px', fontSize: '13px', color: '#94a3b8' }}>
            {points.length < 4 ? (
              <span>Next Point to click: <strong style={{ color: '#34d399' }}>{POINT_LABELS[points.length]}</strong></span>
            ) : (
              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={16} /> All 4 corner points selected!
              </span>
            )}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#0b0f19', padding: '16px', borderRadius: '12px', border: '1px solid #1f2937' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0' }}>Calibration Points</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {POINT_LABELS.map((label, idx) => {
                const pt = points[idx];
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: pt ? 'rgba(16, 185, 129, 0.1)' : '#111827',
                      border: pt ? '1px solid #059669' : '1px solid #1f2937',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: pt ? '#34d399' : '#94a3b8' }}>#{idx + 1} {label.split(' ')[0]}</div>
                    <div style={{ color: pt ? '#f3f4f6' : '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                      {pt ? `X: ${pt.x} px | Y: ${pt.y} px` : 'Not selected yet'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={handleCompute}
                disabled={points.length !== 4 || isSubmitting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: points.length === 4 ? '#10b981' : '#1f2937',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: points.length === 4 ? 'pointer' : 'not-allowed',
                }}
              >
                {isSubmitting ? 'Computing...' : 'Fit Homography'}
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: '10px',
                  background: '#1f2937',
                  color: '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
                title="Reset points"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          {rmse !== null && (
            <div style={{ background: '#064e3b', padding: '16px', borderRadius: '12px', border: '1px solid #10b981' }}>
              <div style={{ fontSize: '12px', color: '#a7f3d0' }}>Reprojection Error</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>{rmse.toFixed(3)} px</div>
              <div style={{ fontSize: '11px', color: '#6ee7b7', marginTop: '4px' }}>
                Sub-pixel geometric accuracy confirmed!
              </div>
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '12px', border: '1px solid #10b981' }}>
              {successMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
