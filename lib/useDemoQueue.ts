"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudienceInput } from "./audience";
import type { JobStatus } from "./types";

/**
 * A sequential "Generate for N customers" queue. The next customer starts when the pipeline is idle: no job, or
 * the current one completed/failed, and no start in flight (`starting`). Recording is serialized server-side
 * anyway, so one at a time is as fast as it gets. The queue lives in this tab: closing it drops what is left
 * (the page's leave guard warns while `queue.length > 0`); jobs already started finish on the server.
 */
export function useDemoQueue({
  jobStatus,
  starting,
  startWith,
}: {
  jobStatus: JobStatus["status"] | null | undefined;
  starting: boolean;
  startWith: (audience: AudienceInput) => unknown;
}) {
  const [queue, setQueue] = useState<AudienceInput[]>([]);
  const startRef = useRef(startWith);
  useEffect(() => {
    startRef.current = startWith;
  }, [startWith]);

  const idle = !starting && (jobStatus == null || jobStatus === "completed" || jobStatus === "failed");

  useEffect(() => {
    if (!idle || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    startRef.current(next); // flips `starting` in the same batch, so this effect does not fire twice
  }, [idle, queue]);

  const enqueue = useCallback((list: AudienceInput[]) => setQueue((current) => [...current, ...list]), []);
  const cancel = useCallback(() => setQueue([]), []);

  return { queue, enqueue, cancel };
}
