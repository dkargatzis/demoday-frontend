import type {
  AppLogin,
  CaptureStart,
  GitHubConnection,
  HealthStatus,
  JobStatus,
  Settings,
  User,
} from "./types";

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Every call carries the HttpOnly session cookie set by the backend. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      credentials: "include",
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError(0, `Cannot reach the backend at ${API_BASE}. Is it running?`);
  }
  if (!res.ok) throw new ApiError(res.status, await describeError(res));
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

// ---------------------------------------------------------------- health & accounts

export async function checkBackendHealth(): Promise<HealthStatus | null> {
  try {
    return await request<HealthStatus>("/api/health");
  } catch {
    return null;
  }
}

/** The signed-in user, or null when signed out. Throws ApiError(0) when the backend is unreachable. */
export async function getMe(): Promise<User | null> {
  try {
    return await request<User>("/api/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export const signIn = (email: string, password: string) => request<User>("/api/auth/login", json({ email, password }));

export const signUp = (email: string, password: string, signupCode?: string) =>
  request<User>("/api/auth/signup", json({ email, password, signup_code: signupCode || undefined }));

export const signOut = () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });

// ---------------------------------------------------------------- pipeline

export function startPipelineJob(data: {
  repo_urls: string[];
  app_url: string;
  voice_style?: string;
  target_seconds?: number;
  use_app_login?: boolean;
}): Promise<JobStatus> {
  return request<JobStatus>("/api/pipeline/start", json(data));
}

/** Current job snapshot, or null when the backend no longer knows the job. */
export async function fetchJobStatus(jobId: string): Promise<JobStatus | null> {
  try {
    return await request<JobStatus>(`/api/pipeline/status/${encodeURIComponent(jobId)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Server-Sent Events stream: every message is a full JobStatus snapshot. */
export function jobEventsUrl(jobId: string): string {
  return `${API_BASE}/api/pipeline/events/${encodeURIComponent(jobId)}`;
}

export function getFullVideoUrl(relativeOrFullUrl: string): string {
  if (relativeOrFullUrl.startsWith("http")) return relativeOrFullUrl;
  return `${API_BASE}${relativeOrFullUrl}`;
}

/** The `download` attribute is ignored cross-origin, so ask the backend for an attachment instead. */
export function getDownloadUrl(relativeOrFullUrl: string): string {
  return `${getFullVideoUrl(relativeOrFullUrl)}?download=1`;
}

// ---------------------------------------------------------------- settings: GitHub token & app logins

export const getSettings = () => request<Settings>("/api/settings");

export const saveGitHubToken = (token: string) =>
  request<GitHubConnection>("/api/settings/github-token", { method: "PUT", body: JSON.stringify({ token }) });

export const deleteGitHubToken = () => request<{ ok: boolean }>("/api/settings/github-token", { method: "DELETE" });

export const listAppLogins = () => request<AppLogin[]>("/api/app-logins");

export const deleteAppLogin = (id: string) =>
  request<{ ok: boolean }>(`/api/app-logins/${encodeURIComponent(id)}`, { method: "DELETE" });

export const startCapture = (appUrl: string) => request<CaptureStart>("/api/app-logins/capture", json({ app_url: appUrl }));

export const finishCapture = (captureId: string) =>
  request<AppLogin>(`/api/app-logins/capture/${encodeURIComponent(captureId)}/finish`, { method: "POST" });

export const cancelCapture = (captureId: string) =>
  request<{ ok: boolean }>(`/api/app-logins/capture/${encodeURIComponent(captureId)}`, { method: "DELETE" });

/** WebSocket for the live sign-in view (the browser sends the session cookie on the handshake). */
export function captureSocketUrl(captureId: string): string {
  return `${API_BASE.replace(/^http/, "ws")}/api/app-logins/capture/${encodeURIComponent(captureId)}/ws`;
}

/** scheme://host[:port] of a URL, matching how the backend keys saved app logins. */
export function originOf(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.origin.toLowerCase() : null;
  } catch {
    return null;
  }
}

async function describeError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail
        .map((d: { loc?: unknown[]; msg?: string }) => `${(d.loc ?? []).slice(1).join(".")}: ${d.msg}`)
        .join("; ");
    }
  } catch {
    // not JSON
  }
  return `${res.status} ${res.statusText}`;
}
