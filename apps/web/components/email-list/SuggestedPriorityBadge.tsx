"use client";

import { useCallback, useState } from "react";
import { CheckIcon, SparklesIcon, XIcon } from "lucide-react";
import { useAccount } from "@/providers/EmailAccountProvider";

interface SuggestedPriorityBadgeProps {
  threadId: string;
  senderEmail: string;
  reason: string;
}

export function SuggestedPriorityBadge({
  threadId,
  senderEmail,
  reason,
}: SuggestedPriorityBadgeProps) {
  const { emailAccountId } = useAccount();
  const [resolved, setResolved] = useState<"accepted" | "dismissed" | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const handleAction = useCallback(
    async (action: "accept" | "dismiss") => {
      setLoading(true);
      try {
        await fetch("/api/emails/priority-suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-email-account-id": emailAccountId,
          },
          body: JSON.stringify({ threadId, senderEmail, action }),
        });
        setResolved(action === "accept" ? "accepted" : "dismissed");
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    },
    [emailAccountId, threadId, senderEmail],
  );

  if (resolved === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckIcon className="h-3 w-3" />
        Priority
      </span>
    );
  }

  if (resolved === "dismissed") return null;

  return (
    <span
      className="group/badge inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      title={reason}
    >
      <SparklesIcon className="h-3 w-3" />
      <span>Suggested Priority</span>
      <span className="ml-0.5 flex gap-0.5 opacity-0 transition-opacity group-hover/badge:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleAction("accept");
          }}
          disabled={loading}
          className="rounded p-0.5 hover:bg-green-200 dark:hover:bg-green-800"
          aria-label="Accept suggestion"
        >
          <CheckIcon className="h-3 w-3 text-green-600" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleAction("dismiss");
          }}
          disabled={loading}
          className="rounded p-0.5 hover:bg-red-200 dark:hover:bg-red-800"
          aria-label="Dismiss suggestion"
        >
          <XIcon className="h-3 w-3 text-red-600" />
        </button>
      </span>
    </span>
  );
}
