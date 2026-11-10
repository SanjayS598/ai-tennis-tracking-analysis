import React from 'react';
import { Smartphone, Watch, X, Wifi, Battery, Heart, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DeviceStatusResponse } from '../types';

interface DeviceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceStatusResponse | null;
  onToggleDeviceSimulation: (device: string, connected: boolean) => void;
}

export const DeviceStatusModal: React.FC<DeviceStatusModalProps> = ({
  isOpen,
  onClose,
  devices,
  onToggleDeviceSimulation,
}) => {
  if (!isOpen || !devices) return null;

  const iphone = devices.iphone;
  const watch = devices.watch;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#0b0f19',
          border: '1px solid #1f2937',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '600px',
          padding: '32px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Wifi size={22} color="#10b981" />
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
            Connected Apple Hardware
          </h2>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 24px 0' }}>
          Real-time low-latency WebSocket transport bridging stationary iPhone video to Apple Watch wrist haptics.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* iPhone Status Card */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smartphone size={20} color="#10b981" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>{iphone.name}</h4>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Stationary Fence Mount Camera</span>
                </div>
              </div>

              <button
                onClick={() => onToggleDeviceSimulation('iphone', !iphone.connected)}
                style={{
                  background: iphone.connected ? 'rgba(16, 185, 129, 0.2)' : '#1f2937',
                  border: iphone.connected ? '1px solid #10b981' : '1px solid #374151',
                  color: iphone.connected ? '#34d399' : '#94a3b8',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {iphone.connected ? 'Connected' : 'Disconnected'} (Toggle)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div style={{ background: '#0b0f19', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#6b7280' }}>Stream</div>
                <div style={{ color: '#ffffff', fontWeight: 600, marginTop: '2px' }}>{iphone.mode || '1080p @ 60 FPS'}</div>
              </div>
              <div style={{ background: '#0b0f19', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#6b7280' }}>Battery</div>
                <div style={{ color: '#ffffff', fontWeight: 600, marginTop: '2px' }}>{iphone.battery_pct}%</div>
              </div>
              <div style={{ background: '#0b0f19', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#6b7280' }}>Transport Latency</div>
                <div style={{ color: '#38bdf8', fontWeight: 600, marginTop: '2px' }}>{iphone.latency_ms || 12} ms</div>
              </div>
            </div>
          </div>

          {/* Apple Watch Status Card */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Watch size={20} color="#38bdf8" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>{watch.name}</h4>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Wrist Haptic Engine & Workout</span>
                </div>
              </div>

              <button
                onClick={() => onToggleDeviceSimulation('watch', !watch.connected)}
                style={{
                  background: watch.connected ? 'rgba(16, 185, 129, 0.2)' : '#1f2937',
                  border: watch.connected ? '1px solid #10b981' : '1px solid #374151',
                  color: watch.connected ? '#34d399' : '#94a3b8',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {watch.connected ? 'Armed' : 'Offline'} (Toggle)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div style={{ background: '#0b0f19', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#6b7280' }}>Heart Rate</div>
                <div style={{ color: '#f87171', fontWeight: 600, marginTop: '2px' }}>{watch.heart_rate_bpm || 142} BPM</div>
              </div>
              <div style={{ background: '#0b0f19', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#6b7280' }}>Active Calories</div>
                <div style={{ color: '#fbbf24', fontWeight: 600, marginTop: '2px' }}>{watch.active_calories || 385} kcal</div>
              </div>
              <div style={{ background: '#0b0f19', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#6b7280' }}>Battery</div>
                <div style={{ color: '#ffffff', fontWeight: 600, marginTop: '2px' }}>{watch.battery_pct}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
