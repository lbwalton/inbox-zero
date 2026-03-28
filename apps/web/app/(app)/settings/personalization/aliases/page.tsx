"use client";

import React, { useCallback, useState } from "react";
import useSWR from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingContent } from "@/components/LoadingContent";
import {
  PencilIcon,
  TrashIcon,
  RefreshCwIcon,
  CheckIcon,
  XIcon,
} from "lucide-react";
import type { GetAliasesResponse } from "@/app/api/alias/route";
import { toastError, toastSuccess } from "@/components/Toast";

type Alias = GetAliasesResponse[number];

export default function AliasManagerPage() {
  const {
    data: aliases,
    isLoading,
    error,
    mutate,
  } = useSWR<GetAliasesResponse>("/api/alias");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/alias/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete alias");
        toastSuccess({ description: "Alias removed" });
        await mutate();
      } catch {
        toastError({ description: "Failed to delete alias" });
      }
      setDeletingId(null);
    },
    [mutate],
  );

  const handleEdit = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/alias/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resolvedEmail: editEmail,
            resolvedName: editName || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to update alias");
        toastSuccess({ description: "Alias updated" });
        await mutate();
      } catch {
        toastError({ description: "Failed to update alias" });
      }
      setEditingId(null);
    },
    [editEmail, editName, mutate],
  );

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      // We need at least one email account — fetch accounts
      const accountsRes = await fetch("/api/accounts");
      if (!accountsRes.ok) throw new Error("Failed to fetch accounts");
      const accounts = (await accountsRes.json()) as Array<{ id: string }>;

      for (const account of accounts) {
        const res = await fetch("/api/alias/regenerate-embeddings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailAccountId: account.id }),
        });
        if (!res.ok) {
          throw new Error("Embedding regeneration failed");
        }
      }

      toastSuccess({ description: "Embeddings regenerated successfully" });
    } catch {
      toastError({ description: "Failed to regenerate embeddings" });
    }
    setRegenerating(false);
  }, []);

  const startEdit = (alias: Alias) => {
    setEditingId(alias.id);
    setEditEmail(alias.resolvedEmail);
    setEditName(alias.resolvedName ?? "");
  };

  return (
    <div className="content-container mx-auto max-w-4xl space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contact Aliases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your natural language contact aliases. Type phrases like
            &quot;my boss&quot; in the To: field and Bntly will resolve them to
            the right contact.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          <RefreshCwIcon
            className={`mr-2 h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
          />
          {regenerating ? "Regenerating..." : "Regenerate Embeddings"}
        </Button>
      </div>

      <LoadingContent loading={isLoading} error={error}>
        {aliases && aliases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">
              No aliases yet. They are created automatically when you confirm a
              suggestion.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phrase</TableHead>
                  <TableHead>Resolves To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aliases?.map((alias) => (
                  <TableRow key={alias.id}>
                    <TableCell className="font-medium">
                      {alias.phrase}
                    </TableCell>
                    <TableCell>
                      {editingId === alias.id ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Name (optional)"
                            className="rounded border border-input bg-background px-2 py-1 text-sm"
                          />
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="Email"
                            className="rounded border border-input bg-background px-2 py-1 text-sm"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7"
                              onClick={() => handleEdit(alias.id)}
                            >
                              <CheckIcon className="mr-1 h-3 w-3" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {alias.resolvedName && (
                            <span className="font-medium">
                              {alias.resolvedName}
                            </span>
                          )}
                          <Badge variant="secondary">
                            {alias.resolvedEmail}
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {alias.confirmedAt ? (
                        <Badge variant="default">Confirmed</Badge>
                      ) : (
                        <Badge variant="outline">Unconfirmed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(alias.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {deletingId === alias.id ? (
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-muted-foreground">
                            Remove this alias?
                          </p>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => handleDelete(alias.id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setDeletingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => startEdit(alias)}
                            disabled={editingId !== null}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(alias.id)}
                            disabled={editingId !== null}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </LoadingContent>
    </div>
  );
}
