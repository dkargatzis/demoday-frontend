import { JobStatus } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function startPipelineJob(data: {
  repo_url: string;
  app_url: string;
  voice_style?: string;
  target_seconds?: number;
}): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/api/pipeline/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to start pipeline: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/api/pipeline/status/${jobId}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Job not found");
  }
  return res.json();
}

export function getFullVideoUrl(relativeOrFullUrl: string): string {
  if (relativeOrFullUrl.startsWith("http")) return relativeOrFullUrl;
  return `${API_BASE}${relativeOrFullUrl}`;
}
