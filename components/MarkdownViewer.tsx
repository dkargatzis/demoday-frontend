"use client";

import React, { useState } from "react";
import { Copy, Check, FileText } from "lucide-react";

export function MarkdownViewer({
  title,
  content,
  badge = "MARKDOWN",
}: {
  title: string;
  content: string;
  badge?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 transition-all duration-300">
      {/* Editor Titlebar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/80 border-b border-zinc-800/80">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="h-3 w-[1px] bg-zinc-800" />
          <div className="flex items-center space-x-2">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-mono font-medium text-zinc-200">
              {title}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
            {badge}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 transition border border-zinc-700/60 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Raw</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code / Content Area */}
      <div className="p-5 bg-zinc-950/40 overflow-x-auto max-h-[550px]">
        <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed selection:bg-emerald-500/30 selection:text-emerald-200">
          {content}
        </pre>
      </div>
    </div>
  );
}
