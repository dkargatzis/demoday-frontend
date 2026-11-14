"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Film,
  Download,
  Copy,
  Check,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Maximize2,
  ExternalLink,
  Layers,
  Clock,
  Radio,
} from "lucide-react";
import { Storyboard, Scene } from "@/lib/types";
import { getDownloadUrl, getFullVideoUrl } from "@/lib/api";

interface VideoTheaterProps {
  videoUrl?: string;
  storyboard?: Storyboard;
  elapsedSeconds?: number;
}

export function VideoTheater({
  videoUrl,
  storyboard,
  elapsedSeconds,
}: VideoTheaterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const fullUrl = videoUrl ? getFullVideoUrl(videoUrl) : "";
  // `download` is ignored cross-origin, so ask the backend for an attachment response instead.
  const downloadUrl = videoUrl ? getDownloadUrl(videoUrl) : "";

  // Compute scene time offsets
  const sceneOffsets = useMemo(() => {
    if (!storyboard?.scenes) return [];
    let cumulative = 0;
    const defaultSceneDuration =
      storyboard.total_duration_sec > 0
        ? storyboard.total_duration_sec / storyboard.scenes.length
        : 15;

    return storyboard.scenes.map((scene) => {
      const start = cumulative;
      const dur = scene.duration_sec || defaultSceneDuration;
      cumulative += dur;
      return {
        ...scene,
        start,
        end: cumulative,
      };
    });
  }, [storyboard]);

  // Determine active scene based on video currentTime
  const activeSceneIndex = useMemo(() => {
    if (!sceneOffsets.length) return -1;
    const idx = sceneOffsets.findIndex(
      (s) => currentTime >= s.start && currentTime < s.end
    );
    return idx !== -1 ? idx : sceneOffsets.length - 1;
  }, [currentTime, sceneOffsets]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleReplay = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const handleSeekToScene = (startTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTime;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const handleCopyLink = () => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Success Celebration Banner */}
      <div className="glass-panel-glow rounded-2xl p-5 border border-emerald-500/40 relative overflow-hidden flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950/40">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Demo Day Package Ready
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Autonomous Mux Completed
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              1080p browser footage synchronized with fal.ai voice narration and documentation.
            </p>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500 mr-1.5">Scenes:</span>
            <span className="text-emerald-400 font-bold">
              {storyboard?.scenes.length ?? 0}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500 mr-1.5">Resolution:</span>
            <span className="text-teal-300 font-bold">1080p 30fps</span>
          </div>

          {elapsedSeconds && (
            <div className="px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-300">
              <span className="text-zinc-500 mr-1.5">Elapsed:</span>
              <span className="text-zinc-200">{elapsedSeconds}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Video & Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Theater Column */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden p-5 sm:p-6 shadow-2xl border border-zinc-800 flex flex-col justify-between">
          <div>
            {/* Window bar */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-zinc-400 font-mono text-[11px] ml-2 hidden sm:inline">
                  demoday-reel-1080p.mp4
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {fullUrl && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-800 transition"
                      title="Copy video link"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 text-[11px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-[11px]">Copy Link</span>
                        </>
                      )}
                    </button>

                    <a
                      href={downloadUrl}
                      download="demoday-pitch.mp4"
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition active:scale-95 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download MP4</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Video Canvas Container */}
            <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden relative border border-zinc-800 shadow-2xl flex items-center justify-center group">
              {fullUrl ? (
                <>
                  <video
                    ref={videoRef}
                    controls
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full h-full object-cover"
                    src={fullUrl}
                  />
                  {/* Subtle active scene badge overlay */}
                  {activeSceneIndex >= 0 && sceneOffsets[activeSceneIndex] && (
                    <div className="absolute top-3 left-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-[11px] font-mono text-zinc-300">
                        <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span>Scene {activeSceneIndex + 1}: {sceneOffsets[activeSceneIndex].title}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-3 text-zinc-500 font-mono text-xs p-8">
                  <Film className="w-10 h-10 mx-auto text-zinc-600 animate-pulse" />
                  <p className="text-zinc-400">Video render pending...</p>
                </div>
              )}
            </div>
          </div>

          {/* Video Metadata Footer */}
          <div className="mt-4 pt-3.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                {storyboard?.project_name || "Autonomous Product Demo"}
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                {storyboard?.tagline || "Built autonomously with Gemini, fal.ai, and Playwright"}
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
              <button
                type="button"
                onClick={handleReplay}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition"
              >
                <RotateCcw className="w-3 h-3 text-zinc-400" />
                <span className="text-[11px]">Replay</span>
              </button>
            </div>
          </div>
        </div>

        {/* Storyboard Timeline Column */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-zinc-800 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
                Interactive Scenes
              </h4>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              Click to seek
            </span>
          </div>

          {/* Scene List */}
          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
            {sceneOffsets.map((scene, idx) => {
              const isActive = idx === activeSceneIndex;
              return (
                <div
                  key={scene.id || idx}
                  onClick={() => handleSeekToScene(scene.start)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isActive
                      ? "bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30"
                      : "bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50"
                  }`}
                >
                  {/* Top glowing bar if active */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-400 animate-pulse" />
                  )}

                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-semibold font-mono text-[11px] ${
                          isActive ? "text-emerald-400" : "text-zinc-300"
                        }`}
                      >
                        Scene {idx + 1}: {scene.title}
                      </span>
                      {isActive && (
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {formatSeconds(scene.start)} - {formatSeconds(scene.end)}
                    </span>
                  </div>

                  <p className="text-zinc-300 italic font-sans leading-relaxed text-[11px] mb-2">
                    "{scene.narration}"
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      Route: {scene.route}
                    </span>
                    {scene.actions?.map((act, aIdx) => (
                      <span
                        key={aIdx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-400 border border-zinc-800/80"
                      >
                        {act.type} {act.value ? `(${act.value})` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
