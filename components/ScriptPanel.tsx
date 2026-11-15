"use client";

import React, { useEffect, useState } from "react";
import { Loader2, RotateCcw, ScrollText } from "lucide-react";
import type { JobStatus } from "@/lib/types";

interface ScriptPanelProps {
  job: JobStatus;
  busy: boolean;
  /** Starts a re-record of this job's script; `lines` holds one entry per scene ("" keeps the recorded line). */
  onRerecord: (lines: string[]) => void;
}

/** A finished video's script: the same pages and steps can be recorded again, with any line rewritten. */
export function ScriptPanel({ job, busy, onRerecord }: ScriptPanelProps) {
  const scenes = job.storyboard?.scenes ?? [];
  const [lines, setLines] = useState<string[]>(scenes.map((scene) => scene.narration));
  useEffect(() => {
    setLines((job.storyboard?.scenes ?? []).map((scene) => scene.narration));
  }, [job.job_id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (job.status !== "completed" || job.kind === "analysis" || scenes.length === 0) return null;
  const edited = lines.filter((line, i) => line.trim() !== scenes[i]?.narration).length;

  return (
    <details className="glass-panel rounded-2xl p-5 mt-6">
      <summary className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 cursor-pointer">
        <ScrollText className="w-3.5 h-3.5 text-emerald-400" /> Script: re-record the same steps
      </summary>
      <p className="mt-3 text-xs text-zinc-500">
        The same pages, clicks and pacing are recorded again with no new planning. Rewrite any line first if you like.
      </p>
      <ol className="mt-4 space-y-3">
        {scenes.map((scene, i) => (
          <li key={scene.id} className="space-y-1">
            <p className="text-[11px] font-mono text-zinc-500">
              {i + 1}. {scene.title} <span className="text-zinc-600">· {scene.route} · {scene.actions.length} steps</span>
            </p>
            <textarea
              rows={2}
              maxLength={600}
              value={lines[i] ?? ""}
              onChange={(e) => setLines((prev) => prev.map((line, j) => (j === i ? e.target.value : line)))}
              className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 resize-y"
            />
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[11px] font-mono text-zinc-500">{edited ? `${edited} line${edited === 1 ? "" : "s"} rewritten` : "Unchanged"}</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => onRerecord(lines.map((line, i) => (line.trim() && line.trim() !== scenes[i].narration ? line.trim() : "")))}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-sm font-bold transition"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Re-record this script
        </button>
      </div>
    </details>
  );
}
