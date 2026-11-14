"use client";

import React, { useState, useEffect } from "react";
import {
  Rocket,
  Download,
  Terminal,
  ExternalLink,
  Film,
  FileText,
  Share2,
  Sparkles,
  Github,
  Globe,
  Mic,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { checkBackendHealth, startPipelineJob, getFullVideoUrl } from "@/lib/api";
import { JobStatus } from "@/lib/types";
import { PipelineStepper } from "@/components/PipelineStepper";
import { MarkdownViewer } from "@/components/MarkdownViewer";

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

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/fastapi/fastapi");
  const [appUrl, setAppUrl] = useState("https://fastapi.tiangolo.com");
  const [voiceStyle, setVoiceStyle] = useState("energetic_tech");
  const [targetSeconds, setTargetSeconds] = useState(60);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const [job, setJob] = useState<JobStatus | null>(null);
  const [activeTab, setActiveTab] = useState<"video" | "readme" | "devpost" | "social">("video");
  const [showLogs, setShowLogs] = useState(true);

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
    const interval = setInterval(() => {
      checkBackendHealth().then(setBackendOnline);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const initialJob = await startPipelineJob({
        repo_url: repoUrl,
        app_url: appUrl,
        voice_style: voiceStyle,
        target_seconds: targetSeconds,
      });
      setJob(initialJob);

      // Connect to SSE stream
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const eventSource = new EventSource(`${API_BASE}/api/pipeline/stream/${initialJob.job_id}`);

      eventSource.onmessage = (event) => {
        try {
          const updated: JobStatus = JSON.parse(event.data);
          setJob(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            eventSource.close();
          }
        } catch (err) {
          console.error("SSE Parse error:", err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };
    } catch (err: any) {
      alert(`Error starting pipeline: ${err.message}`);
    }
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
                  setRepoUrl(p.repo);
                  setAppUrl(p.app);
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition text-[11px] font-mono"
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        {/* Interactive Input Dock */}
        <form
          onSubmit={handleStart}
          className="glass-panel-glow rounded-2xl p-6 sm:p-8 mb-10 shadow-2xl relative overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Repo Input */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-xs font-mono uppercase text-zinc-400 tracking-wider">
                <Github className="w-3.5 h-3.5 text-emerald-400" />
                <span>GitHub Repository URL</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition"
                />
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
            </div>
          </div>

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
              disabled={job?.status === "running"}
              className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {job?.status === "running"
                  ? "Orchestrating Demo..."
                  : "Generate Demo & Launch Kit"}
              </span>
            </button>
          </div>
        </form>

        {/* Live Stepper & Terminal Logs */}
        {job && (
          <section className="space-y-4 mb-10">
            <PipelineStepper
              currentStage={job.stage}
              progress={job.progress}
              status={job.status}
            />

            {/* Terminal Drawer */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-zinc-800/80">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950/80 border-b border-zinc-800/80 text-xs">
                <div className="flex items-center space-x-2 font-mono text-zinc-400">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Agent Execution Log</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-500">ID: {job.job_id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 font-mono text-[11px] transition"
                >
                  <span>{showLogs ? "Collapse" : "Expand"}</span>
                  {showLogs ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {showLogs && (
                <div className="p-4 bg-zinc-950/60 font-mono text-xs text-zinc-400 max-h-52 overflow-y-auto space-y-1.5 selection:bg-zinc-800">
                  {job.logs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-2">
                      <span className="text-emerald-500 select-none">›</span>
                      <span className="text-zinc-300">{log}</span>
                    </div>
                  ))}
                  {job.status === "running" && (
                    <div className="flex items-center space-x-2 text-emerald-400 animate-pulse pt-1">
                      <span className="select-none">›</span>
                      <span>Agent working...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Deliverables Workspace Showcase */}
        {job?.status === "completed" && (
          <section className="space-y-6 pt-4">
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
                <span>60s Demo Reel</span>
              </button>

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

            {/* TAB 1: 21st.dev Video Theater */}
            {activeTab === "video" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden p-5 shadow-2xl border border-zinc-800">
                  {/* Theater Window Bar */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                      <span className="text-zinc-400 font-mono text-[11px] ml-2">
                        1080p Headless MP4
                      </span>
                    </div>

                    {job.video_url && (
                      <a
                        href={getFullVideoUrl(job.video_url)}
                        download="demoday-pitch.mp4"
                        className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download MP4</span>
                      </a>
                    )}
                  </div>

                  {/* Video Player */}
                  <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden relative border border-zinc-800/80 shadow-inner flex items-center justify-center">
                    {job.video_url ? (
                      <video
                        controls
                        autoPlay
                        className="w-full h-full object-cover"
                        src={getFullVideoUrl(job.video_url)}
                      />
                    ) : (
                      <div className="text-center space-y-2 text-zinc-500 font-mono text-xs">
                        <Film className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
                        <p>Video rendering in progress...</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {job.storyboard?.project_name}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {job.storyboard?.tagline}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      fal.ai voice + Playwright
                    </span>
                  </div>
                </div>

                {/* Storyboard Script Timeline */}
                <div className="glass-panel rounded-2xl p-5 space-y-3.5 border border-zinc-800">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                      Storyboard Timeline
                    </h4>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {job.storyboard?.scenes.length ?? 0} Scenes
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {job.storyboard?.scenes.map((scene, idx) => (
                      <div
                        key={scene.id}
                        className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs space-y-2 hover:border-zinc-700 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-400 font-mono text-[11px]">
                            Scene {idx + 1}: {scene.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                            {scene.route}
                          </span>
                        </div>

                        <p className="text-zinc-300 italic font-sans leading-relaxed text-[11px]">
                          "{scene.narration}"
                        </p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {scene.actions.map((act, aIdx) => (
                            <span
                              key={aIdx}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400"
                            >
                              {act.type} {act.value ? `(${act.value})` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-zinc-800/80 text-center text-xs text-zinc-500 font-mono space-y-2">
          <p>
            DemoDay Launch Studio • Built for GenAI Hackathons
          </p>
          <p className="text-[11px] text-zinc-600">
            Gemini 2.0 Flash • fal.ai Audio Synthesis • Playwright Chromium • FFmpeg Stitched
          </p>
        </footer>
      </main>
    </div>
  );
}
