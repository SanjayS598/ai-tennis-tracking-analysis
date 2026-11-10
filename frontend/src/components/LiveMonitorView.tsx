import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Volume2, VolumeX, Activity, Send } from 'lucide-react';
import { BounceEvent } from '../types';

export const LiveMonitorView: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [latestCall, setLatestCall] = useState<{
    call: string;
    confidence: number;
    reason: string;
    latencyMs: number;
    timestamp: number;
  }>({
    call: 'READY',
    confidence: 1.0,
    reason: 'Waiting for match ball bounces...',
    latencyMs: 12,
    timestamp: Date.now(),
  });
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Play synthetic web audio beep
  const playBeep = (freq: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      // AudioContext policy
    }
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8765`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => setIsConnected(false);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'LINE_CALL') {
            const now = Date.now();
            const latency = data.server_time_ms ? Math.max(2, Math.round(now - data.server_time_ms)) : 15;
            setLatestCall({
              call: data.event.call,
              confidence: data.event.call_confidence,
              reason: data.event.reason,
              latencyMs: latency,
              timestamp: now,
            });

            if (data.event.call === 'IN') playBeep(880, 'sine');
            else if (data.event.call === 'OUT') playBeep(330, 'square');
            else playBeep(550, 'triangle');
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (ws) ws.close();
    };
  }, [soundEnabled]);

  const simulateCall = (call: 'IN' | 'OUT' | 'UNCERTAIN') => {
    setLatestCall({
      call,
      confidence: call === 'UNCERTAIN' ? 0.65 : 0.98,
      reason: call === 'IN' ? 'cleanly_inside_court' : call === 'OUT' ? 'past_baseline (margin=4.2cm)' : 'marginal_line_uncertainty',
      latencyMs: Math.floor(Math.random() * 8) + 8,
      timestamp: Date.now(),
    });

    if (call === 'IN') playBeep(880, 'sine');
    else if (call === 'OUT') playBeep(330, 'square');
    else playBeep(550, 'triangle');
  };

  const getCallColor = () => {
    switch (latestCall.call) {
      case 'IN': return { bg: '#064e3b', text: '#34d399', border: '#10b981' };
      case 'OUT': return { bg: '#7f1d1d', text: '#f87171', border: '#ef4444' };
      case 'UNCERTAIN': return { bg: '#78350f', text: '#fbbf24', border: '#f59e0b' };
      default: return { bg: '#0f172a', text: '#94a3b8', border: '#334155' };
    }
  };

  const colors = getCallColor();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      {/* Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: '#0b0f19', padding: '16px 20px', borderRadius: '12px', border: '1px solid #1f2937' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isConnected ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 600 }}>
              <Wifi size={18} /> WebSocket Connected (ws://localhost:8765)
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
              <WifiOff size={18} /> Server Standby (Simulation Mode Active)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: '#1f2937',
              color: soundEnabled ? '#34d399' : '#6b7280',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />} Audio Cues
          </button>
        </div>
      </div>

      {/* Hero Display Card (Watch & On-Court View) */}
      <div
        style={{
          background: colors.bg,
          border: `3px solid ${colors.border}`,
          borderRadius: '24px',
          padding: '60px 24px',
          textAlign: 'center',
          boxShadow: `0 20px 50px -10px ${colors.border}40`,
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px', color: colors.text, opacity: 0.8, marginBottom: '8px' }}>
          Official Line Call
        </div>

        <div style={{ fontSize: '100px', fontWeight: 900, color: colors.text, letterSpacing: '-2px', lineHeight: 1 }}>
          {latestCall.call}
        </div>

        <div style={{ fontSize: '20px', fontWeight: 600, color: '#f3f4f6', marginTop: '16px' }}>
          {latestCall.reason}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px', fontSize: '14px', color: '#cbd5e1' }}>
          <span>Confidence: <strong>{(latestCall.confidence * 100).toFixed(0)}%</strong></span>
          <span>Delivery Latency: <strong>{latestCall.latencyMs} ms</strong></span>
        </div>
      </div>

      {/* Simulator Controls */}
      <div style={{ marginTop: '24px', background: '#0b0f19', padding: '20px', borderRadius: '12px', border: '1px solid #1f2937' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={16} /> Manual Trigger Simulation (Test Watch & On-Screen Audio)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <button
            onClick={() => simulateCall('IN')}
            style={{ padding: '12px', background: '#064e3b', color: '#34d399', border: '1px solid #10b981', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            Trigger "IN"
          </button>
          <button
            onClick={() => simulateCall('OUT')}
            style={{ padding: '12px', background: '#7f1d1d', color: '#f87171', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            Trigger "OUT"
          </button>
          <button
            onClick={() => simulateCall('UNCERTAIN')}
            style={{ padding: '12px', background: '#78350f', color: '#fbbf24', border: '1px solid #f59e0b', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >
            Trigger "UNCERTAIN"
          </button>
        </div>
      </div>
    </div>
  );
};
