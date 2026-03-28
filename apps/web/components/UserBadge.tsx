"use client";

import { Badge } from "@/components/ui/badge";
import { ShieldCheckIcon, CrownIcon, StarIcon } from "lucide-react";
import { cn } from "@/utils";

type UserBadgeProps = {
  role?: string | null;
  tier?: string | null;
  className?: string;
};

const tierConfig: Record<string, { label: string; className: string }> = {
  LIFETIME: {
    label: "Lifetime",
    className:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  BUSINESS_PLUS_MONTHLY: {
    label: "Business+",
    className:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  },
  BUSINESS_PLUS_ANNUALLY: {
    label: "Business+",
    className:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  },
  BUSINESS_MONTHLY: {
    label: "Business",
    className:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  },
  BUSINESS_ANNUALLY: {
    label: "Business",
    className:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  },
  PRO_MONTHLY: {
    label: "Pro",
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  },
  PRO_ANNUALLY: {
    label: "Pro",
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  },
  BASIC_MONTHLY: {
    label: "Basic",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  BASIC_ANNUALLY: {
    label: "Basic",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  COPILOT_MONTHLY: {
    label: "Copilot",
    className:
      "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
  },
};

export function RoleBadge({
  role,
  className,
}: {
  role?: string | null;
  className?: string;
}) {
  if (role !== "ADMIN") return null;

  return (
    <Badge
      className={cn(
        "gap-1 border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
        className,
      )}
    >
      <ShieldCheckIcon className="h-3 w-3" />
      Admin
    </Badge>
  );
}

export function TierBadge({
  tier,
  className,
}: {
  tier?: string | null;
  className?: string;
}) {
  if (!tier) return null;

  const config = tierConfig[tier];
  if (!config) return null;

  const Icon = tier === "LIFETIME" ? StarIcon : CrownIcon;

  return (
    <Badge className={cn("gap-1", config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export function UserBadges({ role, tier, className }: UserBadgeProps) {
  if (role !== "ADMIN" && !tier) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <RoleBadge role={role} />
      <TierBadge tier={tier} />
    </div>
  );
}
