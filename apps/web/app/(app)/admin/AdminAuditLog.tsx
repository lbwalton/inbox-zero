"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingContent } from "@/components/LoadingContent";

type AuditLogEntry = {
  id: string;
  action: string;
  adminEmail: string;
  targetEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type AuditLogsResponse = {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
};

export function AdminAuditLog() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useSWR<AuditLogsResponse>(
    `/api/admin/audit-logs?page=${page}`,
  );

  return (
    <div className="space-y-4">
      <LoadingContent loading={isLoading} error={error}>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Admin Email</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Target User</th>
                <th className="px-4 py-3 text-left font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{log.adminEmail}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.targetEmail ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                </tr>
              ))}
              {data?.logs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No audit log entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {data.page} of {data.totalPages} ({data.total} entries)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (data?.totalPages ?? 1)}
              >
                Next
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </LoadingContent>
    </div>
  );
}
