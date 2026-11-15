"use client";

import React from "react";
import { AlertTriangle, ArrowRight, Boxes, FileCode2, Network, Route, Sparkles } from "lucide-react";
import type { AnalysisGap, CapabilityMap, ProspectAnalysis } from "@/lib/types";

const GAP_LABEL: Record<AnalysisGap["kind"], string> = {
  missing_feature: "Missing feature",
  missing_page: "Missing page",
  api_without_page: "API without a page",
  weak_page: "Weak page",
};

/** What the backend can do against what the app uses: coverage per area and the endpoints no frontend file calls. */
function CapabilitySection({ map, project }: { map: CapabilityMap; project?: string }) {
  const uncalled = map.uncalled_total ?? map.uncalled.length;
  const byArea = new Map<string, CapabilityMap["uncalled"]>();
  for (const endpoint of map.uncalled) byArea.set(endpoint.area, [...(byArea.get(endpoint.area) ?? []), endpoint]);
  return (
    <section className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
          <Network className="w-3.5 h-3.5 text-teal-400" /> What {project || "the backend"} can do that the app doesn&apos;t show
        </h3>
        <p className="text-xs text-zinc-500">
          Measured from the code: {map.endpoints} endpoints, {map.called} called by the frontend, {uncalled} not
          {map.retired ? ` (plus ${map.retired} in deprecated routers, not counted)` : ""}.
        </p>
      </div>
      {!map.frontend_seen ? (
        <p className="text-sm text-amber-200">No frontend code was read, so coverage can&apos;t be measured: add the frontend repository.</p>
      ) : (
        <>
          <ul className="grid gap-x-6 gap-y-1.5 md:grid-cols-2">
            {map.areas.slice(0, 14).map((area) => {
              const share = area.endpoints ? area.called / area.endpoints : 0;
              return (
                <li key={area.area} className="text-[11px] font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span className="truncate text-zinc-300">{area.area}</span>
                    <span>{area.called}/{area.endpoints} in the app</span>
                  </div>
                  <div className="h-1.5 rounded bg-zinc-800 overflow-hidden">
                    <div className={`h-full ${share < 0.5 ? "bg-amber-400/80" : "bg-emerald-400/80"}`} style={{ width: `${Math.round(share * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {map.uncalled.length > 0 && (
            <details>
              <summary className="text-xs font-mono text-zinc-400 cursor-pointer">Endpoints no frontend file calls ({uncalled})</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {[...byArea.entries()].map(([area, endpoints]) => (
                  <div key={area} className="space-y-1">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{area}</p>
                    {endpoints.map((endpoint) => (
                      <p key={`${endpoint.method} ${endpoint.path}`} className="text-[11px] font-mono text-zinc-300 truncate" title={endpoint.file}>
                        <span className="text-teal-300">{endpoint.method}</span> {endpoint.path}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

interface AnalysisReportProps {
  analysis: ProspectAnalysis;
  picked: number;
  onPick: (index: number) => void;
}

/** The founder's read-out of a prospect analysis: the pitch, the funnels to choose from, the gaps, what exists. */
export function AnalysisReport({ analysis, picked, onPick }: AnalysisReportProps) {
  const funnels = analysis.funnels ?? [];
  const gaps = analysis.gaps ?? [];
  const features = analysis.features ?? [];
  const files = analysis.files_read ?? [];
  const forWhom = analysis.prospect ? ` for ${analysis.prospect}` : "";
  return (
    <div className="space-y-6">
      {analysis.summary && (
        <section className="glass-panel rounded-2xl p-5 space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> The pitch{forWhom}
          </h3>
          <p className="text-sm text-zinc-200 leading-relaxed">{analysis.summary}</p>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
          <Route className="w-3.5 h-3.5 text-emerald-400" /> Strongest funnels{forWhom}: pick the one to film
        </h3>
        {funnels.length === 0 && (
          <p className="text-sm text-zinc-400">No funnel led through pages the probe could reach. Check the saved login and the app URL.</p>
        )}
        {funnels.map((funnel, i) => (
          <label
            key={`${funnel.name}-${i}`}
            className={`block glass-panel rounded-2xl p-4 cursor-pointer border transition ${
              i === picked ? "border-emerald-500/60 bg-emerald-500/5" : "border-transparent hover:border-zinc-700"
            }`}
          >
            <div className="flex items-start gap-3">
              <input type="radio" name="funnel" checked={i === picked} onChange={() => onPick(i)} className="mt-1 accent-emerald-500" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-100">{funnel.name}</span>
                  {typeof funnel.strength === "number" && (
                    <span className="text-[11px] font-mono text-zinc-500">strength {Math.round(funnel.strength * 100)}%</span>
                  )}
                </div>
                {funnel.outcome && <p className="text-sm text-zinc-300">{funnel.outcome}</p>}
                {funnel.why_them && <p className="text-xs text-emerald-300/90">Why them: {funnel.why_them}</p>}
                <p className="flex flex-wrap items-center gap-1 text-[11px] font-mono text-zinc-400">
                  {funnel.steps.map((step, j) => (
                    <React.Fragment key={step}>
                      {j > 0 && <ArrowRight className="w-3 h-3 text-zinc-600" />}
                      <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">{step}</span>
                    </React.Fragment>
                  ))}
                </p>
                {funnel.evidence && <p className="text-[11px] text-zinc-500">Evidence: {funnel.evidence}</p>}
              </div>
            </div>
          </label>
        ))}
      </section>

      {gaps.length > 0 && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> What {analysis.prospect || "this prospect"} would look for
          </h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {gaps.map((gap, i) => (
              <li key={`${gap.title}-${i}`} className="glass-panel rounded-2xl p-4 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {GAP_LABEL[gap.kind] ?? gap.kind}
                  </span>
                  <span className="text-sm font-semibold text-zinc-100">{gap.title}</span>
                </div>
                {gap.why_them && <p className="text-xs text-zinc-300">Why it matters: {gap.why_them}</p>}
                {gap.evidence && <p className="text-[11px] text-zinc-500">Evidence: {gap.evidence}</p>}
                {gap.suggestion && <p className="text-xs text-emerald-300/90">Suggestion: {gap.suggestion}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.capabilities && <CapabilitySection map={analysis.capabilities} project={analysis.project} />}

      {features.length > 0 && (
        <details className="glass-panel rounded-2xl p-4">
          <summary className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 cursor-pointer">
            <Boxes className="w-3.5 h-3.5 text-teal-400" /> What {analysis.project || "the product"} does today ({features.length})
          </summary>
          <ul className="mt-3 space-y-1.5">
            {features.map((feature, i) => (
              <li key={`${feature.name}-${i}`} className="text-xs text-zinc-300">
                <span className="font-semibold text-zinc-100">{feature.name}</span>
                {feature.what && <> · {feature.what}</>}
                {feature.where && <span className="font-mono text-zinc-500"> · {feature.where}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {files.length > 0 && (
        <details className="glass-panel rounded-2xl p-4">
          <summary className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 cursor-pointer">
            <FileCode2 className="w-3.5 h-3.5 text-teal-400" /> Files read ({files.length})
          </summary>
          <ul className="mt-3 grid gap-1 md:grid-cols-2 text-[11px] font-mono text-zinc-400">
            {files.map((file) => (
              <li key={`${file.repo}/${file.path}`} className="truncate" title={`${file.repo}/${file.path}`}>
                <span className="text-zinc-600">{file.role}</span> {file.repo}/{file.path}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
