"use client";

import { useEffect, useState } from "react";
import { fetchJobStatus, jobEventsUrl } from "./api";
import type { JobStatus } from "./types";

export type StreamState = "idle" | "live" | "reconnecting" | "polling" | "done" | "lost";

const POLL_MS = 2000;
const MAX_POLL_FAILURES = 15; // ~30 s of an unreachable backend

const isTerminal = (job: JobStatus) => job.status === "completed" || job.status === "failed";

/**
 * Follows a pipeline job over Server-Sent Events (`/api/pipeline/events/{id}`).
 *
 * Every event carries a full JobStatus snapshot, so reconnecting is harmless: the browser retries
 * dropped connections by itself, and if the stream can't be (re)opened at all (for example a 404
 * after a backend restart) the hook falls back to polling the status endpoint.
 */
export function useJobStream(jobId: string | null) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [streamState, setStreamState] = useState<StreamState>("idle");

  useEffect(() => {
    if (!jobId) {
      setStreamState("idle");
      return;
    }
    let disposed = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource(jobEventsUrl(jobId), { withCredentials: true }); // sends the session cookie

    const apply = (next: JobStatus): boolean => {
      if (disposed || next.job_id !== jobId) return false;
      setJob(next);
      if (!isTerminal(next)) return false;
      source.close();
      setStreamState("done");
      return true;
    };

    const poll = async (failures: number): Promise<void> => {
      if (disposed) return;
      try {
        const next = await fetchJobStatus(jobId);
        if (disposed) return;
        if (next === null) {
          setStreamState("lost"); // the backend no longer knows this job
          return;
        }
        if (!apply(next)) pollTimer = setTimeout(() => void poll(0), POLL_MS);
      } catch {
        if (disposed) return;
        if (failures + 1 >= MAX_POLL_FAILURES) setStreamState("lost");
        else pollTimer = setTimeout(() => void poll(failures + 1), POLL_MS);
      }
    };

    setStreamState("live");
    source.onopen = () => {
      if (!disposed) setStreamState("live");
    };
    source.onmessage = (event: MessageEvent<string>) => {
      try {
        apply(JSON.parse(event.data) as JobStatus);
      } catch (err) {
        console.error("Ignoring malformed SSE payload", err);
      }
    };
    source.onerror = () => {
      if (disposed) return;
      if (source.readyState === EventSource.CLOSED) {
        setStreamState("polling"); // fatal: the browser won't retry on its own
        void poll(0);
      } else {
        setStreamState("reconnecting"); // transient: the browser retries (server sends retry: 3000)
      }
    };

    return () => {
      disposed = true;
      source.close();
      clearTimeout(pollTimer);
    };
  }, [jobId]);

  return { job, setJob, streamState };
}
