"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Rocket,
  Sparkles,
  Github,
  Globe,
  Mic,
  Clock,
  Film,
  FileText,
  Share2,
  AlertCircle,
  X,
  Sliders,
  CheckCircle2,
  Terminal,
  LogOut,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  Database,
  Mail,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { ApiError, checkBackendHealth, listAppLogins, listFixtures, originOf, startPipelineJob } from "@/lib/api";
import type { AppLogin, FixtureSet, HealthStatus } from "@/lib/types";
import { useJobStream } from "@/lib/useJobStream";
import { useLeaveGuard } from "@/lib/useLeaveGuard";
import { AuthGate, type Session } from "@/components/AuthGate";
import { AgentTrace, LedgerStrip } from "@/components/AgentTrace";
import { LogTerminal } from "@/components/LogTerminal";
import { PipelineError } from "@/components/PipelineError";
import { VideoTheater } from "@/components/VideoTheater";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { Personalize, AudienceBriefCard, NextCustomerStrip, emptyAudience } from "@/components/Personalize";
import { Outreach } from "@/components/Outreach";
import { CustomerDemos, type MakeAnotherSeed } from "@/components/CustomerDemos";
import { audienceOf, audiencePayload, type AudienceInput, type JobWithAudience } from "@/lib/audience";
import { useDemoQueue } from "@/lib/useDemoQueue";

const PRESETS = [
  {
    name: "FastAPI + Docs",
    repo: "https://github.com/fastapi/fastapi",
    app: "https://fastapi.tiangolo.com",
  },
  {
    name: "Vercel AI SDK",
    repo: "https://github.com/vercel/ai",
    app: "https://sdk.vercel.ai",
  },
  {
    name: "Shadcn UI",
    repo: "https://github.com/shadcn-ui/ui",
    app: "https://ui.shadcn.com",
  },
];

const MAX_REPOS = 5;
const LEAVE_MESSAGE =
  "Your demo is still being generated. If you leave this page, you'll lose its progress and results. Leave anyway?";

function Dashboard({ session }: { session: Session }) {
  // Several repositories can describe one product (for example a frontend and a backend).
  const [repoUrls, setRepoUrls] = useState<string[]>(["https://github.com/fastapi/fastapi"]);
  const [appUrl, setAppUrl] = useState("https://fastapi.tiangolo.com");
  // Saved app logins (Settings) let the recorder show pages behind the app's sign-in.
  const [appLogins, setAppLogins] = useState<AppLogin[]>([]);
  const [useAppLogin, setUseAppLogin] = useState(true);
  // Staged sample data sets (Settings) replace the app's API responses while recording.
  const [fixtureSets, setFixtureSets] = useState<FixtureSet[]>([]);
  const [useStagedData, setUseStagedData] = useState(true);
  const [voiceStyle, setVoiceStyle] = useState("energetic_tech");
  const [targetSeconds, setTargetSeconds] = useState(60);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const backendOnline = health !== null;

  // Live job state over SSE (/api/pipeline/events/{id}) with reconnects and a polling fallback.
  const [jobId, setJobId] = useState<string | null>(null);
  const { job, setJob, streamState, stepExtras, stepMarks } = useJobStream(jobId);
  const [starting, setStarting] = useState(false);
  const [activeTab, setActiveTab] = useState<"video" | "outreach" | "readme" | "devpost" | "social">("video");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [initError, setInitError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  // Personalized demos: one video per ideal customer (who will watch, their site, the next step).
  const [audience, setAudience] = useState<AudienceInput | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const companyRef = useRef<HTMLInputElement>(null);
  const [demosKey, setDemosKey] = useState(0);

  // /?job=<id> reopens a job (the presenter's plan-B tab): the stream replays every event, thumbnails included,
  // while the job is in memory; after a restart the hook gets the final snapshot with its steps and tool calls.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("job");
    if (id && /^[a-f0-9]{8,32}$/.test(id)) setJobId(id);
  }, []);

  // Check health: every 3s while the backend is down (it may still be booting), every 15s once it's up
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const result = await checkBackendHealth();
      if (cancelled) return;
      setHealth(result);
      timer = setTimeout(check, result ? 15000 : 3000);
    };
    void check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    listAppLogins()
      .then(setAppLogins)
      .catch(() => setAppLogins([]));
    listFixtures()
      .then(setFixtureSets)
      .catch(() => setFixtureSets([]));
  }, []);
  const appOrigin = originOf(appUrl);
  const savedLogin = appLogins.find((login) => login.origin === appOrigin);
  const stagedSet = fixtureSets.find((set) => set.origin === appOrigin && set.enabled_count > 0);

  const updateRepo = (index: number, value: string) =>
    setRepoUrls((urls) => urls.map((url, i) => (i === index ? value : url)));

  // Timer for elapsed pipeline runtime
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (job?.status === "running") {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [job?.status]);

  // Locked from submit until the job ends, so a double click can't start two jobs. A lost stream unlocks it.
  const busy =
    starting || ((job?.status === "queued" || job?.status === "running") && streamState !== "lost");
  const brief = audienceOf(job); // null for generic runs
  const kit = (job as JobWithAudience | null)?.launch_kit;
  const outreach = kit?.outreach_email ?? null;
  useEffect(() => {
    if (job?.status === "completed" || job?.status === "failed") setDemosKey((k) => k + 1); // the board reloads
  }, [job?.status]);

  // `explicit` is a queued customer; otherwise the open Personalize panel decides (closed or empty = generic demo).
  const startWith = async (explicit?: AudienceInput | null) => {
    if (busy) return;
    const chosen = explicit === undefined ? (personalizeOpen ? audience : null) : explicit;
    const audienceField = audiencePayload(chosen);
    if (explicit) {
      setAudience(explicit);
      setPersonalizeOpen(true);
    }
    setInitError(null);
    setElapsedSeconds(0);
    setStarting(true);

    try {
      const initialJob = await startPipelineJob({
        repo_urls: repoUrls.map((url) => url.trim()).filter(Boolean),
        app_url: appUrl,
        voice_style: voiceStyle,
        target_seconds: targetSeconds,
        use_app_login: useAppLogin,
        use_staged_data: useStagedData,
        ...(audienceField ? { audience: audienceField } : {}),
      });
      setActiveTab("video");
      setJob(initialJob);
      setJobId(initialJob.job_id); // useJobStream subscribes to this job's event stream
      window.history.replaceState(null, "", `?job=${initialJob.job_id}`); // a reload or a plan-B tab reopens it
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) return session.logout(); // session expired
      setInitError(err.message || "Failed to start autonomous pipeline. Ensure FastAPI backend is running on :8000.");
    } finally {
      setStarting(false);
    }
  };
  const handleStart = (e?: React.FormEvent) => {
    e?.preventDefault();
    return startWith();
  };

  // "Make another for the next customer": same app, repos, tone and next step; a new person to make it for.
  const makeAnother = (seed: MakeAnotherSeed) => {
    setAppUrl(seed.appUrl);
    setAudience({ ...emptyAudience(), persona: seed.persona, goal: seed.goal, cta_url: seed.ctaUrl ?? "" });
    setPersonalizeOpen(true);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
    requestAnimationFrame(() => companyRef.current?.focus());
  };

  // Several customers in a row: each starts when the previous job ends (recording is one at a time anyway).
  const { queue, enqueue, cancel } = useDemoQueue({ jobStatus: job?.status, starting, startWith });
  // Leaving mid-run (or with customers still queued) loses the progress and results, so ask first.
  const confirmLeave = useLeaveGuard(busy || queue.length > 0, LEAVE_MESSAGE);

  const handleEditInputs = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-[#08090c] text-zinc-100 bg-grid-pattern selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Background radial spotlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Top Navigation & Status Bar */}
        <header className="flex items-center justify-between pb-6 mb-10 border-b border-zinc-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-950/30">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white tracking-tight text-lg">
                  DemoDay
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/80 text-zinc-300 font-mono">
                  Launch Studio
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Autonomous Video Reel & Launch Kit Engine
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full glass-panel text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendOnline
                    ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-zinc-300">
                FastAPI {backendOnline ? "Online" : "Standby (:8000)"}
              </span>
            </div>
            {health && (!health.ffmpeg || !health.gemini || !health.fal) && (
              <div
                className="hidden sm:flex items-center px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-950/30 text-[11px] font-mono text-amber-300"
                title="The backend is missing keys or tools and will use fallbacks"
              >
                {[
                  !health.ffmpeg && "FFmpeg missing",
                  !health.gemini && "Gemini: templates",
                  !health.fal && "fal.ai: local TTS",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
            <span className="hidden lg:inline text-[11px] font-mono text-zinc-500">{session.user.email}</span>
            <Link
              href="/settings"
              title="Settings: GitHub access and app logins"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-panel text-xs font-mono text-zinc-300 hover:text-white transition"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <button
              type="button"
              onClick={() => confirmLeave() && session.logout()}
              title="Sign out"
              className="p-2 rounded-full glass-panel text-zinc-400 hover:text-white transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-700/60 shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-medium text-zinc-300">
              Open Track • GenAI Hackathon 2026
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-[1.15]">
            Point it at a repo & URL.
            <br />
            <span className="text-emerald-400 font-normal italic">
              Watch it make your demo day.
            </span>
          </h2>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            The agent plans your video narrative with Gemini, synthesizes punchy
            voiceovers via fal.ai, records 1080p browser footage with Playwright,
            and writes your Devpost submission, README, and social launch thread.
          </p>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
            <span className="text-zinc-500 font-mono">Try with:</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setRepoUrls([p.repo]);
                  setAppUrl(p.app);
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition text-[11px] font-mono"
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        {/* Global Dispatch Error Toast Banner */}
        {initError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{initError}</span>
            </div>
            <button
              onClick={() => setInitError(null)}
              className="text-rose-400 hover:text-rose-200 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Interactive Input Dock */}
        <form
          ref={formRef}
          onSubmit={handleStart}
          className="glass-panel-glow rounded-2xl p-6 sm:p-8 mb-10 shadow-2xl relative overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Repo Input */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-xs font-mono uppercase text-zinc-400 tracking-wider">
                <Github className="w-3.5 h-3.5 text-emerald-400" />
                <span>GitHub Repositor{repoUrls.length > 1 ? "ies" : "y"} URL</span>
              </label>
              {repoUrls.map((url, index) => (
                <div key={index} className="relative flex items-center gap-2">
                  <input
                    type="url"
                    required={index === 0}
                    value={url}
                    onChange={(e) => updateRepo(index, e.target.value)}
                    placeholder={index === 0 ? "https://github.com/owner/repo" : "https://github.com/owner/another-repo"}
                    aria-label={`Repository ${index + 1}`}
                    className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition"
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => setRepoUrls((urls) => urls.filter((_, i) => i !== index))}
                      aria-label={`Remove repository ${index + 1}`}
                      className="p-2.5 rounded-xl text-zinc-500 hover:text-rose-300 hover:bg-rose-950/30 border border-zinc-800 transition shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                {repoUrls.length < MAX_REPOS ? (
                  <button
                    type="button"
                    onClick={() => setRepoUrls((urls) => [...urls, ""])}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add repository (frontend, backend…)
                  </button>
                ) : (
                  <span className="text-zinc-500">Up to {MAX_REPOS} repositories</span>
                )}
                <Link href="/settings" className="text-zinc-500 hover:text-zinc-300 transition">
                  Private repo? Add a GitHub token
                </Link>
              </div>
            </div>

            {/* App URL Input */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-xs font-mono uppercase text-zinc-400 tracking-wider">
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <span>Live Deployed Web Application URL</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  placeholder="https://my-app.lovable.app"
                  className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition"
                />
              </div>
              {savedLogin ? (
                <label className="flex items-center gap-2 text-[11px] font-mono text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useAppLogin}
                    onChange={(e) => setUseAppLogin(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Record signed in with your saved login
                </label>
              ) : (
                <Link href="/settings" className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Pages behind a login? Save an app login in Settings
                </Link>
              )}
              {stagedSet && (
                <label className="flex items-center gap-2 text-[11px] font-mono text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useStagedData}
                    onChange={(e) => setUseStagedData(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  Show staged sample data ({stagedSet.enabled_count} endpoints, labelled in the video)
                </label>
              )}
            </div>
          </div>

          <Personalize
            value={audience}
            onChange={setAudience}
            open={personalizeOpen}
            onOpenChange={setPersonalizeOpen}
            disabled={busy}
            geminiAvailable={!!health?.gemini}
            focusRef={companyRef}
          />

          {/* Options Row */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-400">Tone:</span>
                <select
                  value={voiceStyle}
                  onChange={(e) => setVoiceStyle(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="energetic_tech">⚡ Energetic Tech Founder</option>
                  <option value="calm_expert">🎙️ Calm Technical Architect</option>
                  <option value="fast_founder">🚀 Fast 30s Pitch</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-zinc-400">Target Duration:</span>
                <div className="inline-flex rounded-lg bg-zinc-950 p-1 border border-zinc-800 text-[11px]">
                  {[30, 60, 90].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTargetSeconds(sec)}
                      className={`px-2.5 py-0.5 rounded-md transition ${
                        targetSeconds === sec
                          ? "bg-zinc-800 text-emerald-400 font-bold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={busy}
              className="shrink-0 whitespace-nowrap flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {busy
                  ? "Orchestrating Demo..."
                  : personalizeOpen && audience?.company.trim()
                    ? `Generate Demo for ${audience.company.trim()}`
                    : "Generate Demo & Launch Kit"}
              </span>
            </button>
          </div>
        </form>

        {/* Live Stepper, Error Banner, & Telemetry */}
        {job && (
          <section className="space-y-6 mb-10">
            {streamState === "lost" && (job.status === "queued" || job.status === "running") && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center space-x-2.5 shadow-lg">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Lost contact with the backend. It may have restarted, which clears in-memory jobs. Start a new run.
                </span>
              </div>
            )}

            {/* Agent Trace (replaces the stepper; renders the old grid itself when the job has no steps) */}
            <AgentTrace job={job} extras={stepExtras} marks={stepMarks} elapsedSeconds={elapsedSeconds} />

            {/* Tool ledger: every Gemini and fal.ai call, live */}
            <LedgerStrip calls={job.tool_calls} status={job.status} />

            {/* Who this demo is for: the customer brief, live (facts from their site, labelled assumptions) */}
            {brief && <AudienceBriefCard brief={brief} sceneCount={job.storyboard?.scenes.length} />}
            {queue.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-300">
                <span>Next: {queue.map((a) => a.company).join(", ")}</span>
                <button type="button" onClick={cancel} className="text-zinc-400 hover:text-rose-300 transition">
                  Cancel the rest
                </button>
              </div>
            )}

            {/* Error State Card (if failed) */}
            {job.status === "failed" && (
              <PipelineError
                error={job.error}
                stage={job.stage}
                jobId={job.job_id}
                logs={job.logs}
                onRetry={() => handleStart()}
                onEditSettings={handleEditInputs}
              />
            )}

            {/* Unified Telemetry Terminal */}
            <LogTerminal
              logs={job.logs}
              jobId={job.job_id}
              status={job.status}
              stage={job.stage}
            />
          </section>
        )}

        {/* Deliverables Workspace Showcase (on completion) */}
        {job?.status === "completed" && (
          <section className="space-y-6 pt-4">
            {brief ? (
              <NextCustomerStrip
                company={brief.company}
                durationSec={job.storyboard?.total_duration_sec}
                videoUrl={job.video_url}
                kit={kit}
                onNext={() =>
                  makeAnother({
                    appUrl: job.app_url ?? appUrl,
                    persona: brief.persona,
                    goal: brief.goal ?? "book_call",
                    ctaUrl: brief.cta_url ?? undefined,
                  })
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => makeAnother({ appUrl, persona: "", goal: "book_call" })}
                className="flex items-center gap-2 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition"
              >
                Now make this one for a customer <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Tab Navigation Dock */}
            <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-md">
              <button
                onClick={() => setActiveTab("video")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === "video"
                    ? "bg-zinc-800 text-white shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Film className="w-4 h-4 text-emerald-400" />
                <span>{Math.round(job.storyboard?.total_duration_sec || targetSeconds)}s Demo Reel</span>
              </button>

              {outreach && (
                <button
                  onClick={() => setActiveTab("outreach")}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    activeTab === "outreach" ? "bg-zinc-800 text-white shadow-md" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Outreach</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab("readme")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === "readme"
                    ? "bg-zinc-800 text-white shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>README.md</span>
              </button>

              <button
                onClick={() => setActiveTab("devpost")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === "devpost"
                    ? "bg-zinc-800 text-white shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Rocket className="w-4 h-4 text-purple-400" />
                <span>Devpost Pitch</span>
              </button>

              <button
                onClick={() => setActiveTab("social")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === "social"
                    ? "bg-zinc-800 text-white shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Social Launch Campaign</span>
              </button>
            </div>

            {/* TAB 1: Interactive Video Theater */}
            {activeTab === "video" && (
              <VideoTheater
                videoUrl={job.video_url}
                storyboard={job.storyboard}
                elapsedSeconds={elapsedSeconds}
              />
            )}

            {/* Outreach: the email and LinkedIn DM for this customer, copied with the share link */}
            {activeTab === "outreach" && outreach && (
              <Outreach
                email={outreach}
                dm={kit?.linkedin_dm}
                videoUrl={job.video_url}
                company={brief?.company ?? ""}
                firstName={brief?.first_name}
              />
            )}

            {/* TAB 2: README */}
            {activeTab === "readme" && job.launch_kit && (
              <MarkdownViewer
                title="Generated README.md"
                content={job.launch_kit.readme_markdown}
                badge="MARKDOWN"
              />
            )}

            {/* TAB 3: Devpost */}
            {activeTab === "devpost" && job.launch_kit && (
              <MarkdownViewer
                title="Devpost Hackathon Submission Pitch"
                content={job.launch_kit.devpost_pitch}
                badge="DEVPOST PITCH"
              />
            )}

            {/* TAB 4: Social */}
            {activeTab === "social" && job.launch_kit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MarkdownViewer
                  title="X / Twitter Launch Thread"
                  content={job.launch_kit.x_thread.join("\n\n---\n\n")}
                  badge="X THREAD"
                />
                <MarkdownViewer
                  title="LinkedIn Launch Post"
                  content={job.launch_kit.linkedin_post}
                  badge="LINKEDIN POST"
                />
              </div>
            )}
          </section>
        )}

        {/* Customer demos for this app: one row per personalized video, and "Make another" */}
        <CustomerDemos
          appUrl={appUrl}
          currentJob={job}
          refreshKey={demosKey}
          busy={busy}
          onOpen={(id) => {
            setActiveTab("video");
            setElapsedSeconds(0);
            setJobId(id);
            window.history.replaceState(null, "", `?job=${id}`);
          }}
          onMakeAnother={makeAnother}
          onStartBatch={enqueue}
          batchDefaults={{ goal: audience?.goal ?? "book_call", cta_url: audience?.cta_url }}
        />

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-zinc-800/80 text-center text-xs text-zinc-500 font-mono space-y-2">
          <p>
            DemoDay Launch Studio • Built for GenAI Hackathons
          </p>
          <p className="text-[11px] text-zinc-600">
            {health?.gemini_model ?? "Gemini"} • fal.ai Audio Synthesis • Playwright Chromium • FFmpeg Stitched
          </p>
        </footer>
      </main>
    </div>
  );
}

export default function HomePage() {
  return <AuthGate>{(session) => <Dashboard session={session} />}</AuthGate>;
}
