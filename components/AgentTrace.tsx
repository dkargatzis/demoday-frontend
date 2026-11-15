"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Chrome,
  Circle,
  Clock,
  Film,
  Github,
  HelpCircle,
  ImageIcon,
  Loader2,
  Minus,
  Receipt,
  Sparkles,
  Zap,
} from "lucide-react";
import type { JobStatus, StepExtra, StepPage, StepState, StepVerdict, ToolCall } from "@/lib/types";
import type { StepMark } from "@/lib/useJobStream";
import {
  coverThumb,
  formatClock,
  formatDuration,
  funnelsOf,
  jobSeconds,
  pageFlagged,
  pageMoment,
  pagesOf,
  pageThumb,
  stepSeconds,
  VERDICT_CLASS,
  verdictKind,
  verdictsOf,
  type VerdictKind,
} from "@/lib/trace";
import { PipelineStepper } from "./PipelineStepper";

// ---------------------------------------------------------------- tools

interface ToolMeta {
  name: string;
  icon: React.ElementType;
  className: string;
}

const TOOLS: Record<string, ToolMeta> = {
  gemini: { name: "Gemini", icon: Sparkles, className: "text-sky-300 bg-sky-500/10 border-sky-500/30" },
  fal: { name: "fal.ai", icon: Zap, className: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/30" },
  chromium: { name: "Chromium", icon: Chrome, className: "text-teal-300 bg-teal-500/10 border-teal-500/30" },
  ffmpeg: { name: "FFmpeg", icon: Film, className: "text-indigo-300 bg-indigo-500/10 border-indigo-500/30" },
  github: { name: "GitHub", icon: Github, className: "text-zinc-300 bg-zinc-800/80 border-zinc-700" },
};

const toolMeta = (tool?: string | null): ToolMeta =>
  TOOLS[(tool ?? "").toLowerCase()] ?? {
    name: tool || "agent",
    icon: Bot,
    className: "text-zinc-400 bg-zinc-900 border-zinc-800",
  };

function ToolBadge({ tool }: { tool?: string | null }) {
  const meta = toolMeta(tool);
  const Icon = meta.icon;
  return (
    <span
      data-tool={(tool ?? "").toLowerCase() || "unknown"}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold ${meta.className}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {meta.name}
    </span>
  );
}

// ---------------------------------------------------------------- rows (fixed display order, never arrival order)

interface RowSpec {
  id: string;
  label: string;
  tool: string;
  core?: boolean; // always shown (queued, dimmed) so the panel never looks empty
}

const ORDER: RowSpec[] = [
  { id: "repos", label: "Read repos", tool: "github" },
  { id: "scrape", label: "Explore app", tool: "chromium", core: true },
  { id: "audience", label: "Research customer", tool: "gemini" },
  { id: "understand", label: "Understand", tool: "gemini" },
  { id: "funnels", label: "Find funnels", tool: "gemini" },
  { id: "storyboard", label: "Plan", tool: "gemini", core: true },
  { id: "plancheck", label: "Check plan", tool: "gemini" },
  { id: "ai_clips", label: "AI clips", tool: "fal" },
  { id: "cover", label: "Cover art", tool: "fal" },
  { id: "music", label: "Soundtrack", tool: "fal" },
  { id: "narration", label: "Narrate", tool: "fal", core: true },
  { id: "record", label: "Record", tool: "chromium", core: true },
  { id: "review", label: "Review footage", tool: "gemini" },
  { id: "retake", label: "Retake", tool: "chromium" },
  { id: "video", label: "Assemble", tool: "ffmpeg", core: true },
  { id: "launchpack", label: "Launch kit", tool: "gemini", core: true },
];

// A prospect analysis (step 1 of 2) has its own steps and never records.
const ANALYSIS_ORDER: RowSpec[] = [
  { id: "repos", label: "Read repos", tool: "github" },
  { id: "code", label: "Read the code", tool: "github", core: true },
  { id: "capabilities", label: "Map backend vs app", tool: "github" },
  { id: "scrape", label: "Explore app", tool: "chromium", core: true },
  { id: "audience", label: "Research prospect", tool: "gemini" },
  { id: "understand", label: "Understand", tool: "gemini" },
  { id: "analysis", label: "Analyze for the prospect", tool: "gemini", core: true },
];

interface Row {
  spec: RowSpec;
  state?: StepState;
}

function buildRows(steps: StepState[], kind?: string): Row[] {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const rows: Row[] = [];
  const order = kind === "analysis" ? ANALYSIS_ORDER : ORDER;
  for (const spec of order) {
    const state = byId.get(spec.id);
    if (!state && !spec.core) continue;
    if (spec.id === "ai_clips" && state?.status === "skipped") continue;
    rows.push({ spec, state });
  }
  for (const state of steps) {
    // Unknown ids (a newer server) render generically at the end.
    if (!order.some((o) => o.id === state.id)) {
      rows.push({ spec: { id: state.id, label: state.label || state.id, tool: state.tool ?? "" }, state });
    }
  }
  return rows;
}

// "stopped": still marked running when the job ended (a background task cancelled at completion).
// "unreached": a core row the finished job never got to (it failed earlier).
type RowStatus = StepState["status"] | "queued" | "stopped" | "unreached";

const ROW_CLASS: Record<RowStatus, string> = {
  queued: "border-zinc-800/60 bg-zinc-950/40 opacity-50",
  unreached: "border-zinc-800/60 bg-zinc-950/40 opacity-50",
  running: "border-emerald-500/50 bg-zinc-900/80 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/20",
  done: "border-emerald-900/50 bg-emerald-950/10",
  skipped: "border-zinc-800/60 bg-zinc-950/40 opacity-70",
  stopped: "border-zinc-800/60 bg-zinc-950/40 opacity-70",
  error: "border-amber-500/30 bg-amber-950/10",
};

function displayStatus(state: StepState | undefined, terminal: boolean): RowStatus {
  if (!state) return terminal ? "unreached" : "queued";
  return state.status === "running" && terminal ? "stopped" : state.status;
}

/** The step that failed the job carries the job's own error (`fail(job.error)`); any other error was a fallback. */
const isFatal = (state: StepState | undefined, job: JobStatus): boolean =>
  job.status === "failed" && state?.status === "error" && (!job.error || !state.message || state.message === job.error);

function StatusIcon({ status, fatal }: { status: RowStatus; fatal: boolean }) {
  switch (status) {
    case "running":
      return <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" aria-hidden="true" />;
    case "done":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />;
    case "skipped":
    case "stopped":
      return <Minus className="w-4 h-4 text-zinc-500 shrink-0" aria-hidden="true" />;
    case "error":
      return (
        <AlertTriangle className={`w-4 h-4 shrink-0 ${fatal ? "text-rose-400" : "text-amber-400"}`} aria-hidden="true" />
      );
    default:
      return <Circle className="w-3.5 h-3.5 text-zinc-700 shrink-0 mx-[1px]" aria-hidden="true" />;
  }
}

function StatusChip({
  status,
  seconds,
  message,
  fatal,
}: {
  status: RowStatus;
  seconds?: number;
  message?: string | null;
  fatal: boolean;
}) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold whitespace-nowrap";
  switch (status) {
    case "running":
      return (
        <span className={`${base} bg-emerald-500/15 border-emerald-500/40 text-emerald-300`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          {seconds !== undefined ? formatDuration(seconds) : "running"}
        </span>
      );
    case "done":
      return (
        <span className={`${base} bg-emerald-950/60 border-emerald-800/60 text-emerald-300`}>
          <Check className="w-3 h-3" aria-hidden="true" />
          {seconds !== undefined ? formatDuration(seconds) : "done"}
        </span>
      );
    case "skipped":
      return <span className={`${base} bg-zinc-900 border-zinc-800 text-zinc-500`}>skipped</span>;
    case "stopped":
      return (
        <span className={`${base} bg-zinc-900 border-zinc-800 text-zinc-500`} title="Still running when the job finished">
          stopped
        </span>
      );
    case "error":
      // Amber, not red: an optional step fell back and the job went on. Red only on the step that failed the job.
      return (
        <span
          title={message ?? undefined}
          className={`${base} ${
            fatal
              ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
              : "bg-amber-500/15 border-amber-500/40 text-amber-300"
          }`}
        >
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          {fatal ? "failed" : "fallback"}
          {seconds !== undefined && <span className="opacity-70 font-normal">{formatDuration(seconds)}</span>}
        </span>
      );
    case "unreached":
      return <span className={`${base} bg-zinc-950 border-zinc-800/80 text-zinc-600`}>not run</span>;
    default:
      return <span className={`${base} bg-zinc-950 border-zinc-800/80 text-zinc-600`}>queued</span>;
  }
}

// ---------------------------------------------------------------- sub-rows (one-off `step` extras and storyboard fields)

function PagesStrip({ pages }: { pages: StepPage[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1" data-testid="pages-strip">
      {pages.map((page, i) => {
        const thumb = pageThumb(page);
        const flagged = pageFlagged(page);
        const moment = pageMoment(page);
        const name = page.path || page.title || `page ${i + 1}`;
        return (
          <figure
            key={`${name}-${i}`}
            className={`w-44 shrink-0 rounded-lg border overflow-hidden bg-zinc-950/70 ${
              flagged ? "border-amber-500/30 opacity-60" : "border-zinc-800"
            }`}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- inline base64 thumbnail from the step event
              <img
                src={`data:image/jpeg;base64,${thumb}`}
                alt={`Screenshot of ${name}`}
                className="w-full aspect-video object-cover object-top bg-zinc-900"
              />
            ) : (
              <div className="w-full aspect-video bg-zinc-900 flex items-center justify-center text-zinc-700">
                <ImageIcon className="w-5 h-5" aria-hidden="true" />
              </div>
            )}
            <figcaption className="p-2 space-y-0.5 text-[10px] font-mono">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0 text-zinc-200 font-semibold truncate" title={page.title || name}>
                  {name}
                </div>
                {flagged && (
                  <span className="px-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                    {page.quality}
                  </span>
                )}
              </div>
              {page.purpose && (
                <p className="text-zinc-400 line-clamp-2" title={page.purpose}>
                  {page.purpose}
                </p>
              )}
              {moment && (
                <p className="text-emerald-400/90 line-clamp-2" title={moment}>
                  best moment: {moment}
                </p>
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function VerdictGlyph({ kind }: { kind: VerdictKind }) {
  switch (kind) {
    case "ok":
      return <Check className="w-3 h-3" aria-hidden="true" />;
    case "warn":
      return <AlertTriangle className="w-3 h-3" aria-hidden="true" />;
    case "static":
      return <span aria-hidden="true">~</span>;
    case "mismatch":
      return <HelpCircle className="w-3 h-3" aria-hidden="true" />;
    default:
      return <Circle className="w-2.5 h-2.5" aria-hidden="true" />;
  }
}

function VerdictChips({ verdicts }: { verdicts: StepVerdict[] }) {
  const passed = verdicts.filter((v) => verdictKind(v.verdict) === "ok").length;
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="verdict-chips">
      <span className="text-[10px] font-mono text-zinc-500 mr-1">
        {passed}/{verdicts.length} pass
      </span>
      {verdicts.map((v, i) => {
        const kind = verdictKind(v.verdict);
        const label = v.scene !== undefined && v.scene !== null ? `Scene ${v.scene}` : v.title || `Scene ${i + 1}`;
        const hover = [v.verdict, v.seen && `seen: ${v.seen}`, v.issue, v.confidence !== undefined && `confidence ${v.confidence}`]
          .filter(Boolean)
          .join(" · ");
        return (
          <span
            key={`${label}-${i}`}
            title={hover}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono ${VERDICT_CLASS[kind]}`}
          >
            <VerdictGlyph kind={kind} />
            {label}
            {v.verdict && <span className="opacity-70">· {v.verdict}</span>}
          </span>
        );
      })}
    </div>
  );
}

/** A row's sub-row (thumbnails, rationale, verdicts, cover, soundtrack brief), or null when it has nothing to add. */
function subRow(id: string, state: StepState | undefined, extra: StepExtra | undefined, job: JobStatus): React.ReactNode {
  const storyboard = job.storyboard;
  switch (id) {
    case "understand": {
      const pages = pagesOf(extra);
      return pages.length ? <PagesStrip pages={pages} /> : null;
    }
    case "funnels": {
      const funnels = funnelsOf(extra);
      return funnels.length ? (
        <ol className="space-y-1 text-[11px] text-zinc-400">
          {funnels.map((funnel, i) => (
            <li key={`${funnel.name}-${i}`} title={funnel.evidence ?? undefined}>
              <span className="font-mono text-zinc-500">{i + 1}.</span>{" "}
              <span className={i === 0 ? "text-emerald-300" : "text-zinc-300"}>{funnel.name}</span>
              {funnel.steps?.length ? <span className="font-mono text-zinc-500"> · {funnel.steps.join(" → ")}</span> : null}
              {funnel.outcome ? <span className="block pl-4 text-zinc-500">{funnel.outcome}</span> : null}
            </li>
          ))}
        </ol>
      ) : null;
    }
    case "storyboard":
      return storyboard?.plan_rationale ? (
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          <span className="text-zinc-500 font-mono">Why this tour:</span> {storyboard.plan_rationale}
        </p>
      ) : null;
    case "review": {
      const verdicts = verdictsOf(extra, storyboard?.scenes);
      return verdicts.length ? <VerdictChips verdicts={verdicts} /> : null;
    }
    case "cover": {
      const thumb = coverThumb(extra);
      const brief = !thumb && state?.status === "running" ? storyboard?.cover_visual : null;
      if (!thumb && !storyboard?.cover && !brief) return null;
      return (
        <div className="flex flex-wrap items-start gap-3">
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element -- inline base64 thumbnail from the step event
            <img
              src={`data:image/jpeg;base64,${thumb}`}
              alt="Cover art"
              title={storyboard?.cover_visual ?? undefined}
              className="w-[320px] max-w-full rounded-lg border border-zinc-800 bg-zinc-900"
            />
          )}
          {brief && (
            <p className="text-[11px] text-zinc-400 max-w-md">
              <span className="text-zinc-500 font-mono">brief:</span> {brief}
            </p>
          )}
          {storyboard?.cover && <p className="text-[11px] text-zinc-400 max-w-xs">{storyboard.cover}</p>}
        </div>
      );
    }
    case "music": {
      const call = job.tool_calls?.find((c) => /music|soundtrack|score/i.test(c.purpose));
      if (!storyboard?.music_prompt && !storyboard?.soundtrack && !call) return null;
      return (
        <div className="text-[11px] text-zinc-400 space-y-0.5">
          {storyboard?.music_prompt && (
            <p>
              <span className="text-zinc-500 font-mono">♪ brief:</span> {storyboard.music_prompt}
            </p>
          )}
          {call && <p className="text-zinc-500 font-mono">model: {call.model}</p>}
          {storyboard?.soundtrack && state?.status !== "running" && <p className="text-zinc-500">{storyboard.soundtrack}</p>}
        </div>
      );
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------- the panel

export interface AgentTraceProps {
  job: JobStatus;
  extras?: Record<string, StepExtra>; // one-off `step` payloads, by step id (from useJobStream)
  marks?: Record<string, StepMark>; // when each step's events arrived, seconds since the job started
  elapsedSeconds?: number; // the page's own timer (the stepper had it); the panel also derives time from the job
}

/**
 * The agent's own trace: one row per pipeline step in a fixed order, the tool that made it, how long it took,
 * and the decision text, plus thumbnail strips, verdict chips and cover art from the one-off `step` events.
 * Without `job.steps` (an older server or an old job.json) it renders the previous stepper grid.
 */
export function AgentTrace({ job, extras = {}, marks = {}, elapsedSeconds }: AgentTraceProps) {
  const steps = job.steps;
  const terminal = job.status === "completed" || job.status === "failed";
  const legacy = !steps || (steps.length === 0 && terminal);
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    if (terminal) return;
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, [terminal]);
  const rows = useMemo(() => buildRows(steps ?? [], job.kind), [steps, job.kind]);

  if (legacy) {
    return (
      <PipelineStepper currentStage={job.stage} progress={job.progress} status={job.status} elapsedSeconds={elapsedSeconds} />
    );
  }

  const status = job.status;
  const runningRows = rows.filter((r) => r.state?.status === "running");
  const done = rows.filter((r) => r.state?.status === "done").length;
  const skipped = rows.filter((r) => r.state?.status === "skipped").length;
  const fellBack = rows.filter((r) => r.state?.status === "error" && !isFatal(r.state, job)).length;
  const fatalRow = rows.find((r) => isFatal(r.state, job));
  const hint =
    status === "running" || status === "queued"
      ? runningRows.length
        ? runningRows.map((r) => r.state?.label ?? r.spec.label).join(" · ")
        : status === "queued"
          ? "Waiting for a worker…"
          : "Working…"
      : [
          fatalRow ? `Failed at ${fatalRow.spec.label}` : "",
          `${done} step${done === 1 ? "" : "s"} done`,
          skipped ? `${skipped} skipped` : "",
          fellBack ? `${fellBack} fell back` : "",
        ]
          .filter(Boolean)
          .join(" · ");
  const seconds = jobSeconds(job, now, elapsedSeconds);

  return (
    <div
      data-testid="agent-trace"
      className="w-full glass-panel rounded-2xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300 shadow-xl"
    >
      {/* Top glowing accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] transition-all duration-500 ${
          status === "completed"
            ? "bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.5)]"
            : status === "failed"
              ? "bg-gradient-to-r from-transparent via-rose-500 to-transparent"
              : "bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent animate-pulse"
        }`}
      />

      {/* Header bar (as the stepper had it) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-xl border transition-colors ${
              status === "completed"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : status === "failed"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            <Sparkles className={`w-4 h-4 ${status === "running" ? "animate-spin" : ""}`} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Agent Trace
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
                  status === "completed"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                    : status === "failed"
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                      : status === "running"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 animate-pulse"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}
              >
                {status.toUpperCase()}
              </span>
            </h3>
            <p
              className={`text-xs font-mono mt-0.5 ${
                status === "running" || status === "queued" ? "text-emerald-400 animate-pulse" : "text-zinc-400"
              }`}
            >
              › {hint}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400"
            title="Job runtime"
          >
            <Clock className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            <span>{formatClock(seconds)}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-zinc-400 hidden sm:inline">Completion</span>
            <div
              className={`px-3 py-1 rounded-md border text-xs font-mono font-bold ${
                status === "completed"
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  : status === "failed"
                    ? "bg-rose-950/60 border-rose-500/40 text-rose-400"
                    : "bg-zinc-900 border-zinc-800 text-emerald-400"
              }`}
            >
              {job.progress}%
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar with glowing head */}
      <div className="w-full bg-zinc-900/90 rounded-full h-2.5 mb-5 overflow-hidden p-[1px] border border-zinc-800/80">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            status === "completed"
              ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.7)]"
              : status === "failed"
                ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                : "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
          }`}
          style={{ width: `${Math.max(4, job.progress)}%` }}
        />
      </div>

      {/* Timeline */}
      <ol aria-label="Agent trace" className="space-y-1.5">
        {rows.map(({ spec, state }) => {
          const rowStatus = displayStatus(state, terminal);
          const fatal = isFatal(state, job);
          const mark = marks[spec.id];
          const rowSeconds = rowStatus === "stopped" ? undefined : stepSeconds(state, now, mark);
          const detail = state?.detail || (rowStatus === "error" ? state?.message : "") || "";
          const hover = [state?.label, state?.detail, state?.message].filter(Boolean).join(" — ");
          const sub = subRow(spec.id, state, extras[spec.id], job);
          return (
            <li
              key={spec.id}
              data-step={spec.id}
              data-status={rowStatus}
              className={`rounded-xl border px-3 py-2 transition-all duration-300 ${ROW_CLASS[rowStatus]}`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StatusIcon status={rowStatus} fatal={fatal} />
                <div className="w-40 shrink-0">
                  <div className="text-xs font-bold tracking-tight text-zinc-100">{spec.label}</div>
                  {state && rowStatus === "running" && (
                    <div className="text-[10px] text-emerald-400/90 font-mono truncate">{state.label}</div>
                  )}
                </div>
                <ToolBadge tool={state?.tool ?? spec.tool} />
                <p className="flex-1 min-w-[10rem] text-[11px] font-mono text-zinc-400 truncate" title={hover || undefined}>
                  {detail || (rowStatus === "queued" ? "waiting" : "")}
                </p>
                {mark?.started !== undefined && (
                  <span className="text-[10px] font-mono text-zinc-600 hidden sm:inline" title="Started, seconds into the job">
                    t+{formatClock(mark.started)}
                  </span>
                )}
                <StatusChip status={rowStatus} seconds={rowSeconds} message={state?.message} fatal={fatal} />
              </div>
              {sub && <div className="mt-2 pl-7">{sub}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------- ledger strip: every Gemini and fal.ai call

interface ToolTotals {
  count: number;
  ms: number;
  inFlight: ToolCall[];
  fallbacks: number;
}

export interface LedgerStripProps {
  calls?: ToolCall[]; // job.tool_calls (undefined on older servers: renders nothing)
  status: JobStatus["status"];
}

/** "Gemini ×N · fal.ai ×M · fallbacks" from job.tool_calls, live; click expands the per-call table. */
export function LedgerStrip({ calls, status }: LedgerStripProps) {
  const [open, setOpen] = useState(false);
  const live = status === "queued" || status === "running";
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, [live]);
  if (!calls) return null;

  const totals = new Map<string, ToolTotals>();
  for (const call of calls) {
    const tool = (call.tool ?? "").toLowerCase();
    const bucket = totals.get(tool) ?? { count: 0, ms: 0, inFlight: [], fallbacks: 0 };
    bucket.count += 1;
    if (call.ms != null) bucket.ms += call.ms;
    else if (call.ended_at == null) bucket.inFlight.push(call);
    if (call.ok === false) bucket.fallbacks += 1;
    totals.set(tool, bucket);
  }
  const order = [...new Set(["gemini", "fal", ...totals.keys()])].filter((t) => totals.has(t));
  const fallbacks = calls.filter((c) => c.ok === false).length;
  const sorted = [...calls].sort((a, b) => a.started_at - b.started_at);

  return (
    <div data-testid="ledger-strip" className="glass-panel rounded-xl border border-zinc-800/80 px-4 py-2.5 shadow-lg">
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="flex items-center gap-1.5 text-zinc-400 mr-1">
          <Receipt className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
          Tool ledger
        </span>
        {order.length === 0 ? (
          <span className="text-zinc-500">{live ? "no Gemini or fal.ai calls yet" : "no Gemini or fal.ai calls"}</span>
        ) : (
          order.map((tool, i) => {
            const meta = toolMeta(tool);
            const Icon = meta.icon;
            const bucket = totals.get(tool)!;
            return (
              <React.Fragment key={tool}>
                {i > 0 && (
                  <span className="text-zinc-600" aria-hidden="true">
                    ·
                  </span>
                )}
                <span
                  data-ledger-tool={tool}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${meta.className}`}
                  title={`${meta.name}: ${bucket.count} call${bucket.count === 1 ? "" : "s"}, ${(bucket.ms / 1000).toFixed(1)} s of latency so far`}
                >
                  <Icon className="w-3 h-3" aria-hidden="true" />
                  <span className="font-semibold">
                    {meta.name} ×{bucket.count}
                  </span>
                  <span className="opacity-70">{(bucket.ms / 1000).toFixed(1)} s</span>
                  {bucket.inFlight.length > 0 && (
                    <span className="flex items-center gap-1 text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                      {bucket.inFlight[0].purpose}…
                    </span>
                  )}
                </span>
              </React.Fragment>
            );
          })
        )}
        {fallbacks > 0 && (
          <>
            <span className="text-zinc-600" aria-hidden="true">
              ·
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-amber-500/10 border-amber-500/40 text-amber-300">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              {fallbacks} fallback{fallbacks === 1 ? "" : "s"}
            </span>
          </>
        )}
        {calls.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="tool-ledger-table"
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 transition"
          >
            {open ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />}
            {open ? "Hide calls" : `Show ${calls.length} call${calls.length === 1 ? "" : "s"}`}
          </button>
        )}
      </div>

      {open && calls.length > 0 && (
        <div id="tool-ledger-table" className="mt-3 max-h-64 overflow-auto rounded-lg border border-zinc-800/80">
          <table className="w-full text-[11px] font-mono">
            <thead className="bg-zinc-950/80 text-zinc-500 text-left">
              <tr>
                <th className="px-2.5 py-1.5 font-normal">Tool</th>
                <th className="px-2.5 py-1.5 font-normal">Purpose</th>
                <th className="px-2.5 py-1.5 font-normal">Model</th>
                <th className="px-2.5 py-1.5 font-normal text-right">Latency</th>
                <th className="px-2.5 py-1.5 font-normal">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((call, i) => {
                const meta = toolMeta(call.tool);
                const inFlight = call.ok == null && call.ended_at == null;
                const latency =
                  call.ms != null
                    ? `${(call.ms / 1000).toFixed(1)} s`
                    : call.ended_at != null
                      ? `${(call.ended_at - call.started_at).toFixed(1)} s`
                      : `${Math.max(0, now - call.started_at).toFixed(0)} s…`;
                return (
                  <tr key={`${call.started_at}-${i}`} className="border-t border-zinc-800/60 text-zinc-300">
                    <td className="px-2.5 py-1.5 whitespace-nowrap">{meta.name}</td>
                    <td className="px-2.5 py-1.5">{call.purpose}</td>
                    <td className="px-2.5 py-1.5 text-zinc-500 break-all">{call.model}</td>
                    <td className="px-2.5 py-1.5 text-right whitespace-nowrap">{latency}</td>
                    <td className="px-2.5 py-1.5 whitespace-nowrap">
                      {inFlight ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                          in flight
                        </span>
                      ) : call.ok === false ? (
                        <span className="text-amber-300" title={call.note || undefined}>
                          fallback{call.note ? ` · ${call.note}` : ""}
                        </span>
                      ) : (
                        <span className="text-emerald-400" title={call.note || undefined}>
                          ok{call.note ? ` · ${call.note}` : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
