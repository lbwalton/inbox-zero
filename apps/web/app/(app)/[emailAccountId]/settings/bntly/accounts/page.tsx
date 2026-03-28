"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import type { GetEmailAccountsResponse } from "@/app/api/user/email-accounts/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingContent } from "@/components/LoadingContent";
import { CheckIcon, PencilIcon, XIcon } from "lucide-react";

export default function AccountsSettingsPage() {
  const { data, isLoading, error, mutate } = useSWR<GetEmailAccountsResponse>(
    "/api/user/email-accounts",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Connected Accounts
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your connected email accounts and labels.
        </p>
      </div>
      <LoadingContent loading={isLoading} error={error}>
        <div className="space-y-4">
          {data?.emailAccounts?.map((account) => (
            <AccountRow key={account.id} account={account} mutate={mutate} />
          ))}
          {data?.emailAccounts?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No connected accounts found.
            </p>
          )}
        </div>
      </LoadingContent>
    </div>
  );
}

function AccountRow({
  account,
  mutate,
}: {
  account: GetEmailAccountsResponse["emailAccounts"][number];
  mutate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(account.accountLabel || "");
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/user/email-account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailAccountId: account.id,
          accountLabel: label,
        }),
      });
      mutate();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [account.id, label, mutate]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{account.email}</CardTitle>
            {account.isDefault && <Badge variant="green">Default</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Label:</span>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="rounded-md border border-slate-300 bg-background px-2 py-1 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-slate-700 dark:text-slate-100"
                placeholder="e.g. Work, Personal"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={save}
                disabled={saving}
              >
                <CheckIcon className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setLabel(account.accountLabel || "");
                }}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {account.accountLabel || "No label set"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
              >
                <PencilIcon className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
