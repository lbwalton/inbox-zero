"use client";

import { useCallback, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { CheckIcon } from "lucide-react";
import { cn } from "@/utils";
import { toastError, toastSuccess } from "@/components/Toast";

/**
 * Theme definitions mapping CSS class names to display names and
 * representative HSL colours used to render the mini swatches.
 * The HSL values are pulled directly from globals.css.
 */
const THEMES = [
  {
    id: "light",
    label: "Linen",
    background: "hsl(36, 33%, 97%)",
    primary: "hsl(24, 80%, 44%)",
    accent: "hsl(32, 60%, 90%)",
  },
  {
    id: "dark",
    label: "Ember",
    background: "hsl(24, 10%, 7%)",
    primary: "hsl(32, 85%, 55%)",
    accent: "hsl(24, 12%, 18%)",
  },
  {
    id: "bright",
    label: "Soleil",
    background: "hsl(48, 100%, 98%)",
    primary: "hsl(20, 90%, 48%)",
    accent: "hsl(45, 80%, 88%)",
  },
  {
    id: "monochromatic",
    label: "Stone",
    background: "hsl(30, 5%, 97%)",
    primary: "hsl(30, 5%, 15%)",
    accent: "hsl(28, 60%, 52%)",
  },
  {
    id: "earth",
    label: "Terra",
    background: "hsl(40, 18%, 96%)",
    primary: "hsl(12, 55%, 45%)",
    accent: "hsl(145, 25%, 42%)",
  },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export function ThemePicker() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    async (themeId: ThemeId) => {
      if (themeId === currentTheme) return;

      // Apply immediately for responsiveness
      setTheme(themeId);
      setSaving(true);

      try {
        const res = await fetch("/api/user/theme", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: themeId }),
        });

        if (!res.ok) {
          throw new Error("Failed to save theme preference");
        }

        toastSuccess({ description: "Theme updated." });
      } catch {
        toastError({
          description: "Could not save theme. Please try again.",
        });
      } finally {
        setSaving(false);
      }
    },
    [currentTheme, setTheme],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const group = groupRef.current;
      if (!group) return;

      const items = Array.from(
        group.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
      );
      const currentIndex = items.findIndex(
        (el) => el === document.activeElement,
      );

      let nextIndex: number | null = null;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          nextIndex = (currentIndex + 1) % items.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          nextIndex = (currentIndex - 1 + items.length) % items.length;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (currentIndex >= 0) {
            const id = items[currentIndex]?.dataset.themeId as
              | ThemeId
              | undefined;
            if (id) handleSelect(id);
          }
          return;
        default:
          return;
      }

      if (nextIndex !== null) {
        items[nextIndex]?.focus();
      }
    },
    [handleSelect],
  );

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Theme"
      className="flex flex-wrap gap-4"
      onKeyDown={handleKeyDown}
    >
      {THEMES.map((t) => {
        const isActive = currentTheme === t.id;

        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`Theme: ${t.label}`}
            data-theme-id={t.id}
            tabIndex={isActive ? 0 : -1}
            disabled={saving}
            onClick={() => handleSelect(t.id)}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 rounded-lg p-1.5 outline-none transition-all",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "hover:ring-2 hover:ring-muted-foreground/30 hover:ring-offset-2 hover:ring-offset-background",
              saving && "pointer-events-none opacity-70",
            )}
          >
            {/* Swatch preview */}
            <div
              className="relative h-12 w-16 overflow-hidden rounded-md border border-border shadow-sm"
              aria-hidden="true"
            >
              {/* Background band */}
              <div
                className="absolute inset-0"
                style={{ backgroundColor: t.background }}
              />
              {/* Primary band */}
              <div
                className="absolute bottom-0 left-0 h-3 w-full"
                style={{ backgroundColor: t.primary }}
              />
              {/* Accent dot */}
              <div
                className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full"
                style={{ backgroundColor: t.accent }}
              />

              {/* Check overlay */}
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <CheckIcon className="h-5 w-5 text-white drop-shadow" />
                </div>
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                "text-xs font-medium",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
