"use client";

import React, { useState, useEffect } from "react";
import {
  Rocket,
  Play,
  Download,
  Terminal,
  ExternalLink,
  Film,
  FileText,
  Share2,
  Sparkles,
} from "lucide-react";
import { checkBackendHealth, startPipelineJob, getFullVideoUrl } from "@/lib/api";
import { JobStatus } from "@/lib/types";
import { PipelineStepper } from "@/components/PipelineStepper";
import { MarkdownViewer } from "@/components/MarkdownViewer";

export default function HomePage() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/fastapi/fastapi");
  const [appUrl, setAppUrl] = useState("https://fastapi.tiangolo.com");
  const [voiceStyle, setVoiceStyle] = useState("energetic_tech");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const [job, setJob] = useState<JobStatus | null>(null);
  const [activeTab, setActiveTab] = useState<"video" | "readme" | "devpost" | "social">("video");
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const initialJob = await startPipelineJob({
        repo_url: repoUrl,
        app_url: appUrl,
        voice_style: voiceStyle,
        target_seconds: 60,
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
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
              <Rocket className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              DemoDay Launch Studio
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Autonomous browser recording, fal.ai voiceovers, and Devpost pitch generator
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-zinc-300 font-mono">
              FastAPI {backendOnline ? "Connected" : "Standby (:8000)"}
            </span>
          </div>
        </div>
      </header>

      {/* Input Form */}
      <form
        onSubmit={handleStart}
        className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-8 backdrop-blur-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
              GitHub Repository URL
            </label>
            <input
              type="url"
              required
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
              Deployed Application URL
            </label>
            <input
              type="url"
              required
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="https://my-app.lovable.app"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-zinc-800/60">
          <div className="flex items-center space-x-3 text-xs w-full sm:w-auto">
            <span className="text-zinc-400 font-mono">Voice Tone:</span>
            <select
              value={voiceStyle}
              onChange={(e) => setVoiceStyle(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="energetic_tech">⚡ Energetic Tech Founder</option>
              <option value="calm_expert">🎙️ Calm Technical Expert</option>
              <option value="fast_founder">🚀 Fast Hackathon Pitch</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={job?.status === "running"}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold text-xs tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {job?.status === "running" ? "Generating Launch Kit..." : "Generate Demo & Launch Kit"}
            </span>
          </button>
        </div>
      </form>

      {/* Stepper & Logs */}
      {job && (
        <div className="space-y-4">
          <PipelineStepper
            currentStage={job.stage}
            progress={job.progress}
            status={job.status}
          />

          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center space-x-1.5 text-zinc-400 hover:text-zinc-200 transition font-mono"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showLogs ? "Hide Execution Logs" : "View Execution Logs"}</span>
            </button>
            <span className="font-mono text-zinc-500">Job: {job.job_id}</span>
          </div>

          {showLogs && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-400 max-h-48 overflow-y-auto space-y-1">
              {job.logs.map((log, i) => (
                <div key={i} className="flex items-start space-x-2">
                  <span className="text-emerald-500">›</span>
                  <span className="text-zinc-300">{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results Workspace */}
      {job?.status === "completed" && (
        <div className="mt-8 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex space-x-2 border-b border-zinc-800 pb-2">
            <button
              onClick={() => setActiveTab("video")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "video"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Film className="w-4 h-4 text-emerald-400" />
              <span>60s Demo Video</span>
            </button>

            <button
              onClick={() => setActiveTab("readme")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "readme"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>README.md</span>
            </button>

            <button
              onClick={() => setActiveTab("devpost")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "devpost"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Rocket className="w-4 h-4 text-purple-400" />
              <span>Devpost Pitch</span>
            </button>

            <button
              onClick={() => setActiveTab("social")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === "social"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>Social Launch</span>
            </button>
          </div>

          {/* Tab 1: Video Player & Storyboard */}
          {activeTab === "video" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-4">
                <div className="aspect-video bg-zinc-950 rounded-lg flex items-center justify-center relative overflow-hidden mb-4 border border-zinc-800/80">
                  {job.video_url ? (
                    <video
                      controls
                      autoPlay
                      className="w-full h-full object-cover"
                      src={getFullVideoUrl(job.video_url)}
                    />
                  ) : (
                    <div className="text-center text-zinc-500 font-mono text-xs">
                      Video ready to stream
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {job.storyboard?.project_name} Demo
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {job.storyboard?.tagline}
                    </p>
                  </div>
                  {job.video_url && (
                    <a
                      href={getFullVideoUrl(job.video_url)}
                      download="demoday-demo.mp4"
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download MP4</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Storyboard Script List */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-mono uppercase text-zinc-400 mb-2">
                  Scene Script & Actions
                </h4>
                {job.storyboard?.scenes.map((scene, idx) => (
                  <div
                    key={scene.id}
                    className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-zinc-400 font-mono">
                      <span className="font-semibold text-emerald-400">
                        {idx + 1}. {scene.title}
                      </span>
                      <span>{scene.route}</span>
                    </div>
                    <p className="text-zinc-300 italic font-sans">
                      "{scene.narration}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: README */}
          {activeTab === "readme" && job.launch_kit && (
            <MarkdownViewer
              title="Generated README.md"
              content={job.launch_kit.readme_markdown}
            />
          )}

          {/* Tab 3: Devpost */}
          {activeTab === "devpost" && job.launch_kit && (
            <MarkdownViewer
              title="Devpost Hackathon Submission"
              content={job.launch_kit.devpost_pitch}
            />
          )}

          {/* Tab 4: Social */}
          {activeTab === "social" && job.launch_kit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MarkdownViewer
                title="X / Twitter Launch Thread"
                content={job.launch_kit.x_thread.join("\n\n---\n\n")}
              />
              <MarkdownViewer
                title="LinkedIn Announcement"
                content={job.launch_kit.linkedin_post}
              />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
