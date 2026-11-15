"use client";

import { useEffect, useState } from "react";
import { fetchJobStatus, jobEventsUrl } from "./api";
import type { JobStatus, StepEvent, StepExtra } from "./types";

export type StreamState = "idle" | "live" | "reconnecting" | "polling" | "done" | "lost";

/** When a step's `step` events arrived, in seconds since the job started (the events' `t`). */
export interface StepMark {
  started?: number;
  ended?: number;
}

const POLL_MS = 2000;
const MAX_POLL_FAILURES = 15; // ~30 s of an unreachable backend

const isTerminal = (job: JobStatus) => job.status === "completed" || job.status === "failed";

/**
 * Follows a pipeline job over Server-Sent Events (`/api/pipeline/events/{id}`).
 *
 * The stream is typed (`job`, `step`, `log`, `status`, then `done` or `error`); this hook renders the
 * `status` snapshots (a full JobStatus each) and the final `done`, so reconnecting is harmless: the
 * browser retries dropped connections by itself (replaying from `Last-Event-ID`), and if the stream
 * can't be (re)opened at all (for example a 404 after a backend restart) the hook falls back to
 * polling the status endpoint.
 *
 * The trace rows (`job.steps`) and the ledger (`job.tool_calls`) ride on the snapshots; only the heavy one-off
 * payloads of `step` events (page thumbnails, review verdicts, cover art) are collected separately, per step id.
 * A reconnect replays them from `Last-Event-ID`, and a fresh tab on /?job=<id> gets the whole log again.
 */
export function useJobStream(jobId: string | null) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [stepExtras, setStepExtras] = useState<Record<string, StepExtra>>({});
  const [stepMarks, setStepMarks] = useState<Record<string, StepMark>>({});

  useEffect(() => {
    setStepExtras({});
    setStepMarks({});
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
    const onSnapshot = (event: Event) => {
      try {
        apply(JSON.parse((event as MessageEvent<string>).data) as JobStatus);
      } catch (err) {
        console.error("Ignoring malformed SSE payload", err);
      }
    };
    source.addEventListener("status", onSnapshot);
    source.addEventListener("done", onSnapshot);
    source.onmessage = onSnapshot; // older backends: unnamed snapshots
    const onStep = (event: Event) => {
      if (disposed) return;
      try {
        const step = JSON.parse((event as MessageEvent<string>).data) as StepEvent;
        if (!step || typeof step.id !== "string") return;
        if (step.extra && typeof step.extra === "object") {
          const extra = step.extra;
          setStepExtras((prev) => ({ ...prev, [step.id]: { ...prev[step.id], ...extra } }));
        }
        if (typeof step.t === "number") {
          setStepMarks((prev) => {
            const mark: StepMark = { ...prev[step.id] };
            if (step.status === "running") mark.started = step.t;
            else mark.ended = step.t;
            return { ...prev, [step.id]: mark };
          });
        }
      } catch (err) {
        console.error("Ignoring malformed step event", err);
      }
    };
    source.addEventListener("step", onStep);
    source.onerror = (event: Event) => {
      if (disposed) return;
      if ("data" in event) {
        // The server's own `error` event: the job failed (or is unknown). Fetch the final snapshot once.
        source.close();
        setStreamState("polling");
        void poll(0);
        return;
      }
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

  return { job, setJob, streamState, stepExtras, stepMarks };
}
