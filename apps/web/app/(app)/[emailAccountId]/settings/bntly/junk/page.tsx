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

export default function JunkSettingsPage() {
  const { data, isLoading, error, mutate } = useSWR<GetBntlySettingsResponse>(
    "/api/user/bntly-settings",
  );

  const [junkAutoPurge, setJunkAutoPurge] = useState(false);
  const [junkAutoPurgeDays, setJunkAutoPurgeDays] = useState(30);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    if (data) {
      setJunkAutoPurge(data.junkAutoPurge);
      setJunkAutoPurgeDays(data.junkAutoPurgeDays);
    }
  }, [data]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/user/bntly-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          junkAutoPurge,
          junkAutoPurgeDays,
        }),
      });
      mutate();
    } finally {
      setSaving(false);
    }
  }, [junkAutoPurge, junkAutoPurgeDays, mutate]);

  const triggerPurge = useCallback(async () => {
    setPurging(true);
    try {
      await fetch("/api/junk/purge", { method: "POST" });
    } finally {
      setPurging(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Junk Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure how Bntly handles junk and low-priority emails.
        </p>
      </div>
      <LoadingContent loading={isLoading} error={error}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Junk Retention</CardTitle>
            <CardDescription>
              Control automatic cleanup of junk-classified emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Toggle
              name="junkAutoPurge"
              label="Auto-Delete Junk"
              enabled={junkAutoPurge}
              onChange={setJunkAutoPurge}
              explainText="Automatically delete junk emails after the retention period."
            />

            {junkAutoPurge && (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Retention Period (days)
                </label>
                <p className="mb-2 text-sm text-muted-foreground">
                  Junk emails will be deleted after this many days.
                </p>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={junkAutoPurgeDays}
                  onChange={(e) => setJunkAutoPurgeDays(Number(e.target.value))}
                  className="w-24 rounded-md border border-slate-300 bg-background px-2 py-1 text-sm shadow-sm dark:border-slate-700"
                />
              </div>
            )}

            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>

            <Separator />

            <div>
              <h3 className="mb-2 text-sm font-medium">Manual Purge</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Immediately purge all junk emails that have exceeded the
                retention period.
              </p>
              <Button
                variant="outline"
                onClick={triggerPurge}
                disabled={purging}
              >
                {purging ? "Purging..." : "Purge Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </LoadingContent>
    </div>
  );
}
