"use client";

import React from "react";
import { Loader2, ServerCrash } from "lucide-react";
import { useRequireUser } from "@/lib/useAuth";
import type { User } from "@/lib/types";

export interface Session {
  user: User;
  logout: () => Promise<void>;
}

/** Renders its children only for a signed-in user; everyone else is sent to /login. */
export function AuthGate({ children }: { children: (session: Session) => React.ReactNode }) {
  const { user, error, logout } = useRequireUser();
  if (user) return <>{children({ user, logout })}</>;
  return (
    <div className="min-h-screen bg-[#08090c] bg-grid-pattern flex items-center justify-center px-4">
      {error ? (
        <div className="glass-panel rounded-2xl px-6 py-5 text-sm text-amber-200 flex items-center gap-3 max-w-md">
          <ServerCrash className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking your session…
        </div>
      )}
    </div>
  );
}
