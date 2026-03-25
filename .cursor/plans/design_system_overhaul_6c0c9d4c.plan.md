---
name: Design System Overhaul
overview: Install shadcn/ui, rationalize the color palette from ~18 hardcoded grays to 4 semantic text levels + shadcn standard tokens, replace all remaining arbitrary hex values, and adopt cn() for conditional classes.
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

The visual language is modeled after [Factory.ai](https://factory.ai) — a dark, monospace, information-dense interface that achieves hierarchy through typography weight and spacing rather than a gradient of gray shades.

Reference screenshots saved in `assets/`:

- `Screenshot_2026-03-25_at_2.58.15_PM` — homepage: near-black canvas, orange accent dots, monospace type, minimal palette
- `Screenshot_2026-03-25_at_2.58.51_PM` — product page: bordered buttons, small uppercase tracking-widest labels with orange dot prefix, clean card sections
- `Screenshot_2026-03-25_at_2.59.18_PM` — features: dark section with 3-4 gray levels max, testimonial section, clear separation via borders not shade gradients
- `Screenshot_2026-03-25_at_2.59.53_PM` — app UI: dark mode dashboard, structured output with section headers, monospace throughout
- `Screenshot_2026-03-25_at_3.00.20_PM` — billing: orange progress bars, bordered action buttons, card-based layout
- `Screenshot_2026-03-25_at_3.00.14_PM` — settings: card sections with border separation, toggle switches with orange active state, uppercase section labels

### Key patterns from Factory

- **Near-black canvas** with a single orange accent — no other hue besides green for success states
- **Monospace typography** (JetBrains Mono) — hierarchy via size, weight, tracking, not color variety
- **Small uppercase tracking-widest labels** with orange dot prefix for section markers
- **Bordered buttons**, never filled (invert on hover) — the Factory signature
- **3-4 gray levels max** in the dark UI — background, card, border, and foreground. Period.
- **Card-based sections** with subtle border separation, not shade increments
- **Information density via structure** — spacing and borders create hierarchy, not 10 shades of gray

## Problem

TruthLens started with this Factory-like intent but drifted: no component library, no `cn()` utility, and a fragmented color system — 8 named tokens plus ~10 unnamed grays hardcoded as `[#xxx]` across 60+ locations. The gray soup undermines the clean Factory aesthetic.

## Guiding Principles

- Dieter Rams: "Good design is as little design as possible."
- TruthLens soul.md: "Respect every glance — every element earns its presence or gets cut."
- Factory's lesson: if you need hierarchy, use typography and spacing. If you need separation, use borders and cards. Color is for meaning (accent, success, warning), not for decoration.

## Rationalized Palette

**4 text levels, 3 background levels, 2 border levels, 3 semantic colors.**

Following the Factory pattern: the dark UI uses almost no color variety in the grayscale. Hierarchy comes from type size and weight. Separation comes from borders and card elevation.

### Text Hierarchy (4 levels — down from 10)

- `foreground` (#e5e5e5) — primary content, anything worth reading. Absorbs #ccc.
- `muted-foreground` (#888) — secondary content, evidence detail, explanations. Absorbs #999, #aaa.
- `text-secondary` (#666) — structural labels, meta, captions. Absorbs #555.
- Opacity variants (`muted-foreground/50`, `muted-foreground/40`) — placeholders, hints, dot separators. Absorbs #444, #333-as-text.

### Backgrounds (3 levels — Factory pattern)

- `background` (#0a0a0a) — base canvas. Absorbs #0f0f0f.
- `card` (#141414) — elevated panels, sidebar, dropdowns. Absorbs #111. Replaces old `surface`.
- `muted` (#1a1a1a) — hover states, active tab fills, subtle emphasis.

### Borders (2 levels — Factory pattern)

- `border` (#222) — standard structural dividers between sections.
- `input` (#333) — interactive/form borders, stronger emphasis borders (Factory uses this for cards and form fields).

### Semantic Colors (meaning, not decoration)

- `accent` (#ff4400) + `accent-foreground` (#fff) + `accent-muted` (#ffb199) — attention, flags, active states, the orange dot
- `green` (#00cc66) — verified/success
- `yellow` (#ffaa00) — warning/caution
- `destructive` (#ff4400) — error state (aliases accent)

### Consolidation Map

- #ccc -> `foreground` (+10% brighter — Factory principle: if it's content, make it readable)
- #888 -> `muted-foreground` (no change)
- #999, #aaa -> `muted-foreground` (slightly darker)
- #666 -> `text-secondary` (no change)
- #555 -> `text-secondary` (+7% brighter)
- #444 -> `text-muted-foreground/50` (slight shift, same intent)
- #333 text -> `text-muted-foreground/40` (slight shift, same intent)
- #333 border -> `border-input` (no change)
- #1a1a1a -> `bg-muted` (no change)
- #111, #0f0f0f -> `bg-card` (slight shift)
- #ffb199 -> `text-accent-muted` (no change)

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

Replace `@theme inline` in [src/app/globals.css](src/app/globals.css) with the full shadcn-compatible token set. Dark-only (Factory is dark-only in-app).

**Exact target CSS:**

```css
@import "tailwindcss";

@theme inline {
  --color-background: #0a0a0a;
  --color-foreground: #e5e5e5;
  --color-card: #141414;
  --color-card-foreground: #e5e5e5;
  --color-popover: #141414;
  --color-popover-foreground: #e5e5e5;
  --color-primary: #e5e5e5;
  --color-primary-foreground: #0a0a0a;
  --color-secondary: #1a1a1a;
  --color-secondary-foreground: #e5e5e5;
  --color-muted: #1a1a1a;
  --color-muted-foreground: #888888;
  --color-accent: #ff4400;
  --color-accent-foreground: #ffffff;
  --color-destructive: #ff4400;
  --color-border: #222222;
  --color-input: #333333;
  --color-ring: #ff440066;
  --color-green: #00cc66;
  --color-yellow: #ffaa00;
  --color-accent-muted: #ffb199;
  --color-text-secondary: #666666;
  --color-surface: #141414;
  --color-bg: #0a0a0a;
}
```

Last two entries (`surface`, `bg`) are backward-compat aliases removed in Phase 5.

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

**Note:** `::selection` changes from `#ff440033` (20% alpha) to `#ff440066` (40% alpha via ring). Slightly more visible selection highlight — acceptable.

**Only file touched in Phase 2:** `globals.css`. No component files need changes yet — the backward-compat aliases ensure existing `bg-bg`, `bg-surface`, `border-border`, etc. all keep working.

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

Delete `--color-surface`, `--color-bg`, and `--color-text` from the `@theme inline` block.

### Final sweep

Grep for any `[#` remaining in `.tsx` className strings — should be zero.

## Verification (after each phase)

- `bunx tsc --noEmit` — zero type errors
- `bun run lint` — zero warnings
- `bun run test:smoke` — 2/2 pass
- Visual spot-check in browser — confirm the Factory aesthetic: dark canvas, orange accent, clean typography hierarchy, bordered sections
