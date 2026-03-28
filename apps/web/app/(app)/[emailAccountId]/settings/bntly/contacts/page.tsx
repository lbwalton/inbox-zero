"use client";

import useSWR from "swr";
import type { GetContactScoresResponse } from "@/app/api/contact-scoring/contacts/route";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingContent } from "@/components/LoadingContent";

export default function ContactsSettingsPage() {
  const { data, isLoading, error } = useSWR<GetContactScoresResponse>(
    "/api/contact-scoring/contacts",
  );

  const formatReplyTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Contact Intelligence
        </h1>
        <p className="text-sm text-muted-foreground">
          Your most important contacts ranked by priority score.
        </p>
      </div>
      <LoadingContent loading={isLoading} error={error}>
        {data && data.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Contacts</CardTitle>
              <CardDescription>
                Ranked by priority score. Bntly uses this to triage your inbox.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {contact.contactEmail}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Reply rate: {(contact.replyRate * 100).toFixed(0)}%
                        </span>
                        <span>
                          Avg reply:{" "}
                          {formatReplyTime(contact.avgReplyTimeHours)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        contact.priorityScore >= 70 ? "green" : "secondary"
                      }
                    >
                      {contact.priorityScore.toFixed(0)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No contact scores yet. Bntly will analyze your email patterns
                over time.
              </p>
            </CardContent>
          </Card>
        )}
      </LoadingContent>
    </div>
  );
}
