import React from 'react';
import { UserCheck, Award, TrendingUp, AlertCircle } from 'lucide-react';

export const BiomechanicsView: React.FC = () => {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck color="#10b981" /> Biomechanics & Stroke Studio
        </h2>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          MediaPipe Pose 3D landmark analysis & PyTorch temporal stroke sequence classification.
        </p>
      </div>

      {/* Stroke Type Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase' }}>Forehand</div>
          <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '4px' }}>42</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>58% of groundstrokes</div>
          <div style={{ width: '100%', height: '6px', background: '#1f2937', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: '58%', height: '100%', background: '#38bdf8' }} />
          </div>
        </div>

        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#a855f7', textTransform: 'uppercase' }}>Backhand</div>
          <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '4px' }}>24</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>33% of groundstrokes</div>
          <div style={{ width: '100%', height: '6px', background: '#1f2937', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: '33%', height: '100%', background: '#a855f7' }} />
          </div>
        </div>

        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#34d399', textTransform: 'uppercase' }}>Serve</div>
          <div style={{ fontSize: '36px', fontWeight: 800, marginTop: '4px' }}>18</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>First serve in: 67%</div>
          <div style={{ width: '100%', height: '6px', background: '#1f2937', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: '67%', height: '100%', background: '#34d399' }} />
          </div>
        </div>
      </div>

      {/* Joint Kinematics & Kinetic Chain */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#38bdf8" /> Measured Joint Kinematics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1f2937' }}>
              <span style={{ color: '#94a3b8' }}>Dominant Elbow Extension at Contact</span>
              <strong style={{ color: '#ffffff' }}>152.4° (±4.2°)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1f2937' }}>
              <span style={{ color: '#94a3b8' }}>Shoulder-to-Hip Separation Angle</span>
              <strong style={{ color: '#ffffff' }}>31.8°</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #1f2937' }}>
              <span style={{ color: '#94a3b8' }}>Mean Stance Width</span>
              <strong style={{ color: '#ffffff' }}>0.94 m (Balanced Base)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Torso Vertical Stability Index</span>
              <strong style={{ color: '#34d399' }}>94% Consistency</strong>
            </div>
          </div>
        </div>

        <div style={{ background: '#0b0f19', padding: '20px', borderRadius: '12px', border: '1px solid #1f2937' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#fbbf24" /> Technique Consistency & Insights
          </h3>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 12px 0' }}>
            • <strong>High Contact Reproducibility:</strong> Forehand contact point height was consistent within ±3.8cm across rally phases.
          </p>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 12px 0' }}>
            • <strong>Kinetic Sequencing:</strong> Hip rotation initiated ~45ms ahead of racket acceleration, demonstrating effective energy transfer from the ground up.
          </p>
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <AlertCircle size={16} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#93c5fd' }}>
              In adherence to our non-prescriptive coaching philosophy, these measurements reflect mechanical consistency patterns rather than declaring universal right or wrong technique.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
