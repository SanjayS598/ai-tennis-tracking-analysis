import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Volume2, VolumeX, ShieldCheck, Zap, AlertTriangle, Activity } from 'lucide-react';
import { CallDecision } from '../types';

interface LiveCallState {
  call: CallDecision | 'READY';
  confidence: number;
  reason: string;
  latencyMs: number;
  timestamp: number;
}

export const LiveMonitorView: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [latestCall, setLatestCall] = useState<LiveCallState>({
    call: 'READY',
    confidence: 1.0,
    reason: 'Awaiting on-court ball impact...',
    latencyMs: 12,
    timestamp: Date.now(),
  });

  const playBeep = (freq = 880, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
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
            const latency = data.server_time_ms ? Math.max(2, Math.round(now - data.server_time_ms)) : 14;
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
    } catch (e) {
      setIsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [soundEnabled]);

  const triggerSimulatedCall = (call: CallDecision) => {
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
      case 'IN': return { bg: 'rgba(48, 209, 88, 0.14)', text: '#30d158', border: 'rgba(48, 209, 88, 0.4)' };
      case 'OUT': return { bg: 'rgba(255, 69, 58, 0.14)', text: '#ff453a', border: 'rgba(255, 69, 58, 0.4)' };
      case 'UNCERTAIN': return { bg: 'rgba(255, 159, 10, 0.14)', text: '#ff9f0a', border: 'rgba(255, 159, 10, 0.4)' };
      default: return { bg: 'rgba(255, 255, 255, 0.04)', text: '#94a3b8', border: 'rgba(255, 255, 255, 0.08)' };
    }
  };

  const colors = getCallColor();

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '24px' }}>
      {/* Floating Status Bar */}
      <div className="liquid-glass-capsule" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', padding: '12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isConnected ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#30d158', fontWeight: 600, fontSize: '13px' }}>
              <Wifi size={16} /> Live WebSocket Connected (:8765)
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px' }}>
              <WifiOff size={16} /> Simulation Mode Active
            </span>
          )}
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="glass-btn"
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          {soundEnabled ? <Volume2 size={15} color="#30d158" /> : <VolumeX size={15} color="#94a3b8" />}
          <span>Audio Cues</span>
        </button>
      </div>

      {/* Main Full-Screen Display Card */}
      <div
        className="apple-card"
        style={{
          background: colors.bg,
          borderColor: colors.border,
          borderRadius: '24px',
          padding: '64px 32px',
          textAlign: 'center',
          boxShadow: `0 20px 60px ${colors.border}22`,
          marginBottom: '28px',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Live On-Court Verdict
        </div>

        <div style={{ fontSize: '76px', fontWeight: 900, color: colors.text, letterSpacing: '-2px', margin: '14px 0 10px 0' }}>
          {latestCall.call}
        </div>

        <div style={{ fontSize: '16px', color: '#e2e8f0', fontWeight: 500, maxWidth: '420px', margin: '0 auto 24px' }}>
          {latestCall.reason}
        </div>

        {/* Telemetry pill */}
        <div style={{ display: 'inline-flex', gap: '16px', padding: '8px 18px', background: 'rgba(0, 0, 0, 0.35)', borderRadius: '9999px', fontSize: '12px', color: '#94a3b8' }}>
          <span>Latency: <strong style={{ color: '#0a84ff' }}>{latestCall.latencyMs} ms</strong></span>
          <span>•</span>
          <span>Confidence: <strong style={{ color: '#30d158' }}>{(latestCall.confidence * 100).toFixed(0)}%</strong></span>
        </div>
      </div>

      {/* Manual Trigger Buttons for On-Court Testing */}
      <div className="apple-card" style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
          Simulate Line Calls (Haptic Test)
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
          <button
            onClick={() => triggerSimulatedCall('IN')}
            className="glass-btn"
            style={{ borderColor: 'rgba(48, 209, 88, 0.4)', color: '#30d158' }}
          >
            <ShieldCheck size={16} /> Simulate IN (.success)
          </button>

          <button
            onClick={() => triggerSimulatedCall('OUT')}
            className="glass-btn"
            style={{ borderColor: 'rgba(255, 69, 58, 0.4)', color: '#ff453a' }}
          >
            <Zap size={16} /> Simulate OUT (.failure)
          </button>

          <button
            onClick={() => triggerSimulatedCall('UNCERTAIN')}
            className="glass-btn"
            style={{ borderColor: 'rgba(255, 159, 10, 0.4)', color: '#ff9f0a' }}
          >
            <AlertTriangle size={16} /> Simulate UNCERTAIN (.retry)
          </button>
        </div>
      </div>
    </div>
  );
};
