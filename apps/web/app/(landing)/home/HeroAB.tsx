"use client";

import { useEffect, useState } from "react";
import { Hero } from "@/app/(landing)/home/Hero";
import {
  useHeroVariant,
  useHeroVariantEnabled,
  type HeroVariant,
} from "@/hooks/useFeatureFlags";

const copy: {
  [key in HeroVariant]: {
    title: string;
    subtitle: string;
  };
} = {
  control: {
    title: "Your Inbox, Handled.",
    subtitle:
      "Bntly is your personal email assistant that quietly takes care of the busywork — smart replies, a tidy inbox, and fewer distractions so you can focus on what matters.",
  },
  "clean-up-in-minutes": {
    title: "Less Email, More Life.",
    subtitle:
      "Unsubscribe from noise, get smart replies drafted for you, and finally enjoy a calm inbox. Bntly handles the busywork so you don't have to.",
  },
};

// allow this to work for search engines while avoiding flickering text for users
// ssr method relied on cookies in the root layout which broke static page generation of blog posts
export function HeroAB() {
  const [title, setTitle] = useState(copy.control.title);
  const [subtitle, setSubtitle] = useState(copy.control.subtitle);
  const [isHydrated, setIsHydrated] = useState(false);

  const variant = useHeroVariant();
  // to prevent flickering text
  const isFlagEnabled = useHeroVariantEnabled();

  useEffect(() => {
    if (variant && copy[variant]) {
      setTitle(copy[variant].title);
      setSubtitle(copy[variant].subtitle);
    }
    setIsHydrated(true);
  }, [variant]);

  if (isFlagEnabled === false) return <Hero />;

  return (
    <Hero
      title={
        <span
          className={`transition-opacity duration-300 ease-in-out ${
            isHydrated && isFlagEnabled ? "opacity-100" : "opacity-0"
          }`}
        >
          {title}
        </span>
      }
      subtitle={
        <span
          className={`transition-opacity duration-300 ease-in-out ${
            isHydrated && isFlagEnabled ? "opacity-100" : "opacity-0"
          }`}
        >
          {subtitle}
        </span>
      }
    />
  );
}
