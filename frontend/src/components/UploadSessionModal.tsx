import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  X,
  Loader2,
  Sparkles,
  AlertCircle,
  FileVideo,
  Video,
  Film,
  CheckCircle2,
} from 'lucide-react';
import { SessionReport, SessionType, UserProfile } from '../types';

interface UploadSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (session: SessionReport) => void;
  currentUser?: UserProfile;
}

export const UploadSessionModal: React.FC<UploadSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
  currentUser,
}) => {
  const [sourceType, setSourceType] = useState<'LOCAL' | 'SAMPLE'>('SAMPLE');
  const [file, setFile] = useState<File | null>(null);
  const [selectedSample, setSelectedSample] = useState<string>('match_clip_1.mp4');
  const [sessionType, setSessionType] = useState<SessionType>('match');
  const [playerName, setPlayerName] = useState<string>(currentUser?.name || 'Sanjay Shankar');
  const [isDoubles, setIsDoubles] = useState<boolean>(false);
  const [renderVideo, setRenderVideo] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentUser?.name) {
      setPlayerName(currentUser.name);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceType === 'LOCAL' && !file) {
      setErrorMessage('Please select a tennis video file to analyze.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusStep('Ingesting video footage to processing pipeline...');

    const formData = new FormData();
    if (sourceType === 'LOCAL' && file) {
      formData.append('file', file);
    } else {
      formData.append('sample_filename', selectedSample);
    }
    formData.append('session_type', sessionType);
    formData.append('player_name', playerName);
    formData.append('user_id', currentUser?.id || 'user_sanjay_shankar');
    formData.append('is_doubles', String(isDoubles));
    formData.append('render_video', String(renderVideo));

    const stepInterval = setInterval(() => {
      setStatusStep((prev) => {
        if (prev.includes('Ingesting')) return 'Calibrating ITF court corners & sub-pixel homography...';
        if (prev.includes('Calibrating')) return 'Executing PyTorch TrackNet deep neural network ball detection...';
        if (prev.includes('TrackNet')) return 'Computing parabolic trajectory inflection & court boundary intersections...';
        if (prev.includes('Computing parabolic')) return 'Extracting MediaPipe biomechanical landmarks & stroke classification...';
        return 'Finalizing session JSON report & rendering annotated 1080p replay...';
      });
    }, 4000);

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

  const sampleOptions = [
    {
      id: 'match_clip_1.mp4',
      title: 'US Open Final Point',
      desc: '1080p @ 30 FPS • Baseline rally with deep corner topspin',
      tag: 'Match Play',
    },
    {
      id: 'match_clip_2.mp4',
      title: 'Cross-Court Topspin Rally',
      desc: '1080p @ 30 FPS • High RPM exchange ending in sideline winner',
      tag: 'Rally Drill',
    },
    {
      id: 'match_clip_bounce.mp4',
      title: 'Hawk-Eye Close Sideline Call',
      desc: '1080p @ 30 FPS • Tight bounce on singles sideline chalk line',
      tag: 'Line Call',
    },
    {
      id: 'sample_tennis.mp4',
      title: 'First Serve & Forehand Sequence',
      desc: '1080p @ 30 FPS • Flat serve delivery followed by aggressive forehand',
      tag: 'Serve Practice',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
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
          maxWidth: '580px',
          padding: '32px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
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
            Record or Analyze Tennis Video
          </h2>
        </div>
        <p style={{ color: '#86868b', fontSize: '13px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
          Upload court footage or pick high-res sample footage. Tennis AI tracks the ball in realtime, executes sub-millimeter line calls, and extracts 3D biomechanics for{' '}
          <strong style={{ color: '#ffffff' }}>{currentUser?.name || 'Local Player'}</strong>.
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Source Mode Toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
                Video Source
              </label>
              <div className="glass-segmented" style={{ width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setSourceType('SAMPLE')}
                  className={`glass-segmented-item ${sourceType === 'SAMPLE' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '7px' }}
                >
                  <Film size={14} /> Court Sample Footage (4 Clips)
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('LOCAL')}
                  className={`glass-segmented-item ${sourceType === 'LOCAL' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '7px' }}
                >
                  <Upload size={14} /> Upload Local MP4 File
                </button>
              </div>
            </div>

            {sourceType === 'SAMPLE' ? (
              /* Sample Video Cards List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sampleOptions.map((opt) => {
                  const isSelected = selectedSample === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedSample(opt.id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1px solid rgba(48, 209, 88, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                            {opt.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '9999px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#cbd5e1',
                            }}
                          >
                            {opt.tag}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {opt.desc}
                        </div>
                      </div>

                      {isSelected && (
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#30d158',
                            color: '#000000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckCircle2 size={13} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* File Drag Drop Zone */
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: file ? '1.5px solid rgba(48, 209, 88, 0.4)' : '1.5px dashed rgba(255, 255, 255, 0.16)',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: file ? 'rgba(48, 209, 88, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-m4v"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: file ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: file ? '#30d158' : '#86868b',
                  }}
                >
                  {file ? <FileVideo size={22} /> : <Upload size={22} />}
                </div>

                {file ? (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>{file.name}</div>
                    <div style={{ fontSize: '12px', color: '#86868b', marginTop: '4px' }}>
                      {(file.size / (1024 * 1024)).toFixed(1)} MB • Click to replace
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>
                      Select or drop match video
                    </div>
                    <div style={{ fontSize: '12px', color: '#86868b', marginTop: '4px' }}>
                      MP4 or MOV • Up to 4K 60fps supported
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Session Type & Player Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', display: 'block', marginBottom: '6px' }}>
                  Session Type
                </label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value as SessionType)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: '#161922',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="match">Tournament Match</option>
                  <option value="rally">Baseline Rally Drill</option>
                  <option value="serve">Serve Practice</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#86868b', display: 'block', marginBottom: '6px' }}>
                  Player Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={renderVideo}
                  onChange={(e) => setRenderVideo(e.target.checked)}
                  style={{ accentColor: '#30d158', width: 16, height: 16 }}
                />
                Render 1080p replay video with TrackNet ball trajectory overlays
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#cbd5e1' }}>
                <input
                  type="checkbox"
                  checked={isDoubles}
                  onChange={(e) => setIsDoubles(e.target.checked)}
                  style={{ accentColor: '#30d158', width: 16, height: 16 }}
                />
                Doubles match (use outer doubles sidelines for boundary calls)
              </label>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 69, 58, 0.12)',
                  border: '1px solid rgba(255, 69, 58, 0.3)',
                  color: '#ff453a',
                  fontSize: '12px',
                }}
              >
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="glass-btn-prominent"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                justifyContent: 'center',
                marginTop: '4px',
              }}
            >
              Start Analysis & Track Shots
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
