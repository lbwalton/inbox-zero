"use client";

import { useCallback, useRef, useState } from "react";
import { ThumbsUpIcon, ThumbsDownIcon } from "lucide-react";
import { Tooltip } from "@/components/Tooltip";
import { HelpTooltipContent } from "@/components/HelpTooltipContent";
import { useHelpfulTips } from "@/hooks/useHelpfulTips";
import { useAccount } from "@/providers/EmailAccountProvider";
import { Button } from "@/components/ui/button";

type SignalType = "IMPORTANT" | "NOT_IMPORTANT" | null;

interface SignalButtonsProps {
  threadId: string;
  senderEmail: string;
  initialSignal?: SignalType;
  /** If true, always show buttons (thread view). Otherwise hover-visible on desktop. */
  alwaysVisible?: boolean;
}

/**
 * US-053 + US-074: Thumbs-up / thumbs-down signal buttons with priority context.
 * Calls POST /api/emails/signal with type IMPORTANT or NOT_IMPORTANT.
 * When marking as IMPORTANT, shows a popover for optional context.
 */
export function SignalButtons({
  threadId,
  senderEmail,
  initialSignal = null,
  alwaysVisible = false,
}: SignalButtonsProps) {
  const { emailAccountId } = useAccount();
  const showTips = useHelpfulTips();
  const [signal, setSignal] = useState<SignalType>(initialSignal);
  const [loading, setLoading] = useState(false);
  const [showContextPopover, setShowContextPopover] = useState(false);
  const [contextText, setContextText] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const sendSignal = useCallback(
    async (
      targetSignal: "IMPORTANT" | "NOT_IMPORTANT" | null,
      priorityContext?: string,
    ) => {
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
              ...(priorityContext ? { priorityContext } : {}),
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
    [threadId, senderEmail, emailAccountId],
  );

  const handleImportantClick = useCallback(() => {
    if (loading) return;

    // If already important, toggle off
    if (signal === "IMPORTANT") {
      sendSignal(null);
      return;
    }

    // Show context popover
    setShowContextPopover(true);
    setContextText("");
  }, [signal, loading, sendSignal]);

  const handleSaveContext = useCallback(() => {
    sendSignal("IMPORTANT", contextText.trim() || undefined);
    setShowContextPopover(false);
    setContextText("");
  }, [sendSignal, contextText]);

  const handleSkipContext = useCallback(() => {
    sendSignal("IMPORTANT");
    setShowContextPopover(false);
    setContextText("");
  }, [sendSignal]);

  const handleNotImportant = useCallback(() => {
    if (loading) return;
    const targetSignal = signal === "NOT_IMPORTANT" ? null : "NOT_IMPORTANT";
    sendSignal(targetSignal);
  }, [signal, loading, sendSignal]);

  const visibilityClass = alwaysVisible
    ? ""
    : "md:opacity-0 md:group-hover:opacity-100";

  return (
    <div
      className={`relative flex items-center gap-0.5 ${visibilityClass}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Tooltip
        content="Mark important"
        contentComponent={
          showTips ? (
            <HelpTooltipContent
              title="Mark Important"
              description="Flag this email as important. Trains the AI to prioritize similar emails and senders in the future."
              example="Emails from this sender will rank higher in Priority Inbox"
            />
          ) : undefined
        }
      >
        <button
          type="button"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-green-100 dark:hover:bg-green-900/40 ${
            signal === "IMPORTANT"
              ? "text-green-600 dark:text-green-400"
              : "text-muted-foreground"
          }`}
          aria-label="Mark important"
          onClick={handleImportantClick}
          disabled={loading}
        >
          <ThumbsUpIcon
            className="h-4 w-4"
            fill={signal === "IMPORTANT" ? "currentColor" : "none"}
          />
        </button>
      </Tooltip>

      {showContextPopover && (
        <div
          ref={popoverRef}
          className="absolute bottom-full left-0 z-[9999] mb-2 w-64 rounded-lg border bg-popover p-3 shadow-lg"
        >
          <p className="mb-2 text-xs font-medium">
            Why is this important? (optional)
          </p>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            placeholder="e.g. Key client, time-sensitive deal..."
            className="mb-2 w-full rounded-md border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            rows={2}
            maxLength={500}
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleSkipContext}
            >
              Skip
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSaveContext}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      <Tooltip
        content="Mark not important"
        contentComponent={
          showTips ? (
            <HelpTooltipContent
              title="Mark Not Important"
              description="Flag this email as low priority. Trains the AI to deprioritize similar emails and senders."
              example="Future newsletters from this sender won't appear in Priority Inbox"
            />
          ) : undefined
        }
      >
        <button
          type="button"
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-red-100 dark:hover:bg-red-900/40 ${
            signal === "NOT_IMPORTANT"
              ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          }`}
          aria-label="Mark not important"
          onClick={handleNotImportant}
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
