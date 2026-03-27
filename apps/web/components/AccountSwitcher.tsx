"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckIcon, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAccounts } from "@/hooks/useAccounts";
import type { GetEmailAccountsResponse } from "@/app/api/user/email-accounts/route";
import { useAccount } from "@/providers/EmailAccountProvider";
import { ProfileImage } from "@/components/ProfileImage";
import { cn } from "@/utils";

export function AccountSwitcher() {
  const { data: accountsData } = useAccounts();

  if (!accountsData) return null;

  return (
    <AccountSwitcherInternal
      emailAccounts={accountsData.emailAccounts}
      focusMode={accountsData.focusMode ?? null}
    />
  );
}

export function AccountSwitcherInternal({
  emailAccounts,
  focusMode,
}: {
  emailAccounts: GetEmailAccountsResponse["emailAccounts"];
  focusMode: GetEmailAccountsResponse["focusMode"];
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();

  const {
    emailAccountId: activeEmailAccountId,
    emailAccount: activeEmailAccount,
    isLoading,
  } = useAccount();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getHref = useCallback(
    (emailAccountId: string) => {
      if (!activeEmailAccountId) return `/${emailAccountId}/setup`;

      const basePath = pathname.split("?")[0] || "/";
      const newBasePath = basePath.replace(
        activeEmailAccountId,
        emailAccountId,
      );

      const tab = searchParams.get("tab");

      return `${newBasePath}${tab ? `?tab=${tab}` : ""}`;
    },
    [pathname, activeEmailAccountId, searchParams],
  );

  const handleAccountSelect = useCallback(
    async (accountId: string) => {
      try {
        await fetch(`/api/user/email-accounts/${accountId}/activate`, {
          method: "PUT",
        });
      } catch {
        // Best-effort activation call; navigation handles the switch
      }

      router.push(getHref(accountId));
      router.refresh();
    },
    [getHref, router],
  );

  if (isLoading) return null;

  const isFocusActive = focusMode?.isActive ?? false;
  const focusedAccountId = focusMode?.focusedAccountId ?? null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              aria-label="Switch account"
            >
              {activeEmailAccount ? (
                <>
                  <div className="relative flex aspect-square size-8 items-center justify-center">
                    <ProfileImage
                      image={activeEmailAccount.image}
                      label={
                        activeEmailAccount.name || activeEmailAccount.email
                      }
                    />
                    {isFocusActive &&
                      focusedAccountId === activeEmailAccountId && (
                        <span
                          className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-sidebar bg-violet-500"
                          aria-label="Focus Mode active"
                        />
                      )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {activeEmailAccount.accountLabel ||
                        activeEmailAccount.name ||
                        activeEmailAccount.email}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {activeEmailAccount.email}
                    </span>
                  </div>
                </>
              ) : (
                <div>Choose account</div>
              )}
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-80 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Accounts
            </DropdownMenuLabel>
            {emailAccounts.map((emailAccount) => {
              const isActive = emailAccount.id === activeEmailAccountId;
              const isFocused =
                isFocusActive && focusedAccountId === emailAccount.id;

              return (
                <DropdownMenuItem
                  key={emailAccount.id}
                  className="gap-2 p-2"
                  onSelect={() => {
                    if (!isActive) {
                      handleAccountSelect(emailAccount.id);
                    }
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <ProfileImage
                      image={emailAccount.image}
                      label={emailAccount.name || emailAccount.email}
                    />
                    {isFocused && (
                      <span
                        className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-popover bg-violet-500"
                        aria-label="Focused account"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="truncate font-medium">
                      {emailAccount.accountLabel ||
                        emailAccount.name ||
                        emailAccount.email}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {emailAccount.email}
                    </span>
                  </div>
                  {isActive && (
                    <CheckIcon className="ml-auto size-4 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <Link href="/accounts">
              <DropdownMenuItem className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Add account
                </div>
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
