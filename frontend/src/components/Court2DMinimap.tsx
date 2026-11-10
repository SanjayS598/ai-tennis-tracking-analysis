import React, { useRef, useEffect } from 'react';
import { BounceEvent } from '../types';

interface Court2DMinimapProps {
  events: BounceEvent[];
  selectedEvent: BounceEvent | null;
  onSelectEvent: (event: BounceEvent) => void;
  width?: number;
  height?: number;
}

export const Court2DMinimap: React.FC<Court2DMinimapProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  width = 300,
  height = 650,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ITF Dimensions in meters
  const COURT_LEN = 23.77;
  const SINGLES_W = 8.23;
  const DOUBLES_W = 10.97;
  const ALLEY = 1.37;
  const SERVICE_DIST = 5.485;
  const NET_DIST = 11.885;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High-DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Padding
    const padX = 25;
    const padY = 30;
    const drawW = width - 2 * padX;
    const drawH = height - 2 * padY;

    // Clear background
    ctx.fillStyle = '#064e3b'; // Forest green court
    ctx.fillRect(0, 0, width, height);

    // Coordinate mapping helper
    // court X: [-1.37, 9.60] -> [padX, padX + drawW]
    // court Y: [0, 23.77] -> [padY, padY + drawH]
    const mapX = (x: number) => padX + ((x + ALLEY) / DOUBLES_W) * drawW;
    const mapY = (y: number) => padY + (y / COURT_LEN) * drawH;

    // Draw Court Out-of-bounds border
    ctx.fillStyle = '#047857';
    ctx.fillRect(padX, padY, drawW, drawH);

    // Draw White Lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // 1. Doubles Sidelines & Baselines
    ctx.strokeRect(mapX(-ALLEY), mapY(0), mapX(SINGLES_W + ALLEY) - mapX(-ALLEY), mapY(COURT_LEN) - mapY(0));

    // 2. Singles Sidelines
    ctx.beginPath();
    ctx.moveTo(mapX(0), mapY(0));
    ctx.lineTo(mapX(0), mapY(COURT_LEN));
    ctx.moveTo(mapX(SINGLES_W), mapY(0));
    ctx.lineTo(mapX(SINGLES_W), mapY(COURT_LEN));
    ctx.stroke();

    // 3. Service Lines (Near & Far)
    ctx.beginPath();
    ctx.moveTo(mapX(0), mapY(SERVICE_DIST));
    ctx.lineTo(mapX(SINGLES_W), mapY(SERVICE_DIST));
    ctx.moveTo(mapX(0), mapY(COURT_LEN - SERVICE_DIST));
    ctx.lineTo(mapX(SINGLES_W), mapY(COURT_LEN - SERVICE_DIST));
    ctx.stroke();

    // 4. Center Service Line
    ctx.beginPath();
    ctx.moveTo(mapX(SINGLES_W / 2), mapY(SERVICE_DIST));
    ctx.lineTo(mapX(SINGLES_W / 2), mapY(COURT_LEN - SERVICE_DIST));
    ctx.stroke();

    // 5. Net (Center line)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mapX(-ALLEY - 0.5), mapY(NET_DIST));
    ctx.lineTo(mapX(SINGLES_W + ALLEY + 0.5), mapY(NET_DIST));
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Draw Bounces
    events.forEach((ev) => {
      if (!ev.estimated_court_xy) return;
      const bx = mapX(ev.estimated_court_xy.x);
      const by = mapY(ev.estimated_court_xy.y);
      const isSelected = selectedEvent?.event_id === ev.event_id;

      // Color by call
      let fillColor = '#10b981'; // IN (green)
      if (ev.call === 'OUT') fillColor = '#ef4444'; // OUT (red)
      if (ev.call === 'UNCERTAIN') fillColor = '#f59e0b'; // UNCERTAIN (amber)

      if (isSelected) {
        // Highlight ring
        ctx.beginPath();
        ctx.arc(bx, by, 12, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Bounce dot
      ctx.beginPath();
      ctx.arc(bx, by, isSelected ? 7 : 5, 0, 2 * Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [events, selectedEvent, width, height]);

  // Click handler on canvas
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const padX = 25;
    const padY = 30;
    const drawW = width - 2 * padX;
    const drawH = height - 2 * padY;
    const mapX = (x: number) => padX + ((x + ALLEY) / DOUBLES_W) * drawW;
    const mapY = (y: number) => padY + (y / COURT_LEN) * drawH;

    // Find closest event within click radius (15px)
    let closest: BounceEvent | null = null;
    let minDist = 15;

    events.forEach((ev) => {
      if (!ev.estimated_court_xy) return;
      const bx = mapX(ev.estimated_court_xy.x);
      const by = mapY(ev.estimated_court_xy.y);
      const d = Math.hypot(clickX - bx, clickY - by);
      if (d < minDist) {
        minDist = d;
        closest = ev;
      }
    });

    if (closest) {
      onSelectEvent(closest);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          cursor: 'pointer',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}
      />
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} /> IN
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} /> OUT
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} /> UNCERTAIN
        </span>
      </div>
    </div>
  );
};
