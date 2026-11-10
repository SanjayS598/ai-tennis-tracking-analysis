export type CallDecision = 'IN' | 'OUT' | 'UNCERTAIN';

export interface Point2D {
  x: number;
  y: number;
}

export interface VideoMetadata {
  source_video: string;
  fps: number;
  width: number;
  height: number;
  total_frames: number;
  duration_sec: number;
}

export interface CourtCalibration {
  image_points: Point2D[];
  court_points: Point2D[];
  homography: number[][] | null;
  status: string;
}

export interface BounceEvent {
  event_id: string;
  session_id: string;
  frame_idx: number;
  timestamp_ms: number;
  type: string;
  ball_image_xy: Point2D;
  estimated_court_xy: Point2D | null;
  bounce_confidence: number;
  call: CallDecision;
  call_confidence: number;
  reason: string;
}

export type SessionType = 'match' | 'rally' | 'serve';

export interface SessionReport {
  session_id: string;
  session_type?: SessionType;
  player_name?: string;
  created_at: string;
  video_metadata: VideoMetadata;
  camera_position: string;
  calibration: CourtCalibration;
  events: BounceEvent[];
}

export interface SessionSummary {
  session_id: string;
  display_id?: string;
  session_type?: SessionType;
  player_name?: string;
  created_at: string;
  source_video: string;
  duration_sec: number;
  total_frames: number;
  fps: number;
  has_annotated_video: boolean;
  total_events: number;
  in_calls: number;
  out_calls: number;
  uncertain_calls: number;
}

export interface DeviceInfo {
  name: string;
  connected: boolean;
  mode?: string;
  camera_position?: string;
  haptic_engine?: string;
  heart_rate_bpm?: number;
  active_calories?: number;
  battery_pct: number;
  latency_ms?: number;
  workout_active?: boolean;
}

export interface DeviceStatusResponse {
  iphone: DeviceInfo;
  watch: DeviceInfo;
  live_subscribers: number;
  server_time_ms: number;
}

export interface SampleVideo {
  filename: string;
  path: string;
  size_mb: number;
}
