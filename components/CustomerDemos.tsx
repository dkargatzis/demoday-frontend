"use client";

import React, { useEffect, useId, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronRight, Copy, ExternalLink, ListPlus, Loader2, Users } from "lucide-react";
import { originOf } from "@/lib/api";
import type { JobStatus } from "@/lib/types";
import {
  MAX_BATCH,
  audienceOf,
  copiedLabel,
  copyShareLink,
  goalLabel,
  hostOf,
  isGoal,
  listCustomerDemos,
  parseCustomerLines,
  truncate,
  videoUrlForJob,
  type AudienceGoal,
  type AudienceInput,
  type JobSummary,
} from "@/lib/audience";
import { useFlash } from "@/components/Personalize";

/** What "Make another" hands back to the form: the app and the reusable parts of the audience. */
export interface MakeAnotherSeed {
  appUrl: string;
  persona: string;
  goal: AudienceGoal;
  ctaUrl?: string;
}

interface CustomerDemosProps {
  appUrl: string;
  currentJob: JobStatus | null;
  /** Bumped by the page when a job reaches completed/failed, so the board reloads. */
  refreshKey: number;
  busy: boolean;
  onOpen: (id: string) => void;
  onMakeAnother: (seed: MakeAnotherSeed) => void;
  /** When given, the "Add several customers" sub-panel is shown. */
  onStartBatch?: (list: AudienceInput[]) => void;
  /** Goal and link applied to every customer of a batch (the panel's current values). */
  batchDefaults?: { goal: AudienceGoal; cta_url?: string };
}

const BATCH_KEY = "demoday.customerBatch";
const EMPTY = "No customer demos yet. Personalize the next run for a customer and it shows up here.";
const button =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed";
const field =
  "w-full px-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-[11px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition disabled:opacity-50";

const formatDay = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function DemoRow({
  row,
  showHost,
  copied,
  minting,
  onCopy,
  onOpen,
  onMakeAnother,
}: {
  row: JobSummary;
  showHost: boolean;
  copied: string | null;
  minting: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onMakeAnother: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-zinc-950/70 border-zinc-800">
      <div className="text-xs min-w-0">
        <p className="text-zinc-200 truncate">
          {showHost && <span className="text-zinc-500 font-mono">{hostOf(row.url)} · </span>}
          for <span className="font-semibold text-white">{row.customer}</span>
          {row.persona && <span className="text-zinc-400"> · {truncate(row.persona, 48)}</span>}
        </p>
        <p className="text-zinc-500 font-mono mt-0.5">
          {row.status === "failed" ? (
            <span className="text-rose-300">failed</span>
          ) : row.durationSec ? (
            `${Math.round(row.durationSec)} s`
          ) : (
            "done"
          )}
          {" · "}
          {formatDay(row.createdAt)}
          {row.customerGoal ? ` · ${goalLabel(row.customerGoal)}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {row.status === "completed" && (
          <button type="button" disabled={minting} onClick={onCopy} className={button}>
            {minting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
            )}
            {copied ?? "Copy share link"}
          </button>
        )}
        <button type="button" onClick={onOpen} className={button}>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          Open
        </button>
        <button type="button" onClick={onMakeAnother} className={button}>
          Make another
          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
        </button>
      </div>
    </div>
  );
}

/**
 * The per-app customer board under the deliverables: every personalized job (from GET /api/jobs, so it survives
 * reloads), the running one first, other apps collapsed. Each row copies its share link (minted on click, like
 * the Share button) or seeds the form for the next customer.
 */
export function CustomerDemos({
  appUrl,
  currentJob,
  refreshKey,
  busy,
  onOpen,
  onMakeAnother,
  onStartBatch,
  batchDefaults,
}: CustomerDemosProps) {
  const id = useId();
  const [rows, setRows] = useState<JobSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);
  const [copied, flashCopied] = useFlash<{ id: string; label: string }>();
  const [minting, setMinting] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("");

  useEffect(() => {
    let cancelled = false;
    listCustomerDemos(50)
      .then((list) => {
        if (cancelled) return;
        setRows(list.filter((row) => row.customer));
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // The batch text survives a closed tab (read after mount: the page is prerendered without a window).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BATCH_KEY);
      if (saved) setBatchText(saved);
    } catch {
      // storage blocked (private mode): the textarea just starts empty
    }
  }, []);
  const updateBatch = (text: string) => {
    setBatchText(text);
    try {
      window.localStorage.setItem(BATCH_KEY, text);
    } catch {
      // storage blocked: keep it in memory only
    }
  };

  // The current job joins the board at once: a spinner row while it runs, a finished row before the list reloads.
  const brief = audienceOf(currentJob);
  const running = currentJob && brief && (currentJob.status === "queued" || currentJob.status === "running") ? brief : null;
  const finished: JobSummary | null =
    currentJob && brief && (currentJob.status === "completed" || currentJob.status === "failed") && !rows.some((row) => row.id === currentJob.job_id)
      ? {
          id: currentJob.job_id,
          url: currentJob.app_url ?? appUrl,
          createdAt: currentJob.created_at ? new Date(currentJob.created_at * 1000).toISOString() : new Date().toISOString(),
          productName: currentJob.storyboard?.project_name ?? null,
          status: currentJob.status === "failed" ? "failed" : "completed",
          customer: brief.company,
          persona: brief.persona,
          customerGoal: brief.goal ?? "book_call",
          durationSec: currentJob.storyboard?.total_duration_sec ?? null,
        }
      : null;
  const allRows = finished ? [finished, ...rows] : rows;

  const origin = originOf(appUrl);
  const sameApp = (row: JobSummary) => origin !== null && originOf(row.url ?? "") === origin;
  const current = allRows.filter(sameApp);
  const others = allRows.filter((row) => !sameApp(row));
  const host = hostOf(appUrl) || "your app";

  const copyRow = async (row: JobSummary) => {
    if (minting) return;
    setMinting(row.id);
    try {
      flashCopied({ id: row.id, label: copiedLabel(await copyShareLink(videoUrlForJob(row.id))) });
    } finally {
      setMinting(null);
    }
  };

  const seedFrom = (row: JobSummary): MakeAnotherSeed => ({
    appUrl: row.url ?? appUrl,
    persona: row.persona ?? "",
    goal: isGoal(row.customerGoal) ? row.customerGoal : "book_call",
  });

  const renderRow = (row: JobSummary, showHost: boolean) => (
    <DemoRow
      key={row.id}
      row={row}
      showHost={showHost}
      copied={copied?.id === row.id ? copied.label : null}
      minting={minting === row.id}
      onCopy={() => void copyRow(row)}
      onOpen={() => onOpen(row.id)}
      onMakeAnother={() => onMakeAnother(seedFrom(row))}
    />
  );

  const parsed = parseCustomerLines(batchText, batchDefaults);
  const count = current.length;

  return (
    <section className="glass-panel rounded-2xl p-6 space-y-4 mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-emerald-400 shrink-0" />
          <h2 className="text-sm font-bold text-white truncate">Customer demos for {host}</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/80 text-zinc-300 shrink-0">
            {count} customer{count === 1 ? "" : "s"}
          </span>
        </div>
        {!loaded && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
      </div>

      {error && <p className="text-xs text-rose-300">Could not load your customer demos: {error}</p>}

      <div className="space-y-2">
        {running && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-emerald-950/20 border-emerald-800/60 text-xs">
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
            <p className="text-zinc-200 truncate">
              for <span className="font-semibold text-white">{running.company}</span>
              <span className="text-zinc-400"> · {(currentJob?.stage || "queued").replace(/_/g, " ")}...</span>
            </p>
          </div>
        )}
        {current.map((row) => renderRow(row, false))}
        {loaded && !running && count === 0 && <p className="text-xs text-zinc-500 font-mono">{EMPTY}</p>}
      </div>

      {others.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setOthersOpen((open) => !open)}
            aria-expanded={othersOpen}
            className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition"
          >
            {othersOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Other apps ({others.length})
          </button>
          {othersOpen && others.map((row) => renderRow(row, true))}
        </div>
      )}

      {onStartBatch && (
        <div className="pt-3 border-t border-zinc-800/80 space-y-2">
          <button
            type="button"
            onClick={() => setBatchOpen((open) => !open)}
            aria-expanded={batchOpen}
            aria-controls={`${id}-batch`}
            className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition"
          >
            <ListPlus className="w-3.5 h-3.5" />
            Add several customers
            {batchOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {batchOpen && (
            <div id={`${id}-batch`} className="space-y-2">
              <label htmlFor={`${id}-batch-text`} className="block text-[11px] text-zinc-500">
                One per line, up to {MAX_BATCH}: Company | website | who will watch | first name
              </label>
              <textarea
                id={`${id}-batch-text`}
                rows={4}
                value={batchText}
                disabled={busy}
                spellCheck={false}
                placeholder={"Acme | https://acme.com | Head of Platform at a 40-person fintech | Maria\nGlobex | globex.io | VP Engineering who reviews every release | Sam"}
                onChange={(e) => updateBatch(e.target.value)}
                className={`${field} resize-y`}
              />
              {parsed.customers.length > 0 && (
                <ol className="text-[11px] font-mono text-zinc-400 space-y-0.5">
                  {parsed.customers.map((customer, index) => (
                    <li key={index}>
                      {index + 1}. <span className="text-zinc-200">{customer.company}</span>
                      {customer.website ? ` · ${hostOf(customer.website)}` : ""} · {truncate(customer.persona, 48)}
                      {customer.first_name ? ` · ${customer.first_name}` : ""}
                    </li>
                  ))}
                </ol>
              )}
              {parsed.errors.map((line, index) => (
                <p key={index} className="text-[11px] text-amber-300">
                  {line}
                </p>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-zinc-500">Runs one after another, about two minutes each; keep this tab open.</p>
                <button
                  type="button"
                  disabled={busy || parsed.customers.length === 0}
                  onClick={() => onStartBatch(parsed.customers)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate for {parsed.customers.length} customer{parsed.customers.length === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
