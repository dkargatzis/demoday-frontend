"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { cancelCapture, captureSocketUrl, finishCapture, originOf, startCapture } from "@/lib/api";
import { useLeaveGuard } from "@/lib/useLeaveGuard";
import type { AppLogin } from "@/lib/types";

const SPECIAL_KEYS = new Set([
  "Enter", "Tab", "Backspace", "Delete", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Home", "End", "PageUp", "PageDown",
]);

/**
 * Live view of a browser running on the DemoDay server. The user signs in to their app here; only the resulting
 * session is saved (encrypted, per user). Clicks, typing, paste and scrolling are forwarded over a WebSocket.
 */
export function LoginCapture({
  appUrl,
  onClose,
  onSaved,
}: {
  appUrl: string;
  onClose: () => void;
  onSaved: (login: AppLogin) => void;
}) {
  const [phase, setPhase] = useState<"starting" | "live" | "saving">("starting");
  const [frame, setFrame] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState(appUrl);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const captureRef = useRef<{ id: string; width: number; height: number } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const savedRef = useRef(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const wheel = useRef<{ dy: number; timer: number }>({ dy: 0, timer: 0 });

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    startCapture(appUrl)
      .then(({ capture_id, viewport }) => {
        if (disposed) {
          cancelCapture(capture_id).catch(() => undefined);
          return;
        }
        captureRef.current = { id: capture_id, ...viewport };
        const socket = new WebSocket(captureSocketUrl(capture_id));
        socket.binaryType = "blob";
        socketRef.current = socket;
        socket.onopen = () => {
          setPhase("live");
          surfaceRef.current?.focus();
        };
        socket.onmessage = (event) => {
          if (typeof event.data === "string") {
            const message = JSON.parse(event.data);
            if (message.type === "status") setPageUrl(message.url);
            else if (message.type === "notice") setNotice(message.message);
            else if (message.type === "closed" && !savedRef.current)
              setError("The sign-in browser closed after 5 idle minutes. Start again.");
            return;
          }
          const next = URL.createObjectURL(event.data as Blob);
          setFrame(next);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = next;
        };
        socket.onclose = (event) => {
          if (!disposed && !savedRef.current && event.code !== 1000)
            setError("Lost the connection to the sign-in browser. Start again.");
        };
      })
      .catch((err) => !disposed && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      disposed = true;
      socketRef.current?.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      const capture = captureRef.current;
      if (capture && !savedRef.current) cancelCapture(capture.id).catch(() => undefined);
    };
  }, [appUrl]);

  const send = useCallback((message: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }, []);

  const onClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const capture = captureRef.current;
    if (!capture) return;
    const rect = e.currentTarget.getBoundingClientRect();
    send({
      type: "click",
      x: ((e.clientX - rect.left) / rect.width) * capture.width,
      y: ((e.clientY - rect.top) / rect.height) * capture.height,
    });
    surfaceRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const modifier = e.metaKey || e.ctrlKey;
    if (modifier && e.key.toLowerCase() === "a") {
      send({ type: "key", key: "ControlOrMeta+a" });
    } else if (modifier || e.altKey) {
      return; // leave Cmd/Ctrl+V to the paste handler, and other shortcuts to the browser
    } else if (e.key === "Tab" && e.shiftKey) {
      send({ type: "key", key: "Shift+Tab" });
    } else if (SPECIAL_KEYS.has(e.key)) {
      send({ type: "key", key: e.key });
    } else if (e.key.length === 1) {
      send({ type: "text", text: e.key });
    } else {
      return;
    }
    e.preventDefault();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (text) send({ type: "text", text });
    e.preventDefault();
  };

  const onWheel = (e: React.WheelEvent) => {
    wheel.current.dy += e.deltaY;
    if (!wheel.current.timer)
      wheel.current.timer = window.setTimeout(() => {
        send({ type: "wheel", dy: wheel.current.dy });
        wheel.current = { dy: 0, timer: 0 };
      }, 60);
  };

  const save = async () => {
    const capture = captureRef.current;
    if (!capture) return;
    setPhase("saving");
    setNotice(null);
    try {
      const login = await finishCapture(capture.id);
      savedRef.current = true;
      onSaved(login);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
      setPhase("live");
    }
  };

  const origin = originOf(appUrl) ?? appUrl;
  // Leaving closes the sign-in browser without saving anything.
  useLeaveGuard(!error, "You're signing in to your app. If you leave, the sign-in browser closes and nothing is saved. Leave anyway?");

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain">
      <div className="glass-panel rounded-2xl w-full max-w-5xl shadow-2xl border border-zinc-800 flex flex-col max-h-full">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-zinc-800/80">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" /> Sign in to {origin}
            </h3>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Only the resulting session is saved, encrypted. Your password isn&apos;t stored. A demo account is best.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-zinc-800/80 text-xs font-mono">
          <button type="button" onClick={() => send({ type: "back" })} disabled={phase !== "live"} aria-label="Back"
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="flex-1 truncate px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
            {pageUrl}
          </span>
        </div>

        <div className="p-4 overflow-auto">
          {error ? (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> {error}
            </div>
          ) : (
            <div
              ref={surfaceRef}
              tabIndex={0}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onWheel={onWheel}
              className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 aspect-[16/10]"
            >
              {frame && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={frame} alt={`Live view of ${origin}`} onClick={onClick} draggable={false}
                  className="w-full h-full object-contain cursor-pointer select-none" />
              )}
              {(phase === "starting" || !frame) && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-mono text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Opening {origin} in a secure browser…
                </div>
              )}
            </div>
          )}
          {notice && (
            <p className="mt-3 text-xs text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {notice}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-zinc-800/80">
          <p className="text-[11px] text-zinc-500 font-mono">
            Click into the page and type normally. Paste works for passwords from your password manager.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={phase !== "live" || Boolean(error)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition disabled:opacity-50">
              {phase === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              I&apos;m signed in, save session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
