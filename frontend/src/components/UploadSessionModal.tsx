import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, Loader2, Sparkles, AlertCircle, FileVideo } from 'lucide-react';
import { SessionReport, SessionType } from '../types';

interface UploadSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (session: SessionReport) => void;
}

export const UploadSessionModal: React.FC<UploadSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [sessionType, setSessionType] = useState<SessionType>('match');
  const [playerName, setPlayerName] = useState<string>('Sanjay Shankar');
  const [isDoubles, setIsDoubles] = useState<boolean>(false);
  const [renderVideo, setRenderVideo] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a tennis video file to analyze.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusStep('Uploading video footage to processing pipeline...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_type', sessionType);
    formData.append('player_name', playerName);
    formData.append('is_doubles', String(isDoubles));
    formData.append('render_video', String(renderVideo));

    // Simulated progress updates for user feedback
    const stepInterval = setInterval(() => {
      setStatusStep((prev) => {
        if (prev.includes('Uploading')) return 'Calibrating ITF court corners & sub-pixel homography...';
        if (prev.includes('Calibrating')) return 'Executing PyTorch TrackNet deep neural network ball detection...';
        if (prev.includes('TrackNet')) return 'Computing parabolic trajectory inflection & court boundary intersections...';
        if (prev.includes('Computing parabolic')) return 'Extracting MediaPipe biomechanical landmarks & stroke classification...';
        return 'Finalizing session JSON report & rendering annotated 1080p replay...';
      });
    }, 4500);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with HTTP ${res.status}`);
      }

      const report: SessionReport = await res.json();
      setIsProcessing(false);
      onSessionCreated(report);
      onClose();
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsProcessing(false);
      setErrorMessage(err.message || 'An error occurred while processing the session.');
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
          maxWidth: '560px',
          padding: '32px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        {!isProcessing && (
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
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Sparkles size={20} color="#10b981" />
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
            Upload Match & Session Footage
          </h2>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
          Upload stationary baseline footage. Tennis AI tracks the ball, calls every line (`IN`/`OUT`), and reconstructs the 3D trajectory.
        </p>

        {isProcessing ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <Loader2 size={32} color="#10b981" className="animate-spin" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px 0', color: '#ffffff' }}>
              Analyzing Tennis Session...
            </h3>
            <p style={{ fontSize: '13px', color: '#34d399', fontWeight: 600, minHeight: '36px' }}>
              {statusStep}
            </p>
            <div style={{ width: '100%', height: '6px', background: '#1f2937', borderRadius: '3px', overflow: 'hidden', marginTop: '16px' }}>
              <div
                style={{
                  width: '70%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)',
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* File Drag Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #374151',
                borderRadius: '12px',
                padding: '28px',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'rgba(16, 185, 129, 0.08)' : 'rgba(17, 24, 39, 0.6)',
                transition: 'all 0.2s',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <FileVideo size={36} color={file ? '#10b981' : '#6b7280'} style={{ margin: '0 auto 10px' }} />
              {file ? (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{file.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    {(file.size / (1024 * 1024)).toFixed(1)} MB • Click to replace
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>
                    Click or drag tennis video clip here
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    Supports MP4, MOV (1080p @ 30/60 FPS recommended)
                  </div>
                </div>
              )}
            </div>

            {/* Session Type Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                SESSION CATEGORY
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(
                  [
                    { id: 'match', label: '🏆 Match' },
                    { id: 'rally', label: '🎾 Rally' },
                    { id: 'serve', label: '⚡ Serve' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSessionType(t.id)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: sessionType === t.id ? '1px solid #10b981' : '1px solid #374151',
                      background: sessionType === t.id ? 'rgba(16, 185, 129, 0.2)' : '#111827',
                      color: sessionType === t.id ? '#34d399' : '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Player Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                PLAYER NAME
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{
                  width: '100%',
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Render video option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="renderVideo"
                checked={renderVideo}
                onChange={(e) => setRenderVideo(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#10b981' }}
              />
              <label htmlFor="renderVideo" style={{ fontSize: '13px', color: '#cbd5e1', cursor: 'pointer' }}>
                Render 1080p annotated video overlay (TrackNet trail & court wireframe)
              </label>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #dc2626',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#f87171',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
              }}
            >
              <Upload size={18} /> Analyze Video with AI
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
