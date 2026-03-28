"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/utils";
import {
  UserCircle,
  Focus,
  MessageSquare,
  Users,
  ShieldCheck,
  Bell,
  PenTool,
  Trash2,
  Tags,
  AtSign,
} from "lucide-react";

const sidebarItems = [
  { href: "accounts", label: "Connected Accounts", icon: UserCircle },
  { href: "focus-mode", label: "Focus Mode", icon: Focus },
  { href: "tone-profile", label: "Tone Profile", icon: MessageSquare },
  { href: "contacts", label: "Contacts", icon: Users },
  { href: "trusted-senders", label: "Trusted Senders", icon: ShieldCheck },
  { href: "notifications", label: "Notifications", icon: Bell },
  { href: "auto-draft", label: "Auto-Draft & Nudges", icon: PenTool },
  { href: "junk", label: "Junk Settings", icon: Trash2 },
  { href: "labels", label: "Suggested Labels", icon: Tags },
  { href: "aliases", label: "Alias Manager", icon: AtSign },
];

export default function BntlySettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ emailAccountId: string }>();
  const pathname = usePathname();
  const basePath = `/${params.emailAccountId}/settings/bntly`;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] gap-0">
      <aside className="w-64 shrink-0 border-r bg-muted/30 p-4">
        <h2 className="mb-4 px-2 text-lg font-semibold tracking-tight">
          Bntly Settings
        </h2>
        <nav className="flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const fullHref = `${basePath}/${item.href}`;
            const isActive = pathname === fullHref;
            return (
              <Link
                key={item.href}
                href={fullHref}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
