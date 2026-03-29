"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { ThumbsUpIcon, ThumbsDownIcon, SkipForwardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingContent } from "@/components/LoadingContent";
import { useAccount } from "@/providers/EmailAccountProvider";
import { prefixPath } from "@/utils/path";
import { toastError, toastSuccess } from "@/components/Toast";

type ContactSender = {
  id: string;
  contactEmail: string;
  priorityScore: number;
  manualOverride: boolean;
};

type Rating = "important" | "not_important" | null;

export default function ImportanceOnboardingPage() {
  const router = useRouter();
  const { emailAccountId } = useAccount();
  const { data, isLoading, error } = useSWR<{ contacts: ContactSender[] }>(
    "/api/contact-scoring/top-senders",
  );

  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [saving, setSaving] = useState(false);

  const setRating = useCallback((contactEmail: string, rating: Rating) => {
    setRatings((prev) => ({
      ...prev,
      [contactEmail]: prev[contactEmail] === rating ? null : rating,
    }));
  }, []);

  const handleSave = useCallback(async () => {
    const entries = Object.entries(ratings).filter(([, r]) => r !== null);
    if (entries.length === 0) {
      router.push(prefixPath(emailAccountId, "/mail"));
      return;
    }

    setSaving(true);
    try {
      const updates = entries.map(([contactEmail, rating]) => ({
        contactEmail,
        priorityScore: rating === "important" ? 90 : 10,
        manualOverride: true,
      }));

      await fetch("/api/contact-scoring/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      toastSuccess({ description: `Saved ${entries.length} preference(s).` });
      router.push(prefixPath(emailAccountId, "/mail"));
    } catch {
      toastError({ description: "Failed to save preferences." });
    } finally {
      setSaving(false);
    }
  }, [ratings, emailAccountId, router]);

  const handleSkip = useCallback(() => {
    router.push(prefixPath(emailAccountId, "/mail"));
  }, [emailAccountId, router]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Train Your Priority Inbox</h1>
        <p className="mt-2 text-muted-foreground">
          Mark your top senders as important or not important so the AI learns
          your preferences.
        </p>
      </div>

      <LoadingContent loading={isLoading} error={error}>
        <div className="space-y-2">
          {data?.contacts.map((contact) => {
            const rating = ratings[contact.contactEmail] ?? null;
            return (
              <div
                key={contact.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {contact.contactEmail.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">
                    {contact.contactEmail}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={rating === "important" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRating(contact.contactEmail, "important")}
                  >
                    <ThumbsUpIcon className="mr-1 h-4 w-4" />
                    Important
                  </Button>
                  <Button
                    variant={
                      rating === "not_important" ? "destructive" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setRating(contact.contactEmail, "not_important")
                    }
                  >
                    <ThumbsDownIcon className="mr-1 h-4 w-4" />
                    Not Important
                  </Button>
                </div>
              </div>
            );
          })}

          {data?.contacts.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No contacts found yet. Send and receive some emails first.
            </p>
          )}
        </div>
      </LoadingContent>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={handleSkip}>
          <SkipForwardIcon className="mr-1 h-4 w-4" />
          Skip for Now
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Done"}
        </Button>
      </div>
    </div>
  );
}
