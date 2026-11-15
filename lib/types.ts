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
  why?: string | null; // the planner's one line on why this scene is in the tour
  verdict?: string | null; // the footage review's verdict for this scene
  seen?: string | null; // what the reviewer saw on screen
}

export interface Storyboard {
  project_name: string;
  tagline: string;
  scenes: Scene[];
  total_duration_sec: number;
  intro_sec?: number; // AI intro length before scene 1 (0 without AI clips)
  outro_sec?: number;
  intro_visual?: string | null;
  outro_visual?: string | null;
  plan_rationale?: string | null; // why these pages in this order (one sentence)
  music_prompt?: string | null; // Gemini's brief for the fal.ai soundtrack
  cover_visual?: string | null; // Gemini's brief for the fal.ai cover art
  soundtrack?: string | null; // how the soundtrack was made, or why it was skipped
  cover?: string | null; // how the cover art was made, or why it was skipped
}

export type StepStatus = "running" | "done" | "skipped" | "error";

/** One row of the agent trace (`JobStatus.steps`): a pipeline step and the tool behind it. */
export interface StepState {
  id: string;
  status: StepStatus;
  label: string;
  tool?: string | null; // gemini, fal, chromium, ffmpeg or github
  detail?: string | null;
  message?: string | null;
  started_at?: number | null; // unix seconds
  ended_at?: number | null;
}

/** One Gemini or fal.ai call the job made (`JobStatus.tool_calls`, the ledger). */
export interface ToolCall {
  tool: "gemini" | "fal" | string;
  purpose: string;
  model: string;
  started_at: number; // unix seconds
  ended_at?: number | null;
  ms?: number | null;
  ok?: boolean | null; // null while the call is in flight
  note?: string;
}

/** A page Gemini looked at (the `understand` step's one-off extra). Both server spellings are accepted. */
export interface StepPage {
  path?: string;
  title?: string;
  purpose?: string;
  best_moment?: string;
  demo_moment?: string;
  quality?: string; // ok, empty, error, login, ...
  thumb?: string; // base64 JPEG
  thumbnail_b64?: string;
}

/** The footage review's verdict for one scene (the `review` step's one-off extra). */
export interface StepVerdict {
  scene?: string | number;
  title?: string;
  verdict?: string;
  confidence?: number | string;
  seen?: string;
  issue?: string;
}

/** The one-off payload of a `step` SSE event (thumbnails, verdicts); never part of a JobStatus snapshot. */
export interface StepExtra {
  pages?: StepPage[];
  verdicts?: StepVerdict[];
  scenes?: StepVerdict[];
  thumb?: string; // base64 JPEG (cover art)
  thumbnail_b64?: string;
  [key: string]: unknown;
}

/** A `step` SSE event: the row, `t` (seconds since the job started) and the optional one-off extra. */
export interface StepEvent {
  id: string;
  status: StepStatus;
  label: string;
  tool?: string | null;
  t?: number;
  detail?: string;
  message?: string;
  extra?: StepExtra;
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
  jobId?: string; // on the start response (Launch Kit v2 naming)
  app_url?: string;
  created_at?: number;
  options?: { goals?: string[]; requestedLanguage?: string; language?: string };
  steps?: StepState[]; // the agent trace, one row per pipeline step (absent on older servers)
  tool_calls?: ToolCall[]; // every Gemini and fal.ai call, with latency
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
  session_storage_keys?: number;
  indexed_db_records?: number;
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

export interface FixtureEntry {
  url: string;
  method: string;
  status: number;
  body: unknown;
  post_data?: string | null;
  enabled: boolean;
  source: string;
}

export interface FixtureSet {
  id: string;
  origin: string;
  polished: boolean;
  brief: string;
  updated_at: number;
  entry_count: number;
  enabled_count: number;
  entries?: FixtureEntry[];
  note?: string;
}
