"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Mail, Send } from "lucide-react";
import { DEMO_LINK, copiedStatus, copyWithDemoLink, fillDemoLink, type OutreachEmail } from "@/lib/audience";
import { useFlash } from "@/components/Personalize";

interface OutreachProps {
  email: OutreachEmail;
  dm?: string | null;
  videoUrl?: string;
  company: string;
  firstName?: string | null;
}

type Action = "email" | "mail" | "dm";

const button =
  "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 transition border border-zinc-700/60 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

function DemoLinkChip() {
  return (
    <span
      title="filled with the share link when you copy"
      className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono uppercase align-baseline"
    >
      demo link
    </span>
  );
}

/** The text with every {{DEMO_LINK}} rendered as the emerald chip. */
function WithDemoLink({ text }: { text: string }) {
  const parts = text.split(DEMO_LINK);
  return (
    <>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && <DemoLinkChip />}
        </React.Fragment>
      ))}
    </>
  );
}

function Card({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-950/80 border-b border-zinc-800/80">
        <div className="flex items-center space-x-2 min-w-0">
          <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-mono font-medium text-zinc-200 truncate">{title}</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
          {badge}
        </span>
      </div>
      <div className="p-4 sm:p-5 space-y-4">{children}</div>
    </div>
  );
}

/**
 * The Outreach tab: the email and the LinkedIn DM written for this customer. The link placeholder is filled with
 * the share link only when you copy or open the email, through the same endpoint as the Share button; the app
 * never sends anything.
 */
export function Outreach({ email, dm, videoUrl, company, firstName }: OutreachProps) {
  const [status, flash] = useFlash<string>(6000);
  const [busy, setBusy] = useState<Action | null>(null);
  const [done, setDone] = useState<Action | null>(null);

  const run = async (kind: Action, action: (url: string) => Promise<void>) => {
    if (busy || !videoUrl) return;
    setBusy(kind);
    try {
      await action(videoUrl);
      setDone(kind);
    } finally {
      setBusy(null);
    }
  };

  const copyEmail = () =>
    run("email", async (url) => {
      flash(copiedStatus(await copyWithDemoLink(`Subject: ${email.subject}\n\n${email.body}`, url)));
    });

  const openMail = () =>
    run("mail", async (url) => {
      const filled = await fillDemoLink(email.body, url);
      window.location.href = `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(filled.text)}`;
      flash(
        filled.shareable
          ? "Opened your mail app with a public share link"
          : "Opened your mail app with the signed-in player link (share links are off on this server)",
      );
    });

  const copyDm = () =>
    run("dm", async (url) => {
      if (dm) flash(copiedStatus(await copyWithDemoLink(dm, url)));
    });

  const icon = (kind: Action, Idle: React.ElementType) => {
    if (busy === kind) return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    if (done === kind && status) return <Check className="w-3.5 h-3.5 text-emerald-400" />;
    return <Idle className="w-3.5 h-3.5 text-zinc-400" />;
  };

  const copyLabel = (kind: Action) => (done === kind && status ? "Copied" : "Copy with share link");
  const disabled = !videoUrl || busy !== null;

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-1 gap-6 ${dm ? "lg:grid-cols-5" : ""}`}>
        <div className={dm ? "lg:col-span-3" : ""}>
          <Card title={`Email to ${firstName || company}`} badge="EMAIL">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1">Subject</p>
              <p className="text-sm font-semibold text-white">{email.subject}</p>
            </div>
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-200 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <WithDemoLink text={email.body} />
            </pre>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void copyEmail()} disabled={disabled} className={button}>
                {icon("email", Copy)}
                {copyLabel("email")}
              </button>
              <button type="button" onClick={() => void openMail()} disabled={disabled} className={button}>
                {icon("mail", ExternalLink)}
                Open in mail app
              </button>
            </div>
          </Card>
        </div>

        {dm && (
          <div className="lg:col-span-2">
            <Card title="LinkedIn DM" badge="LINKEDIN DM">
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-200 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <WithDemoLink text={dm} />
              </pre>
              <button type="button" onClick={() => void copyDm()} disabled={disabled} className={button}>
                {icon("dm", Send)}
                {copyLabel("dm")}
              </button>
            </Card>
          </div>
        )}
      </div>

      <p className="text-[11px] font-mono text-zinc-500 min-h-[1rem]" aria-live="polite">
        {status ?? (videoUrl ? "The demo link is filled in when you copy; nothing is sent by DemoDay." : "The video is still rendering.")}
      </p>
    </div>
  );
}
