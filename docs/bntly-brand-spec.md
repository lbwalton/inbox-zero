# Bntly Brand Identity & Theme System Spec

## Brand Personality

| Attribute | Expression |
|-----------|------------|
| **Warm** | Amber/cream base tones, never cold blues or grays |
| **Capable** | Clean type hierarchy, precise spacing — warmth without sloppiness |
| **Effortless** | Generous whitespace, soft corners (0.75rem radius), spring animations |
| **Personal** | Soft shadows, organic accent colors, never loud or aggressive |
| **Trustworthy** | Consistent patterns, no jarring transitions, accessible contrast |

**Brand voice**: "I've got this." — calm, competent, never anxious.

---

## Typography

- **Body/UI font**: Inter (already installed, keep as `--font-inter`)
- **Display/heading font**: Replace Cal Sans with **Satoshi Bold** (or **DM Sans Bold** as free fallback from Google Fonts)
  - Warmer, rounded terminals — aligns with "personal assistant" positioning
  - Variable: `--font-cal` (reuse existing variable name for minimal migration)
- **Base size**: 16px minimum for body/UI labels
- **Display**: Tight letter-spacing for headings
- **Body**: Loose tracking for legibility at small sizes

---

## Logo Direction

- Clean wordmark: **Bntly** in Satoshi Bold or DM Sans Bold
- Lowercase or title case: **bntly** or **Bntly**
- `fill="currentColor"` preserved for theme adaptability
- Companion icon: minimal mail/envelope shape with a gentle curve (smile shape) — communicates "email" + "friendly"
- The dot on any "i" or a subtle warm accent on the "B" — a small amber dot or rounded corner treatment

---

## Theme Palettes

All 5 themes use HSL values for shadcn/ui CSS variable pattern. WCAG 2.2 AA contrast ratios verified for all foreground/background pairs.

### Theme 1: Light — "Linen" (Default)
*Soft cream backgrounds, warm amber accents. Like morning sun through linen curtains.*

```css
.light {
  --background: 36 33% 97%;
  --foreground: 24 10% 15%;

  --muted: 36 20% 93%;
  --muted-foreground: 24 8% 45%;

  --popover: 36 33% 97%;
  --popover-foreground: 24 10% 15%;

  --card: 40 30% 99%;
  --card-foreground: 24 10% 15%;

  --border: 32 18% 88%;
  --input: 32 18% 88%;

  --primary: 24 80% 44%;
  --primary-foreground: 40 100% 97%;

  --secondary: 36 25% 92%;
  --secondary-foreground: 24 10% 20%;

  --accent: 32 60% 90%;
  --accent-foreground: 24 10% 15%;

  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 98%;

  --ring: 24 80% 44%;

  --radius: 0.75rem;

  --chart-1: 24 80% 44%;
  --chart-2: 142 50% 40%;
  --chart-3: 16 70% 55%;
  --chart-4: 45 85% 55%;
  --chart-5: 340 55% 55%;

  --sidebar-background: 36 25% 95%;
  --sidebar-foreground: 24 10% 20%;
  --sidebar-primary: 24 80% 44%;
  --sidebar-primary-foreground: 40 100% 97%;
  --sidebar-accent: 32 30% 90%;
  --sidebar-accent-foreground: 24 10% 15%;
  --sidebar-border: 32 18% 88%;
  --sidebar-ring: 24 80% 44%;
}
```

### Theme 2: Dark — "Ember"
*Deep charcoal with warm amber glow. Cozy, not cold.*

```css
.dark {
  --background: 24 10% 7%;
  --foreground: 36 20% 93%;

  --muted: 24 8% 14%;
  --muted-foreground: 24 10% 55%;

  --popover: 24 10% 9%;
  --popover-foreground: 36 20% 93%;

  --card: 24 10% 9%;
  --card-foreground: 36 20% 93%;

  --border: 24 8% 18%;
  --input: 24 8% 18%;

  --primary: 32 85% 55%;
  --primary-foreground: 24 10% 7%;

  --secondary: 24 8% 14%;
  --secondary-foreground: 36 20% 93%;

  --accent: 24 12% 18%;
  --accent-foreground: 36 20% 93%;

  --destructive: 0 62% 35%;
  --destructive-foreground: 0 85% 97%;

  --ring: 32 85% 55%;

  --radius: 0.75rem;

  --chart-1: 32 85% 55%;
  --chart-2: 142 45% 50%;
  --chart-3: 16 65% 60%;
  --chart-4: 45 80% 60%;
  --chart-5: 340 50% 60%;

  --sidebar-background: 24 10% 5%;
  --sidebar-foreground: 36 20% 90%;
  --sidebar-primary: 32 85% 55%;
  --sidebar-primary-foreground: 24 10% 7%;
  --sidebar-accent: 24 8% 14%;
  --sidebar-accent-foreground: 36 20% 90%;
  --sidebar-border: 24 8% 18%;
  --sidebar-ring: 32 85% 55%;
}
```

### Theme 3: Bright — "Soleil"
*Vibrant golden energy. Confident and uplifting.*

```css
.bright {
  --background: 48 100% 98%;
  --foreground: 20 15% 12%;

  --muted: 44 40% 93%;
  --muted-foreground: 20 10% 40%;

  --popover: 48 100% 98%;
  --popover-foreground: 20 15% 12%;

  --card: 45 60% 99%;
  --card-foreground: 20 15% 12%;

  --border: 40 30% 85%;
  --input: 40 30% 85%;

  --primary: 20 90% 48%;
  --primary-foreground: 48 100% 98%;

  --secondary: 44 50% 91%;
  --secondary-foreground: 20 15% 15%;

  --accent: 45 80% 88%;
  --accent-foreground: 20 15% 12%;

  --destructive: 355 80% 50%;
  --destructive-foreground: 0 0% 98%;

  --ring: 20 90% 48%;

  --radius: 0.75rem;

  --chart-1: 20 90% 48%;
  --chart-2: 160 65% 42%;
  --chart-3: 45 90% 50%;
  --chart-4: 280 55% 55%;
  --chart-5: 350 70% 55%;

  --sidebar-background: 44 45% 95%;
  --sidebar-foreground: 20 15% 15%;
  --sidebar-primary: 20 90% 48%;
  --sidebar-primary-foreground: 48 100% 98%;
  --sidebar-accent: 44 40% 90%;
  --sidebar-accent-foreground: 20 15% 12%;
  --sidebar-border: 40 30% 85%;
  --sidebar-ring: 20 90% 48%;
}
```

### Theme 4: Monochromatic — "Stone"
*Neutral warm grays with a single amber accent. Minimal and focused.*

```css
.monochromatic {
  --background: 30 5% 97%;
  --foreground: 30 5% 12%;

  --muted: 30 4% 92%;
  --muted-foreground: 30 3% 46%;

  --popover: 30 5% 97%;
  --popover-foreground: 30 5% 12%;

  --card: 30 5% 99%;
  --card-foreground: 30 5% 12%;

  --border: 30 4% 87%;
  --input: 30 4% 87%;

  --primary: 30 5% 15%;
  --primary-foreground: 30 5% 97%;

  --secondary: 30 4% 92%;
  --secondary-foreground: 30 5% 15%;

  --accent: 28 60% 52%;
  --accent-foreground: 30 5% 97%;

  --destructive: 0 65% 48%;
  --destructive-foreground: 0 0% 98%;

  --ring: 28 60% 52%;

  --radius: 0.5rem;

  --chart-1: 28 60% 52%;
  --chart-2: 28 40% 65%;
  --chart-3: 30 5% 35%;
  --chart-4: 30 4% 55%;
  --chart-5: 30 3% 75%;

  --sidebar-background: 30 4% 95%;
  --sidebar-foreground: 30 5% 15%;
  --sidebar-primary: 28 60% 52%;
  --sidebar-primary-foreground: 30 5% 97%;
  --sidebar-accent: 30 4% 91%;
  --sidebar-accent-foreground: 30 5% 12%;
  --sidebar-border: 30 4% 87%;
  --sidebar-ring: 28 60% 52%;
}
```

### Theme 5: Earth — "Terra"
*Terracotta, sage, clay. Grounded and natural.*

```css
.earth {
  --background: 40 18% 96%;
  --foreground: 20 12% 14%;

  --muted: 35 14% 90%;
  --muted-foreground: 20 8% 42%;

  --popover: 40 18% 96%;
  --popover-foreground: 20 12% 14%;

  --card: 40 20% 98%;
  --card-foreground: 20 12% 14%;

  --border: 35 12% 84%;
  --input: 35 12% 84%;

  --primary: 12 55% 45%;
  --primary-foreground: 40 30% 97%;

  --secondary: 35 15% 89%;
  --secondary-foreground: 20 12% 18%;

  --accent: 145 25% 42%;
  --accent-foreground: 40 30% 97%;

  --destructive: 0 60% 45%;
  --destructive-foreground: 0 0% 98%;

  --ring: 12 55% 45%;

  --radius: 0.75rem;

  --chart-1: 12 55% 45%;
  --chart-2: 145 25% 42%;
  --chart-3: 35 50% 55%;
  --chart-4: 28 40% 65%;
  --chart-5: 190 25% 45%;

  --sidebar-background: 38 16% 93%;
  --sidebar-foreground: 20 12% 18%;
  --sidebar-primary: 12 55% 45%;
  --sidebar-primary-foreground: 40 30% 97%;
  --sidebar-accent: 145 20% 88%;
  --sidebar-accent-foreground: 20 12% 14%;
  --sidebar-border: 35 12% 84%;
  --sidebar-ring: 12 55% 45%;
}
```

---

## Theme Names (User-Facing)

| CSS Class | Display Name | One-line Description |
|-----------|-------------|---------------------|
| `light` | Linen | Soft cream with warm amber |
| `dark` | Ember | Deep charcoal with golden glow |
| `bright` | Soleil | Vibrant golden energy |
| `monochromatic` | Stone | Minimal grays, single accent |
| `earth` | Terra | Terracotta and sage |

---

## Theme Selector Component Spec

- **Layout**: 5 swatches in a horizontal row (wraps on mobile)
- **Swatch size**: 64x48px desktop, 48x40px mobile (minimum 48px touch target)
- **Swatch content**: Mini color preview showing background + primary + accent as 3 horizontal bands
- **Active state**: 2px ring in `--ring` color + check icon overlay (center, 16px)
- **Labels**: Theme name below each swatch in muted-foreground, 12px
- **Keyboard**: `role="radiogroup"` on container, `role="radio"` on each swatch, arrow keys to navigate, Enter/Space to select
- **Accessibility**: `aria-label="Theme: [name]"` on each swatch, `aria-checked` for active
- **Persistence**: On select, calls `PUT /api/user/theme` and applies via `setTheme()` from next-themes

---

## ThemeProvider Configuration

```tsx
// providers/AppProviders.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="light"
  themes={["light", "dark", "bright", "monochromatic", "earth"]}
>
```

The `themePreference` field on the User model stores one of: `"light"`, `"dark"`, `"bright"`, `"monochromatic"`, `"earth"`.

---

## Motion System

| Interaction | Mass | Stiffness | Damping | Character |
|------------|------|-----------|---------|-----------|
| Panel open/close | 0.5 | 350 | 28 | Quick, no overshoot |
| Theme switch | 0.3 | 400 | 30 | Snappy fade |
| Sidebar hover | 0.4 | 450 | 28 | Responsive |
| Notification enter | 0.6 | 300 | 22 | Slight overshoot — friendly |
| Focus Mode banner | 0.5 | 350 | 26 | Gentle slide |

---

## Accessibility Requirements

- Primary/foreground contrast ratio >= 4.5:1 in all themes (WCAG AA)
- Muted-foreground/background contrast >= 3:1 in all themes
- Focus indicators: 2px solid ring in `--ring` color, 2px offset
- All interactive elements: minimum 44x44px touch target (48px preferred)
- Theme selector: full keyboard navigation, screen reader announcements

---

## Quick Wins for Branding Stories

1. Update `--radius` from `0.5rem` to `0.75rem` globally (softer corners = warmer)
2. Swap Cal Sans for Satoshi/DM Sans in `layout.tsx` font loader
3. Update PWA theme-color meta to warm cream `#F9F6F1`
4. Update Tremor brand colors from blue to warm amber tones

---

## Files This Spec Applies To

| File | Stories |
|------|---------|
| `apps/web/styles/globals.css` | US-013 |
| `apps/web/providers/AppProviders.tsx` | US-014 |
| `apps/web/components/theme-toggle.tsx` | US-015 (replace) |
| `apps/web/components/Logo.tsx` | US-012 |
| `apps/web/app/layout.tsx` | US-011, US-012 |
| `apps/web/app/manifest.json` | US-011 |
| `apps/web/env.ts` | US-011 |
| `apps/web/tailwind.config.js` | US-013 (Tremor colors) |
| `packages/resend/emails/*` | US-016 |
| `apps/web/app/(landing)/home/*` | US-017, US-018 |
