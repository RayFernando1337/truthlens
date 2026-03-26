---
name: Design System Overhaul
overview: Reconcile the existing shadcn/ui scaffold with the app's current dark-first token stack, expand the migration inventory to cover the newly split UI files, replace remaining arbitrary hex class values, migrate typography to a 3-tier hierarchy (18/16/14px — heading, body, chrome), adopt cn(), align verification with the current smoke scripts, and remove legacy aliases once the repo is truly ready.
todos:
  - id: phase-1a-reaudit
    content: "[Phase 1A] Re-audit the existing shadcn/ui setup against the updated plan and confirm the required scaffold is already present"
    status: completed
  - id: phase-1b-validation
    content: "[Phase 1B] Validate the Phase 1 scaffold with bunx tsc --noEmit and bun run lint"
    status: completed
  - id: phase-1c-plan-sync-handoff
    content: "[Phase 1C] Update the plan after the Phase 1 re-audit, record discoveries, and confirm that Phase 2 prerequisites are ready for handoff"
    status: completed
  - id: phase-2a-theme-map
    content: "[Phase 2A] Rewrite src/app/globals.css @theme inline mappings to the canonical shadcn + TruthLens semantic token architecture"
    status: pending
  - id: phase-2b-light-dark-values
    content: "[Phase 2B] Replace src/app/globals.css :root and .dark values with the canonical light/dark palette and backward-compat aliases"
    status: pending
  - id: phase-2c-global-base-rules
    content: "[Phase 2C] Align body, scrollbar, selection, and @layer base rules in src/app/globals.css with the updated token system"
    status: pending
  - id: phase-2d-automated-validation
    content: "[Phase 2D] Run Phase 2 automated validation with bunx tsc --noEmit and bun run lint after the globals.css rewrite"
    status: pending
  - id: phase-2e-browser-validation
    content: "[Phase 2E] Run Phase 2 browser verification in light/dark mode on desktop and mobile after the globals.css rewrite"
    status: pending
  - id: phase-2f-plan-sync-handoff
    content: "[Phase 2F] Update the plan after the globals.css rewrite, record new discoveries and remaining token work, and confirm that the Phase 3 slices are ready to hand off"
    status: pending
  - id: phase-3a-right-panel
    content: "[Phase 3A] Migrate TruthPanel.tsx, TruthPanelSections.tsx, and AnalysisContent.tsx: hex replacements, typography tiers, cn() adoption, alias renames, and slice handoff notes"
    status: pending
  - id: phase-3b-extras-fixtures
    content: "[Phase 3B] Migrate TruthPanelExtras.tsx and TranscriptInputFixtures.tsx: hex replacements, typography tiers, cn() adoption, alias renames, and slice handoff notes"
    status: pending
  - id: phase-3c-supporting
    content: "[Phase 3C] Migrate SessionHistory.tsx, SessionHistoryRow.tsx, Flag.tsx, TrustChart.tsx, and ShareCapture.tsx: hex replacements, typography tiers, cn() adoption, alias renames, and slice handoff notes"
    status: pending
  - id: phase-3d-input-page
    content: "[Phase 3D] Migrate TranscriptInputParts.tsx and page.tsx: remaining header hex cleanup, typography tiers, cn() adoption, alias renames, and slice handoff notes"
    status: pending
  - id: phase-3e-grep-merge
    content: "[Phase 3E] Merge the Phase 3 implementation slices and run grep sweeps for remaining hex classNames and legacy aliases"
    status: pending
  - id: phase-3f-browser-verify
    content: "[Phase 3F] Run integrated Phase 3 browser verification and confirm the 18/16/14 typography hierarchy is visually correct"
    status: pending
  - id: phase-3g-plan-sync-handoff
    content: "[Phase 3G] Update the plan after the parallel migration wave, record integrated discoveries and residual issues, and confirm that Phase 4 cleanup is ready to hand off"
    status: pending
  - id: phase-4a-remove-aliases
    content: "[Phase 4A] Remove the temporary --color-surface and --color-bg aliases from src/app/globals.css once all component migrations are merged"
    status: pending
  - id: phase-4b-automated-checks
    content: "[Phase 4B] Run final automated checks: bunx tsc --noEmit, bun run lint, bun run smoke:readiness, and bun run test:smoke"
    status: pending
  - id: phase-4c-final-browser
    content: "[Phase 4C] Run final browser verification in both modes after alias removal and confirm there are no visual regressions"
    status: pending
  - id: phase-4d-plan-closeout
    content: "[Phase 4D] Sync this plan document with the shipped repo state, update status headings, record final file status, and capture remaining follow-on questions before declaring the overhaul complete"
    status: pending
isProject: false
---

# Design System Overhaul

## Phase Status

### Phase 1 -- DONE

Phase 1 has been re-audited against this updated plan. The repo already contains the required shadcn scaffold (`components.json`, `src/lib/utils.ts`, `src/components/ui/`), the supporting dependencies, and the Phase 1 CSS/runtime pieces (`@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, `@custom-variant dark`, `@layer base`). Validation passes: `bunx tsc --noEmit` and `bun run lint`.

### Phase 2 -- NEXT

Phase 2 starts with the full `src/app/globals.css` token rewrite to the canonical light/dark semantic palette. Execute it as six sequential handoff units (`Phase 2A` through `Phase 2F`) because every step touches the same file, its immediate verification path, or the handoff packet for the next wave. No token reconciliation or component migration work should be treated as complete until that rewrite lands and the Phase 2 handoff is written down.

### Phase 3 -- READY AFTER PHASE 2

Phase 3 is the parallel implementation wave. `Phase 3A` through `Phase 3D` can fan out once `Phase 2F` is complete, then `Phase 3E`, `Phase 3F`, and `Phase 3G` collapse back to a single integration owner for merge, grep sweeps, browser review, and the Phase 4 handoff packet.

### Phase 4 -- BLOCKED ON PHASE 3

Phase 4 is the sequential cleanup and closeout wave. `Phase 4A` through `Phase 4D` should stay with one owner after `Phase 3G` confirms the merged UI is clean and the final cleanup scope is stable.

## Current File Status

- `components.json` exists and points shadcn to `src/app/globals.css`, `@/lib/utils`, and `@/components/ui`
- `src/lib/utils.ts` exists and exports `cn()`
- `package.json` already includes `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`, `lucide-react`, and `shadcn`
- `src/app/globals.css` contains the Phase 1 shadcn imports and base layer, but it is still a split-brain file: TruthLens dark-first hex tokens live in `@theme inline`, shadcn OKLCH defaults live in `:root` / `.dark`, and raw `body` / scrollbar / `::selection` hex bypass the token system
- `src/app/layout.tsx` already imports `cn()`, loads the font variables, and applies the mono font on `<body>`, but it does not currently set `class="dark"` on `<html>`
- `src/components/ui/button.tsx` exists from the initial shadcn setup, is built on `@base-ui/react/button`, and the app shell still uses raw `<button>` elements almost everywhere else
- `src/app/components/AnalysisContent.tsx` is now a first-class Phase 3 file; the previous plan incorrectly treated its appeals toggle and verdict copy as if they still lived inside `TruthPanelSections.tsx`
- `src/app/components/SessionHistoryRow.tsx` is now a first-class Phase 3 file; `SessionHistory.tsx` alone no longer represents the whole history surface
- `src/app/page.tsx` is not clean: it still carries `text-[#555]` on the header action and still uses the `bg-bg` / `bg-surface` aliases
- `package.json` now exposes two distinct verification scripts: `bun run smoke:readiness` for mocked API contract checks and `bun run test:smoke` for Playwright UI smoke
- `README.md` and `TRUTHLENS_ARCHITECTURE.md` are currently drifted from the live app; this plan should be treated as the execution truth for the overhaul until those docs are refreshed

## Execution Orchestration

### Sequential waves

- `Phase 1A-1C` are complete and establish the shared scaffold baseline plus the first handoff packet
- `Phase 2A-2F` should stay with one owner because all work centers on `src/app/globals.css`, its verification, and the resulting handoff packet for the parallel wave
- `Phase 4A-4D` should stay with one owner because alias removal, final checks, and plan closeout depend on the fully merged Phase 3 output

### Parallel wave

- `Phase 3A-3D` are the main fan-out tasks and can be assigned to four engineers or agents in parallel once `Phase 2F` is complete
- Each Phase 3 owner should touch only the files in their slice, plus the minimum import changes needed for `cn()`
- `Phase 3E-3G` collapse back to one integration owner after the four Phase 3 slices merge

### Recommended handoff units

- `Phase 2A-2F`: 1 engineer or agent working sequentially
- `Phase 3A`: 1 engineer or agent for `TruthPanel.tsx`, `TruthPanelSections.tsx`, and `AnalysisContent.tsx`
- `Phase 3B`: 1 engineer or agent for `TruthPanelExtras.tsx` and `TranscriptInputFixtures.tsx`
- `Phase 3C`: 1 engineer or agent for `SessionHistory.tsx`, `SessionHistoryRow.tsx`, `Flag.tsx`, `TrustChart.tsx`, and `ShareCapture.tsx`
- `Phase 3D`: 1 engineer or agent for `TranscriptInputParts.tsx` and `page.tsx`
- `Phase 3E-3G`: 1 integration engineer or agent after the parallel wave lands
- `Phase 4A-4D`: 1 finisher engineer or agent for cleanup, verification, and plan sync

### Phase brief before work starts

- Before any phase or sub-phase begins, the owner should restate the exact scope, likely files to touch, non-goals, verification plan, and what would block a clean handoff
- If discovery changes the scope materially, pause and update the plan or handoff packet before silently widening the task
- Treat gut-level adjacency concerns as valid signals; if a change feels like it should affect another surface, investigate instead of assuming the blast radius is limited

### Discovery and sub-agent policy

- Owners are encouraged to launch focused sub-agents for unfamiliar areas, impact analysis, repo sweeps, visual regression investigation, or verification setup
- Keep each sub-agent bounded to a concrete question, file set, or dependency chain; the parent owner stays accountable for the final phase output
- Good triggers include: "where else is this token or alias used?", "what adjacent UI surfaces depend on this component?", "what verification flow covers this slice?", and "if this class changes, what else might regress?"
- If discovery reveals additional required work outside the assigned slice, either capture it as a follow-on item for the orchestrator or explicitly widen the phase with approval before editing

### Required closeout packet

- Every phase owner should end with a concise handoff note that covers: shipped scope, files touched, verification run, plan sections updated, new repo discoveries, unresolved questions, and whether the next phase is ready or blocked
- The closeout packet should call out anything newly learned that changes sequencing, file ownership, risk, or verification expectations
- If a phase is not ready to hand off, say so explicitly and list the blockers rather than letting the next owner discover them indirectly

### Readiness gate before the next phase

- Do not begin the next phase until the previous phase's closeout packet exists, the plan has been updated, and the relevant readiness checks for that phase have passed
- The next owner should read the prior phase's closeout packet before editing, then restate their own phase brief so the orchestrator can confirm the handoff stayed intact
- If the previous phase uncovered new questions, missing files, or cross-cutting risk, resolve them or split new work before moving the dependency graph forward

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

- **Single-hue canvas** with orange-led chrome — allow extra hues only when they are data-driven domain signals (for example, segment-type colors), not ad hoc decorative theme choices
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

**Design principle (Rams):** "Weniger, aber besser." Less, but better. The user glances at any panel and instantly knows: what is this section (heading), what should I read (body), and what's a control (chrome). Three roles, three sizes. Nothing else.

**3-tier hierarchy:**

| Tier        | Class       | Size | Weight          | Case / Tracking             | Role                                                                                                                                                                                                                             |
| ----------- | ----------- | ---- | --------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Heading** | `text-lg`   | 18px | `font-semibold` | normal case                 | The anchor. Panel titles, disclosure headers, TLDR opener, source title. The eye lands here first and orients.                                                                                                                   |
| **Body**    | `text-base` | 16px | `font-normal`   | normal case                 | Everything the user reads. Claims, analysis, transcript chunks, evidence, explanations, steelman, flag labels, menu items, query results. Comfortable sustained reading at the web-standard size.                                |
| **Chrome**  | `text-sm`   | 14px | `font-semibold` | `uppercase tracking-widest` | Structural controls. Section markers (`Lbl`), buttons, disclosure tabs, toggle buttons, flag badges, stat counters, timestamps, loading hints. Uppercase + tracking makes it unmistakable as chrome even at only 2px below body. |

**Minimum size: 14px.** Every piece of text in the app is readable. The old `text-[8px]` through `text-xs` range is gone entirely.

Three sizes. Three textures. The hierarchy comes from the combination of size, weight, and typographic treatment — not from a gradient of barely-perceptible pixel differences. Ive: "When something is designed really well, you're not aware of the design. You're aware of what it enables you to do."

**Size migration map (old → new):**

| Old                           | New                          | Why                                                                                       |
| ----------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| `text-sm` (14px) body content | `text-base` (16px) **Body**  | Bump up. 14px body was too small — now at web-standard reading size.                      |
| `text-xs` (12px) body content | `text-base` (16px) **Body**  | Bump up. Evidence details, descriptions — these are content the user reads.               |
| `text-[11px]` body content    | `text-base` (16px) **Body**  | Bump up. Flag labels, disclosure content, fixture labels, menu items, query input.        |
| `text-[11px]` label / button  | `text-sm` (14px) **Chrome**  | Bump up. Buttons and labels are chrome — now at legible 14px with uppercase + tracking.   |
| `text-[10px]` label / button  | `text-sm` (14px) **Chrome**  | Bump up. Section labels, disclosure tabs, loading hints.                                  |
| `text-[10px]` metadata        | `text-sm` (14px) **Chrome**  | Bump up. Counters, timestamps — still chrome, now readable. `tabular-nums` for alignment. |
| `text-[9px]`                  | `text-sm` (14px) **Chrome**  | **Eliminated.** Appeals toggles, segment tags, badge text.                                |
| `text-[8px]`                  | `text-sm` (14px) **Chrome**  | **Eliminated.** Session kind labels.                                                      |
| _(new)_                       | `text-lg` (18px) **Heading** | **Added.** Section titles that don't currently exist get the anchor tier.                 |

**Key rules:**

- **Chrome is always `uppercase tracking-widest`.** This is what separates it from body at only 2px smaller — the all-caps + wide tracking creates a completely different visual texture.
- Body content is normal case, `font-normal`, `leading-relaxed` (1.625) for comfortable reading.
- Headings are normal case, `font-semibold`, default leading.
- `tabular-nums` on any numeric chrome (stats, counters, timestamps).

### Component Patterns

Every pattern references one of three tiers: **Heading** (18px), **Body** (16px), **Chrome** (14px).

**Section heading — Heading:**

```
text-lg font-semibold text-foreground
```

Panel titles ("Analysis", "Verdicts"), source title, disclosure headers, TLDR opener.

**Section label (the `Lbl` component) — Chrome:**

```
text-sm font-semibold uppercase tracking-widest text-text-secondary
```

**Bordered button (Factory signature) — Chrome:**

```
border border-input px-3 py-2 text-sm font-semibold uppercase tracking-widest
text-foreground hover:border-foreground
```

Filled-on-hover variant (Analyze button): `hover:bg-foreground hover:text-background`

**Toggle button (appeals, query types) — Chrome:**

- Selected: `border-foreground bg-foreground text-background`
- Unselected: `border-input text-muted-foreground hover:border-text-secondary`

**Dropdown menu:**

```
absolute z-20 mt-1 min-w-[220px] border border-input bg-card py-1 shadow-lg
```

Menu items — Body: `px-4 py-2 text-base text-muted-foreground hover:bg-muted hover:text-foreground`

**Flag badge — Chrome:**

```
inline-flex items-center gap-1.5 px-2 py-0.5 text-sm font-semibold uppercase tracking-widest
```

Background and text from semantic color at 15% opacity (e.g. `bg-accent/15 text-accent`).

**Loading hint — Chrome:**

```
flex items-center gap-2 px-4 py-4
```

Dot: `h-1.5 w-1.5 animate-pulse bg-foreground`. Label: `text-sm uppercase tracking-widest text-muted-foreground/50`.

**Disclosure tabs — Chrome:**

```
text-sm font-semibold uppercase tracking-widest transition-colors
```

Active: `bg-muted text-foreground`. Inactive: `text-text-secondary hover:text-muted-foreground`.

**Flag feed items:**
Flag label — Body: `text-base text-foreground`. Type badge — Chrome: `text-sm font-semibold uppercase tracking-widest` with semantic color.

**Border-left indicators (flags, evidence, verdicts):**
`border-l-2` with semantic color. Content indented with `pl-2`.

**Dot separator:** `·` in `text-muted-foreground/40`.

**Cards/elevated panels:** `border border-border bg-card`. Optional `shadow-lg` for floating. Semantic-tinted: `border-{color}/30 bg-{color}/5`.

**Stats bar — Chrome:**

```
text-sm font-semibold uppercase tracking-widest tabular-nums
```

**Empty state:**

```
flex h-full flex-col items-center justify-center gap-3 text-center
```

Primary — Body: `text-base text-text-secondary`. Secondary — Chrome: `text-sm text-muted-foreground/40`.

### Layout

**Two-panel split:**

- Left sidebar: `w-[320px] xl:w-[400px] shrink-0 border-r border-border bg-background`
- Right main panel: `flex min-w-0 flex-1 flex-col bg-card`
- Full height: `flex h-full flex-col` on the root container

**Header bar:**

```
flex items-center justify-between border-b border-border px-6 py-3
```

Logo — Heading: `text-lg font-bold tracking-wider text-foreground`. Status indicators right-aligned — Chrome.

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

Target architecture: dark mode activates via `.dark` class on `<html>`. The `@custom-variant dark` directive makes Tailwind's `dark:` prefix work with this class-based approach.

Current repo reality is different: `layout.tsx` does not apply `dark`, so the app behaves as dark-first because `bg-bg`, `bg-surface`, and raw `body` hex dominate the rendered shell. Treat light mode as an explicit Phase 2 target, not a shipped capability.

For the overhaul, existing hardcoded hex values that assumed dark mode are replaced with semantic tokens that can support both modes once the class wiring is real. Inline `style=` attributes that use hex for dynamic semantic colors (verdict borders, pattern type indicators, flag type colors) remain as-is — these are data-driven colors tied to domain semantics, not theme tokens.

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
--primary: oklch(0.205 0 0); /* ← used as bg-primary */
--primary-foreground: oklch(0.985 0 0); /* ← used as text-primary-foreground */
```

Standard shadcn tokens (all must exist for components to render correctly):
`background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring`.

**Adding custom colors** (TruthLens extensions): define in `:root`/`.dark`, reference in `@theme inline`:

```css
:root {
  --green: #00994d;
}
.dark {
  --green: #00cc66;
}

@theme inline {
  --color-green: var(--green);
}
```

Reference: https://ui.shadcn.com/docs/theming

### Dark mode toggle

Dark mode uses **class-based switching** via `.dark` on `<html>`. The `@custom-variant dark (&:is(.dark *))` directive (already in `globals.css` from Phase 1) makes Tailwind's `dark:` prefix work with this class. The live repo does not currently apply that class, so this section describes the target behavior that Phase 2 must actually wire up.

```html
<html class="dark">
  <!-- dark mode active -->
  ...
</html>

<html>
  <!-- light mode (default) -->
  ...
</html>
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

TruthLens started with this Factory-like intent but drifted: the repo now has the shadcn scaffold and `cn()`, yet the live UI still runs on a fragmented token stack, raw global hex, and an incomplete migration manifest that missed newer split files. The gray soup still undermines the clean Factory aesthetic.

## Guiding Principles

- Dieter Rams: "Good design is as little design as possible."
- TruthLens soul.md: "Respect every glance — every element earns its presence or gets cut."
- Factory's lesson: if you need hierarchy, use typography and spacing. If you need separation, use borders and cards. Color is for meaning (accent, success, warning), not for decoration.

## Rationalized Palette

**4 text levels, 3 background levels, 2 border levels, 3 semantic colors — per mode.**

Following the Factory pattern: each mode uses almost no color variety in the grayscale. Hierarchy comes from type size and weight. Separation comes from borders and card elevation. The same token names resolve to mode-appropriate values via CSS custom properties.

### Text Hierarchy (4 levels — down from 10)

| Token              | Dark                         | Light   | Role                                             |
| ------------------ | ---------------------------- | ------- | ------------------------------------------------ |
| `foreground`       | #e5e5e5                      | #171717 | Primary content, anything worth reading          |
| `muted-foreground` | #888888                      | #737373 | Secondary content, evidence detail, explanations |
| `text-secondary`   | #666666                      | #a3a3a3 | Structural labels, meta, captions                |
| Opacity variants   | `muted-foreground/50`, `/40` | same    | Placeholders, hints, dot separators              |

Dark consolidation: #ccc → `foreground`, #999/#aaa → `muted-foreground`, #555 → `text-secondary`, #444 → `muted-foreground/50`, #333-as-text → `muted-foreground/40`.

### Backgrounds (3 levels — Factory pattern)

| Token        | Dark    | Light   | Role                                                         |
| ------------ | ------- | ------- | ------------------------------------------------------------ |
| `background` | #0a0a0a | #fafafa | Base canvas                                                  |
| `card`       | #141414 | #ffffff | Elevated panels, sidebar, dropdowns. Replaces old `surface`. |
| `muted`      | #1a1a1a | #f5f5f5 | Hover states, active tab fills, subtle emphasis              |

### Borders (2 levels — Factory pattern)

| Token    | Dark    | Light   | Role                                          |
| -------- | ------- | ------- | --------------------------------------------- |
| `border` | #222222 | #e5e5e5 | Standard structural dividers between sections |
| `input`  | #333333 | #d4d4d4 | Interactive/form borders, stronger emphasis   |

### Semantic Colors (meaning, not decoration)

| Token               | Dark      | Light     | Role                                                  |
| ------------------- | --------- | --------- | ----------------------------------------------------- |
| `accent`            | #ff4400   | #ff4400   | Attention, flags, active states, the orange dot       |
| `accent-foreground` | #ffffff   | #ffffff   | Text on accent backgrounds                            |
| `accent-muted`      | #ffb199   | #e63900   | Softer accent text (lighter on dark, darker on light) |
| `green`             | #00cc66   | #00994d   | Verified/success (darkened for light-bg contrast)     |
| `yellow`            | #ffaa00   | #b37700   | Warning/caution (darkened for light-bg contrast)      |
| `destructive`       | #ff4400   | #ff4400   | Error state (aliases accent)                          |
| `ring`              | #ff440066 | #ff440066 | Focus ring (40% alpha orange)                         |

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

## Phase 1 -- DONE: Install shadcn/ui

**Re-audit confirmed:** the repo already contains the Phase 1 scaffold. `components.json`, `src/lib/utils.ts`, and `src/components/ui/button.tsx` exist, the `@/*` -> `./src/*` path alias is correct, and Tailwind v4 + PostCSS remain compatible. Phase 1 is therefore a reconciliation pass, not a fresh init into an empty repo.

Validated Phase 1 scaffold:

- `components.json` — config pointing to `src/components/ui/`, `@/lib/utils`, Tailwind v4 CSS-first
- `src/lib/utils.ts` — exports `cn()` (clsx + tailwind-merge)
- Installs `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`, `lucide-react`

**Risk:** The init may overwrite or append to `globals.css`. Merge carefully — Phase 2 defines the definitive theme. Keep `@import "tailwindcss"` and body/scrollbar/selection rules; let shadcn add `@import "tw-animate-css"` and any `@layer base` it needs.

The old `--color-text` token is already absent from `@theme` (the codebase uses `text-foreground` and `text-text-secondary` instead).

Validation: `bunx tsc --noEmit` and `bun run lint` pass.

### Phase 1 verification and handoff criteria

- The scaffold exists and matches the updated Phase 1 contract
- `bunx tsc --noEmit` and `bun run lint` pass
- The plan status, current file status, and current understanding of repo state are updated
- The remaining Phase 2 work is clearly called out: `src/app/globals.css` is still transitional and must be rewritten before any parallel component migration begins

## Phase 2 -- NEXT: Rationalize the Token Palette

Replace the `@theme inline`, `:root`, and `.dark` blocks in [src/app/globals.css](src/app/globals.css) with the full TruthLens-flavored token set. Uses CSS custom property indirection (the pattern shadcn established in Phase 1) so Tailwind utility classes like `bg-card` and `text-muted-foreground` resolve to the correct value per mode.

**Current repo reality to fix in Phase 2:** `@theme inline` is still hardcoded to TruthLens dark hex, `:root` and `.dark` still contain the default shadcn OKLCH palette, and the plain `body` / scrollbar / `::selection` rules still use literal hex outside the shared token system. Because those `body` rules are unlayered, they can override the later `@layer base` body styling. Phase 2 is therefore both a token rewrite and a cascade cleanup.

**Architecture:** `@theme inline` maps Tailwind color-\* tokens to `var()` references. `:root` provides light values, `.dark` provides dark values, and the raw global rules must also move onto `var()` references. The `@custom-variant dark` directive (already present from Phase 1) makes `dark:` prefixed utilities work once the class is actually applied.

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

Last two `@theme inline` entries (`surface`, `bg`) are backward-compat aliases removed in `Phase 4A`. They are still actively used across the app today, so do not treat them as dead cleanup-only tokens until `Phase 3E` confirms the alias sweep is complete.

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

**Only file touched in Phase 2:** `globals.css`. No component files need changes yet — the backward-compat aliases ensure existing `bg-bg`, `bg-surface`, `border-border`, etc. all keep working. Token class names are mode-agnostic once the rewrite lands: `text-foreground` resolves to #e5e5e5 in dark, #171717 in light.

### Phase 2 verification and handoff criteria

- `Phase 2D` passes `bunx tsc --noEmit` and `bun run lint`
- `Phase 2E` confirms the token behavior in the current dark-first shell and verifies manual `.dark` toggling only after the class-based mode path is actually wired or explicitly simulated in browser tools
- `Phase 2F` updates the plan, current file status, and any newly discovered token, alias, or affected-file information
- Before handing off to `Phase 3A-3D`, confirm the parallel slice boundaries still make sense and call out any newly discovered files that should join or leave a slice

## Phase 3 — Replace Hex Values + Typography Scale

**This phase combines two sweeps across the same files:** (1) replacing all remaining `[#...]` hex values with semantic tokens, and (2) migrating font sizes to the 3-tier hierarchy (Heading 18px / Body 16px / Chrome 14px) defined in the Design Specification. Since both hit the same components, doing them together avoids a second pass.

### Typography migration (apply alongside hex replacements)

When touching each file for hex replacements below, also apply the 3-tier migration map from the Design Specification. The rule is simple:

- **If it's content the user reads** → `text-base` (16px) **Body**
- **If it's a label, button, tab, counter, or badge** → `text-sm` (14px) **Chrome** (+ `uppercase tracking-widest` if not already)
- **If it anchors a section** → `text-lg` (18px) **Heading** (new — add where no heading exists)

Concrete substitutions:

- **`text-[8px]`, `text-[9px]`, `text-[10px]` on labels/buttons/metadata** → `text-sm` (Chrome)
- **`text-[10px]`, `text-[11px]` on readable content** → `text-base` (Body)
- **`text-[11px]` on labels/buttons** → `text-sm` (Chrome)
- **`text-xs` (12px) on readable content** → `text-base` (Body)
- **`text-sm` (14px) on readable content** → `text-base` (Body)
- **`text-sm` (14px) on labels/buttons** → keep `text-sm` (already Chrome)
- **Add `text-lg font-semibold`** for section headings where none exist

### Hex color replacements

**Re-audit on 2026-03-26:** the old "73 substitutions across 8 files" manifest is stale. The app now includes additional split files and still carries remaining header / history / analysis shell debt. Treat the Phase 3 migration inventory below as the current source of truth.

**Files with remaining arbitrary hex in `className` or still-active legacy aliases:**

- `src/app/components/TruthPanel.tsx` — stats rail, flag rows, disclosure tabs, retry states, idle copy, plus `bg-bg` / `bg-surface`
- `src/app/components/TruthPanelSections.tsx` — verdict CTA, empty states, unverifiable rows, pattern descriptions, plus `bg-bg`
- `src/app/components/AnalysisContent.tsx` — appeals toggle, yellow evidence blocks, quoted excerpts, and `text-bg` in the selected state
- `src/app/components/TruthPanelExtras.tsx` — topic segments, query tabs, evidence rows, input placeholder, and `text-bg` in the selected state
- `src/app/components/TranscriptInputFixtures.tsx` — menu shell, fixture card, hover states, preview box, and `bg-surface` / `bg-bg`
- `src/app/components/SessionHistory.tsx` — history trigger, dropdown shell, empty state, and `bg-surface`
- `src/app/components/SessionHistoryRow.tsx` — title button, session kind label, age metadata, editor input, and row divider
- `src/app/components/TrustChart.tsx` — chart shell background and chrome label (SVG stroke/fill stays excluded)
- `src/app/components/ShareCapture.tsx` — share button label only (canvas drawing code stays excluded)
- `src/app/components/Flag.tsx` — badge background token map still contains `bg-[#444]/15`
- `src/app/page.tsx` — header action still uses `text-[#555]`, and the page shell still relies on `bg-bg` / `bg-surface`

**Files that still need alias cleanup even without arbitrary hex class values:**

- `src/app/components/TranscriptInputParts.tsx` — `bg-bg`, `hover:text-bg`, and typography cleanup

**Files already clean for this phase's purposes:**

- `src/app/layout.tsx`
- `src/app/components/TranscriptInput.tsx`

**DO NOT TOUCH** (inline styles / canvas — confirmed exclusions):

- `ShareCapture.tsx` lines 18-129 — canvas `fillStyle`/`strokeStyle` hex values
- `TruthPanel.tsx` lines 31-36 (FC object), 80-84 (`style={{ color: ... }}`)
- `TruthPanelExtras.tsx` lines 14-18 (SCOL), 46-50 (`style={{ borderColor }}`)
- `TruthPanelSections.tsx` lines 135-138 (VCOL), 179-181, 195-198 (PCOL), 217-226 (`style=`)
- `TrustChart.tsx` lines 7-10 (trustColor), 38-45 (SVG stroke/fill)

## Phase 3 sub-task assignments

`Phase 3A` through `Phase 3D` run **in parallel** after `Phase 2F` completes. `Phase 3E`, `Phase 3F`, and `Phase 3G` are sequential integration tasks after those four implementation slices merge. Each sub-task handles ALL migration work for its assigned files: hex replacements, typography scale, `cn()` adoption, and alias renames. This avoids multiple passes over the same files.

**Each agent should:** read the full Design Specification and Technical Implementation Notes in this plan before starting. Apply the hex color map, typography migration map, `cn()` sites, and alias renames listed below for their assigned files. Run `bunx tsc --noEmit` and `bun run lint` after completing their files. Produce a slice closeout note that lists files touched, checks run, new discoveries, adjacent files that may also be affected, and whether the slice is ready for `Phase 3E` merge.

### Phase 3A — TruthPanel.tsx + TruthPanelSections.tsx + AnalysisContent.tsx

**Hex replacements:** Truth panel shell, tab states, error / retry copy, verdict and pattern empty states, appeals toggle, excerpt blocks, and any remaining `text-[#...]`, `border-[#...]`, `bg-[#...]`, or hover-state equivalents in these three files.

**cn() sites (add `import { cn } from "@/lib/utils"` where needed):**

- `TruthPanel.tsx`: disclosure tab active/inactive ternary
- `AnalysisContent.tsx`: appeals toggle selected/unselected ternary (this moved out of `TruthPanelSections.tsx`)

**Alias renames:**

- `TruthPanel.tsx`: `bg-surface` → `bg-card`
- `TruthPanel.tsx`: `bg-bg` → `bg-background`
- `TruthPanelSections.tsx`: `bg-bg` → `bg-background`
- `AnalysisContent.tsx`: `text-bg` → `text-background`

**Typography:** Apply 3-tier map. Readable content (11px, 12px, 14px) → `text-base` Body. Labels/buttons/tabs (9px, 10px) → `text-sm` Chrome. Add `text-lg` Headings for section titles.

### Phase 3B — TruthPanelExtras.tsx + TranscriptInputFixtures.tsx

**Hex replacements:** Topic segment empty states, query tabs, evidence rows, the query input placeholder, fixture menu shell, fixture card hover states, and the preview box shell.

**cn() sites:**

- `TruthPanelExtras.tsx`: query type tab selected/unselected ternary

**Alias renames:**

- `TruthPanelExtras.tsx`: `text-bg` → `text-background`
- `TranscriptInputFixtures.tsx`: `bg-surface` → `bg-card`
- `TranscriptInputFixtures.tsx`: `bg-bg` → `bg-background`

**Typography:** Apply 3-tier map. Readable content → `text-base` Body. Labels/buttons (9px, 10px, 11px) → `text-sm` Chrome. Add `text-lg` Headings.

### Phase 3C — SessionHistory.tsx + SessionHistoryRow.tsx + Flag.tsx + TrustChart.tsx + ShareCapture.tsx

**Hex replacements:** History trigger, dropdown shell, row title / metadata states, session kind label, row dividers, chart shell label, share button label, and the `Flag.tsx` badge map.

**cn() sites:**

- `Flag.tsx`: flag badge style composition from record lookup

**Alias renames:**

- `SessionHistory.tsx`: `bg-surface` → `bg-card`
- `SessionHistoryRow.tsx`: `bg-bg` → `bg-background`

**Typography:** Apply 3-tier map. SessionHistory 8px kind labels → `text-sm` Chrome. Flag badge → `text-sm` Chrome. Readable content → `text-base` Body.

**DO NOT TOUCH** (inline styles — confirmed exclusions):

- `ShareCapture.tsx` lines 18-129 — canvas `fillStyle`/`strokeStyle` hex values
- `TrustChart.tsx` lines 7-10 (trustColor), 38-45 (SVG stroke/fill)

### Phase 3D — TranscriptInputParts.tsx + page.tsx

**Hex replacements:** `page.tsx` still has a header action in `text-[#555]`; migrate that along with the alias cleanup. `TranscriptInputParts.tsx` does not have arbitrary hex classNames left, but it still has typography and alias debt.

**cn() sites (add `import { cn } from "@/lib/utils"` to `TranscriptInputParts.tsx`):**

- `TranscriptInputParts.tsx`: mic button ternary (recording vs idle)
- `TranscriptInputParts.tsx`: recording indicator dot ternary
- `TranscriptInputParts.tsx`: severity border class composition (multi-condition)
- `TranscriptInputParts.tsx`: progress bar inner class composition

**Alias renames:**

- `TranscriptInputParts.tsx`: `bg-bg` → `bg-background`
- `TranscriptInputParts.tsx`: `hover:text-bg` → `hover:text-background`
- `page.tsx`: `bg-bg` → `bg-background`
- `page.tsx`: `bg-surface` → `bg-card`

**Typography:** Apply 3-tier map. InputHeader label → `text-sm` Chrome. Body content → `text-base` Body. Page header logo → `text-lg` Heading, and header status/actions should also land on the 14px chrome tier.

### Phase 3E — Merge + grep sweeps

Runs after **all** `Phase 3A-3D` sub-tasks complete. Merge the four implementation slices into one branch or worktree before final visual verification. Key checks:

- Grep sweep: zero `[#` remaining in `.tsx` className strings
- Grep sweep: zero `bg-surface`, `bg-bg`, `text-bg`, `hover:text-bg` remaining in `.tsx` files
- Resolve any cross-branch conflicts before final verification
- Run `bunx tsc --noEmit`, `bun run lint`, and `bun run smoke:readiness` on the merged branch before handing off to `Phase 3F`

### Phase 3F — Browser verification

Runs after `Phase 3E` is clean. See the Verification Workflow section for full instructions. Key checks:

- Desktop screenshots in both light and dark mode
- Mobile screenshot to confirm no clipping
- Typography spot-check: Headings (18px) visually anchor each section, Body (16px) is comfortable reading, Chrome (14px uppercase) reads as controls not content
- Confirm no text below 14px anywhere in the integrated UI

### Phase 3G — Plan sync + handoff criteria

- Update the plan after the merged parallel wave, including status headings, current file status, and any scope discoveries that the slice owners surfaced
- Record residual issues, newly affected files, verification follow-ups, or product questions that were discovered during the migration
- Hand off to `Phase 4A-4D` only if the remaining work is truly cleanup/finalization rather than undiscovered migration work

## Phase 4 — Final Cleanup

**After `Phase 3G` confirms everything is clean and the cleanup scope is stable.** Execute `Phase 4A` through `Phase 4D` sequentially.

### Remove alias definitions from globals.css

Delete `--color-surface: var(--card)` and `--color-bg: var(--background)` from the `@theme inline` block. (`--color-text` was already removed in Phase 1.)

### Final verification

- `bunx tsc --noEmit` — zero type errors (confirms no remaining references to removed tokens)
- `bun run lint` — zero warnings
- `bun run smoke:readiness` — mocked API contract smoke passes
- `bun run test:smoke` — 2/2 pass
- Grep: zero `[#` in `.tsx` className strings
- Grep: zero `bg-surface`, `bg-bg`, `text-bg`, `hover:text-bg` in `.tsx` files
- Browser verification in both modes (see Verification Workflow)

### Phase 4 closeout criteria

- The alias cleanup is complete and all final automated and browser checks pass
- The plan is fully synced with the shipped repo state, including prose headings, file status, verification notes, and any learned constraints
- Remaining follow-on questions, future design improvements, or non-blocking cleanup ideas are captured explicitly so the orchestrator can schedule them later instead of losing them at the end of the overhaul

## Verification Workflow

### Automated checks and readiness gates

```bash
bunx tsc --noEmit        # zero type errors
bun run lint             # zero warnings
bun run smoke:readiness  # mocked analyze/summarize/verify route contracts
bun run test:smoke       # 2/2 Playwright UI smoke when shell behavior changed
```

Use `tsc` + `lint` as the minimum implementation-pass checks. Use `smoke:readiness` at phase boundaries and before declaring a phase ready. Use `test:smoke` whenever the rendered shell or user interaction flow changed materially.

### Readiness gate before starting any new phase

1. Read the prior phase's closeout packet and confirm that the plan is updated
2. Re-state the next phase's exact scope, expected files, non-goals, and verification plan
3. Launch sub-agents for additional discovery if the repo area is unfamiliar or the blast radius is unclear
4. Stop and split new work if discovery changes the task enough that the existing handoff is no longer accurate

### Handoff packet template (required after every phase)

```md
Phase:
Shipped scope:
Files touched:
Verification run:
Plan updates made:
New discoveries:
Remaining gaps or questions:
Next phase ready or blocked:
Suggested follow-on tasks:
```

### Browser verification (run after `Phase 2E`, `Phase 3F`, and `Phase 4C`)

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

1. Confirm whether the live page is still dark-first via the alias tokens and raw body rules or whether the Phase 2 class-based rewrite has landed
2. If the class-based rewrite has landed, use `browser_snapshot` to find the `<html>` element and toggle `document.documentElement.classList.toggle('dark')`
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

| Phase | Automated                           | Browser                      | Plan / discovery sync                                                                                    | Handoff gate                                                                                                    |
| ----- | ----------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1A-1C | `tsc` + `lint`                      | —                            | Status headings and file status updated; remaining Phase 2 work called out                               | `Phase 2` only starts once the scaffold baseline and transitional `globals.css` state are clearly documented    |
| 2A-2C | —                                   | —                            | Capture any newly discovered token, alias, or shared-style dependencies before the validation pass       | Do not hand off `Phase 3` yet; the `globals.css` rewrite is still in flight                                     |
| 2D    | `tsc` + `lint`                      | —                            | Note any compiler or lint surprises that change the planned component slices                             | `Phase 2E` only if the token rewrite compiles cleanly                                                           |
| 2E    | —                                   | Desktop + mobile, both modes | Record any visual regressions, light-mode surprises, or newly affected files found during browser review | `Phase 2F` only if the new token system behaves correctly in both modes                                         |
| 2F    | `smoke:readiness`                   | —                            | Update the plan, current file status, and discovered follow-on work; confirm `Phase 3A-3D` slice mapping | `Phase 3A-3D` only if the slice boundaries and prerequisites are still accurate                                 |
| 3A-3D | `tsc` + `lint` (each agent)         | —                            | Each slice owner writes a closeout note with discoveries, affected neighbors, and ready/not-ready status | `Phase 3E` only after all slice handoffs exist and the merge owner has read them                                |
| 3E    | Grep sweeps + merged `tsc` + `lint` + `smoke:readiness` | —                            | Consolidate discoveries from all slice owners and note any merge-only issues                             | `Phase 3F` only if the merged branch is clean and no hidden alias/hex debt remains                              |
| 3F    | —                                   | Desktop + mobile, both modes | Record integrated UI findings, typography issues, and any residual regressions                           | `Phase 3G` only if the integrated UI is visually coherent in both modes                                         |
| 3G    | `smoke:readiness`                   | —                            | Update the plan, file status, residual issue list, and Phase 4 cleanup scope                             | `Phase 4A-4D` only if the remaining work is true cleanup rather than missing migration work                     |
| 4A    | `tsc` + `lint`                      | —                            | Note any cleanup fallout or alias-removal surprises                                                      | `Phase 4B` only if alias removal is mechanically safe                                                           |
| 4B    | `tsc` + `lint` + `smoke:readiness` + `test:smoke` | —                            | Record any test gaps or regressions that change final-closeout confidence                                | `Phase 4C` only if the automated baseline is clean                                                              |
| 4C    | —                                   | Desktop + mobile, both modes | Record final visual findings and any non-blocking follow-up ideas                                        | `Phase 4D` only if final visuals are acceptable and any remaining issues are explicitly classified              |
| 4D    | Plan sync                           | —                            | Prose headings, file status, learned constraints, and follow-on questions match the repo                 | Overhaul is complete only when the plan is synced and any remaining work has been captured for the orchestrator |

### Dependency graph

```
Phase 1A -> Phase 1B -> Phase 1C
                       │
                       ▼
Phase 2A -> Phase 2B -> Phase 2C -> Phase 2D -> Phase 2E -> Phase 2F
                                                                │
                                      ┌───────────┬───────────┬───────────┐
                                      ▼           ▼           ▼           ▼
                                   Phase 3A    Phase 3B    Phase 3C    Phase 3D
                                      └───────────┴───────────┴───────────┘
                                                                │
                                                                ▼
                                                             Phase 3E
                                                                │
                                                                ▼
                                                             Phase 3F
                                                                │
                                                                ▼
                                                             Phase 3G
                                                                │
                                                                ▼
Phase 4A -> Phase 4B -> Phase 4C -> Phase 4D
```

**Total agents possible:** 4 concurrent during `Phase 3A-3D`, with focused discovery sub-agents launched opportunistically inside any phase when additional context or impact analysis is needed. All primary phases outside that wave are single-owner sequential work.
