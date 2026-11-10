import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Sparkles, AlertCircle, FileVideo, Video } from 'lucide-react';
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
        if (e.target === e.currentTarget && !isProcessing) onClose();
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
        {!isProcessing && (
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
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              background: 'rgba(48, 209, 88, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} color="#30d158" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#f5f5f7', letterSpacing: '-0.02em' }}>
            Upload Match & Session Footage
          </h2>
        </div>
        <p style={{ color: '#86868b', fontSize: '13px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
          Upload stationary baseline footage. Tennis AI tracks the ball, calls every line (<code style={{ color: '#30d158' }}>IN</code> / <code style={{ color: '#ff453a' }}>OUT</code>), and reconstructs the 3D trajectory.
        </p>

        {isProcessing ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(48, 209, 88, 0.12)',
                border: '1px solid rgba(48, 209, 88, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <Loader2 size={32} color="#30d158" className="animate-spin" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0', color: '#f5f5f7', letterSpacing: '-0.01em' }}>
              Analyzing Tennis Session...
            </h3>
            <p style={{ fontSize: '13px', color: '#30d158', fontWeight: 500, minHeight: '36px', lineHeight: 1.4 }}>
              {statusStep}
            </p>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden', marginTop: '20px' }}>
              <div
                style={{
                  width: '75%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #30d158 0%, #0a84ff 100%)',
                  borderRadius: '999px',
                }}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* File Drag Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: file ? '1.5px solid rgba(48, 209, 88, 0.4)' : '1.5px dashed rgba(255, 255, 255, 0.16)',
                borderRadius: '16px',
                padding: '28px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'rgba(48, 209, 88, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <FileVideo size={36} color={file ? '#30d158' : '#86868b'} style={{ margin: '0 auto 10px', display: 'block' }} />
              {file ? (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>{file.name}</div>
                  <div style={{ fontSize: '12px', color: '#86868b', marginTop: '4px' }}>
                    {(file.size / (1024 * 1024)).toFixed(1)} MB • Click to replace
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#f5f5f7' }}>
                    Click or drag tennis video clip here
                  </div>
                  <div style={{ fontSize: '12px', color: '#86868b', marginTop: '4px' }}>
                    Supports MP4, MOV (1080p @ 30/60 FPS recommended)
                  </div>
                </div>
              )}
            </div>

            {/* Session Type Selector using Apple Segmented Glass Picker */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Session Category
              </label>
              <div className="glass-segmented" style={{ width: '100%', display: 'flex' }}>
                {(
                  [
                    { id: 'match', label: 'Match' },
                    { id: 'rally', label: 'Rally' },
                    { id: 'serve', label: 'Serve' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSessionType(t.id)}
                    className={sessionType === t.id ? 'active' : ''}
                    style={{ flex: 1, textAlign: 'center', padding: '8px 12px' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Player Name */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Player Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#f5f5f7',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border 0.2s',
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
                style={{ cursor: 'pointer', accentColor: '#30d158', width: 16, height: 16 }}
              />
              <label htmlFor="renderVideo" style={{ fontSize: '13px', color: '#86868b', cursor: 'pointer' }}>
                Render 1080p annotated video overlay (TrackNet trail & court wireframe)
              </label>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 69, 58, 0.12)',
                  border: '1px solid rgba(255, 69, 58, 0.28)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '12px',
                  color: '#ff453a',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="glass-btn-prominent"
              style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
              }}
            >
              <Upload size={16} /> Analyze Video with AI
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
