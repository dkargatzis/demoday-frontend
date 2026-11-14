import type { HealthStatus, JobStatus } from "./types";

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export async function checkBackendHealth(): Promise<HealthStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as HealthStatus) : null;
  } catch {
    return null;
  }
}

export async function startPipelineJob(data: {
  repo_url: string;
  app_url: string;
  voice_style?: string;
  target_seconds?: number;
}): Promise<JobStatus> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/pipeline/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error(`Cannot reach the backend at ${API_BASE}. Is it running?`);
  }
  if (!res.ok) {
    throw new Error(await describeError(res));
  }
  return res.json();
}

/** Current job snapshot, or null when the backend no longer knows the job (e.g. it restarted). */
export async function fetchJobStatus(jobId: string): Promise<JobStatus | null> {
  const res = await fetch(`${API_BASE}/api/pipeline/status/${encodeURIComponent(jobId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Status request failed: ${res.status}`);
  return res.json();
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
