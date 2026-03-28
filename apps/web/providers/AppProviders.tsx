"use client";

import type React from "react";
import { useEffect } from "react";
import { Provider } from "jotai";
import { useTheme } from "next-themes";
import { ComposeModalProvider } from "@/providers/ComposeModalProvider";
import { jotaiStore } from "@/store";
import { ThemeProvider } from "@/components/theme-provider";

const VALID_THEMES = ["light", "dark", "bright", "monochromatic", "earth"];

function ThemeSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    fetch("/api/user/theme")
      .then((res) => {
        if (!res.ok) return;
        return res.json();
      })
      .then((data) => {
        if (data?.theme && VALID_THEMES.includes(data.theme)) {
          setTheme(data.theme);
        }
      })
      .catch(() => {
        // Silently fail — keep default theme
      });
  }, [setTheme]);

  return null;
}

export function AppProviders(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      themes={["light", "dark", "bright", "monochromatic", "earth"]}
    >
      <ThemeSync />
      <Provider store={jotaiStore}>
        <ComposeModalProvider>{props.children}</ComposeModalProvider>
      </Provider>
    </ThemeProvider>
  );
}
