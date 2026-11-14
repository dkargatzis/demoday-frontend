export interface Action {
  type: "navigate" | "click" | "type" | "scroll" | "wait";
  selector?: string;
  value?: string;
  dwell_ms?: number;
}

export interface Scene {
  id: string;
  title: string;
  route: string;
  narration: string;
  actions: Action[];
  duration_sec?: number;
}

export interface Storyboard {
  project_name: string;
  tagline: string;
  scenes: Scene[];
  total_duration_sec: number;
}

export interface LaunchKit {
  readme_markdown: string;
  devpost_pitch: string;
  x_thread: string[];
  linkedin_post: string;
}

export interface JobStatus {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  stage: string;
  logs: string[];
  storyboard?: Storyboard;
  launch_kit?: LaunchKit;
  video_url?: string;
  error?: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  ffmpeg: boolean;
  gemini: boolean;
  fal: boolean;
  gemini_model: string;
  vault: boolean;
  signup_code: boolean;
}

export interface User {
  id: string;
  email: string;
}

interface SavedSecret {
  id: string;
  kind: string;
  name: string;
  created_at: number;
}

export interface GitHubConnection extends SavedSecret {
  login: string;
  token_type: "classic" | "fine-grained";
  scopes: string;
}

export interface AppLogin extends SavedSecret {
  origin: string;
  cookie_count: number;
  last_url?: string;
}

export interface Settings {
  vault: boolean;
  github: GitHubConnection | null;
  app_logins: AppLogin[];
}

export interface CaptureStart {
  capture_id: string;
  origin: string;
  viewport: { width: number; height: number };
}
