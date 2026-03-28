"use client";

import * as React from "react";
import { CheckIcon, PaletteIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/utils";

const THEMES = [
  { id: "light", label: "Linen", color: "#FAF7F2" },
  { id: "dark", label: "Ember", color: "#D4451A" },
  { id: "bright", label: "Soleil", color: "#F5A623" },
  { id: "monochromatic", label: "Stone", color: "#8B8680" },
  { id: "earth", label: "Terra", color: "#6B4E3D" },
] as const;

export function ThemeToggle({ focus }: { focus?: boolean }) {
  const { setTheme, theme } = useTheme();
  const [open, setOpen] = React.useState(false);

  const handleSelect = (themeId: string) => {
    setTheme(themeId);
    setOpen(false);
    fetch("/api/user/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: themeId }),
    }).catch(() => {});
  };

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          "flex w-full items-center px-3 py-1 text-sm leading-6 text-foreground",
          focus && "bg-accent",
        )}
        onClick={() => setOpen(!open)}
      >
        <PaletteIcon className="mr-2 h-4 w-4" />
        Theme
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-48 rounded-md border bg-popover p-2 shadow-md">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                theme === t.id && "font-medium",
              )}
              onClick={() => handleSelect(t.id)}
            >
              <span
                className="inline-block h-4 w-4 rounded-full border"
                style={{ backgroundColor: t.color }}
              />
              <span className="flex-1 text-left">{t.label}</span>
              {theme === t.id && <CheckIcon className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
