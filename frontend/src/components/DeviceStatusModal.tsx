import React, { useState } from 'react';
import { Smartphone, Watch, X, Wifi, RefreshCw, ExternalLink, Radio, CheckCircle2, AlertCircle, Copy, Check, QrCode } from 'lucide-react';
import { DeviceStatusResponse } from '../types';

interface DeviceStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceStatusResponse | null;
  onRefreshDevices?: () => void;
  onToggleDeviceSimulation: (device: string, connected: boolean) => void;
}

export const DeviceStatusModal: React.FC<DeviceStatusModalProps> = ({
  isOpen,
  onClose,
  devices,
  onRefreshDevices,
  onToggleDeviceSimulation,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !devices) return null;

  const iphone = devices.iphone;
  const watch = devices.watch;
  const hostIp =
    typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? window.location.hostname
      : (devices.local_lan_ip && !devices.local_lan_ip.startsWith('172.19.') && !devices.local_lan_ip.startsWith('172.18.') ? devices.local_lan_ip : '172.16.5.195');
  const pairingUrl = `http://${hostIp}:8000/companion`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=${encodeURIComponent(pairingUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pairingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScanNow = async () => {
    setIsScanning(true);
    try {
      await fetch('/api/devices/scan', { method: 'POST' });
      if (onRefreshDevices) {
        onRefreshDevices();
      }
    } catch (e) {
      console.warn('Scan error:', e);
    } finally {
      setTimeout(() => setIsScanning(false), 800);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
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
          maxWidth: '580px',
          padding: '28px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingRight: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                background: 'rgba(10, 132, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={18} color="#0a84ff" />
            </div>
            <div>
              <h2 style={{ fontSize: '19px', fontWeight: 700, margin: 0, color: '#f5f5f7', letterSpacing: '-0.02em' }}>
                Apple Hardware Discovery
              </h2>
              <span style={{ fontSize: '11px', color: '#86868b' }}>
                Active USB & Local Wi-Fi Bonjour Scanner
              </span>
            </div>
          </div>

          <button
            onClick={handleScanNow}
            disabled={isScanning}
            className="glass-btn"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#30d158',
            }}
          >
            <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>

        <p style={{ color: '#86868b', fontSize: '13px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
          Tennis AI scans for stationary iPhone cameras and Apple Watch wrist sensors over USB and local network WebSockets.
        </p>

        {/* Real Hardware Status Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* iPhone Status Card */}
          <div className="apple-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '10px',
                    background: iphone.connected ? 'rgba(48, 209, 88, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Smartphone size={20} color={iphone.connected ? '#30d158' : '#86868b'} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f5f5f7' }}>
                    {iphone.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: iphone.connected ? '#30d158' : '#ff9f0a',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: iphone.connected ? '#30d158' : '#ff9f0a', fontWeight: 500 }}>
                      {iphone.connected
                        ? (iphone.is_simulated ? 'Connected (Demo Mode)' : `Active (${iphone.transport || 'Live'})`)
                        : 'Searching USB & Local Network...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {iphone.connected ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px' }}>
                  <div style={{ color: '#86868b', fontSize: '11px', fontWeight: 500 }}>Stream Mode</div>
                  <div style={{ color: '#f5f5f7', fontWeight: 600, fontSize: '13px', marginTop: '3px' }}>{iphone.mode || '1080p @ 60 FPS'}</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px' }}>
                  <div style={{ color: '#86868b', fontSize: '11px', fontWeight: 500 }}>Battery</div>
                  <div style={{ color: '#f5f5f7', fontWeight: 600, fontSize: '13px', marginTop: '3px' }}>{iphone.battery_pct}%</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '10px' }}>
                  <div style={{ color: '#86868b', fontSize: '11px', fontWeight: 500 }}>Latency</div>
                  <div style={{ color: '#0a84ff', fontWeight: 600, fontSize: '13px', marginTop: '3px' }}>{iphone.latency_ms || 12} ms</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#86868b', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '10px', lineHeight: 1.4 }}>
                {iphone.details || 'Plug your iPhone into this Mac via USB cable, or open the pairing link below on your phone to connect instantly.'}
              </div>
            )}
          </div>

          {/* Apple Watch Status Card */}
          <div className="apple-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '10px',
                    background: watch.connected ? 'rgba(10, 132, 255, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Watch size={20} color={watch.connected ? '#0a84ff' : '#86868b'} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f5f5f7' }}>
                    {watch.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: watch.connected ? '#30d158' : '#86868b',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: watch.connected ? '#30d158' : '#86868b', fontWeight: 500 }}>
                      {watch.connected
                        ? (watch.is_simulated ? 'Armed (Demo Mode)' : 'Armed & Haptics Ready')
                        : 'Standby / Awaiting WebSocket Transport'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {watch.connected ? (
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
            ) : (
              <div style={{ fontSize: '12px', color: '#86868b', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 12px', borderRadius: '10px', lineHeight: 1.4 }}>
                {watch.details || 'Listening on port 8765 for Apple Watch CoreBluetooth / WebSocket telemetry bridge.'}
              </div>
            )}
          </div>

          {/* Real Device Pairing URL Banner with QR Code */}
          <div
            style={{
              background: 'rgba(48, 209, 88, 0.06)',
              border: '1px solid rgba(48, 209, 88, 0.25)',
              borderRadius: '16px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#30d158', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <QrCode size={16} /> Instant iPhone & Watch Connection
              </div>
              <a
                href={pairingUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '11px',
                  color: '#30d158',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                }}
              >
                Open in Browser <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {/* QR Code image */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '6px',
                  borderRadius: '10px',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
              >
                <img
                  src={qrCodeUrl}
                  alt="Pairing QR Code"
                  width={110}
                  height={110}
                  style={{ display: 'block' }}
                />
              </div>

              {/* Step-by-Step Instructions */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '8px' }}>
                  <strong>1.</strong> Ensure your iPhone is on the same Wi-Fi.<br />
                  <strong>2.</strong> Scan this QR code with your iPhone Camera (or open Safari).<br />
                  <strong>3.</strong> Tap <em>"Connect Camera & Haptics"</em>.
                </div>

                <div
                  style={{
                    background: '#000000',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#f5f5f7',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pairingUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '6px',
                      color: copied ? '#30d158' : '#cbd5e1',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Remote On-Court Tailscale Mode */}
          <div
            style={{
              background: 'rgba(10, 132, 255, 0.06)',
              border: '1px solid rgba(10, 132, 255, 0.25)',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0a84ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wifi size={15} /> Remote On-Court Mode (Tailscale Cellular)
              </div>
              <span style={{ fontSize: '11px', color: '#86868b' }}>No Court Wi-Fi Needed</span>
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '8px' }}>
              When playing outdoors on cellular, connect iPhone to your Tailscale mesh (e.g. Linux VM <code>ss-dsktp</code> at <code>100.100.166.88</code>). The phone records <strong>720p @ 60 FPS</strong> locally and uploads the last 15s on-demand when you challenge a line call.
            </div>
            <div
              style={{
                background: '#000000',
                padding: '8px 12px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#30d158',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              Tailscale Hub URL: http://100.100.166.88:8000
            </div>
          </div>

          {/* Developer / Demo Simulation Overrides */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#86868b' }}>
                Demo Simulation Mode
              </div>
              <div style={{ fontSize: '11px', color: '#636366' }}>
                Simulate iPhone & Watch for UI testing without physical devices
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onToggleDeviceSimulation('iphone', !iphone.connected)}
                className="glass-btn"
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  color: iphone.connected ? '#30d158' : '#86868b',
                }}
              >
                iPhone: {iphone.connected ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => onToggleDeviceSimulation('watch', !watch.connected)}
                className="glass-btn"
                style={{
                  padding: '5px 10px',
                  fontSize: '11px',
                  color: watch.connected ? '#30d158' : '#86868b',
                }}
              >
                Watch: {watch.connected ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
