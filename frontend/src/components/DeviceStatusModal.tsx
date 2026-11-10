import React from 'react';
import { Smartphone, Watch, X, Wifi } from 'lucide-react';
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
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="liquid-glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '32px',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="glass-btn"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: 34,
            height: 34,
            padding: 0,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#86868b',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              background: 'rgba(10, 132, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wifi size={18} color="#0a84ff" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#f5f5f7', letterSpacing: '-0.02em' }}>
            Connected Apple Hardware
          </h2>
        </div>
        <p style={{ color: '#86868b', fontSize: '13px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
          Real-time low-latency WebSocket transport bridging stationary iPhone video to Apple Watch wrist haptics.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* iPhone Status Card */}
          <div className="apple-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '10px',
                    background: 'rgba(48, 209, 88, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Smartphone size={20} color="#30d158" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f5f5f7' }}>{iphone.name}</h4>
                  <span style={{ fontSize: '12px', color: '#86868b' }}>Stationary Baseline Mount</span>
                </div>
              </div>

              <button
                onClick={() => onToggleDeviceSimulation('iphone', !iphone.connected)}
                className="glass-btn"
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: iphone.connected ? '#30d158' : '#86868b',
                }}
              >
                {iphone.connected ? 'Connected' : 'Disconnected'} (Toggle)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px' }}>
                <div style={{ color: '#86868b', fontSize: '11px', fontWeight: 500 }}>Stream</div>
                <div style={{ color: '#f5f5f7', fontWeight: 600, fontSize: '13px', marginTop: '3px' }}>{iphone.mode || '1080p @ 60 FPS'}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px' }}>
                <div style={{ color: '#86868b', fontSize: '11px', fontWeight: 500 }}>Battery</div>
                <div style={{ color: '#f5f5f7', fontWeight: 600, fontSize: '13px', marginTop: '3px' }}>{iphone.battery_pct}%</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px' }}>
                <div style={{ color: '#86868b', fontSize: '11px', fontWeight: 500 }}>Transport Latency</div>
                <div style={{ color: '#0a84ff', fontWeight: 600, fontSize: '13px', marginTop: '3px' }}>{iphone.latency_ms || 12} ms</div>
              </div>
            </div>
          </div>

          {/* Apple Watch Status Card */}
          <div className="apple-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '10px',
                    background: 'rgba(10, 132, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Watch size={20} color="#0a84ff" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f5f5f7' }}>{watch.name}</h4>
                  <span style={{ fontSize: '12px', color: '#86868b' }}>Wrist Haptic Engine & Workout</span>
                </div>
              </div>

              <button
                onClick={() => onToggleDeviceSimulation('watch', !watch.connected)}
                className="glass-btn"
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: watch.connected ? '#30d158' : '#86868b',
                }}
              >
                {watch.connected ? 'Armed' : 'Offline'} (Toggle)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px' }}>
                <div style={{ color: '#86868b', fontSize: '11px', fontWeight: 500 }}>Heart Rate</div>
                <div style={{ color: '#ff453a', fontWeight: 600, fontSize: '13px', marginTop: '3px' }}>{watch.heart_rate_bpm || 142} BPM</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px' }}>
                <div style={{ color: '#86868b', fontSize: '11px', fontWeight: 500 }}>Active Calories</div>
                <div style={{ color: '#ff9f0a', fontWeight: 600, fontSize: '13px', marginTop: '3px' }}>{watch.active_calories || 385} kcal</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px' }}>
                <div style={{ color: '#86868b', fontSize: '11px', fontWeight: 500 }}>Battery</div>
                <div style={{ color: '#f5f5f7', fontWeight: 600, fontSize: '13px', marginTop: '3px' }}>{watch.battery_pct}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
