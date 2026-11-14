import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Step {
  id: string;
  label: string;
}

const STEPS: Step[] = [
  { id: "ingesting", label: "Repo & URL Ingestion" },
  { id: "planning", label: "Gemini Scene Planning" },
  { id: "recording", label: "fal.ai Audio & Playwright" },
  { id: "assembling", label: "FFmpeg Video Assembly" },
  { id: "launch_kit", label: "Deliverables Generated" },
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
    <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          Pipeline Execution ({status})
        </span>
        <span className="text-xs font-mono font-bold text-emerald-400">
          {progress}%
        </span>
      </div>

      <div className="w-full bg-zinc-800 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className="bg-emerald-500 h-2 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STEPS.map((s, idx) => {
          const isDone = currentIndex > idx || status === "completed";
          const isCurrent = currentIndex === idx && status === "running";

          return (
            <div
              key={s.id}
              className={`flex items-center space-x-2 p-2 rounded-lg text-xs font-medium border ${
                isDone
                  ? "bg-emerald-950/20 border-emerald-800 text-emerald-300"
                  : isCurrent
                  ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                  : "bg-zinc-950 border-zinc-900 text-zinc-600"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-zinc-700 shrink-0" />
              )}
              <span className="truncate">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
