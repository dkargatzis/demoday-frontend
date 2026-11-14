"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Search,
  Filter,
  Sparkles,
  ArrowDownCircle,
} from "lucide-react";

interface LogTerminalProps {
  logs: string[];
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  stage: string;
}

export function LogTerminal({ logs, jobId, status, stage }: LogTerminalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"all" | "scenes" | "warnings">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as logs come in
  useEffect(() => {
    if (autoScroll && scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isOpen]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === "scenes") {
      return log.toLowerCase().includes("scene") || log.toLowerCase().includes("storyboard");
    }
    if (filter === "warnings") {
      return (
        log.toLowerCase().includes("error") ||
        log.toLowerCase().includes("warn") ||
        log.toLowerCase().includes("failed") ||
        log.toLowerCase().includes("retry")
      );
    }
    return true;
  });

  const formatLogLine = (line: string) => {
    const isError = /error|failed|exception|critical/i.test(line);
    const isWarn = /warning|fallback|retry/i.test(line);
    const isSuccess = /completed|success|finished|verified|muxed/i.test(line);
    const isScene = /scene|storyboard|playwright|fal\.ai/i.test(line);

    let textColor = "text-zinc-300";
    let prefixColor = "text-emerald-500";

    if (isError) {
      textColor = "text-rose-300 font-medium";
      prefixColor = "text-rose-500";
    } else if (isWarn) {
      textColor = "text-amber-300";
      prefixColor = "text-amber-500";
    } else if (isSuccess) {
      textColor = "text-emerald-300";
      prefixColor = "text-emerald-400";
    } else if (isScene) {
      textColor = "text-teal-200";
      prefixColor = "text-teal-400";
    }

    return (
      <div className="flex items-start space-x-2 py-0.5 leading-relaxed hover:bg-zinc-900/50 rounded px-1 -mx-1 transition-colors">
        <span className={`${prefixColor} select-none font-mono text-[11px]`}>›</span>
        <span className={`flex-1 break-all ${textColor}`}>{line}</span>
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-zinc-800/90 shadow-2xl transition-all duration-300">
      {/* Terminal Titlebar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-zinc-950/90 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center space-x-2.5 font-mono text-xs">
          <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-zinc-200">Execution Telemetry</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400 text-[11px] font-mono">
            ID: <span className="text-zinc-300">{jobId.slice(0, 8)}</span>
          </span>
          {status === "running" && (
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>LIVE ({stage})</span>
            </span>
          )}
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center space-x-2">
          {isOpen && (
            <>
              {/* Filter Pills */}
              <div className="hidden sm:flex items-center space-x-1 bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-2 py-0.5 rounded transition ${
                    filter === "all"
                      ? "bg-zinc-800 text-emerald-400 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  All ({logs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("scenes")}
                  className={`px-2 py-0.5 rounded transition ${
                    filter === "scenes"
                      ? "bg-zinc-800 text-teal-400 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Scenes
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("warnings")}
                  className={`px-2 py-0.5 rounded transition ${
                    filter === "warnings"
                      ? "bg-zinc-800 text-amber-400 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Alerts
                </button>
              </div>

              {/* Auto Scroll Toggle */}
              <button
                type="button"
                onClick={() => setAutoScroll(!autoScroll)}
                title={autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
                className={`hidden md:flex items-center space-x-1 px-2 py-1 rounded-md text-[10px] font-mono border transition ${
                  autoScroll
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-zinc-900 text-zinc-500 border-zinc-800"
                }`}
              >
                <ArrowDownCircle className="w-3 h-3" />
                <span>Auto-scroll</span>
              </button>

              {/* Copy logs */}
              <button
                type="button"
                onClick={handleCopyLogs}
                className="flex items-center space-x-1 px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-mono border border-zinc-800 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-zinc-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-1 px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] font-mono border border-zinc-800 transition"
          >
            <span>{isOpen ? "Hide" : "Show"}</span>
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      {isOpen && (
        <div className="bg-zinc-950/80 p-3 sm:p-4 font-mono text-xs">
          {/* Optional search input within terminal */}
          {logs.length > 8 && (
            <div className="mb-2.5 relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter logs by keyword (e.g. 'Playwright', 'fal', 'scene')..."
                className="w-full pl-7 pr-3 py-1 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}

          <div
            ref={scrollRef}
            className="max-h-56 sm:max-h-64 overflow-y-auto space-y-0.5 pr-2 selection:bg-emerald-500/20 selection:text-emerald-200"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-zinc-600 py-3 text-center text-[11px]">
                {logs.length === 0 ? "Awaiting initial agent telemetry..." : "No logs match current filter."}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <React.Fragment key={index}>{formatLogLine(log)}</React.Fragment>
              ))
            )}

            {status === "running" && (
              <div className="flex items-center space-x-2 text-emerald-400 py-1 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-medium animate-pulse">
                  Agent active: processing {stage}...
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
