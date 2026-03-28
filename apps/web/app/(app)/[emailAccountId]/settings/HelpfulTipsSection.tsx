"use client";

import { useState } from "react";
import { FormSection, FormSectionLeft } from "@/components/Form";
import { Toggle } from "@/components/Toggle";
import { toastError, toastSuccess } from "@/components/Toast";
import { useUser } from "@/hooks/useUser";
import { mutate } from "swr";

export function HelpfulTipsSection() {
  const { data: userData } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);

  const showHelpfulTips = userData?.showHelpfulTips ?? true;

  async function handleToggle(enabled: boolean) {
    setIsUpdating(true);
    try {
      await fetch("/api/user/helpful-tips", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showHelpfulTips: enabled }),
      });
      await mutate("/api/user/me");
      toastSuccess({
        description: `Helpful tips ${enabled ? "enabled" : "disabled"}.`,
      });
    } catch {
      toastError({ description: "Failed to update helpful tips setting." });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <FormSection>
      <FormSectionLeft
        title="Helpful Tips"
        description="Show detailed explanations and examples when hovering over action buttons. Great for new users; power users can turn this off."
      />
      <div className="flex items-center sm:col-span-2">
        <Toggle
          name="showHelpfulTips"
          label="Show helpful tips"
          enabled={showHelpfulTips}
          onChange={handleToggle}
          explainText={
            isUpdating
              ? "Saving..."
              : showHelpfulTips
                ? "Hover over any action button to see what it does and an example."
                : "Action buttons show simple tooltips only."
          }
        />
      </div>
    </FormSection>
  );
}
