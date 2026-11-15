import type { JobStatus, Scene, StepExtra, StepFunnel, StepPage, StepState, StepVerdict } from "./types";

/** mm:ss for the job timer. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Short duration for a trace row: 3.4s, 27s, 1m 05s. */
export function formatDuration(seconds: number): string {
  const sec = Math.max(0, seconds);
  if (sec < 10) return `${sec.toFixed(1)}s`;
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/** True when a storyboard note (`soundtrack`, `cover`) says the asset was made, not why it was skipped. */
export const assetMade = (note?: string | null): boolean =>
  !!note && !/^\s*(skipped|not |no |none|failed|off\b|disabled|unavailable)/i.test(note);

export type VerdictKind = "ok" | "warn" | "static" | "mismatch" | "unknown";

/** Chip colours per verdict bucket (shared by the trace and the theater). */
export const VERDICT_CLASS: Record<VerdictKind, string> = {
  ok: "bg-emerald-500/10 border-emerald-500/40 text-emerald-300",
  warn: "bg-amber-500/10 border-amber-500/40 text-amber-300",
  static: "bg-zinc-900 border-zinc-700 text-zinc-300",
  mismatch: "bg-amber-500/10 border-amber-500/40 text-amber-200",
  unknown: "bg-zinc-900 border-zinc-800 text-zinc-400",
};

/** Buckets a review verdict ("ok", "blank", "sign-in wall", "static", "mismatch", ...) for its chip. */
export function verdictKind(verdict?: string | null): VerdictKind {
  const v = (verdict ?? "").trim().toLowerCase();
  if (!v) return "unknown";
  if (/^(ok|pass|passed|good|fine|match|matches|matched|verified|yes)\b/.test(v)) return "ok";
  if (/static|frozen|no motion|unchanged|still/.test(v)) return "static";
  if (/mismatch|wrong|different|unexpected|off[- ]script/.test(v)) return "mismatch";
  if (/blank|empty|error|sign|login|log in|404|fail|missing|broken|crash/.test(v)) return "warn";
  return "unknown";
}

/** The `understand` extra's pages (ignores malformed entries). */
export function pagesOf(extra?: StepExtra): StepPage[] {
  const pages = extra?.pages;
  return Array.isArray(pages) ? pages.filter((p): p is StepPage => !!p && typeof p === "object") : [];
}

/** The `funnels` extra's ranked funnels (ignores malformed entries). */
export function funnelsOf(extra?: StepExtra): StepFunnel[] {
  const funnels = extra?.funnels;
  return Array.isArray(funnels) ? funnels.filter((f): f is StepFunnel => !!f && typeof f === "object" && typeof f.name === "string") : [];
}

export const pageThumb = (page: StepPage): string | undefined => page.thumb || page.thumbnail_b64 || undefined;
export const pageMoment = (page: StepPage): string | undefined => page.best_moment || page.demo_moment || undefined;

const FINE_QUALITY = new Set(["", "ok", "good", "fine", "rich", "usable", "normal", "content"]);

/** True when the reviewer flagged the page (empty, error, login wall, ...). */
export function pageFlagged(page: StepPage): boolean {
  return !FINE_QUALITY.has((page.quality ?? "").trim().toLowerCase());
}

/** Review verdicts from the `review` extra (`verdicts` or `scenes`), else from the storyboard's scenes. */
export function verdictsOf(extra: StepExtra | undefined, scenes: Scene[] | undefined): StepVerdict[] {
  const fromExtra = extra?.verdicts ?? extra?.scenes;
  if (Array.isArray(fromExtra) && fromExtra.length) {
    return fromExtra.filter((v): v is StepVerdict => !!v && typeof v === "object");
  }
  return (scenes ?? [])
    .map((s, i) => ({ scene: i + 1, title: s.title, verdict: s.verdict ?? undefined, seen: s.seen ?? undefined }))
    .filter((v) => v.verdict);
}

export const coverThumb = (extra?: StepExtra): string | undefined => extra?.thumb || extra?.thumbnail_b64 || undefined;

/** Seconds a row has taken: live for a running row, final otherwise; undefined when there is nothing to show. */
export function stepSeconds(
  step: StepState | undefined,
  now: number,
  mark?: { started?: number; ended?: number },
): number | undefined {
  if (!step) return undefined;
  if (step.started_at != null) {
    if (step.status === "running") return Math.max(0, now - step.started_at);
    if (step.ended_at != null) return Math.max(0, step.ended_at - step.started_at);
  }
  if (mark?.started != null && mark.ended != null) return Math.max(0, mark.ended - mark.started);
  return undefined;
}

/** The job's wall-clock seconds: exact from server timestamps once it is over, otherwise the best live estimate. */
export function jobSeconds(job: JobStatus, now: number, elapsedSeconds?: number): number {
  const steps = job.steps ?? [];
  const firstStart = steps.reduce<number | undefined>(
    (min, s) => (s.started_at != null && (min == null || s.started_at < min) ? s.started_at : min),
    undefined,
  );
  const lastEnd = steps.reduce<number | undefined>(
    (max, s) => (s.ended_at != null && (max == null || s.ended_at > max) ? s.ended_at : max),
    undefined,
  );
  const startedAt = job.created_at ?? firstStart;
  const live = Math.max(0, elapsedSeconds ?? 0);
  if (job.status === "completed" || job.status === "failed") {
    return startedAt != null && lastEnd != null ? Math.max(0, lastEnd - startedAt) : live;
  }
  // A tab opened on /?job=<id> has no page timer: fall back to the server's creation time.
  return Math.max(live, startedAt != null ? now - startedAt : 0);
}
