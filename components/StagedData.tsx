"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Database, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { captureFixtures, deleteFixtures, getFixture, listFixtures, originOf, polishFixtures, updateFixtures } from "@/lib/api";
import type { FixtureEntry, FixtureSet } from "@/lib/types";

const input =
  "w-full px-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition";
const formatDate = (seconds: number) =>
  new Date(seconds * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const shortUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.pathname + (u.search.length > 30 ? u.search.slice(0, 30) + "…" : u.search);
  } catch {
    return url;
  }
};

/**
 * Staged sample data: capture an app's JSON API responses, have Gemini rewrite them as rich demo data of the
 * same shape, review and edit them, and replay them while recording (labelled "Sample data" in the video).
 */
export function StagedData({ suggestedUrl, geminiAvailable }: { suggestedUrl?: string; geminiAvailable: boolean }) {
  const [sets, setSets] = useState<FixtureSet[]>([]);
  const [open, setOpen] = useState<FixtureSet | null>(null);
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [url, setUrl] = useState(suggestedUrl ?? "");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState<"capture" | "polish" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const reload = useCallback(() => {
    listFixtures()
      .then(setSets)
      .catch((err) => setError(err.message));
  }, []);
  useEffect(reload, [reload]);
  useEffect(() => {
    if (suggestedUrl && !url) setUrl(suggestedUrl);
  }, [suggestedUrl, url]);

  const entries: FixtureEntry[] = open?.entries ?? [];
  const select = (set: FixtureSet, index: number) => {
    setOpen(set);
    setSelected(index);
    setDraft(JSON.stringify(set.entries?.[index]?.body ?? null, null, 2));
    setDraftError(null);
  };

  const run = async (kind: "capture" | "polish" | "save", action: () => Promise<FixtureSet | void>, done: string) => {
    setBusy(kind);
    setError(null);
    setFlash(null);
    try {
      const result = await action();
      if (result) select(result, 0);
      setFlash(result?.note ? `${done}: ${result.note}` : done);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  /** Applies the editor text to the selected entry; returns the updated entries or null when it isn't valid JSON. */
  const applyDraft = (): FixtureEntry[] | null => {
    if (!open?.entries) return null;
    try {
      const body = JSON.parse(draft);
      setDraftError(null);
      return open.entries.map((e, i) => (i === selected ? { ...e, body, source: "edited" } : e));
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : String(err));
      return null;
    }
  };

  const save = () => {
    const updated = applyDraft();
    if (!updated || !open) return;
    void run("save", () => updateFixtures(open.id, updated), "Sample data saved");
  };

  const toggleEntry = (index: number) => {
    if (!open?.entries) return;
    const updated = open.entries.map((e, i) => (i === index ? { ...e, enabled: !e.enabled } : e));
    setOpen({ ...open, entries: updated });
  };

  return (
    <section className="glass-panel rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-bold text-white">Staged sample data</h2>
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed">
        Dashboards look best with real-looking data. DemoDay loads your app (signed in, when you saved a login),
        records the JSON its pages fetch, and Gemini rewrites those responses as rich sample data with exactly the
        same structure. Demos then replay that data instead of calling your API, and the video carries a small
        &ldquo;Sample data&rdquo; label. Works for pages that load their data from JSON APIs in the browser.
      </p>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> {error}
        </div>
      )}
      {flash && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {flash}
        </div>
      )}

      <div className="space-y-2">
        {sets.length === 0 && <p className="text-xs text-zinc-500 font-mono">No sample data yet.</p>}
        {sets.map((set) => (
          <div key={set.id}
            className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border ${
              open?.id === set.id ? "bg-emerald-950/20 border-emerald-800/60" : "bg-zinc-950/70 border-zinc-800"
            }`}>
            <div className="text-xs min-w-0">
              <p className="text-zinc-200 font-semibold truncate">{set.origin}</p>
              <p className="text-zinc-500 font-mono mt-0.5">
                {set.enabled_count}/{set.entry_count} endpoints · {set.polished ? "Gemini-polished" : "as captured"} ·{" "}
                {formatDate(set.updated_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => getFixture(set.id).then((full) => select(full, 0)).catch((e) => setError(e.message))}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition">
                {open?.id === set.id ? "Editing" : "Review & edit"}
              </button>
              <button type="button"
                onClick={() => run("save", async () => { await deleteFixtures(set.id); if (open?.id === set.id) setOpen(null); }, `Removed the sample data for ${set.origin}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/60 transition">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!originOf(url)) return setError("Enter the dashboard page's full URL, starting with https://");
          void run("capture", () => captureFixtures(url.trim()), "Captured the page's API responses. Now polish them with Gemini or edit them below.");
        }}
        className="flex flex-col sm:flex-row gap-2 pt-2"
      >
        <input type="url" required placeholder="https://app.example.com/dashboard" value={url} disabled={busy !== null}
          onChange={(e) => setUrl(e.target.value)} className={input} />
        <button type="submit" disabled={busy !== null}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition disabled:opacity-50 shrink-0">
          {busy === "capture" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
          {busy === "capture" ? "Loading the page…" : "Capture API data"}
        </button>
      </form>

      {open && (
        <div className="space-y-3 pt-2 border-t border-zinc-800/80">
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={brief} onChange={(e) => setBrief(e.target.value)} disabled={busy !== null} maxLength={500}
              placeholder="Optional brief for Gemini, e.g. a 12-person team with 8 active repositories and healthy weekly growth"
              className={input} />
            <button type="button" disabled={busy !== null || !geminiAvailable}
              title={geminiAvailable ? "Rewrite the captured responses as rich sample data" : "GEMINI_API_KEY is not set on the backend"}
              onClick={() => run("polish", () => polishFixtures(open.id, brief), "Gemini rewrote the data")}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition disabled:opacity-50 shrink-0">
              {busy === "polish" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {busy === "polish" ? "Asking Gemini…" : "Polish with Gemini"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {entries.map((entry, index) => (
                <div key={index}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] font-mono cursor-pointer ${
                    index === selected ? "bg-zinc-800 border-emerald-700/60 text-white" : "bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                  onClick={() => { const updated = applyDraft(); if (updated) setOpen({ ...open, entries: updated }); setSelected(index); setDraft(JSON.stringify((updated ?? entries)[index].body, null, 2)); }}>
                  <input type="checkbox" checked={entry.enabled} onChange={() => toggleEntry(index)} onClick={(e) => e.stopPropagation()}
                    className="accent-emerald-500" title="Replay this endpoint" />
                  <span className="truncate flex-1" title={entry.url}>
                    <span className="text-zinc-500">{entry.method}</span> {shortUrl(entry.url)}
                  </span>
                  {entry.source.startsWith("gemini") && <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />}
                </div>
              ))}
            </div>
            <div className="md:col-span-2 space-y-2">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false}
                className="w-full h-80 p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-emerald-500 resize-y" />
              {draftError && <p className="text-[11px] text-rose-300">Not valid JSON: {draftError}</p>}
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-zinc-500 font-mono truncate">{entries[selected]?.source ?? ""}</p>
                <button type="button" onClick={save} disabled={busy !== null}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition disabled:opacity-50">
                  {busy === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Save sample data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
