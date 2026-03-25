---
name: Truth Terminal Polish
overview: "Five targeted fixes to address the visual issues visible in the screenshot: the flat chart line, invisible disclosure tabs, undifferentiated flag rows, and stats bar hierarchy. All changes are CSS/layout/prop-level -- no new API calls, no data model changes."
todos:
  - id: chart-swap
    content: In TruthPanel.tsx, swap TrustChart primary/overlay when snapshot.trustTrajectory is available
    status: pending
  - id: chart-height
    content: In TrustChart.tsx, increase H from 72 to 96
    status: pending
  - id: tabs-sticky
    content: In DisclosureTabs, add sticky top-0, bg-[#0a0a0a], border-y, z-[5]
    status: pending
  - id: flag-border
    content: In FlagFeed, add border-l-2 with flag color via inline style
    status: pending
  - id: stats-check
    content: In StatsBar, add checkmark icon before verified count when > 0
    status: pending
isProject: false
---

# Truth Terminal Visual Polish

## Problem Summary

The screenshot shows the architecture working correctly (trust score, flags, analysis, verdicts all present) but the visual hierarchy fails the 2-second glance test and the gotcha-screenshot test in specific ways:

- **The trust chart is a flat red smear** because paste-mode EMA values converge (all chunks processed near-simultaneously at similar confidence). The analysis `trustTrajectory` -- which captures the rhetorical arc per-segment -- exists but is drawn as a faint dashed overlay behind the flat EMA line.
- **The disclosure tabs are invisible** between the flag feed and the analysis content. No background, no stickiness, no visual separation.
- **Flag rows are visually uniform** -- high-severity flags (LOGIC, STAT) look identical to medium-severity (VAGUE, PRED). Nothing draws the eye to the most important flags.
- **The stats bar treats all counts equally** -- "10 verified" in muted green reads the same as "14 claims" in white.

## Changes

### 1. Chart: prefer analysis trustTrajectory as primary line

**Why:** The analysis model's `trustTrajectory` reflects the rhetorical arc of the content (setup, evidence gaps, logical fallacies). The EMA reflects temporal processing order, which is meaningless in paste mode. When the trajectory is available, it should be the hero line.

**File:** [src/app/components/TruthPanel.tsx](src/app/components/TruthPanel.tsx) -- lines 134, 150

Current:

```tsx
<TrustChart scores={ema} overlay={snapshot?.trustTrajectory} />
```

Change: compute which source is primary based on whether trajectory exists:

```tsx
const trajectory = snapshot?.trustTrajectory;
const hasTrajectory = trajectory && trajectory.length > 1;
// ...
<TrustChart scores={hasTrajectory ? trajectory : ema} overlay={hasTrajectory ? ema : trajectory} />;
```

During streaming before analysis returns, EMA stays primary. After analysis arrives, the trajectory takes over. The big trust number will then reflect the model's trust assessment, not the processing-order EMA.

### 2. Chart: increase height for line readability

**File:** [src/app/components/TrustChart.tsx](src/app/components/TrustChart.tsx) -- line 4

Change `H` from `72` to `96`. This gives the line ~33% more vertical room to express variation. The chart already uses `preserveAspectRatio="none"` so the SVG will fill its container width regardless.

### 3. Disclosure tabs: distinct background + sticky + visual separation

**File:** [src/app/components/TruthPanel.tsx](src/app/components/TruthPanel.tsx) -- the `DisclosureTabs` component (line 110)

Current tab bar div:

```tsx
<div className="flex border-t border-[#222]">
```

Change to:

```tsx
<div className="sticky top-0 z-[5] flex border-y border-[#222] bg-[#0a0a0a]">
```

- `sticky top-0` -- sticks to top of the scrollable area as user scrolls past flags. The chart+stats are in a _sibling_ div above the scroll container, so `top-0` within the scroll context is correct.
- `z-[5]` -- above flag feed content, below the chart header.
- `bg-[#0a0a0a]` -- darker background distinguishes tabs from both the flag feed above and disclosure content below.
- `border-y` -- adds bottom border for separation from content.

This is the single most impactful fix. In the screenshot, 16 flags push the tabs and analysis content way below the fold. With sticky tabs, the user scrolls through flags and the tab bar locks in place -- analysis/verdicts/patterns are always one click away.

### 4. Flag feed: add colored left border per row

**File:** [src/app/components/TruthPanel.tsx](src/app/components/TruthPanel.tsx) -- `FlagFeed` component (line 84-86)

Current flag button:

```tsx
className = "flex w-full items-center gap-2.5 border-b border-[#1a1a1a] px-4 py-1.5 ...";
```

Add a `border-l-2` with the flag's color via inline style:

```tsx
className="flex w-full items-center gap-2.5 border-b border-[#1a1a1a] border-l-2 px-4 py-1.5 ..."
style={{ borderLeftColor: FC[f.flag.type] }}
```

This mirrors the transcript severity borders and the evidence/pattern left borders throughout the UI. Red border for logic/stat/attribution flags. Amber for vague/prediction. The eye now scans the left edge for hot spots, matching how news chyrons use colored bars.

### 5. Stats bar: distinguish verified count

**File:** [src/app/components/TruthPanel.tsx](src/app/components/TruthPanel.tsx) -- `StatsBar` component (line 73)

Current verified span:

```tsx
<span style={{ color: verified > 0 ? "#00cc66" : "#666" }}>{verified} verified</span>
```

Wrap the count in a subtle badge when > 0 to make it feel like a result, not just a counter:

```tsx
<span style={{ color: verified > 0 ? "#00cc66" : "#666" }}>
  {verified > 0 && <span className="mr-0.5 opacity-70">{"\u2713"}</span>}
  {verified} verified
</span>
```

A small green checkmark before the count signals "these were checked against real sources." Subtle but meaningful.

## What this does NOT change

- **Analysis content layout** -- working as designed
- **Flag feed data or ordering** -- newest-first is correct per plan
- **EMA computation** -- still computed, just may be used as overlay
- **Any API calls or data model** -- pure presentation layer
- **TranscriptInput** -- left panel stays as-is

## Testing

After the changes, the same "Tech pitch" demo should show:

- Trust chart with a line that has visible ups and downs (from trustTrajectory), not a flat band
- Stats bar with a green checkmark before the verified count
- Flag rows with colored left borders (red for STAT/LOGIC/ATTR, amber for VAGUE/PRED)
- Disclosure tabs visually distinct and sticky when scrolling
