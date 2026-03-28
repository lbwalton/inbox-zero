"use client";

import { useCallback } from "react";
import useSWR from "swr";
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

interface SuggestedLabel {
  id: string;
  emailAccountId: string;
  labelName: string;
  reasoning: string;
  status: "PENDING" | "APPROVED" | "DISMISSED";
  gmailLabelId: string | null;
  createdAt: string;
}

export default function LabelsSettingsPage() {
  const { data, isLoading, error, mutate } =
    useSWR<SuggestedLabel[]>("/api/labels");

  const updateLabel = useCallback(
    async (id: string, status: "APPROVED" | "DISMISSED") => {
      await fetch(`/api/labels/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      mutate();
    },
    [mutate],
  );

  const statusVariant = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "green" as const;
      case "DISMISSED":
        return "red" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suggested Labels</h1>
        <p className="text-sm text-muted-foreground">
          Bntly suggests labels based on your email patterns. Approve or dismiss
          them here.
        </p>
      </div>
      <LoadingContent loading={isLoading} error={error}>
        {data && data.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Labels</CardTitle>
              <CardDescription>
                Review and manage AI-suggested labels for your inbox.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between rounded-md border p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {label.labelName}
                        </span>
                        <Badge variant={statusVariant(label.status)}>
                          {label.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {label.reasoning}
                      </p>
                    </div>
                    {label.status === "PENDING" && (
                      <div className="ml-4 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateLabel(label.id, "APPROVED")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateLabel(label.id, "DISMISSED")}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No suggested labels yet. Bntly will suggest labels as it learns
                your email patterns.
              </p>
            </CardContent>
          </Card>
        )}
      </LoadingContent>
    </div>
  );
}
