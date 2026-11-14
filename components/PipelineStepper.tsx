"use client";

import React from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Database,
  Brain,
  Mic,
  Video,
  FileCheck,
  Sparkles,
  AlertCircle,
  Clock,
} from "lucide-react";

interface Step {
  id: string;
  label: string;
  desc: string;
  activeHint: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  {
    id: "ingesting",
    label: "Repo Ingest",
    desc: "Scan tree & live URL",
    activeHint: "Scanning repo routes & target URL...",
    icon: Database,
  },
  {
    id: "planning",
    label: "Gemini Plan",
    desc: "Draft storyboard & actions",
    activeHint: "Generating scene actions & voice scripts...",
    icon: Brain,
  },
  {
    id: "recording",
    label: "Voice & Capture",
    desc: "fal.ai TTS & Playwright",
    activeHint: "Synthesizing voiceover & recording 1080p...",
    icon: Mic,
  },
  {
    id: "assembling",
    label: "FFmpeg Assembly",
    desc: "Mux audio & 1080p MP4",
    activeHint: "Concatenating scenes & encoding H.264 MP4...",
    icon: Video,
  },
  {
    id: "launch_kit",
    label: "Launch Kit",
    desc: "Devpost, README & X",
    activeHint: "Drafting submission pitch & social thread...",
    icon: FileCheck,
  },
];

export function PipelineStepper({
  currentStage,
  progress,
  status,
  elapsedSeconds,
}: {
  currentStage: string;
  progress: number;
  status: "queued" | "running" | "completed" | "failed" | string;
  elapsedSeconds?: number;
}) {
  const getStageIndex = (stage: string) => {
    const map: Record<string, number> = {
      queued: 0,
      ingesting: 0,
      planning: 1,
      recording: 2,
      assembling: 3,
      launch_kit: 4,
      completed: 5,
      failed: 2, // fallback if stage is unknown
    };
    return map[stage] ?? 0;
  };

  const currentIndex = getStageIndex(currentStage);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300 shadow-xl">
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

      {/* Header bar */}
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
            <Sparkles className={`w-4 h-4 ${status === "running" ? "animate-spin" : ""}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Autonomous Video Pipeline
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
            {status === "running" && STEPS[currentIndex] && (
              <p className="text-xs text-emerald-400 font-mono mt-0.5 animate-pulse">
                › {STEPS[currentIndex].activeHint}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {elapsedSeconds !== undefined && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>
          )}

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
              {progress}%
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar with glowing head */}
      <div className="w-full bg-zinc-900/90 rounded-full h-2.5 mb-6 overflow-hidden p-[1px] border border-zinc-800/80">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            status === "completed"
              ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.7)]"
              : status === "failed"
              ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
              : "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
          }`}
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {STEPS.map((s, idx) => {
          const isDone = currentIndex > idx || status === "completed";
          const isFailed = status === "failed" && currentIndex === idx;
          const isCurrent = currentIndex === idx && status === "running";
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={`flex flex-col p-3 sm:p-3.5 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                isDone
                  ? "bg-emerald-950/20 border-emerald-800/60 text-emerald-200"
                  : isFailed
                  ? "bg-rose-950/30 border-rose-500/60 text-rose-200 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/30"
                  : isCurrent
                  ? "bg-zinc-900 border-emerald-500/60 text-white shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500/40"
                  : "bg-zinc-950/60 border-zinc-800/70 text-zinc-500 opacity-60"
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
              )}

              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    isDone
                      ? "bg-emerald-500/15 text-emerald-400"
                      : isFailed
                      ? "bg-rose-500/20 text-rose-400"
                      : isCurrent
                      ? "bg-emerald-500/20 text-emerald-300 animate-pulse"
                      : "bg-zinc-900 text-zinc-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isFailed ? (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-zinc-700" />
                )}
              </div>

              <span className="text-xs font-bold tracking-tight">{s.label}</span>
              <span className="text-[11px] text-zinc-400 mt-0.5 font-mono truncate">
                {isFailed ? "Failed" : isCurrent ? "Active" : s.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
