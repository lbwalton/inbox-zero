"use client";

import { useCallback } from "react";
import { XIcon } from "lucide-react";
import { useBulkProcessState, resetBulkProcess } from "@/store/bulk-process";
import { cancelAiRules } from "@/utils/queue/email-actions";

export function BulkProcessOverlay() {
  const { running, total, completed } = useBulkProcessState();

  const onCancel = useCallback(() => {
    cancelAiRules();
    resetBulkProcess();
  }, []);

  if (!running && completed === 0) return null;

  const done = !running && completed > 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-background p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium">
            {done ? "Processing complete" : "Processing emails..."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {done
              ? `Finished processing ${completed} email(s)`
              : `${completed} / ${total} emails processed`}
          </p>
        </div>
        <button
          type="button"
          onClick={done ? () => resetBulkProcess() : onCancel}
          className="ml-2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={done ? "Dismiss" : "Cancel"}
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
      {!done && total > 0 && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {percent}%
          </p>
        </div>
      )}
    </div>
  );
}
