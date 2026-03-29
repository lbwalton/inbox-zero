"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/Form";
import { SectionDescription, SectionHeader } from "@/components/Typography";
import { TooltipExplanation } from "@/components/TooltipExplanation";
import { useAccount } from "@/providers/EmailAccountProvider";
import { useAiQueueState } from "@/store/ai-queue";
import { runAiRules, cancelAiRules } from "@/utils/queue/email-actions";
import { fetchWithAccount } from "@/utils/fetch";
import { sleep } from "@/utils/sleep";
import { dateToSeconds } from "@/utils/date";
import { SetDateDropdown } from "@/app/(app)/[emailAccountId]/assistant/SetDateDropdown";
import type { ThreadsResponse } from "@/app/api/google/threads/controller";
import type { ThreadsQuery } from "@/app/api/google/threads/validation";

export function RerunRulesSection() {
  const { emailAccountId } = useAccount();
  const queue = useAiQueueState();

  const [running, setRunning] = useState(false);
  const [totalThreads, setTotalThreads] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [emailLimit, setEmailLimit] = useState<string>("");
  const abortRef = useRef<() => void>(undefined);

  const onStart = useCallback(async () => {
    if (!startDate) return;
    setRunning(true);
    setTotalThreads(0);

    const limit = emailLimit ? parseInt(emailLimit, 10) : undefined;

    let nextPageToken = "";
    const BATCH_SIZE = 25;
    const startDateInSeconds = dateToSeconds(startDate);
    const endDateInSeconds = endDate ? dateToSeconds(endDate) : "";
    const q = `after:${startDateInSeconds} ${endDate ? `before:${endDateInSeconds}` : ""}`;

    let aborted = false;
    let processed = 0;

    abortRef.current = () => {
      aborted = true;
      cancelAiRules();
    };

    try {
      for (let i = 0; i < 100; i++) {
        if (aborted) break;
        if (limit && processed >= limit) break;

        const query: ThreadsQuery = {
          type: "inbox",
          nextPageToken,
          limit: BATCH_SIZE,
          q,
        };
        const res = await fetchWithAccount({
          url: `/api/google/threads?${new URLSearchParams(query as any).toString()}`,
          emailAccountId,
        });
        const data: ThreadsResponse = await res.json();
        nextPageToken = data.nextPageToken || "";

        let threads = data.threads;
        if (limit) {
          threads = threads.slice(0, limit - processed);
        }

        processed += threads.length;
        setTotalThreads((t) => t + threads.length);

        await runAiRules(emailAccountId, threads, true);

        if (!nextPageToken || aborted) break;
        await sleep(threads.length ? 5_000 : 2_000);
      }

      toast.success(`Re-processed ${processed} email(s) with current rules.`);
    } catch {
      toast.error("There was an error re-running rules.");
    } finally {
      setRunning(false);
    }
  }, [emailAccountId, startDate, endDate, emailLimit]);

  const onCancel = useCallback(() => {
    abortRef.current?.();
    setRunning(false);
    toast.info("Rule re-run cancelled.");
  }, []);

  return (
    <FormSection>
      <div>
        <div className="flex items-center gap-1.5">
          <SectionHeader>Re-run rules on past emails</SectionHeader>
          <TooltipExplanation
            size="md"
            text="Your emails are checked by your AI rules when they first arrive. If you change your rules later, old emails keep their old results. Use this to check old emails again with your new rules. This uses API credits."
          />
        </div>
        <SectionDescription>
          Changed your rules? Use this to go back and check old emails with your
          updated rules. Only use this when you have made changes to your rules
          and want those changes to apply to emails you already received.
        </SectionDescription>
      </div>

      <div className="space-y-3">
        <SectionDescription>
          Pick a date range to choose which emails to re-check. You can also set
          a limit so it only checks a certain number of emails at a time.
        </SectionDescription>

        <div className="grid grid-cols-2 gap-2">
          <SetDateDropdown
            onChange={setStartDate}
            value={startDate}
            placeholder="Start date"
            disabled={running}
          />
          <SetDateDropdown
            onChange={setEndDate}
            value={endDate}
            placeholder="End date (optional)"
            disabled={running}
          />
        </div>

        <div>
          <input
            type="number"
            min="1"
            placeholder="Max emails (leave empty for all)"
            value={emailLimit}
            onChange={(e) => setEmailLimit(e.target.value)}
            disabled={running}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>

        {!!queue.size && running && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950">
            Progress: {totalThreads - queue.size}/{totalThreads} emails
            completed
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={running || !startDate}
            loading={running}
            onClick={onStart}
          >
            Re-run Rules
          </Button>
          {running && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </FormSection>
  );
}
