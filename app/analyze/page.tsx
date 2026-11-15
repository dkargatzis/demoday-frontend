"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clapperboard, Github, Globe, ListChecks, Loader2, Microscope } from "lucide-react";
import { AuthGate, type Session } from "@/components/AuthGate";
import { AgentTrace } from "@/components/AgentTrace";
import { AnalysisReport } from "@/components/AnalysisReport";
import { Personalize } from "@/components/Personalize";
import { ApiError, checkBackendHealth, startAnalysisJob, startPipelineJob } from "@/lib/api";
import { audiencePayload, emptyAudience, type AudienceInput } from "@/lib/audience";
import { useJobStream } from "@/lib/useJobStream";

const input =
  "w-full px-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition";
const label = "flex items-center gap-2 text-xs font-mono uppercase text-zinc-400 tracking-wider";
const REMEMBER = "demoday.analyze"; // the last app URL and repositories, in this browser
const DEFAULTS = { appUrl: "https://www.warestack.com", repos: "https://github.com/warestack/core-api" };

function remembered(): typeof DEFAULTS {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER) || "{}");
    return { appUrl: saved.appUrl || DEFAULTS.appUrl, repos: saved.repos || DEFAULTS.repos };
  } catch {
    return DEFAULTS;
  }
}

function AnalyzeView({ session }: { session: Session }) {
  const router = useRouter();
  const [appUrl, setAppUrl] = useState(DEFAULTS.appUrl);
  const [repos, setRepos] = useState(DEFAULTS.repos);
  const [focus, setFocus] = useState("");
  const [audience, setAudience] = useState<AudienceInput | null>(emptyAudience());
  const [prospectOpen, setProspectOpen] = useState(true);
  const [geminiAvailable, setGeminiAvailable] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [picked, setPicked] = useState(0);
  const [steps, setSteps] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [addressed, setAddressed] = useState(false);
  const [making, setMaking] = useState(false);
  const { job, stepExtras, stepMarks } = useJobStream(jobId);

  useEffect(() => {
    const saved = remembered();
    setAppUrl(saved.appUrl);
    setRepos(saved.repos);
    const reopen = new URLSearchParams(window.location.search).get("job"); // a reload keeps the analysis
    if (reopen) setJobId(reopen);
    checkBackendHealth()
      .then((health) => setGeminiAvailable(Boolean(health?.gemini)))
      .catch(() => undefined);
  }, []);

  const analysis = job?.kind === "analysis" ? job.analysis ?? null : null;
  const funnels = analysis?.funnels ?? [];
  useEffect(() => {
    setSteps(funnels[picked]?.demo_steps ?? ""); // the picked funnel's demo steps fill the editor
  }, [picked, analysis]); // eslint-disable-line react-hooks/exhaustive-deps

  const running = job !== null && (job.status === "queued" || job.status === "running");
  const repoUrls = repos.split(/[\s,]+/).map((url) => url.trim()).filter(Boolean);
  const prospect = audiencePayload(audience);

  const analyze = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (starting || running) return;
    setError(null);
    setStarting(true);
    setPicked(0);
    try {
      localStorage.setItem(REMEMBER, JSON.stringify({ appUrl, repos }));
    } catch {
      // private mode: nothing remembered
    }
    try {
      const started = await startAnalysisJob({
        repo_urls: repoUrls,
        app_url: appUrl,
        ...(prospect ? { audience: prospect } : {}),
        ...(focus.trim() ? { instructions: focus.trim() } : {}),
      });
      setJobId(started.job_id);
      window.history.replaceState(null, "", `?job=${started.job_id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) return session.logout();
      setError(err instanceof Error ? err.message : "Could not start the analysis");
    } finally {
      setStarting(false);
    }
  };

  const makeVideo = async () => {
    if (making || !job) return;
    setMaking(true);
    setError(null);
    try {
      const started = await startPipelineJob({
        repo_urls: repoUrls,
        app_url: job.app_url || appUrl,
        target_seconds: seconds,
        ...(steps.trim() ? { instructions: steps.trim() } : {}),
        ...(addressed && prospect ? { audience: prospect } : {}),
      });
      router.push(`/?job=${started.job_id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) return session.logout();
      setError(err instanceof Error ? err.message : "Could not start the video");
      setMaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090c] bg-grid-pattern text-zinc-100">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <header className="flex items-center justify-between pb-6 border-b border-zinc-800/80">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Microscope className="w-5 h-5 text-emerald-400" /> Analyze a prospect
            </h1>
            <p className="text-xs font-mono text-zinc-500">
              Step 1: the code and the live app, read for one prospect. Step 2: the video of the funnel you pick.
            </p>
          </div>
          <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-panel text-xs font-mono text-zinc-300 hover:text-white transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </header>

        <form onSubmit={analyze} className="glass-panel rounded-2xl p-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="app-url" className={label}>
                <Globe className="w-3.5 h-3.5 text-teal-400" /> Live app
              </label>
              <input id="app-url" type="url" required value={appUrl} onChange={(e) => setAppUrl(e.target.value)} className={input}
                     placeholder="https://www.warestack.com/dashboard/your-org" />
            </div>
            <div className="space-y-2">
              <label htmlFor="repos" className={label}>
                <Github className="w-3.5 h-3.5 text-teal-400" /> Repositories
              </label>
              <input id="repos" value={repos} onChange={(e) => setRepos(e.target.value)} className={input}
                     placeholder="https://github.com/owner/api https://github.com/owner/web" />
            </div>
          </div>
          <Personalize value={audience} onChange={setAudience} open={prospectOpen} onOpenChange={setProspectOpen}
                       disabled={starting || running} geminiAvailable={geminiAvailable} heading="The prospect"
                       blurb="Who this analysis is for: their public site is read for facts. The video is not addressed to them unless you tick that in step 2." />
          <div className="space-y-2">
            <label htmlFor="focus" className={label}>
              <ListChecks className="w-3.5 h-3.5 text-teal-400" /> Focus <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
            </label>
            <textarea id="focus" rows={2} maxLength={1000} value={focus} onChange={(e) => setFocus(e.target.value)}
                      className={`${input} font-sans resize-y`}
                      placeholder="What should the analysis weigh? e.g. their SOC 2 audit next quarter, the rules engine" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-mono text-zinc-500">
              Private repositories use the GitHub token in Settings; the app is read with its saved login.
            </p>
            <button type="submit" disabled={starting || running || !geminiAvailable}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-sm font-bold transition">
              {starting || running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Microscope className="w-4 h-4" />}
              {running ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </form>

        {error && <div className="glass-panel rounded-2xl px-5 py-4 text-sm text-amber-200 border border-amber-500/30">{error}</div>}

        {job && <AgentTrace job={job} extras={stepExtras} marks={stepMarks} />}

        {job?.status === "failed" && (
          <div className="glass-panel rounded-2xl px-5 py-4 text-sm text-amber-200 border border-amber-500/30">
            The analysis failed: {job.error}
          </div>
        )}

        {analysis && (
          <>
            <AnalysisReport analysis={analysis} picked={picked} onPick={setPicked} />
            <section className="glass-panel rounded-2xl p-5 space-y-4">
              <label htmlFor="steps" className={label}>
                <Clapperboard className="w-3.5 h-3.5 text-emerald-400" /> Step 2: the video of this funnel
              </label>
              <textarea id="steps" rows={5} maxLength={1000} value={steps} onChange={(e) => setSteps(e.target.value)}
                        className={`${input} font-sans resize-y`} placeholder="Open this page, click that, show the result." />
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-300">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2">
                    Length
                    <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1">
                      {[30, 45, 60, 90].map((s) => <option key={s} value={s}>{s}s</option>)}
                    </select>
                  </label>
                  {prospect && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={addressed} onChange={(e) => setAddressed(e.target.checked)} className="accent-emerald-500" />
                      Address it to {prospect.company} (greeting and &ldquo;Made for&rdquo; cards)
                    </label>
                  )}
                </div>
                <button type="button" onClick={makeVideo} disabled={making || !steps.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-sm font-bold transition">
                  {making ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
                  Generate the video
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return <AuthGate>{(session) => <AnalyzeView session={session} />}</AuthGate>;
}
