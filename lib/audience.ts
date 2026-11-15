import { API_BASE, ApiError, apiOrigin, getShareLink } from "./api";
import type { JobStatus, LaunchKit, Storyboard } from "./types";

// Personalized demos ("one demo per ideal customer"): the types, request helpers and share-link helpers behind
// components/Personalize.tsx, components/Outreach.tsx and components/CustomerDemos.tsx. Mirrors the backend's
// Audience, AudienceBrief, OutreachEmail and JobSummary schemas. Everything here is additive and optional, so a
// plain JobStatus from lib/types.ts is also a JobWithAudience.

// ---------------------------------------------------------------- types

/** What the outro card asks the viewer to do. */
export type AudienceGoal = "book_call" | "start_trial" | "reply";

export const GOALS: readonly AudienceGoal[] = ["book_call", "start_trial", "reply"];

export const GOAL_LABELS: Record<AudienceGoal, string> = {
  book_call: "Book a call",
  start_trial: "Start a trial",
  reply: "Reply",
};

export const isGoal = (value: unknown): value is AudienceGoal => GOALS.includes(value as AudienceGoal);

/** The "Personalize for a customer" panel; sent as `audience` on POST /api/pipeline/start. */
export interface AudienceInput {
  company: string;
  persona: string;
  website?: string;
  first_name?: string;
  goal: AudienceGoal;
  cta_url?: string;
  notes?: string;
}

/** Where a line of the brief comes from. The backend prefixes pains with "[site] ", "[sender] " or "[assumed] ". */
export type SourceTag = "site" | "sender" | "assumed";

/** `job.audience`: what the planner, the title cards and the outreach know about the prospect. */
export interface AudienceBrief {
  company: string;
  persona: string;
  website?: string | null;
  first_name?: string | null;
  goal?: AudienceGoal;
  cta_url?: string | null;
  notes?: string | null;
  what_they_do?: string; // [site] one sentence in the site's words; "" when the site was not read
  facts?: string[]; // [site] verified near-verbatim against the fetched text
  pains?: string[]; // each prefixed with its tag
  talking_points?: string[];
  assumptions?: string[]; // shown amber, spoken only as possibilities
  tone?: string;
  site_title?: string;
  pages_read?: string[]; // paths actually fetched
  site_error?: string | null; // "HTTP 403", "timed out after 15 s", "private network address", ...
  research_sec?: number;
  source?: string; // "pending" from the 202 until the research lands, then e.g. "acme.com + Gemini (gemini-3.6-flash)"
  coverage?: number | null; // scenes naming the company, the role or a tagged fact (set after planning)
  unsourced_numbers?: string[]; // numbers in the narration that are neither on the site nor in the notes
}

export interface OutreachEmail {
  subject: string;
  body: string; // carries DEMO_LINK exactly once
}

/** A personalized job's launch kit: the four generic fields plus the outreach. */
export type LaunchKitWithOutreach = LaunchKit & {
  outreach_email?: OutreachEmail | null;
  linkedin_dm?: string | null;
};

/** A job snapshot with the personalization fields. They are all optional, so every JobStatus is one. */
export type JobWithAudience = JobStatus & {
  audience?: AudienceBrief | null;
  launch_kit?: LaunchKitWithOutreach;
  storyboard?: Storyboard & { audience_note?: string | null };
};

/** One row of GET /api/jobs (camelCase); the last four fields are only set for personalized jobs. */
export interface JobSummary {
  id: string;
  url?: string | null; // the app URL
  createdAt?: string | null; // ISO 8601, UTC
  productName?: string | null;
  status: "completed" | "failed";
  customer?: string | null;
  persona?: string | null;
  customerGoal?: string | null;
  durationSec?: number | null;
  coverUrl?: string | null; // the cover poster, once painted
}

// ---------------------------------------------------------------- accessors & small helpers

export const audienceOf = (job: JobStatus | null | undefined): AudienceBrief | null =>
  (job as JobWithAudience | null | undefined)?.audience ?? null;

export const outreachOf = (job: JobStatus | null | undefined): OutreachEmail | null =>
  (job as JobWithAudience | null | undefined)?.launch_kit?.outreach_email ?? null;

export const emptyAudience = (): AudienceInput => ({
  company: "",
  persona: "",
  website: "",
  first_name: "",
  goal: "book_call",
  cta_url: "",
  notes: "",
});

/** The request field: trimmed, blanks dropped; null until both Company and "who will watch" are filled. */
export function audiencePayload(value: AudienceInput | null | undefined): AudienceInput | null {
  if (!value) return null;
  const company = value.company.trim();
  const persona = value.persona.trim();
  if (!company || !persona) return null;
  const optional = (text?: string) => {
    const trimmed = text?.trim();
    return trimmed ? trimmed : undefined;
  };
  return {
    company,
    persona,
    website: optional(value.website),
    first_name: optional(value.first_name),
    goal: isGoal(value.goal) ? value.goal : "book_call",
    cta_url: optional(value.cta_url),
    notes: optional(value.notes),
  };
}

/** "acme.com" for https://www.acme.com/pricing (or for "acme.com" typed in a hurry); "" when empty. */
export function hostOf(url?: string | null): string {
  const text = (url ?? "").trim();
  if (!text) return "";
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`).hostname.replace(/^www\./, "");
  } catch {
    return text;
  }
}

export const goalLabel = (goal?: string | null): string => (isGoal(goal) ? GOAL_LABELS[goal] : GOAL_LABELS.book_call);

/** Splits "[site] Reviews pile up" into its tag and text; untagged lines get tag null. */
export function splitTag(line: string): { tag: SourceTag | null; text: string } {
  const match = /^\[(site|sender|assumed)\]\s*/i.exec(line);
  if (!match) return { tag: null, text: line };
  return { tag: match[1].toLowerCase() as SourceTag, text: line.slice(match[0].length) };
}

export const truncate = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

// ---------------------------------------------------------------- share links & the {{DEMO_LINK}} placeholder

/** The literal placeholder the backend writes into the outreach; replaced by the share link on copy. */
export const DEMO_LINK = "{{DEMO_LINK}}";

/** The player URL of a job's finished video, as the backend sets job.video_url. */
export const videoUrlForJob = (jobId: string): string => `/api/pipeline/video/${jobId}`;

/**
 * Replaces every {{DEMO_LINK}} with a link to the video: the public share link (minted now, through the same
 * POST /api/pipeline/share/{id} the Share button uses) or, when share links are off on this server, the
 * signed-in player URL. Never throws: getShareLink already falls back.
 */
export async function fillDemoLink(
  text: string,
  videoUrl: string,
): Promise<{ text: string; url: string; shareable: boolean }> {
  const link = await getShareLink(videoUrl);
  return { text: text.split(DEMO_LINK).join(link.url), url: link.url, shareable: link.shareable };
}

/**
 * Copies text to the clipboard. Pass a promise for text that is still being fetched (a share link being
 * minted): handing the promise to ClipboardItem keeps the user gesture alive, which Safari requires.
 */
export async function copyText(text: string | Promise<string>): Promise<void> {
  const pending = Promise.resolve(text);
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const blob = pending.then((value) => new Blob([value], { type: "text/plain" }));
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
    } else {
      await navigator.clipboard.writeText(await pending);
    }
  } catch {
    window.prompt("Copy this text:", await pending);
  }
}

/** Mints the share link for a video and copies it; resolves to whether it is a public link. */
export async function copyShareLink(videoUrl: string): Promise<boolean> {
  let shareable = false;
  await copyText(
    getShareLink(videoUrl).then((link) => {
      shareable = link.shareable;
      return link.url;
    }),
  );
  return shareable;
}

/** Copies `text` with every {{DEMO_LINK}} filled; resolves to whether the link is public. */
export async function copyWithDemoLink(text: string, videoUrl: string): Promise<boolean> {
  let shareable = false;
  await copyText(
    fillDemoLink(text, videoUrl).then((filled) => {
      shareable = filled.shareable;
      return filled.text;
    }),
  );
  return shareable;
}

/** Button label after a copy. */
export const copiedLabel = (shareable: boolean): string =>
  shareable ? "Copied" : "Copied (signed-in link: share links are off on this server)";

/** Status line after a copy. */
export const copiedStatus = (shareable: boolean): string =>
  shareable
    ? "Copied with a public share link"
    : "Copied with the signed-in player link (share links are off on this server)";

// ---------------------------------------------------------------- GET /api/jobs

/** GET through the same base URL and cookie policy as lib/api.ts (its `request` helper is module-private). */
async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: "no-store", credentials: "include" });
  } catch {
    throw new ApiError(0, `Cannot reach the backend at ${apiOrigin() || "this server"}. Is it running?`);
  }
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body?.message === "string") message = body.message;
      else if (typeof body?.detail === "string") message = body.detail;
    } catch {
      // not JSON
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

/** Your recent finished jobs, newest first (the board keeps the rows that have a `customer`). */
export const listCustomerDemos = (limit = 50) => getJson<JobSummary[]>(`/api/jobs?limit=${limit}`);

/** The full job, running or finished (the same object as the stream's `done` event). */
export const getJob = (id: string) => getJson<JobWithAudience>(`/api/jobs/${encodeURIComponent(id)}`);

// ---------------------------------------------------------------- "Add several customers"

export const MAX_BATCH = 5;

/** The batch textarea: one customer per line as "Company | website | who will watch | first name". */
export function parseCustomerLines(
  text: string,
  defaults: { goal: AudienceGoal; cta_url?: string } = { goal: "book_call" },
  max = MAX_BATCH,
): { customers: AudienceInput[]; errors: string[] } {
  const customers: AudienceInput[] = [];
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  lines.slice(0, max).forEach((line, index) => {
    const [company = "", website = "", persona = "", first_name = ""] = line.split("|").map((cell) => cell.trim());
    if (!company || persona.length < 3) {
      errors.push(`Line ${index + 1}: needs at least "Company | website | who will watch"`);
      return;
    }
    customers.push({ ...emptyAudience(), goal: defaults.goal, cta_url: defaults.cta_url ?? "", company, website, persona, first_name });
  });
  if (lines.length > max) errors.push(`Only the first ${max} customers are queued`);
  return { customers, errors };
}
