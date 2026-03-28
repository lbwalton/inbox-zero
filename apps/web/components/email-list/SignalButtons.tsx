"use client";

import { useCallback, useState } from "react";
import { ThumbsUpIcon, ThumbsDownIcon } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";
import { useAccount } from "@/providers/EmailAccountProvider";

type SignalType = "IMPORTANT" | "NOT_IMPORTANT" | null;

interface SignalButtonsProps {
  threadId: string;
  senderEmail: string;
  initialSignal?: SignalType;
  /** If true, always show buttons (thread view). Otherwise hover-visible on desktop. */
  alwaysVisible?: boolean;
}

/**
 * US-053: Thumbs-up / thumbs-down signal buttons.
 * Calls POST /api/emails/signal with type IMPORTANT or NOT_IMPORTANT.
 * Mutual exclusion between the two signals.
 */
export function SignalButtons({
  threadId,
  senderEmail,
  initialSignal = null,
  alwaysVisible = false,
}: SignalButtonsProps) {
  const { emailAccountId } = useAccount();
  const [signal, setSignal] = useState<SignalType>(initialSignal);
  const [loading, setLoading] = useState(false);

  const handleSignal = useCallback(
    async (newSignal: "IMPORTANT" | "NOT_IMPORTANT") => {
      if (loading) return;

      // Toggle off if same signal clicked
      const targetSignal = signal === newSignal ? null : newSignal;

      setLoading(true);
      try {
        if (targetSignal) {
          await fetch("/api/emails/signal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              threadId,
              senderEmail,
              signal: targetSignal,
              emailAccountId,
            }),
          });
        }
        setSignal(targetSignal);
      } catch {
        // Revert on error
      } finally {
        setLoading(false);
      }
    },
    [threadId, senderEmail, emailAccountId, signal, loading],
  );

  const visibilityClass = alwaysVisible
    ? ""
    : "md:opacity-0 md:group-hover:opacity-100";

  return (
    <div
      className={`flex items-center gap-0.5 ${visibilityClass}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Tooltip content="Mark important">
        <button
          type="button"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-green-100 dark:hover:bg-green-900/40 ${
            signal === "IMPORTANT"
              ? "text-green-600 dark:text-green-400"
              : "text-muted-foreground"
          }`}
          aria-label="Mark important"
          onClick={() => handleSignal("IMPORTANT")}
          disabled={loading}
        >
          <ThumbsUpIcon
            className="h-4 w-4"
            fill={signal === "IMPORTANT" ? "currentColor" : "none"}
          />
        </button>
      </Tooltip>
      <Tooltip content="Mark not important">
        <button
          type="button"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-red-100 dark:hover:bg-red-900/40 ${
            signal === "NOT_IMPORTANT"
              ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          }`}
          aria-label="Mark not important"
          onClick={() => handleSignal("NOT_IMPORTANT")}
          disabled={loading}
        >
          <ThumbsDownIcon
            className="h-4 w-4"
            fill={signal === "NOT_IMPORTANT" ? "currentColor" : "none"}
          />
        </button>
      </Tooltip>
    </div>
  );
}
