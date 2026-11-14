"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Rocket } from "lucide-react";
import { checkBackendHealth, getMe, signIn, signUp } from "@/lib/api";

/** Only same-site paths, so ?next= can't be used as an open redirect. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((me) => me && router.replace(next))
      .catch(() => undefined);
    checkBackendHealth().then((health) => setNeedsCode(Boolean(health?.signup_code)));
  }, [router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(email, password, signupCode);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const input =
    "w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition";

  return (
    <div className="relative min-h-screen bg-[#08090c] text-zinc-100 bg-grid-pattern flex items-center justify-center px-4 py-12">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Rocket className="w-5 h-5" />
          </div>
          <span className="font-bold text-white tracking-tight text-lg">DemoDay</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/80 text-zinc-300 font-mono">
            Launch Studio
          </span>
        </div>

        <form onSubmit={submit} className="glass-panel-glow rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div role="tablist" aria-label="Account" className="inline-flex w-full rounded-xl bg-zinc-950 p-1 border border-zinc-800 text-xs font-semibold">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition ${
                  mode === m ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
              Email
            </label>
            <input id="email" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} className={input} />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
              Password
            </label>
            <input id="password" type="password" required minLength={8} value={password}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)} className={input} />
            {mode === "signup" && <p className="text-[11px] text-zinc-500">At least 8 characters.</p>}
          </div>
          {mode === "signup" && needsCode && (
            <div className="space-y-2">
              <label htmlFor="code" className="text-xs font-mono uppercase text-zinc-400 tracking-wider">
                Signup code
              </label>
              <input id="code" required value={signupCode} onChange={(e) => setSignupCode(e.target.value)}
                className={input} />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs tracking-wider uppercase transition disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
