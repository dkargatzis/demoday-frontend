"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Github,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  Rocket,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { AuthGate, type Session } from "@/components/AuthGate";
import { LoginCapture } from "@/components/LoginCapture";
import { StagedData } from "@/components/StagedData";
import { checkBackendHealth } from "@/lib/api";
import { deleteAppLogin, deleteGitHubToken, getSettings, originOf, saveGitHubToken } from "@/lib/api";
import type { Settings } from "@/lib/types";

const input =
  "w-full px-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition";
const formatDate = (seconds: number) =>
  new Date(seconds * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function SettingsView({ session }: { session: Session }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [captureUrl, setCaptureUrl] = useState("");
  const [capturing, setCapturing] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [geminiAvailable, setGeminiAvailable] = useState(true);
  useEffect(() => {
    checkBackendHealth().then((h) => setGeminiAvailable(Boolean(h?.gemini)));
  }, []);

  const reload = useCallback(() => {
    getSettings()
      .then(setSettings)
      .catch((err) => setError(err.message));
  }, []);
  useEffect(reload, [reload]);

  const run = async (action: () => Promise<unknown>, done?: string) => {
    setError(null);
    setFlash(null);
    try {
      await action();
      if (done) setFlash(done);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const saveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingToken(true);
    await run(async () => {
      await saveGitHubToken(token);
      setToken("");
    }, "GitHub token saved");
    setSavingToken(false);
  };

  const openCapture = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFlash(null);
    if (originOf(captureUrl)) setCapturing(captureUrl.trim());
    else setError("Enter the app's full URL, starting with https://");
  };

  const locked = settings !== null && !settings.vault;

  return (
    <div className="relative min-h-screen bg-[#08090c] text-zinc-100 bg-grid-pattern">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight text-lg">Settings</h1>
              <p className="text-[11px] text-zinc-400">Private repositories and signed-in recording</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span className="hidden sm:inline text-zinc-500">{session.user.email}</span>
            <button type="button" onClick={session.logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </header>

        {locked && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Saving credentials is turned off on this server: DEMODAY_SECRET_KEY is not set.
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> {error}
          </div>
        )}
        {flash && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {flash}
          </div>
        )}

        {/* GitHub access */}
        <section className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">GitHub access</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Needed for private repositories, and it raises GitHub&apos;s rate limit. Create a{" "}
            <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">fine-grained token</a>{" "}
            with read-only <span className="font-mono text-zinc-300">Contents</span> and{" "}
            <span className="font-mono text-zinc-300">Metadata</span> access to the repositories you want in demos.
            It&apos;s stored encrypted and only used to read those repositories.
          </p>
          {settings?.github ? (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <div className="text-xs">
                <p className="text-zinc-200 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Connected as @{settings.github.login}
                </p>
                <p className="text-zinc-500 font-mono mt-0.5">
                  {settings.github.token_type} token · saved {formatDate(settings.github.created_at)}
                </p>
              </div>
              <button type="button" onClick={() => run(deleteGitHubToken, "GitHub token removed")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/60 transition">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          ) : (
            <form onSubmit={saveToken} className="flex flex-col sm:flex-row gap-2">
              <input type="password" required minLength={20} placeholder="github_pat_…" value={token} disabled={locked}
                autoComplete="off" onChange={(e) => setToken(e.target.value)} className={input} />
              <button type="submit" disabled={savingToken || locked}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition disabled:opacity-50 shrink-0">
                {savingToken ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                Save token
              </button>
            </form>
          )}
        </section>

        {/* App logins */}
        <section className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">App logins for signed-in recording</h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            To record pages behind your app&apos;s login, sign in once in a secure browser that DemoDay opens for you.
            SSO and two-factor flows work. Only the resulting session is saved, encrypted; your password isn&apos;t
            stored. Recordings and AI planning see whatever this account shows, so a demo account with sample data
            is best. DemoDay never clicks sign-out or destructive buttons.
          </p>

          <div className="space-y-2">
            {settings?.app_logins.length === 0 && (
              <p className="text-xs text-zinc-500 font-mono">No saved app logins yet.</p>
            )}
            {settings?.app_logins.map((login) => (
              <div key={login.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="text-xs min-w-0">
                  <p className="text-zinc-200 font-semibold flex items-center gap-1.5 truncate">
                    <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" /> {login.origin}
                  </p>
                  <p className="text-zinc-500 font-mono mt-0.5">
                    saved {formatDate(login.created_at)} · {login.cookie_count} cookies
                    {login.indexed_db_records ? ` · ${login.indexed_db_records} IndexedDB` : ""}
                    {login.session_storage_keys ? ` · ${login.session_storage_keys} session keys` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setError(null); setFlash(null); setCapturing(login.last_url || login.origin); }} disabled={locked}
                    className="px-3 py-1.5 rounded-lg text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition disabled:opacity-50">
                    Sign in again
                  </button>
                  <button type="button" onClick={() => run(() => deleteAppLogin(login.id), `Removed the login for ${login.origin}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/60 transition">
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={openCapture} className="flex flex-col sm:flex-row gap-2 pt-2">
            <input type="url" required placeholder="https://app.example.com/dashboard" value={captureUrl}
              disabled={locked} onChange={(e) => setCaptureUrl(e.target.value)} className={input} />
            <button type="submit" disabled={locked}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition disabled:opacity-50 shrink-0">
              <Globe className="w-3.5 h-3.5" /> Add app login
            </button>
          </form>
        </section>
        <StagedData suggestedUrl={settings?.app_logins[0]?.last_url || settings?.app_logins[0]?.origin}
          geminiAvailable={geminiAvailable} />
      </main>

      {capturing && (
        <LoginCapture
          appUrl={capturing}
          onClose={() => setCapturing(null)}
          onSaved={(login) => {
            setCapturing(null);
            setCaptureUrl("");
            setError(null);
            setFlash(`Saved your login for ${login.origin}. Demos of this app will now be recorded signed in.`);
            reload();
          }}
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return <AuthGate>{(session) => <SettingsView session={session} />}</AuthGate>;
}
