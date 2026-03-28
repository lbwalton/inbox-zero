"use client";

import { Tooltip } from "@/components/Tooltip";

/**
 * US-052: Priority badge showing ContactScore priority level.
 * 20px height, monospace score. Gray (0-39), amber (40-79), green (80-100).
 */
export function PriorityBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;

  const rounded = Math.round(score);

  let bgClass: string;
  let textClass: string;
  if (rounded >= 80) {
    bgClass = "bg-green-100 dark:bg-green-900/40";
    textClass = "text-green-800 dark:text-green-300";
  } else if (rounded >= 40) {
    bgClass = "bg-amber-100 dark:bg-amber-900/40";
    textClass = "text-amber-800 dark:text-amber-300";
  } else {
    bgClass = "bg-gray-100 dark:bg-gray-800";
    textClass = "text-gray-600 dark:text-gray-400";
  }

  return (
    <Tooltip content={`Priority score: ${rounded} / 100`}>
      <span
        className={`inline-flex h-5 items-center rounded px-1.5 font-mono text-xs leading-none ${bgClass} ${textClass}`}
        aria-label={`Priority score ${rounded}`}
      >
        {rounded}
      </span>
    </Tooltip>
  );
}
