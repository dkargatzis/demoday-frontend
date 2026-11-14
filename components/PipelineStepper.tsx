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
} from "lucide-react";

interface Step {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  { id: "ingesting", label: "Repo Ingest", desc: "Scan tree & live URL", icon: Database },
  { id: "planning", label: "Gemini Plan", desc: "Draft storyboard & actions", icon: Brain },
  { id: "recording", label: "Voice & Capture", desc: "fal.ai TTS & Playwright", icon: Mic },
  { id: "assembling", label: "FFmpeg Assembly", desc: "Mux audio & 1080p MP4", icon: Video },
  { id: "launch_kit", label: "Launch Kit", desc: "Devpost, README & X", icon: FileCheck },
];

export function PipelineStepper({
  currentStage,
  progress,
  status,
}: {
  currentStage: string;
  progress: number;
  status: string;
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
    };
    return map[stage] ?? 0;
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="w-full glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300">
      {/* Top glowing accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              Autonomous Pipeline
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                status === "completed"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : status === "running"
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-300 animate-pulse"
                  : "bg-zinc-800 border-zinc-700 text-zinc-400"
              }`}>
                {status.toUpperCase()}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-zinc-400">Total Completion</span>
          <div className="px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs font-mono font-bold text-emerald-400">
            {progress}%
          </div>
        </div>
      </div>

      {/* Progress Bar with glowing head */}
      <div className="w-full bg-zinc-900 rounded-full h-2 mb-6 overflow-hidden p-[1px] border border-zinc-800">
        <div
          className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STEPS.map((s, idx) => {
          const isDone = currentIndex > idx || status === "completed";
          const isCurrent = currentIndex === idx && status === "running";
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={`flex flex-col p-3 rounded-xl border transition-all duration-300 ${
                isDone
                  ? "bg-emerald-950/20 border-emerald-800/60 text-emerald-200"
                  : isCurrent
                  ? "bg-zinc-900 border-emerald-500/50 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30"
                  : "bg-zinc-950/60 border-zinc-800/80 text-zinc-500 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg ${
                  isDone
                    ? "bg-emerald-500/10 text-emerald-400"
                    : isCurrent
                    ? "bg-emerald-500/20 text-emerald-300 animate-pulse"
                    : "bg-zinc-900 text-zinc-600"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>

                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-zinc-700" />
                )}
              </div>

              <span className="text-xs font-semibold tracking-tight">{s.label}</span>
              <span className="text-[11px] text-zinc-400 mt-0.5 font-mono truncate">
                {s.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
