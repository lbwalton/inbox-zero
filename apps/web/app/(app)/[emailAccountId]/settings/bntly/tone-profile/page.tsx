"use client";

import { useState } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
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

interface ToneProfileData {
  id: string;
  emailAccountId: string;
  avgSentenceLength: number;
  commonOpeners: string[];
  commonSignoffs: string[];
  formalityScore: number;
  commonPhrases: string[];
  lastScanned: string;
}

export default function ToneProfileSettingsPage() {
  const params = useParams<{ emailAccountId: string }>();
  const { data, isLoading, error, mutate } = useSWR<ToneProfileData>(
    `/api/tone-profile?emailAccountId=${params.emailAccountId}`,
  );
  const [scanning, setScanning] = useState(false);

  const triggerScan = async () => {
    setScanning(true);
    try {
      await fetch("/api/tone-profile/scan", { method: "POST" });
      mutate();
    } finally {
      setScanning(false);
    }
  };

  const formalityLabel = (score: number) => {
    if (score <= 1) return "Very Casual";
    if (score <= 2) return "Casual";
    if (score <= 3) return "Neutral";
    if (score <= 4) return "Formal";
    return "Very Formal";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tone Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your writing style as analyzed by Bntly. Used to draft replies in your
          voice.
        </p>
      </div>
      <LoadingContent loading={isLoading} error={error}>
        {data ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Your Tone Profile</CardTitle>
                  <CardDescription>
                    Last scanned:{" "}
                    {new Date(data.lastScanned).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Button onClick={triggerScan} disabled={scanning}>
                  {scanning ? "Scanning..." : "Re-scan"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-medium">Formality</h3>
                <Badge variant="secondary">
                  {formalityLabel(data.formalityScore)} ({data.formalityScore}
                  /5)
                </Badge>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-medium">
                  Average Sentence Length
                </h3>
                <p className="text-sm text-muted-foreground">
                  {data.avgSentenceLength.toFixed(1)} words
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-medium">Common Openers</h3>
                <div className="flex flex-wrap gap-2">
                  {(data.commonOpeners as string[])?.length > 0 ? (
                    (data.commonOpeners as string[]).map((opener, i) => (
                      <Badge key={i} variant="outline">
                        {opener}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      None detected yet.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-medium">Common Sign-offs</h3>
                <div className="flex flex-wrap gap-2">
                  {(data.commonSignoffs as string[])?.length > 0 ? (
                    (data.commonSignoffs as string[]).map((signoff, i) => (
                      <Badge key={i} variant="outline">
                        {signoff}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      None detected yet.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-medium">Common Phrases</h3>
                <div className="flex flex-wrap gap-2">
                  {(data.commonPhrases as string[])?.length > 0 ? (
                    (data.commonPhrases as string[]).map((phrase, i) => (
                      <Badge key={i} variant="outline">
                        {phrase}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      None detected yet.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="mb-4 text-muted-foreground">
                No tone profile found. Run a scan to analyze your writing style.
              </p>
              <Button onClick={triggerScan} disabled={scanning}>
                {scanning ? "Scanning..." : "Run Initial Scan"}
              </Button>
            </CardContent>
          </Card>
        )}
      </LoadingContent>
    </div>
  );
}
