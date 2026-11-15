"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronRight, Copy, Loader2, Mail, User } from "lucide-react";
import {
  GOALS,
  GOAL_LABELS,
  copiedLabel,
  copyShareLink,
  copyWithDemoLink,
  emptyAudience,
  goalLabel,
  hostOf,
  splitTag,
  type AudienceBrief,
  type AudienceInput,
  type LaunchKitWithOutreach,
  type SourceTag,
} from "@/lib/audience";

export { emptyAudience };

const TEASER =
  "Send each ideal customer their own demo: their name on the card, their pages first, their next step at the end.";
const field =
  "w-full px-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition disabled:opacity-50";
const caption = "block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5";
const secondaryButton =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed";

/** A value that clears itself a few seconds after it was set (copy confirmations, status lines). */
export function useFlash<T>(ms = 3500): [T | null, (value: T) => void] {
  const [state, setState] = useState<{ value: T; at: number } | null>(null);
  useEffect(() => {
    if (!state) return;
    const timer = setTimeout(() => setState(null), ms);
    return () => clearTimeout(timer);
  }, [state, ms]);
  const flash = useCallback((value: T) => setState({ value, at: Date.now() }), []);
  return [state ? state.value : null, flash];
}

// ---------------------------------------------------------------- the form panel

interface PersonalizeProps {
  value: AudienceInput | null;
  onChange: (value: AudienceInput | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
  geminiAvailable: boolean;
  /** The Company input, so the page can focus it ("Make another for the next customer"). */
  focusRef?: React.RefObject<HTMLInputElement | null>;
  /** The panel's heading and one-line blurb (the analysis page says what the fields are for there). */
  heading?: string;
  blurb?: string;
}

/**
 * "Personalize for a customer": collapsed by default (a single row under the URL inputs), expanded a
 * two-column grid of who the demo is for. Lives inside the page's form, so Company and "who will watch" are
 * required only while it is open. The URL-ish inputs are type="text" with inputMode="url": the e2e tests address
 * the repo and app fields as input[type=url] by index.
 */
export function Personalize({ value, onChange, open, onOpenChange, disabled, geminiAvailable, focusRef,
                             heading = "Personalize for a customer", blurb = TEASER }: PersonalizeProps) {
  const id = useId();
  const ownRef = useRef<HTMLInputElement | null>(null);
  const companyRef = focusRef ?? ownRef;
  const current = value ?? emptyAudience();
  const set = (patch: Partial<AudienceInput>) => onChange({ ...current, ...patch });

  // Opening the panel (the header, the nudge button or "Make another") lands the cursor in Company.
  useEffect(() => {
    if (open) companyRef.current?.focus();
  }, [open, companyRef]);

  const clear = () => {
    onChange(null);
    onOpenChange(false);
  };

  return (
    <div className="mb-6 rounded-xl border border-zinc-800/80 bg-zinc-950/40">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          className="flex flex-1 items-center gap-3 text-left rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
        >
          <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <User className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-white">{heading}</span>
            <span className="block text-[11px] text-zinc-500 leading-relaxed">{blurb}</span>
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
        </button>
        {open && (
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition disabled:opacity-50 shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div id={`${id}-panel`} className="px-4 pb-4 border-t border-zinc-800/80 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <label htmlFor={`${id}-company`} className={caption}>
                Company
              </label>
              <input
                id={`${id}-company`}
                ref={companyRef}
                type="text"
                required
                value={current.company}
                maxLength={80}
                disabled={disabled}
                placeholder="Acme"
                autoComplete="organization"
                onChange={(e) => set({ company: e.target.value })}
                className={field}
              />
            </div>
            <div>
              <label htmlFor={`${id}-website`} className={caption}>
                Their website
              </label>
              <input
                id={`${id}-website`}
                type="text"
                inputMode="url"
                value={current.website ?? ""}
                disabled={disabled}
                placeholder="https://acme.com  (public pages only)"
                autoComplete="url"
                spellCheck={false}
                onChange={(e) => set({ website: e.target.value })}
                className={field}
              />
            </div>
            <div>
              <label htmlFor={`${id}-persona`} className={caption}>
                Who will watch it
              </label>
              <textarea
                id={`${id}-persona`}
                required
                rows={2}
                value={current.persona}
                maxLength={300}
                disabled={disabled}
                placeholder="Head of Platform at a 40-person fintech, drowning in PR reviews"
                onChange={(e) => set({ persona: e.target.value })}
                className={`${field} resize-y`}
              />
            </div>
            <div>
              <label htmlFor={`${id}-first`} className={caption}>
                First name
              </label>
              <input
                id={`${id}-first`}
                type="text"
                value={current.first_name ?? ""}
                maxLength={40}
                disabled={disabled}
                placeholder="Maria"
                autoComplete="given-name"
                onChange={(e) => set({ first_name: e.target.value })}
                className={field}
              />
            </div>
            <div>
              <span id={`${id}-goal`} className={caption}>
                What should they do next?
              </span>
              <div
                role="group"
                aria-labelledby={`${id}-goal`}
                className="inline-flex rounded-xl bg-zinc-950/80 p-1 border border-zinc-800 text-xs font-mono"
              >
                {GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    disabled={disabled}
                    aria-pressed={current.goal === goal}
                    onClick={() => set({ goal })}
                    className={`px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                      current.goal === goal ? "bg-zinc-800 text-emerald-400 font-bold" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {GOAL_LABELS[goal]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor={`${id}-cta`} className={caption}>
                Link for that step
              </label>
              <input
                id={`${id}-cta`}
                type="text"
                inputMode="url"
                value={current.cta_url ?? ""}
                disabled={disabled}
                placeholder="https://cal.com/you/15min"
                autoComplete="url"
                spellCheck={false}
                onChange={(e) => set({ cta_url: e.target.value })}
                className={field}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor={`${id}-notes`} className={caption}>
                Anything you know <span className="normal-case text-zinc-600">(optional; quoted as your notes, never as a fact)</span>
              </label>
              <textarea
                id={`${id}-notes`}
                rows={2}
                value={current.notes ?? ""}
                maxLength={600}
                disabled={disabled}
                placeholder="They mentioned review queues at their last all-hands"
                onChange={(e) => set({ notes: e.target.value })}
                className={`${field} resize-y`}
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Facts come only from their site and what you typed; guesses are labelled in the brief and spoken as guesses.
            {!geminiAvailable && (
              <span className="block text-amber-300/90 mt-1">
                Gemini is off: the brief and outreach use templates from what you type.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the live brief

function Tag({ tag }: { tag: SourceTag }) {
  const tone =
    tag === "site"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : tag === "assumed"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : "bg-zinc-800 text-zinc-300 border-zinc-700";
  return <span className={`shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full border ${tone}`}>{tag}</span>;
}

/**
 * The audience brief as it lands: "Made for Acme" from the 202 on (source "pending"), then what the site says
 * (emerald "site" badges), the pains with their tags, the assumptions in amber, and a provenance footer.
 */
export function AudienceBriefCard({ brief, sceneCount }: { brief: AudienceBrief; sceneCount?: number }) {
  const pending = (brief.source ?? "pending") === "pending";
  const host = hostOf(brief.website);
  const facts = brief.facts ?? [];
  const pains = brief.pains ?? [];
  const assumptions = brief.assumptions ?? [];
  const points = brief.talking_points ?? [];
  const pagesRead = brief.pages_read ?? [];
  const numbers = brief.unsourced_numbers ?? [];
  const siteRead = Boolean(brief.what_they_do) || facts.length > 0;

  return (
    <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white tracking-tight">Made for {brief.company}</h3>
            <p className="text-[11px] text-zinc-400 truncate">
              {brief.first_name ? `${brief.first_name}, ` : ""}
              {brief.persona}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-semibold">
            {goalLabel(brief.goal)}
          </span>
          {host && <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">{host}</span>}
        </div>
      </div>

      {pending ? (
        <p className="flex items-center gap-2 text-xs text-zinc-300 font-mono">
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          {host ? `Researching ${host} (up to 15 s)...` : "Writing the brief from what you typed..."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <h4 className={caption}>What their site says</h4>
            {siteRead ? (
              <>
                {brief.what_they_do && <p className="text-zinc-200 leading-relaxed">{brief.what_they_do}</p>}
                <ul className="space-y-1">
                  {facts.map((fact, index) => (
                    <li key={index} className="flex items-start gap-2 text-zinc-300">
                      <Tag tag="site" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : brief.site_error ? (
              <p className="text-amber-300/90">Site not read: {brief.site_error}; using only what you typed</p>
            ) : (
              <p className="text-zinc-500">
                {host ? "Nothing usable was read from their site; using only what you typed" : "No website given; using only what you typed"}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <h4 className={caption}>Pains</h4>
            {pains.length > 0 ? (
              <ul className="space-y-1">
                {pains.map((pain, index) => {
                  const { tag, text } = splitTag(pain);
                  return (
                    <li key={index} className="flex items-start gap-2 text-zinc-300">
                      <Tag tag={tag ?? "assumed"} />
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-zinc-500">None listed</p>
            )}
          </div>

          {assumptions.length > 0 && (
            <div className="space-y-1.5">
              <h4 className={`${caption} text-amber-400`}>Assumed, not sourced</h4>
              <ul className="space-y-1">
                {assumptions.map((line, index) => (
                  <li key={index} className="flex items-start gap-2 text-amber-200/90">
                    <Tag tag="assumed" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {points.length > 0 && (
            <div className="space-y-1.5">
              <h4 className={caption}>Show them</h4>
              <ul className="space-y-1 list-disc list-inside text-zinc-300">
                {points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
              {brief.tone && <p className="text-zinc-500 font-mono text-[11px]">Tone: {brief.tone}</p>}
            </div>
          )}
        </div>
      )}

      {!pending && (
        <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
          <span>
            {pagesRead.length > 0 ? `Read ${pagesRead.length} page(s) in ${(brief.research_sec ?? 0).toFixed(1)} s · ` : ""}
            {brief.source}
          </span>
          <span className="flex flex-wrap items-center gap-3">
            {typeof brief.coverage === "number" && (
              <span className={brief.coverage === 0 ? "text-rose-300" : "text-emerald-300"}>
                {sceneCount ? `Named in ${brief.coverage} of ${sceneCount} scenes` : `Named in ${brief.coverage} scene(s)`}
              </span>
            )}
            {numbers.length > 0 && <span className="text-amber-300">Unsourced numbers: {numbers.join(", ")}</span>}
          </span>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- the strip above the tab dock

interface NextCustomerStripProps {
  company: string;
  durationSec?: number;
  videoUrl?: string;
  kit?: LaunchKitWithOutreach | null;
  onNext: () => void;
}

/** "Made for Acme · 58 s" with [Copy share link] [Copy email] [Make another for the next customer]. */
export function NextCustomerStrip({ company, durationSec, videoUrl, kit, onNext }: NextCustomerStripProps) {
  const [copied, flash] = useFlash<{ kind: "link" | "email"; label: string }>();
  const [busy, setBusy] = useState<"link" | "email" | null>(null);
  const email = kit?.outreach_email ?? null;

  const copy = async (kind: "link" | "email", action: (url: string) => Promise<boolean>) => {
    if (busy || !videoUrl) return;
    setBusy(kind);
    try {
      flash({ kind, label: copiedLabel(await action(videoUrl)) });
    } finally {
      setBusy(null);
    }
  };

  const iconFor = (kind: "link" | "email") => {
    if (busy === kind) return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    if (copied?.kind === kind) return <Check className="w-3.5 h-3.5 text-emerald-400" />;
    return kind === "link" ? <Copy className="w-3.5 h-3.5 text-zinc-400" /> : <Mail className="w-3.5 h-3.5 text-zinc-400" />;
  };

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
          <User className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">
            Made for {company}
            {durationSec ? ` · ${Math.round(durationSec)} s` : ""}
          </p>
          <p className="text-[11px] font-mono text-zinc-500">Share it, send the email, then make the next one.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!videoUrl || busy !== null}
          onClick={() => void copy("link", copyShareLink)}
          className={secondaryButton}
        >
          {iconFor("link")}
          {copied?.kind === "link" ? copied.label : "Copy share link"}
        </button>
        {email && (
          <button
            type="button"
            disabled={!videoUrl || busy !== null}
            onClick={() => void copy("email", (url) => copyWithDemoLink(`Subject: ${email.subject}\n\n${email.body}`, url))}
            className={secondaryButton}
          >
            {iconFor("email")}
            {copied?.kind === "email" ? copied.label : "Copy email"}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition"
        >
          Make another for the next customer
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
