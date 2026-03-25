---
name: Design System Overhaul
overview: Install shadcn/ui, rationalize the color palette from ~18 hardcoded grays to 4 semantic text levels + shadcn standard tokens (dual light/dark mode via CSS custom properties), replace all remaining arbitrary hex values, and adopt cn() for conditional classes.
todos:
  - id: phase-1-shadcn
    content: "Phase 1: Install shadcn/ui — run init, get cn(), components.json, dependencies"
    status: completed
  - id: phase-2-tokens
    content: "Phase 2: Rationalize token palette in globals.css — full shadcn set + TruthLens extensions + backward compat aliases"
    status: pending
  - id: phase-3-hex-replace
    content: "Phase 3: Replace all remaining [#...] hex values across ~10 files (~60 locations) using consolidation map"
    status: pending
  - id: phase-4-cn
    content: "Phase 4: Adopt cn() for conditional className logic across component files"
    status: pending
  - id: phase-5-cleanup
    content: "Phase 5: Remove backward compat aliases (surface, bg), final verification"
    status: pending
isProject: false
---

# Design System Overhaul

## Design Reference: Factory.ai

The visual language is modeled after [Factory.ai](https://factory.ai) — a monospace, information-dense interface that achieves hierarchy through typography weight and spacing rather than a gradient of gray shades. Factory's own site is dark-primary, but the structural principles transfer cleanly to both modes.

Reference screenshots saved in `assets/`. Factory uses **light mode for marketing, dark mode for the app** — same structural patterns, inverted canvas:

**Light mode (marketing site — factory.ai):**
- `Screenshot_2026-03-25_at_2.58.15_PM` — homepage: off-white canvas, near-black text, orange dot prefix "● VISION" label, monospace type, bordered buttons ("LOG IN", "CONTACT SALES" — outlined, never filled), code block with light border
- `Screenshot_2026-03-25_at_2.58.51_PM` — product page: white canvas, orange dot "● FACTORY PRODUCT" / "● KEY FEATURES" / "● VALUE PROPOSITIONS" section labels, filled CTA button ("QUICKSTART GUIDE →"), feature grid with icons and monospace descriptions
- `Screenshot_2026-03-25_at_2.59.18_PM` — features/testimonials: MIXED — dark card section at top ("● FEATURES", white text on near-black, 3 feature columns) then light section below ("● TESTIMONIALS", large serif quote, monospace attribution)

**Dark mode (app — app.factory.ai):**
- `Screenshot_2026-03-25_at_2.59.53_PM` — chat UI: near-black canvas, dark sidebar with session list, structured output with bold section headers ("My advice", "Done", "Added", "Verified"), bullet points, monospace throughout, model selector at bottom
- `Screenshot_2026-03-25_at_3.00.20_PM` — billing: uppercase card headers ("USAGE", "BILLING SUMMARY"), orange striped progress bar, bordered action buttons ("ACTIVATE PAID PLAN", "Edit payment method", "VIEW BILLING DETAILS")
- `Screenshot_2026-03-25_at_3.00.14_PM` — settings: uppercase section headers ("YOUR ACCOUNT", "SET UP YOUR CODEBASE", "YOUR APPS", "PREFERENCES", "KEYBOARD SHORTCUTS", "DANGER ZONE" in red), bordered buttons ("MANAGE", "CONNECT", "CANCEL"), toggle switches with orange active state, card sections with border separation

### Key patterns from Factory

These are mode-agnostic structural rules — they apply to both dark and light:

- **Single-hue canvas** with a single orange accent — no other hue besides green for success states
- **Monospace typography** (JetBrains Mono) — hierarchy via size, weight, tracking, not color variety
- **Small uppercase tracking-widest labels** with orange dot prefix for section markers
- **Bordered buttons**, never filled (invert on hover) — the Factory signature
- **3-4 gray levels max** per mode — background, card, border, and foreground. Period.
- **Card-based sections** with subtle border separation, not shade increments
- **Information density via structure** — spacing and borders create hierarchy, not 10 shades of gray

### Dual-mode approach

Factory itself proves both modes work: their marketing site (screenshots 1-3) is light, their app (screenshots 4-6) is dark. The structural patterns are identical — orange dots, bordered buttons, uppercase monospace labels, card-based sections, 3-4 gray levels. Only the canvas polarity changes.

TruthLens follows the same approach:

- **Dark:** near-black canvas → dark-gray card → medium border → light foreground
- **Light:** near-white canvas → white card → light-gray border → dark foreground

Semantic colors (accent orange, green, yellow) stay constant in hue; their lightness adjusts per mode for WCAG contrast on the respective background. The orange accent reads well on both — #ff4400 is high-contrast against both near-black and near-white.

---

## Design Specification (canonical reference)

This section is the source of truth for all visual decisions. When implementing or reviewing, check work against this spec.

### Typography

**Font:** JetBrains Mono (`--font-mono`) is the sole typeface, set on `<body>` via `font-[family-name:var(--font-mono)]`. Geist Sans is loaded as `--font-sans` for shadcn component internals but does not appear in TruthLens UI.

**Scale (all sizes used in the app):**

| Size | Weight | Tracking | Use |
|---|---|---|---|
| `text-sm` (14px) | normal | default | Body text: transcript chunks, analysis TLDR, content paragraphs |
| `text-xs` (12px) | normal | default | Dense body: core points, evidence claims, query answers |
| `text-[11px]` | normal / medium / semibold | default / `tracking-wider` / `tracking-widest` | Primary workhorse: flag labels, disclosure content, fixture labels, buttons |
| `text-[10px]` | semibold | `tracking-widest` / `tracking-wider` | Section labels (`Lbl`), button text, stat counters, loading hints |
| `text-[9px]` | semibold | `tracking-widest` / `tracking-wider` | Micro labels: appeals toggles, segment type tags, gap/assumption badges |
| `text-[8px]` | semibold | `tracking-wider` | Session history kind labels (MIC, TXT, URL) |

**Key rules:**
- All labels and buttons are `uppercase`. Body content is normal case.
- Section headers use `tracking-widest` (0.1em). Button/tag text uses `tracking-wider` (0.05em).
- `tabular-nums` on any numeric display (stats, counters, timestamps).
- `leading-relaxed` for multi-line content. `leading-snug` for compact items.

### Component Patterns

**Section label (the `Lbl` component):**
```
text-[9px] font-semibold uppercase tracking-widest text-text-secondary
```

**Bordered button (Factory signature — never filled, invert on hover):**
```
border border-input px-3 py-1 text-[10px] font-semibold uppercase tracking-widest
text-foreground hover:border-foreground
```
Filled-on-hover variant (Analyze button):
```
hover:bg-foreground hover:text-background
```

**Toggle button (appeals, query types — selected inverts):**
- Selected: `border-foreground bg-foreground text-background`
- Unselected: `border-input text-muted-foreground hover:border-text-secondary`

**Dropdown menu:**
```
absolute z-20 mt-1 min-w-[220px] border border-input bg-card py-1 shadow-lg
```
Menu items: `px-4 py-1.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground`

**Flag badge:**
```
inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider
```
Background and text from semantic color at 15% opacity (e.g. `bg-accent/15 text-accent`).

**Loading hint:**
```
flex items-center gap-2 px-4 py-4
```
Dot: `h-1 w-1 animate-pulse bg-foreground`. Label: `text-[10px] uppercase tracking-widest text-muted-foreground/50`.

**Disclosure tabs (section toggles):**
```
text-[10px] font-semibold uppercase tracking-widest transition-colors
```
Active: `bg-muted text-foreground`. Inactive: `text-text-secondary hover:text-muted-foreground`.

**Border-left indicators (flags, evidence, verdicts):**
`border-l-2` with semantic color from the data type. Content indented with `pl-2`.

**Dot separator:** `·` character in `text-muted-foreground/40`.

**Cards/elevated panels:** `border border-border bg-card`. Optional `shadow-lg` for floating panels. Semantic-tinted cards use `border-{color}/30 bg-{color}/5` (e.g. steelman: `border-green/30 bg-green/5`).

**Empty state (center of right panel when no data):**
```
flex h-full flex-col items-center justify-center gap-3 text-center
```
Primary: `text-sm text-text-secondary`. Secondary: `text-[11px] text-muted-foreground/40`.

### Layout

**Two-panel split:**
- Left sidebar: `w-[320px] xl:w-[400px] shrink-0 border-r border-border bg-background`
- Right main panel: `flex min-w-0 flex-1 flex-col bg-card`
- Full height: `flex h-full flex-col` on the root container

**Header bar:**
```
flex items-center justify-between border-b border-border px-6 py-3
```
Logo: `text-sm font-bold tracking-wider text-foreground`. Status indicators right-aligned.

**Sticky chart area (top of right panel):**
```
sticky top-0 z-10 border-b border-border bg-card
```

**Content area:** `min-h-0 flex-1 overflow-y-auto` for scrollable disclosure content.

**Standard section padding:** `px-4 py-3` for content sections. `space-y-3` between items.

### Responsive

The current layout is desktop-first with a fixed sidebar. Mobile adaptation is out of scope for this overhaul but the token system supports it — all sizing is relative and all colors are semantic.

Breakpoints in use: `xl:` (1280px) for sidebar width expansion.

### Color Mode

Dark mode activates via `.dark` class on `<html>`. The `@custom-variant dark` directive makes Tailwind's `dark:` prefix work with this class-based approach.

Default is light mode (`:root` values). To default to dark, add `class="dark"` to the `<html>` element in `layout.tsx`. A runtime toggle can swap this class.

For the initial overhaul, existing hardcoded hex values (which assumed dark mode) are replaced with semantic tokens that work in both modes. Inline `style=` attributes that use hex for dynamic semantic colors (verdict borders, pattern type indicators, flag type colors) remain as-is — these are data-driven colors tied to domain semantics, not theme tokens.

---

## Technical Implementation Notes (agent rules)

These are the canonical technical references. Agents MUST follow these patterns.

### Tailwind v4 token architecture

Tailwind v4 uses **CSS-first configuration**. There is no `tailwind.config.ts`. All customization happens in CSS via `@theme`.

- `@theme { }` — defines design tokens that generate utility classes. Variables like `--color-accent: #ff4400` create `.text-accent`, `.bg-accent`, etc.
- `@theme inline { }` — same but does NOT generate `:root` CSS variables for the defaults (avoids conflicts when using runtime CSS custom properties).
- The pattern we use: `@theme inline` maps `--color-X: var(--X)` where `--X` is a CSS custom property defined in `:root` and `.dark`. This lets the same utility class (e.g., `bg-card`) resolve to different values per mode.

Reference: https://tailwindcss.com/docs/theme

### shadcn/ui CSS variable conventions

shadcn uses a `background`/`foreground` naming convention. The `background` suffix is omitted:

```css
--primary: oklch(0.205 0 0);         /* ← used as bg-primary */
--primary-foreground: oklch(0.985 0 0); /* ← used as text-primary-foreground */
```

Standard shadcn tokens (all must exist for components to render correctly):
`background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring`.

**Adding custom colors** (TruthLens extensions): define in `:root`/`.dark`, reference in `@theme inline`:

```css
:root { --green: #00994d; }
.dark { --green: #00cc66; }

@theme inline { --color-green: var(--green); }
```

Reference: https://ui.shadcn.com/docs/theming

### Dark mode toggle

Dark mode uses **class-based switching** via `.dark` on `<html>`. The `@custom-variant dark (&:is(.dark *))` directive (already in `globals.css` from Phase 1) makes Tailwind's `dark:` prefix work with this class.

```html
<html class="dark"> <!-- dark mode active -->
<html>              <!-- light mode (default) -->
```

There is no `prefers-color-scheme` media query in use — mode is controlled explicitly via class.

### Next.js integration

**AGENTS.md rule:** Before writing any Next.js code, check `node_modules/next/dist/docs/` for relevant guides. Training data may be outdated.

Key facts for this project:
- Next.js 16.2.0 with App Router
- PostCSS config: `@tailwindcss/postcss` plugin (no separate Tailwind config file)
- Fonts loaded via `next/font/google` — JetBrains Mono (`--font-mono`) and Geist (`--font-sans`)
- `layout.tsx` sets the font CSS variables on `<html>` and applies `font-[family-name:var(--font-mono)]` on `<body>`
- Package manager: **bun** exclusively (never npm/npx/yarn — see AGENTS.md)

### File conventions

Per project rules (`.cursor/rules/code-standards.mdc`):
- All types in `src/lib/types.ts`
- All Zod schemas in `src/lib/schemas.ts`
- All LLM prompts in `src/lib/prompts.ts`
- Max 300 lines per file, max 50 lines per function
- Domain enum string literals use **kebab-case**

---

## Problem

TruthLens started with this Factory-like intent but drifted: no component library, no `cn()` utility, and a fragmented color system — 8 named tokens plus ~10 unnamed grays hardcoded as `[#xxx]` across 60+ locations. The gray soup undermines the clean Factory aesthetic.

## Guiding Principles

- Dieter Rams: "Good design is as little design as possible."
- TruthLens soul.md: "Respect every glance — every element earns its presence or gets cut."
- Factory's lesson: if you need hierarchy, use typography and spacing. If you need separation, use borders and cards. Color is for meaning (accent, success, warning), not for decoration.

## Rationalized Palette

**4 text levels, 3 background levels, 2 border levels, 3 semantic colors — per mode.**

Following the Factory pattern: each mode uses almost no color variety in the grayscale. Hierarchy comes from type size and weight. Separation comes from borders and card elevation. The same token names resolve to mode-appropriate values via CSS custom properties.

### Text Hierarchy (4 levels — down from 10)

| Token | Dark | Light | Role |
|---|---|---|---|
| `foreground` | #e5e5e5 | #171717 | Primary content, anything worth reading |
| `muted-foreground` | #888888 | #737373 | Secondary content, evidence detail, explanations |
| `text-secondary` | #666666 | #a3a3a3 | Structural labels, meta, captions |
| Opacity variants | `muted-foreground/50`, `/40` | same | Placeholders, hints, dot separators |

Dark consolidation: #ccc → `foreground`, #999/#aaa → `muted-foreground`, #555 → `text-secondary`, #444 → `muted-foreground/50`, #333-as-text → `muted-foreground/40`.

### Backgrounds (3 levels — Factory pattern)

| Token | Dark | Light | Role |
|---|---|---|---|
| `background` | #0a0a0a | #fafafa | Base canvas |
| `card` | #141414 | #ffffff | Elevated panels, sidebar, dropdowns. Replaces old `surface`. |
| `muted` | #1a1a1a | #f5f5f5 | Hover states, active tab fills, subtle emphasis |

### Borders (2 levels — Factory pattern)

| Token | Dark | Light | Role |
|---|---|---|---|
| `border` | #222222 | #e5e5e5 | Standard structural dividers between sections |
| `input` | #333333 | #d4d4d4 | Interactive/form borders, stronger emphasis |

### Semantic Colors (meaning, not decoration)

| Token | Dark | Light | Role |
|---|---|---|---|
| `accent` | #ff4400 | #ff4400 | Attention, flags, active states, the orange dot |
| `accent-foreground` | #ffffff | #ffffff | Text on accent backgrounds |
| `accent-muted` | #ffb199 | #e63900 | Softer accent text (lighter on dark, darker on light) |
| `green` | #00cc66 | #00994d | Verified/success (darkened for light-bg contrast) |
| `yellow` | #ffaa00 | #b37700 | Warning/caution (darkened for light-bg contrast) |
| `destructive` | #ff4400 | #ff4400 | Error state (aliases accent) |
| `ring` | #ff440066 | #ff440066 | Focus ring (40% alpha orange) |

### Consolidation Map (class-name replacements — mode-agnostic)

These replacements use semantic token names that resolve correctly in both modes:

- #ccc → `foreground` (+10% brighter in dark — Factory principle: if it's content, make it readable)
- #888 → `muted-foreground` (no change in dark)
- #999, #aaa → `muted-foreground` (slightly darker in dark)
- #666 → `text-secondary` (no change in dark)
- #555 → `text-secondary` (+7% brighter in dark)
- #444 → `text-muted-foreground/50` (slight shift, same intent)
- #333 text → `text-muted-foreground/40` (slight shift, same intent)
- #333 border → `border-input` (no change in dark)
- #1a1a1a → `bg-muted` (no change in dark)
- #111, #0f0f0f → `bg-card` (slight shift in dark)
- #ffb199 → `text-accent-muted` (no change in dark)

---

## Phase 1 — Install shadcn/ui

**Audit confirmed:** no conflicts. No existing `components.json`, `src/lib/utils.ts`, or `src/components/ui/`. Path alias `@/*` -> `./src/*` is correct. Tailwind v4 + PostCSS are compatible.

Run `bunx shadcn@latest init` to scaffold:

- `components.json` — config pointing to `src/components/ui/`, `@/lib/utils`, Tailwind v4 CSS-first
- `src/lib/utils.ts` — exports `cn()` (clsx + tailwind-merge)
- Installs `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`, `lucide-react`

**Risk:** The init may overwrite or append to `globals.css`. Merge carefully — Phase 2 defines the definitive theme. Keep `@import "tailwindcss"` and body/scrollbar/selection rules; let shadcn add `@import "tw-animate-css"` and any `@layer base` it needs.

Also drop the old `--color-text` token from `@theme` (it was never used as `text-text` — only `text-foreground` and `text-text-secondary` are in the codebase).

Verify: `bunx tsc --noEmit` and `bun run lint` pass.

## Phase 2 — Rationalize the Token Palette

Replace the `@theme inline`, `:root`, and `.dark` blocks in [src/app/globals.css](src/app/globals.css) with the full TruthLens-flavored token set. Uses CSS custom property indirection (the pattern shadcn established in Phase 1) so Tailwind utility classes like `bg-card` and `text-muted-foreground` resolve to the correct value per mode.

**Architecture:** `@theme inline` maps Tailwind color-* tokens to `var()` references. `:root` provides light values, `.dark` provides dark values. The `@custom-variant dark` directive (already present from Phase 1) makes `dark:` prefixed utilities work.

**Exact target CSS:**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-green: var(--green);
  --color-yellow: var(--yellow);
  --color-accent-muted: var(--accent-muted);
  --color-text-secondary: var(--text-secondary);

  --color-surface: var(--card);
  --color-bg: var(--background);

  --font-heading: var(--font-sans);
  --font-sans: var(--font-sans);

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: #fafafa;
  --foreground: #171717;
  --card: #ffffff;
  --card-foreground: #171717;
  --popover: #ffffff;
  --popover-foreground: #171717;
  --primary: #171717;
  --primary-foreground: #fafafa;
  --secondary: #f5f5f5;
  --secondary-foreground: #171717;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --accent: #ff4400;
  --accent-foreground: #ffffff;
  --destructive: #ff4400;
  --border: #e5e5e5;
  --input: #d4d4d4;
  --ring: #ff440066;

  --green: #00994d;
  --yellow: #b37700;
  --accent-muted: #e63900;
  --text-secondary: #a3a3a3;
  --radius: 0.625rem;
}

.dark {
  --background: #0a0a0a;
  --foreground: #e5e5e5;
  --card: #141414;
  --card-foreground: #e5e5e5;
  --popover: #141414;
  --popover-foreground: #e5e5e5;
  --primary: #e5e5e5;
  --primary-foreground: #0a0a0a;
  --secondary: #1a1a1a;
  --secondary-foreground: #e5e5e5;
  --muted: #1a1a1a;
  --muted-foreground: #888888;
  --accent: #ff4400;
  --accent-foreground: #ffffff;
  --destructive: #ff4400;
  --border: #222222;
  --input: #333333;
  --ring: #ff440066;

  --green: #00cc66;
  --yellow: #ffaa00;
  --accent-muted: #ffb199;
  --text-secondary: #666666;
}
```

Last two `@theme inline` entries (`surface`, `bg`) are backward-compat aliases removed in Phase 5.

**body/scrollbar/selection** use `var()`:

```css
body {
  background: var(--color-background);
  color: var(--color-foreground);
  overflow-wrap: break-word;
  word-break: break-word;
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

::selection {
  background: var(--color-ring);
  color: var(--color-foreground);
}
```

**`@layer base`** (from shadcn, kept as-is):

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

**Note:** `::selection` changes from `#ff440033` (20% alpha) to `#ff440066` (40% alpha via ring). Slightly more visible selection highlight — acceptable.

**Only file touched in Phase 2:** `globals.css`. No component files need changes yet — the backward-compat aliases ensure existing `bg-bg`, `bg-surface`, `border-border`, etc. all keep working. Token class names are mode-agnostic: `text-foreground` resolves to #e5e5e5 in dark, #171717 in light.

## Phase 3 — Replace All Remaining Hex Values

**Audit confirmed 73 discrete substitutions across 8 files.** Full manifest:

### [src/app/components/TruthPanelSections.tsx](src/app/components/TruthPanelSections.tsx) — 13 replacements

- L27: `border-[#333]` -> `border-input`, `text-[#888]` -> `text-muted-foreground`
- L105: `border-[#333]` -> `border-input`
- L128: `border-[#333]` -> `border-input`
- L151: `text-[#444]` -> `text-muted-foreground/50`
- L158: `text-[#ffb199]` -> `text-accent-muted`
- L164: `text-[#444]` -> `text-muted-foreground/50`
- L173: `text-[#333]` -> `text-muted-foreground/40`
- L175: `text-[#333]` -> `text-muted-foreground/40`
- L187: `border-[#333]` -> `border-input`
- L188: `text-[#888]` -> `text-muted-foreground`
- L228: `text-[#ccc]` -> `text-foreground`
- L232: `text-[#444]` -> `text-muted-foreground/50`

### [src/app/components/TruthPanelExtras.tsx](src/app/components/TruthPanelExtras.tsx) — 13 replacements

- L28: `text-[#444]` -> `text-muted-foreground/50`
- L35: `text-[#444]` -> `text-muted-foreground/50`
- L37: `border-[#333]` -> `border-input`
- L53: `text-[#444]` -> `text-muted-foreground/50`
- L59: `text-[#555]` -> `text-text-secondary`
- L85: `border-[#333]` -> `border-input`
- L86: `text-[#888]` -> `text-muted-foreground`
- L87: `text-[#ccc]` -> `text-foreground`
- L118: `border-[#333]` -> `border-input`, `text-[#888]` -> `text-muted-foreground`
- L126: `border-[#333]` -> `border-input`, `placeholder:text-[#444]` -> `placeholder:text-muted-foreground/50`
- L128: `border-[#333]` -> `border-input`

### [src/app/components/TruthPanel.tsx](src/app/components/TruthPanel.tsx) — 13 replacements

- L77: `border-[#1a1a1a]` -> `border-muted`
- L79: `text-[#333]` -> `text-muted-foreground/40`
- L81: `text-[#333]` -> `text-muted-foreground/40`
- L98: `border-[#1a1a1a]` -> `border-muted`, `hover:bg-[#1a1a1a]` -> `hover:bg-muted`
- L107: `text-[#ccc]` -> `text-foreground`
- L118: `text-[#444]` -> `text-muted-foreground/50`
- L136: `bg-[#1a1a1a]` -> `bg-muted`, `text-[#555]` -> `text-text-secondary`, `hover:text-[#888]` -> `hover:text-muted-foreground`
- L163: `text-[#444]` -> `text-muted-foreground/50`
- L213: `text-[#555]` -> `text-text-secondary`
- L214: `text-[#333]` -> `text-muted-foreground/40`

### [src/app/components/TranscriptInputFixtures.tsx](src/app/components/TranscriptInputFixtures.tsx) — 12 replacements

- L18: `border-[#333]` -> `border-input`
- L24: `text-[#555]` -> `text-text-secondary`
- L33: `text-[#888]` -> `text-muted-foreground`, `hover:bg-[#1a1a1a]` -> `hover:bg-muted`
- L53: `bg-[#111]` -> `bg-card`
- L68: `text-[#555]` -> `text-text-secondary`, `hover:text-[#aaa]` -> `hover:text-muted-foreground`
- L73: `text-[#999]` -> `text-muted-foreground`
- L74: `text-[#555]` -> `text-text-secondary`
- L78: `border-[#1a1a1a]` -> `border-muted`
- L79: `text-[#ccc]` -> `text-foreground`
- L87: `text-[#999]` -> `text-muted-foreground`

### [src/app/components/SessionHistory.tsx](src/app/components/SessionHistory.tsx) — 10 replacements

- L41: `text-[#555]` -> `text-text-secondary`
- L53: `border-[#333]` -> `border-input`
- L55: `text-[#444]` -> `text-muted-foreground/50`
- L59: `border-[#1a1a1a]` -> `border-muted`, `hover:bg-[#1a1a1a]` -> `hover:bg-muted`
- L60: `text-[#555]` -> `text-text-secondary`
- L63: `text-[#ccc]` -> `text-foreground`
- L64: `text-[#444]` -> `text-muted-foreground/50`
- L66: `text-[#333]` -> `text-muted-foreground/40`, `group-hover:text-[#555]` -> `group-hover:text-text-secondary`

### [src/app/components/TrustChart.tsx](src/app/components/TrustChart.tsx) — 2 replacements

- L63: `bg-[#0f0f0f]` -> `bg-background`
- L65: `text-[#555]` -> `text-text-secondary`

### [src/app/components/ShareCapture.tsx](src/app/components/ShareCapture.tsx) — 1 replacement

- L161: `text-[#555]` -> `text-text-secondary`

### [src/app/components/Flag.tsx](src/app/components/Flag.tsx) — 1 replacement (JS object -> className)

- L14: `bg-[#444]/15` -> `bg-muted-foreground/15`

**DO NOT TOUCH** (inline styles / canvas — confirmed exclusions):

- `ShareCapture.tsx` lines 18-129 — canvas `fillStyle`/`strokeStyle` hex values
- `TruthPanel.tsx` lines 31-36 (FC object), 80-84 (`style={{ color: ... }}`)
- `TruthPanelExtras.tsx` lines 14-18 (SCOL), 46-50 (`style={{ borderColor }}`)
- `TruthPanelSections.tsx` lines 135-138 (VCOL), 179-181, 195-198 (PCOL), 217-226 (`style=`)
- `TrustChart.tsx` lines 7-10 (trustColor), 38-45 (SVG stroke/fill)

**Files already clean (zero [#...] in className):** `page.tsx`, `layout.tsx`, `TranscriptInput.tsx`, `TranscriptInputParts.tsx`.

## Phase 4 — Adopt cn() for Conditional Classes

**Audit confirmed 8 migration sites across 5 files.** Add `import { cn } from "@/lib/utils"` to each.

### [src/app/components/TranscriptInputParts.tsx](src/app/components/TranscriptInputParts.tsx) — 4 sites

- L43-45: mic button ternary (recording vs idle)
- L47: recording indicator dot ternary
- L85-89: severity border class composition (multi-condition)
- L132: progress bar inner class composition

### [src/app/components/TruthPanel.tsx](src/app/components/TruthPanel.tsx) — 1 site

- L135-137: disclosure tab active/inactive ternary

### [src/app/components/TruthPanelSections.tsx](src/app/components/TruthPanelSections.tsx) — 1 site

- L24-28: appeals toggle selected/unselected ternary

### [src/app/components/TruthPanelExtras.tsx](src/app/components/TruthPanelExtras.tsx) — 1 site

- L115-119: query type tab selected/unselected ternary

### [src/app/components/Flag.tsx](src/app/components/Flag.tsx) — 1 site

- L34: flag badge style composition from record lookup

**Files with zero template-literal classNames (no cn() needed):** `TranscriptInput.tsx`, `TranscriptInputFixtures.tsx`, `SessionHistory.tsx`, `TrustChart.tsx`, `ShareCapture.tsx`, `page.tsx`.

## Phase 5 — Remove Backward Compat Aliases and Final Polish

**Audit confirmed 13 usages of old aliases across 7 files.**

### Remove `bg-surface` (4 usages -> `bg-card`)

- `TranscriptInputFixtures.tsx` L18
- `TruthPanel.tsx` L219
- `page.tsx` L62
- `SessionHistory.tsx` L53

### Remove `bg-bg` (7 usages -> `bg-background`)

- `page.tsx` L37, L41
- `TranscriptInputFixtures.tsx` L78
- `TranscriptInputParts.tsx` L75
- `TruthPanel.tsx` L131
- `TruthPanelSections.tsx` L208

### Remove `text-bg` / `hover:text-bg` (3 usages -> `text-background` / `hover:text-background`)

- `TranscriptInputParts.tsx` L160: `hover:text-bg` -> `hover:text-background`
- `TruthPanelSections.tsx` L26: `text-bg` -> `text-background`
- `TruthPanelExtras.tsx` L117: `text-bg` -> `text-background`

### Then remove from globals.css

Delete `--color-surface` and `--color-bg` from the `@theme inline` block. (`--color-text` was already removed in Phase 1.)

### Final sweep

Grep for any `[#` remaining in `.tsx` className strings — should be zero.

## Verification Workflow

### Automated checks (run after every phase)

```bash
bunx tsc --noEmit        # zero type errors
bun run lint             # zero warnings
bun run test:smoke       # 2/2 pass
```

### Browser verification (run after Phases 2, 3, and 5)

These phases change visual output. Use the browser MCP tools to verify.

**Setup:**
1. Start the dev server: `bun run dev` (if not already running)
2. Navigate to `http://localhost:3000` using `browser_navigate`
3. Load a demo fixture (click "Demo" → select a text fixture → click "Analyze") so the full UI is populated: header, sidebar with input, right panel with chart, flags, disclosure sections

**Desktop verification (1440×900 viewport):**
1. Take a `browser_take_screenshot` of the full page
2. Check against the Design Specification:
   - **Header:** logo left-aligned, status indicators right-aligned, single border-bottom
   - **Sidebar:** correct background token (should be `background` color), bordered section labels, bordered buttons
   - **Right panel:** chart area with sticky header, flag feed with colored left-border indicators, disclosure tabs with correct active/inactive states
   - **Colors:** no hex values bleeding through — all semantic tokens should resolve. In dark mode: near-black canvas, light foreground. In light mode: near-white canvas, dark foreground. Orange accent visible in both.
   - **Typography:** monospace throughout, uppercase labels, correct size hierarchy (small labels < body text)

**Mobile verification (375×812 viewport):**
1. Resize viewport and take a screenshot
2. The sidebar will overflow off-screen at 320px fixed width — this is a known limitation (see "Responsive" in the Design Specification). Verify nothing is broken or clipped in a way that blocks usage.

**Mode toggle verification:**
1. Use `browser_snapshot` to find the `<html>` element
2. Run JavaScript in console to toggle: `document.documentElement.classList.toggle('dark')`
3. Take screenshots in both modes
4. Verify that:
   - Background inverts (near-black ↔ near-white)
   - Text inverts (light ↔ dark foreground)
   - Borders adjust (dark subtle ↔ light subtle)
   - Orange accent is visible and high-contrast in both modes
   - Cards (dropdowns, fixture card, disclosure content) show clear elevation from background
   - No "ghost" hex colors that look wrong in the other mode

### Design iteration process

If the browser verification reveals issues:

1. **Identify the gap:** screenshot shows a color that doesn't match the spec. Is it a missed hex replacement? A token resolving to the wrong value? A `style=` attribute that needs a mode-aware approach?
2. **Check the spec first:** consult the Rationalized Palette tables and Component Patterns in this document. The plan is canon — if the rendered output doesn't match, the code is wrong, not the plan (unless the plan has a genuine error, in which case update the plan AND the code).
3. **Fix and re-verify:** make the code change, then re-take the browser screenshot to confirm. Don't batch visual fixes blindly — verify each one.
4. **Inline styles are exempt:** `style={{ color: FC[flag.type] }}` and similar data-driven colors remain as hex. These are keyed to domain data (verdict status, pattern type, flag severity) and don't theme-switch. If light mode makes them unreadable, that's a separate future task — flag it but don't block the phase.

### Per-phase verification checklist

| Phase | Automated | Browser | What to check visually |
|---|---|---|---|
| 1 | tsc + lint | — | Nothing visual changes — just infrastructure |
| 2 | tsc + lint | Desktop + mobile, both modes | Tokens resolve correctly, body/scrollbar/selection use var(), no regressions |
| 3 | tsc + lint + smoke | Desktop both modes | All `[#...]` className replacements render correctly, no missing borders/text |
| 4 | tsc + lint | — | cn() is a refactor, no visual change |
| 5 | tsc + lint + smoke | Desktop + mobile, both modes | Final visual: no bg-surface/bg-bg remnants, grep confirms zero `[#` in classNames |
