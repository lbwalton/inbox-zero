"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionDescription } from "@/components/Typography";
import type { ThreadsResponse } from "@/app/api/google/threads/controller";
import type { ThreadsQuery } from "@/app/api/google/threads/validation";
import { LoadingContent } from "@/components/LoadingContent";
import { runAiRules, cancelAiRules } from "@/utils/queue/email-actions";
import { sleep } from "@/utils/sleep";
import { PremiumAlertWithData, usePremium } from "@/components/PremiumAlert";
import { SetDateDropdown } from "@/app/(app)/[emailAccountId]/assistant/SetDateDropdown";
import { dateToSeconds } from "@/utils/date";
import { useThreads } from "@/hooks/useThreads";
import {
  useBulkProcessState,
  startBulkProcess,
  incrementBulkTotal,
  finishBulkProcess,
  resetBulkProcess,
} from "@/store/bulk-process";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAccount } from "@/providers/EmailAccountProvider";
import { prefixPath } from "@/utils/path";
import { fetchWithAccount } from "@/utils/fetch";

export function BulkRunRules() {
  const { emailAccountId } = useAccount();

  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, error } = useThreads({ type: "inbox" });

  const { hasAiAccess, isLoading: isLoadingPremium } = usePremium();

  const bulkState = useBulkProcessState();

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" Icon={HistoryIcon}>
            Bulk Process Emails
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Existing Inbox Emails</DialogTitle>
          </DialogHeader>
          <LoadingContent loading={isLoading} error={error}>
            {data && (
              <>
                <SectionDescription>
                  This runs your rules on unread emails currently in your inbox
                  (that have not been previously processed). You can close this
                  dialog and navigate freely — processing continues in the
                  background.
                </SectionDescription>

                <div className="space-y-4">
                  <LoadingContent loading={isLoadingPremium}>
                    {hasAiAccess ? (
                      <div className="flex flex-col space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <SetDateDropdown
                            onChange={setStartDate}
                            value={startDate}
                            placeholder="Set start date"
                            disabled={bulkState.running}
                          />
                          <SetDateDropdown
                            onChange={setEndDate}
                            value={endDate}
                            placeholder="Set end date (optional)"
                            disabled={bulkState.running}
                          />
                        </div>

                        <Button
                          type="button"
                          disabled={bulkState.running || !startDate}
                          loading={bulkState.running}
                          onClick={() => {
                            if (!startDate) return;
                            startBulkProcess();
                            setIsOpen(false);
                            onRun(emailAccountId, { startDate, endDate });
                          }}
                        >
                          Process Emails
                        </Button>
                        {bulkState.running && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              cancelAiRules();
                              resetBulkProcess();
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    ) : (
                      <PremiumAlertWithData />
                    )}
                  </LoadingContent>

                  <SectionDescription>
                    You can also process specific emails by visiting the{" "}
                    <Link
                      href={prefixPath(emailAccountId, "/mail")}
                      target="_blank"
                      className="font-semibold hover:underline"
                    >
                      Mail
                    </Link>{" "}
                    page.
                  </SectionDescription>
                </div>
              </>
            )}
          </LoadingContent>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// fetch batches of messages and add them to the ai queue
async function onRun(
  emailAccountId: string,
  { startDate, endDate }: { startDate: Date; endDate?: Date },
) {
  let nextPageToken = "";
  const LIMIT = 25;

  const startDateInSeconds = dateToSeconds(startDate);
  const endDateInSeconds = endDate ? dateToSeconds(endDate) : "";
  const q = `after:${startDateInSeconds} ${
    endDate ? `before:${endDateInSeconds}` : ""
  } is:unread`;

  try {
    for (let i = 0; i < 100; i++) {
      const query: ThreadsQuery = {
        type: "inbox",
        nextPageToken,
        limit: LIMIT,
        q,
      };
      const res = await fetchWithAccount({
        url: `/api/google/threads?${new URLSearchParams(query as any).toString()}`,
        emailAccountId,
      });
      const data: ThreadsResponse = await res.json();

      nextPageToken = data.nextPageToken || "";

      const threadsWithoutPlan = data.threads.filter((t) => !t.plan);

      incrementBulkTotal(threadsWithoutPlan.length);

      await runAiRules(emailAccountId, threadsWithoutPlan, false);

      if (!nextPageToken) break;

      // avoid gmail api rate limits
      await sleep(threadsWithoutPlan.length ? 5_000 : 2_000);
    }
  } finally {
    finishBulkProcess();
  }
}
