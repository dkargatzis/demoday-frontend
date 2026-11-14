import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

export function MarkdownViewer({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800">
        <span className="text-xs font-mono font-medium text-zinc-300">
          {title}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px]">
        {content}
      </pre>
    </div>
  );
}
