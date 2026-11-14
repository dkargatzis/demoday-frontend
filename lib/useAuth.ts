"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiError, getMe, signOut } from "./api";
import type { User } from "./types";

/**
 * Guards a page: resolves the signed-in user, or sends the visitor to /login and back here afterwards.
 * When the backend is unreachable it reports an error instead of bouncing to the login page.
 */
export function useRequireUser() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        if (me) setUser(me);
        else router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't check your session");
      });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  const logout = useCallback(async () => {
    await signOut().catch(() => undefined);
    router.replace("/login");
  }, [router]);

  return { user, error, logout };
}
