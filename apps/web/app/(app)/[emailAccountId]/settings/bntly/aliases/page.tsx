"use client";

import { useCallback, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { TrashIcon, RefreshCwIcon, PlusIcon } from "lucide-react";

interface ContactAlias {
  id: string;
  phrase: string;
  resolvedEmail: string;
  resolvedName: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AliasManagerPage() {
  const { data, isLoading, error, mutate } = useSWR<ContactAlias[]>(
    "/api/alias",
    fetcher,
  );

  const [phrase, setPhrase] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const addAlias = useCallback(async () => {
    if (!phrase.trim() || !email.trim()) return;
    setAdding(true);
    try {
      await fetch("/api/alias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrase: phrase.trim(),
          resolvedEmail: email.trim(),
          resolvedName: name.trim() || null,
        }),
      });
      setPhrase("");
      setEmail("");
      setName("");
      mutate();
    } finally {
      setAdding(false);
    }
  }, [phrase, email, name, mutate]);

  const deleteAlias = useCallback(
    async (id: string) => {
      await fetch(`/api/alias/${id}`, { method: "DELETE" });
      mutate();
    },
    [mutate],
  );

  const regenerateEmbeddings = useCallback(async () => {
    setRegenerating(true);
    try {
      await fetch("/api/alias/regenerate-embeddings", { method: "POST" });
    } finally {
      setRegenerating(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alias Manager</CardTitle>
        <CardDescription>
          Manage contact aliases for quick email resolution. Type a phrase like
          &quot;my boss&quot; and Bntly will resolve it to the right email
          address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Add New Alias</h3>
          <div className="flex gap-2">
            <input
              placeholder="Phrase (e.g. 'my boss')"
              value={phrase}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPhrase(e.target.value)
              }
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <input
              placeholder="Name (optional)"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <Button onClick={addAlias} disabled={adding} size="sm">
              <PlusIcon className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        <Separator />

        <LoadingContent loading={isLoading} error={error}>
          {data && data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No aliases yet. Add one above or let Bntly learn them from your
              emails.
            </p>
          ) : (
            <div className="space-y-2">
              {data?.map((alias) => (
                <div
                  key={alias.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        &quot;{alias.phrase}&quot;
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm">
                        {alias.resolvedName
                          ? `${alias.resolvedName} <${alias.resolvedEmail}>`
                          : alias.resolvedEmail}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {alias.confirmedAt ? (
                        <Badge variant="default">Confirmed</Badge>
                      ) : (
                        <Badge variant="secondary">Unconfirmed</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAlias(alias.id)}
                  >
                    <TrashIcon className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </LoadingContent>

        <Separator />

        <div>
          <Button
            variant="outline"
            onClick={regenerateEmbeddings}
            disabled={regenerating}
          >
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            {regenerating ? "Regenerating..." : "Regenerate Contact Embeddings"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            Rebuilds the vector embeddings used for smart alias resolution.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
