"use client";

import { useCallback, useEffect } from "react";

/**
 * While `active`, asks before the user leaves the page:
 * - reload, closing the tab, or going to another site: the browser's own "Leave site?" dialog
 *   (browsers no longer show custom text there);
 * - links inside the app, which never trigger that dialog: a confirm dialog with `message`.
 * Returns `confirmLeave()` for actions that navigate in code (for example signing out).
 */
export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = ""; // older browsers need a value to show the dialog
    };
    // Capture phase on document runs before React's handlers, so a cancelled click never reaches next/link.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return; // opening in a new tab doesn't leave this page
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return; // full navigation: the browser dialog covers it
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, message]);

  return useCallback(() => !active || window.confirm(message), [active, message]);
}
