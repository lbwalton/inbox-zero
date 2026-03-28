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

export default function NotificationsSettingsPage() {
  const { data, isLoading, error, mutate } = useSWR<GetBntlySettingsResponse>(
    "/api/user/bntly-settings",
  );

  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(true);
  const [emailDigestTimeUtc, setEmailDigestTimeUtc] = useState(14);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setSlackEnabled(data.slackEnabled);
      setSmsEnabled(data.smsEnabled);
      setPushEnabled(data.pushEnabled);
      setEmailDigestEnabled(data.emailDigestEnabled);
      setEmailDigestTimeUtc(data.emailDigestTimeUtc);
    }
  }, [data]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/user/bntly-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slackEnabled,
          slackWebhookUrl: slackWebhookUrl || null,
          smsEnabled,
          smsPhoneEncrypted: smsPhone || null,
          pushEnabled,
          emailDigestEnabled,
          emailDigestTimeUtc,
        }),
      });
      mutate();
    } finally {
      setSaving(false);
    }
  }, [
    slackEnabled,
    slackWebhookUrl,
    smsEnabled,
    smsPhone,
    pushEnabled,
    emailDigestEnabled,
    emailDigestTimeUtc,
    mutate,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Choose how Bntly sends you alerts and digests.
        </p>
      </div>
      <LoadingContent loading={isLoading} error={error}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Channels</CardTitle>
            <CardDescription>
              Enable or disable individual notification channels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Toggle
                name="slackEnabled"
                label="Slack Notifications"
                enabled={slackEnabled}
                onChange={setSlackEnabled}
              />
              {slackEnabled && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">
                    Slack Webhook URL
                  </label>
                  <input
                    type="url"
                    value={slackWebhookUrl}
                    onChange={(e) => setSlackWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full rounded-md border border-slate-300 bg-background px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-slate-700 dark:text-slate-100"
                  />
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <Toggle
                name="smsEnabled"
                label="SMS Notifications"
                enabled={smsEnabled}
                onChange={setSmsEnabled}
              />
              {smsEnabled && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full rounded-md border border-slate-300 bg-background px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-slate-700 dark:text-slate-100"
                  />
                </div>
              )}
            </div>

            <Separator />

            <Toggle
              name="pushEnabled"
              label="Push Notifications"
              enabled={pushEnabled}
              onChange={setPushEnabled}
            />

            <Separator />

            <div className="space-y-4">
              <Toggle
                name="emailDigestEnabled"
                label="Email Digest"
                enabled={emailDigestEnabled}
                onChange={setEmailDigestEnabled}
              />
              {emailDigestEnabled && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">
                    Digest Time (UTC hour, 0-23)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={emailDigestTimeUtc}
                    onChange={(e) =>
                      setEmailDigestTimeUtc(Number(e.target.value))
                    }
                    className="w-20 rounded-md border border-slate-300 bg-background px-2 py-1 text-sm shadow-sm dark:border-slate-700"
                  />
                </div>
              )}
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
