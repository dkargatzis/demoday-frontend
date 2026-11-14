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
