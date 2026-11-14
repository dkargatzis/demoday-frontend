"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  RotateCcw,
  Sliders,
  Copy,
  Check,
  ExternalLink,
  LifeBuoy,
  ShieldAlert,
} from "lucide-react";

interface PipelineErrorProps {
  error?: string;
  stage?: string;
  jobId?: string;
  logs?: string[];
  onRetry: () => void;
  onEditSettings?: () => void;
}

export function PipelineError({
  error,
  stage = "execution",
  jobId,
  logs = [],
  onRetry,
  onEditSettings,
}: PipelineErrorProps) {
  const [copied, setCopied] = useState(false);

  const rawError = error || logs.filter((l) => /error|failed/i.test(l)).pop() || "Unknown pipeline execution exception.";

  // Contextual remediation hints based on failure signatures
  const getTroubleshootingAdvice = () => {
    const lower = (rawError + " " + stage).toLowerCase();
    if (lower.includes("fal") || lower.includes("key") || lower.includes("unauthorized")) {
      return {
        title: "fal.ai / Authentication Issue",
        desc: "Ensure FAL_KEY is exported or placed in .env on the backend. fal.ai handles voice narration synthesis.",
        action: "Check Backend .env",
      };
    }
    if (lower.includes("gemini") || lower.includes("resource_exhausted") || lower.includes("quota")) {
      return {
        title: "Gemini API Issue",
        desc: "Ensure GEMINI_API_KEY is valid. If rate limited, wait a few moments or switch to a paid project quota tier.",
        action: "Verify GEMINI_API_KEY",
      };
    }
    if (lower.includes("playwright") || lower.includes("timeout") || lower.includes("navigation") || lower.includes("selector")) {
      return {
        title: "Browser Capture / URL Unreachable",
        desc: "Playwright could not navigate or record the target web app. Verify that the live app URL is publicly accessible without CAPTCHA or blocking bot traffic.",
        action: "Test URL in Browser",
      };
    }
    if (lower.includes("ffmpeg") || lower.includes("mux") || lower.includes("encode")) {
      return {
        title: "Media Assembly / FFmpeg Issue",
        desc: "Audio/video muxing failed. Ensure ffmpeg and ffprobe are installed and available in the system PATH.",
        action: "Verify FFmpeg Binaries",
      };
    }
    return {
      title: "Pipeline Failure in Stage: " + stage,
      desc: "An unexpected error interrupted this run. Review the telemetry trace below or retry with different repo/URL parameters.",
      action: "Review Logs",
    };
  };

  const advice = getTroubleshootingAdvice();

  const handleCopyReport = () => {
    const report = [
      `--- DEMODAY PIPELINE FAILURE REPORT ---`,
      `Job ID: ${jobId || "N/A"}`,
      `Failed Stage: ${stage}`,
      `Error Message: ${rawError}`,
      `\n--- Recent Telemetry Logs ---`,
      ...logs.slice(-10),
    ].join("\n");

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-6 sm:p-7 border border-rose-500/30 shadow-2xl relative overflow-hidden transition-all">
      {/* Top red danger accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-lg shadow-rose-950/40">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Pipeline Interrupted
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Failed at: {stage}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Autonomous execution halted before video completion.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {onEditSettings && (
            <button
              type="button"
              onClick={onEditSettings}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono transition"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              <span>Edit Inputs</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRetry}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-semibold transition active:scale-95 shadow-md shadow-rose-950/30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Run</span>
          </button>
        </div>
      </div>

      {/* Error Output Card */}
      <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-zinc-800/80 mb-4 font-mono text-xs">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-2 mb-2 border-b border-zinc-900">
          <span className="flex items-center space-x-1.5 text-rose-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Root Exception Details</span>
          </span>
          <button
            type="button"
            onClick={handleCopyReport}
            className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 transition"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Diagnostics</span>
              </>
            )}
          </button>
        </div>
        <pre className="text-rose-200/90 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto text-[11px]">
          {rawError}
        </pre>
      </div>

      {/* Troubleshooting suggestion */}
      <div className="flex items-start space-x-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-300">
        <LifeBuoy className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-zinc-200">{advice.title}: </span>
          <span className="text-zinc-400">{advice.desc}</span>
        </div>
      </div>
    </div>
  );
}
