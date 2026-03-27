"use client";

import { FormSection, FormSectionLeft } from "@/components/Form";
import { ThemePicker } from "@/components/ThemePicker";

export function AppearanceSection() {
  return (
    <FormSection>
      <FormSectionLeft
        title="Appearance"
        description="Choose a color theme for the interface."
      />

      <div className="sm:col-span-2">
        <ThemePicker />
      </div>
    </FormSection>
  );
}
