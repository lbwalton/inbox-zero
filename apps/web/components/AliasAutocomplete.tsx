"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, XIcon } from "lucide-react";

interface AliasMatch {
  contactEmail: string;
  contactName: string | null;
  similarityScore: number;
  emailAccountId: string;
  confirmed?: boolean;
}

interface AliasAutocompleteProps {
  /** The current raw text in the To field */
  searchQuery: string;
  /** The emailAccountId for context */
  emailAccountId: string;
  /** Called when a resolved email should be inserted */
  onSelectEmail: (email: string) => void;
}

/**
 * Inline alias resolution component that renders below the To: field.
 * When the user types a phrase that doesn't look like an email (no @ symbol),
 * debounces 300ms and calls POST /api/alias/resolve.
 *
 * - Confirmed alias: fires onSelectEmail immediately (silent replace).
 * - Unconfirmed matches: shows a confirmation chip with "Use this" / "Not right".
 */
export function AliasAutocomplete({
  searchQuery,
  emailAccountId,
  onSelectEmail,
}: AliasAutocompleteProps) {
  const [matches, setMatches] = useState<AliasMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMatches = useCallback(
    async (phrase: string) => {
      if (!phrase.trim() || phrase.includes("@")) {
        setMatches([]);
        setVisible(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch("/api/alias/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phrase: phrase.trim() }),
        });

        if (!res.ok) {
          setMatches([]);
          setVisible(false);
          return;
        }

        const data = (await res.json()) as { matches: AliasMatch[] };

        if (data.matches.length === 0) {
          setMatches([]);
          setVisible(false);
          return;
        }

        // If the top match is confirmed, silently insert
        if (data.matches[0]?.confirmed) {
          onSelectEmail(data.matches[0].contactEmail);
          setMatches([]);
          setVisible(false);
          return;
        }

        setMatches(data.matches);
        setCurrentIndex(0);
        setVisible(true);
      } catch {
        setMatches([]);
        setVisible(false);
      } finally {
        setIsLoading(false);
      }
    },
    [onSelectEmail],
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim() || searchQuery.includes("@")) {
      setMatches([]);
      setVisible(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void fetchMatches(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, fetchMatches]);

  const handleUseThis = useCallback(async () => {
    const match = matches[currentIndex];
    if (!match) return;

    // Confirm the alias
    try {
      await fetch("/api/alias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phrase: searchQuery.trim(),
          resolvedEmail: match.contactEmail,
          resolvedName: match.contactName,
          emailAccountId: match.emailAccountId || emailAccountId,
        }),
      });
    } catch {
      // Alias confirmation is best-effort
    }

    onSelectEmail(match.contactEmail);
    setMatches([]);
    setVisible(false);
  }, [matches, currentIndex, searchQuery, emailAccountId, onSelectEmail]);

  const handleNotRight = useCallback(() => {
    if (currentIndex < matches.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setMatches([]);
      setVisible(false);
    }
  }, [currentIndex, matches.length]);

  if (!visible || matches.length === 0 || isLoading) {
    return null;
  }

  const match = matches[currentIndex];
  if (!match) return null;

  const initial =
    match.contactName?.[0]?.toUpperCase() ??
    match.contactEmail[0]?.toUpperCase() ??
    "?";
  const similarityPct = Math.round(match.similarityScore * 100);

  return (
    <div
      className="mt-1 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 animate-in fade-in slide-in-from-bottom-1"
      style={{
        animationDuration: "200ms",
        animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
        {initial}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          {match.contactName && (
            <span className="truncate text-sm font-medium text-foreground">
              {match.contactName}
            </span>
          )}
          <span className="truncate text-sm text-muted-foreground">
            {match.contactEmail}
          </span>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {similarityPct}% match
          </Badge>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={handleUseThis}
          className="h-7 text-xs"
        >
          <CheckCircleIcon className="mr-1 h-3 w-3" />
          Use this
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleNotRight}
          className="h-7 text-xs text-muted-foreground"
        >
          <XIcon className="mr-1 h-3 w-3" />
          Not right
        </Button>
      </div>
    </div>
  );
}
