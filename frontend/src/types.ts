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

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ShotTrajectory {
  shot_number: number;
  stroke_type: string;
  speed_mph: number;
  call: CallDecision;
  margin_cm: number;
  start_pos: Point3D;
  apex_pos: Point3D;
  bounce_pos: Point3D;
  end_pos: Point3D;
  frame_idx: number;
  timestamp_ms: number;
  description: string;
  hitter?: 'user' | 'opponent';
  court_side?: 'near' | 'far';
  is_user_shot?: boolean;
}

export interface PoseFrame {
  frame_idx: number;
  timestamp_ms: number;
  landmarks: Record<string, Point2D>;
  elbow_angle_deg: number;
  shoulder_hip_separation_deg: number;
  knee_flexion_deg: number;
  kinetic_chain_pct: number;
}

export interface BiomechanicsData {
  dominant_hand: string;
  frames: PoseFrame[];
  stroke_counts: Record<string, number>;
  avg_elbow_extension_deg: number;
  avg_shoulder_hip_sep_deg: number;
  avg_knee_flexion_deg: number;
  stance_width_ratio: number;
  kinetic_efficiency_score: number;
  coaching_summary: string;
}

export interface UserProfile {
  id: string;
  name: string;
  handedness: 'Right' | 'Left';
  play_style: string;
  utr_rating: string;
}

export type SessionType = 'match' | 'rally' | 'serve' | 'challenge';

export interface SideChangeEvent {
  frame_idx: number;
  timestamp_ms: number;
  user_court_side: 'near' | 'far';
  opponent_court_side: 'far' | 'near';
  confidence: number;
  reason: string;
}

export interface PlayerTrackingInfo {
  user_name: string;
  user_handedness: string;
  current_court_side: 'near' | 'far';
  user_shirt_color: string;
  opponent_shirt_color: string;
  side_changes: SideChangeEvent[];
}

export interface SessionReport {
  session_id: string;
  session_type?: SessionType;
  player_name?: string;
  user_id?: string;
  created_at: string;
  video_metadata: VideoMetadata;
  camera_position: string;
  calibration: CourtCalibration;
  events: BounceEvent[];
  shots?: ShotTrajectory[];
  biomechanics?: BiomechanicsData;
  player_tracking?: PlayerTrackingInfo;
}

export interface SessionSummary {
  session_id: string;
  display_id?: string;
  session_type?: SessionType;
  player_name?: string;
  user_id?: string;
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
  status?: 'connected' | 'searching' | 'armed' | 'simulated' | 'offline';
  transport?: string;
  mode?: string;
  camera_position?: string;
  haptic_engine?: string;
  heart_rate_bpm?: number;
  active_calories?: number;
  battery_pct: number;
  latency_ms?: number;
  workout_active?: boolean;
  details?: string;
  is_simulated?: boolean;
}

export interface DeviceStatusResponse {
  iphone: DeviceInfo;
  watch: DeviceInfo;
  local_lan_ip?: string;
  pairing_url?: string;
  discovery_active?: boolean;
  hardware_found?: {
    usb: Array<any>;
    bonjour: Array<any>;
  };
  simulated_mode?: boolean;
  live_subscribers: number;
  server_time_ms: number;
}

export interface SampleVideo {
  filename: string;
  path: string;
  size_mb: number;
}
