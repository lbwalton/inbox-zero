"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import type { GetFocusModeResponse } from "@/app/api/focus-mode/route";
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

export default function FocusModeSettingsPage() {
  const { data, isLoading, error, mutate } =
    useSWR<GetFocusModeResponse>("/api/focus-mode");

  const [isActive, setIsActive] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [threshold, setThreshold] = useState(80);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setIsActive(data.isActive ?? false);
      setScheduleEnabled(data.scheduleEnabled ?? false);
      setStartHour(data.scheduleStartHour ?? 9);
      setEndHour(data.scheduleEndHour ?? 17);
      setThreshold(data.breakthroughThreshold ?? 80);
    }
  }, [data]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/focus-mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive,
          scheduleEnabled,
          scheduleStartHour: startHour,
          scheduleEndHour: endHour,
          breakthroughThreshold: threshold,
        }),
      });
      mutate();
    } finally {
      setSaving(false);
    }
  }, [isActive, scheduleEnabled, startHour, endHour, threshold, mutate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Focus Mode</h1>
        <p className="text-sm text-muted-foreground">
          Control when and how Bntly filters your inbox for focused work.
        </p>
      </div>
      <LoadingContent loading={isLoading} error={error}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Focus Mode Settings</CardTitle>
            <CardDescription>
              When active, only high-priority emails break through.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Toggle
              name="focusModeActive"
              label="Enable Focus Mode"
              enabled={isActive}
              onChange={setIsActive}
            />

            <Separator />

            <Toggle
              name="scheduleEnabled"
              label="Use Schedule"
              enabled={scheduleEnabled}
              onChange={setScheduleEnabled}
              explainText="Automatically activate focus mode during set hours."
            />

            {scheduleEnabled && (
              <div className="flex items-center gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">
                    Start Hour
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                    className="w-20 rounded-md border border-slate-300 bg-background px-2 py-1 text-sm shadow-sm dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">
                    End Hour
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="w-20 rounded-md border border-slate-300 bg-background px-2 py-1 text-sm shadow-sm dark:border-slate-700"
                  />
                </div>
              </div>
            )}

            <Separator />

            <div>
              <label className="mb-1 block text-sm font-medium">
                Breakthrough Threshold
              </label>
              <p className="mb-2 text-sm text-muted-foreground">
                Emails with a priority score above this value will still appear
                during focus mode.
              </p>
              <input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-20 rounded-md border border-slate-300 bg-background px-2 py-1 text-sm shadow-sm dark:border-slate-700"
              />
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
