"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import type { GetBntlySettingsResponse } from "@/app/api/user/bntly-settings/route";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/Toggle";
import { LoadingContent } from "@/components/LoadingContent";
import { Separator } from "@/components/ui/separator";

export default function AutoDraftSettingsPage() {
  const { data, isLoading, error, mutate } = useSWR<GetBntlySettingsResponse>(
    "/api/user/bntly-settings",
  );

  const [autoDraftEnabled, setAutoDraftEnabled] = useState(true);
  const [autoDraftThreshold, setAutoDraftThreshold] = useState(70);
  const [outboundNudgeDays, setOutboundNudgeDays] = useState(3);
  const [inboundNudgeDays, setInboundNudgeDays] = useState(2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setAutoDraftEnabled(data.autoDraftEnabled);
      setAutoDraftThreshold(data.autoDraftThreshold);
      setOutboundNudgeDays(data.outboundNudgeDays);
      setInboundNudgeDays(data.inboundNudgeDays);
    }
  }, [data]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/user/bntly-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoDraftEnabled,
          autoDraftThreshold,
          outboundNudgeDays,
          inboundNudgeDays,
        }),
      });
      mutate();
    } finally {
      setSaving(false);
    }
  }, [
    autoDraftEnabled,
    autoDraftThreshold,
    outboundNudgeDays,
    inboundNudgeDays,
    mutate,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Auto-Draft & Nudge Rules
        </h1>
        <p className="text-sm text-muted-foreground">
          Control when Bntly auto-drafts replies and sends follow-up nudges.
        </p>
      </div>
      <LoadingContent loading={isLoading} error={error}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Auto-Draft</CardTitle>
            <CardDescription>
              Bntly can automatically draft replies for high-confidence emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Toggle
              name="autoDraftEnabled"
              label="Enable Auto-Draft"
              enabled={autoDraftEnabled}
              onChange={setAutoDraftEnabled}
            />

            {autoDraftEnabled && (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Confidence Threshold (0-100)
                </label>
                <p className="mb-2 text-sm text-muted-foreground">
                  Only auto-draft when confidence is above this value.
                </p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={autoDraftThreshold}
                  onChange={(e) =>
                    setAutoDraftThreshold(Number(e.target.value))
                  }
                  className="w-20 rounded-md border border-slate-300 bg-background px-2 py-1 text-sm shadow-sm dark:border-slate-700"
                />
              </div>
            )}

            <Separator />

            <div>
              <h3 className="mb-4 text-lg font-semibold">Nudge Rules</h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Outbound Nudge (days)
                  </label>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Remind you to follow up if no reply after this many days.
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={outboundNudgeDays}
                    onChange={(e) =>
                      setOutboundNudgeDays(Number(e.target.value))
                    }
                    className="w-20 rounded-md border border-slate-300 bg-background px-2 py-1 text-sm shadow-sm dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Inbound Nudge (days)
                  </label>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Remind you to reply to important emails after this many
                    days.
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={inboundNudgeDays}
                    onChange={(e) =>
                      setInboundNudgeDays(Number(e.target.value))
                    }
                    className="w-20 rounded-md border border-slate-300 bg-background px-2 py-1 text-sm shadow-sm dark:border-slate-700"
                  />
                </div>
              </div>
            </div>

            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </LoadingContent>
    </div>
  );
}
