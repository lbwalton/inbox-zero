"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import type { GetTrustedSendersResponse } from "@/app/api/trusted-senders/route";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingContent } from "@/components/LoadingContent";
import { Separator } from "@/components/ui/separator";
import { TrashIcon } from "lucide-react";

type SenderType = "CONTACT" | "TEAM_DOMAIN" | "CLIENT_DOMAIN";

export default function TrustedSendersSettingsPage() {
  const { data, isLoading, error, mutate } = useSWR<GetTrustedSendersResponse>(
    "/api/trusted-senders",
  );

  const [newValue, setNewValue] = useState("");
  const [newType, setNewType] = useState<SenderType>("CONTACT");
  const [adding, setAdding] = useState(false);

  const addSender = useCallback(async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/trusted-senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType, value: newValue.trim() }),
      });
      setNewValue("");
      mutate();
    } finally {
      setAdding(false);
    }
  }, [newValue, newType, mutate]);

  const removeSender = useCallback(
    async (id: string) => {
      await fetch(`/api/trusted-senders/${id}`, { method: "DELETE" });
      mutate();
    },
    [mutate],
  );

  const typeLabel: Record<SenderType, string> = {
    CONTACT: "Contact",
    TEAM_DOMAIN: "Team Domain",
    CLIENT_DOMAIN: "Client Domain",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trusted Senders</h1>
        <p className="text-sm text-muted-foreground">
          Emails from trusted senders always bypass junk filtering.
        </p>
      </div>
      <LoadingContent loading={isLoading} error={error}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Trusted Sender</CardTitle>
            <CardDescription>
              Add an email address or domain to your trusted list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">
                  Email or Domain
                </label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. jane@example.com or example.com"
                  className="w-full rounded-md border border-slate-300 bg-background px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-slate-700 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as SenderType)}
                  className="rounded-md border border-slate-300 bg-background px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:text-slate-100"
                >
                  <option value="CONTACT">Contact</option>
                  <option value="TEAM_DOMAIN">Team Domain</option>
                  <option value="CLIENT_DOMAIN">Client Domain</option>
                </select>
              </div>
              <Button onClick={addSender} disabled={adding || !newValue.trim()}>
                {adding ? "Adding..." : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Trusted Senders</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.length > 0 ? (
              <div className="space-y-2">
                {data.map((sender) => (
                  <div
                    key={sender.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {sender.value}
                      </span>
                      <Badge variant="secondary">
                        {typeLabel[sender.type as SenderType] || sender.type}
                      </Badge>
                      {sender.addedManually && (
                        <Badge variant="outline">Manual</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSender(sender.id)}
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No trusted senders yet.
              </p>
            )}
          </CardContent>
        </Card>
      </LoadingContent>
    </div>
  );
}
