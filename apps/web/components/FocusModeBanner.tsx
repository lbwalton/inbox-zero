"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon } from "lucide-react";

interface FocusModeState {
  isActive: boolean;
  focusedAccountId: string | null;
  accountLabel?: string;
}

/**
 * US-054: Focus Mode banner below top nav.
 * 32px slim banner with violet left-border accent.
 * Shows when FocusMode.isActive = true.
 * Fetches status from GET /api/focus-mode and account label from /api/user/email-accounts.
 */
export function FocusModeBanner() {
  const [focusMode, setFocusMode] = useState<FocusModeState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function fetchFocusMode() {
      try {
        const [fmRes, accountsRes] = await Promise.all([
          fetch("/api/focus-mode"),
          fetch("/api/user/email-accounts"),
        ]);

        if (!fmRes.ok || !accountsRes.ok) return;

        const fm = await fmRes.json();
        const accountsData = await accountsRes.json();

        if (!fm || !fm.isActive) {
          setFocusMode(null);
          return;
        }

        let accountLabel = "Unknown";
        if (fm.focusedAccountId && accountsData?.emailAccounts) {
          const account = accountsData.emailAccounts.find(
            (a: { id: string; accountLabel?: string; email?: string }) =>
              a.id === fm.focusedAccountId,
          );
          accountLabel = account?.accountLabel || account?.email || "Unknown";
        }

        setFocusMode({
          isActive: fm.isActive,
          focusedAccountId: fm.focusedAccountId,
          accountLabel,
        });
      } catch {
        // Silently fail — banner just won't show
      }
    }

    fetchFocusMode();
  }, []);

  const handlePause = useCallback(async () => {
    try {
      const res = await fetch("/api/focus-mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (res.ok) {
        setFocusMode(null);
      }
    } catch {
      // Silently fail
    }
  }, []);

  if (!focusMode?.isActive || dismissed) return null;

  return (
    <div className="flex h-8 items-center border-b border-l-4 border-border border-l-violet-500 bg-violet-50 px-4 text-sm dark:bg-violet-950/30">
      <span className="flex-1 truncate text-violet-900 dark:text-violet-200">
        Focus &middot; {focusMode.accountLabel} &middot; Other accounts paused
      </span>
      <button
        type="button"
        onClick={handlePause}
        className="mr-2 text-xs font-medium text-violet-700 underline hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
      >
        Pause
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="inline-flex items-center justify-center text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-200"
        aria-label="Dismiss focus mode banner"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
