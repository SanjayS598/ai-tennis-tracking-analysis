import React from 'react';
import { UserCheck, Award, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';

export const BiomechanicsView: React.FC = () => {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: '#ffffff' }}>
          Biomechanics & Kinetic Chain
        </h2>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>
          MediaPipe Pose 3D spatial extraction & PyTorch temporal stroke sequence classification.
        </p>
      </div>

      {/* Stroke Type Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '28px' }}>
        <div className="apple-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a84ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Forehand
          </div>
          <div style={{ fontSize: '38px', fontWeight: 800, marginTop: '6px', color: '#ffffff' }}>42</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>58% of groundstrokes</div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', marginTop: '14px', overflow: 'hidden' }}>
            <div style={{ width: '58%', height: '100%', background: '#0a84ff', borderRadius: '9999px' }} />
          </div>
        </div>

        <div className="apple-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Backhand
          </div>
          <div style={{ fontSize: '38px', fontWeight: 800, marginTop: '6px', color: '#ffffff' }}>24</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>33% of groundstrokes</div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', marginTop: '14px', overflow: 'hidden' }}>
            <div style={{ width: '33%', height: '100%', background: '#bf5af2', borderRadius: '9999px' }} />
          </div>
        </div>

        <div className="apple-card" style={{ padding: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#30d158', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Serve
          </div>
          <div style={{ fontSize: '38px', fontWeight: 800, marginTop: '6px', color: '#ffffff' }}>18</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>First serve in: 67%</div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', marginTop: '14px', overflow: 'hidden' }}>
            <div style={{ width: '67%', height: '100%', background: '#30d158', borderRadius: '9999px' }} />
          </div>
        </div>
      </div>

      {/* Joint Kinematics & Kinetic Chain */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px' }}>
        <div className="apple-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
            <TrendingUp size={18} color="#0a84ff" /> Measured Joint Kinematics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Dominant Elbow Extension at Contact</span>
              <strong style={{ color: '#ffffff', fontSize: '14px' }}>152.4° (±4.2°)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Shoulder-to-Hip Separation Angle</span>
              <strong style={{ color: '#ffffff', fontSize: '14px' }}>31.8°</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Stance Width (Normalized to Torso)</span>
              <strong style={{ color: '#ffffff', fontSize: '14px' }}>1.42x</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Knee Flexion Depth Prior to Drive</span>
              <strong style={{ color: '#30d158', fontSize: '14px' }}>118.6° (Optimal)</strong>
            </div>
          </div>
        </div>

        <div className="apple-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff' }}>
            <Sparkles size={18} color="#30d158" /> Kinetic Chain Consistency
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
            Normalized 24-dimensional joint positions are invariant to player court coordinates and camera perspective, evaluating kinetic energy transfer from legs through torso to racquet face.
          </p>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
              Kinematic Efficiency Score
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#30d158' }}>94.2 / 100</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Excellent hip-shoulder separation and full extension through ball contact.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
