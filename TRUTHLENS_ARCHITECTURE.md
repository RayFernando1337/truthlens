# TRUTHLENS

Real-time claim analysis powered by Nemotron 3 Super.

---

## Problem

People consume content (talks, podcasts, pitches, articles) and have no way to
evaluate claims in real time. By the time something sounds wrong, the speaker has
moved on. There is no tool that sits alongside content consumption and flags
what is supported, what is missing, and what is manipulation.

TruthLens solves this with three tiers of analysis running concurrently, each
progressively deeper, all streaming results as the content flows in.

---

## Stack

```
Frontend          Next.js + Vercel AI SDK (@ai-sdk/openai-compatible)
Inference         Nemotron 3 Super on Nebius Token Factory (~400 tok/s)
Search/Verify     Tavily (Nebius-owned, agentic search)
Deployment        Local dev / Vercel (if time permits)
```

---

## Architecture

```
                    +------------------+
                    |   Content Input  |
                    |  (paste / mic)   |
                    +--------+---------+
                             |
                    chunk every ~15 seconds
                             |
                    +--------v---------+
                    |   Chunk Router   |
                    +--+------+-----+--+
                       |      |     |
              L1 every |      |     | L3 every
              chunk    |      |     | 6+ chunks
                       v      |     v
                  +----+--+   |  +--+------+
                  |  L1   |   |  |   L3    |
                  | Pulse |   |  | Accumul |
                  +-------+   |  +---------+
                              |
                     L2 every 3-4 chunks
                              |
                         +----v----+
                         |   L2    |
                         | Analyze |
                         +---------+
```

### L1 -- Pulse (real-time, <1s response)

Fires on every chunk. Lightweight structured output.

- Model: `nvidia/nemotron-3-super-120b-a12b` via Nebius
- Prompt: tight, <200 token system prompt requesting JSON
- Output: `{ claims[], flags[], tone, confidence }`
- Rendering: inline badges below each transcript segment
- No tool use. Pure inference speed.

### L2 -- Analysis (5-15s, background)

Fires after 3-4 chunks accumulate. Full rhetorical breakdown.

- Model: same Nemotron Super
- Tool: Tavily search for claim verification
- Prompt: adapted from rhetorical-analyzer skill (evidence table,
  appeals, assumptions, steelman, missing evidence)
- Output: structured analysis object
- Rendering: expandable panels in Analysis tab

### L3 -- Accumulate (ongoing, leverages 1M context)

Fires after 6+ chunks. Sends full session transcript.

- Model: same Nemotron Super
- Context: entire accumulated transcript (this is the 1M window play)
- Prompt: cross-claim contradiction detection, narrative arc mapping,
  confidence trajectory
- Output: patterns array, trust trajectory, overall assessment
- Rendering: Patterns tab with trajectory chart

---

## API Wiring

```typescript
// lib/nemotron.ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const nemotron = createOpenAICompatible({
  name: 'nebius',
  baseURL: 'https://api.tokenfactory.nebius.com/v1/',
  headers: {
    Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
  },
});

export const model = nemotron.chatModel(
  'nvidia/nemotron-3-super-120b-a12b'
);
```

```typescript
// lib/tavily.ts
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

// OR simple fetch wrapper:
async function searchTavily(query: string) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'basic', // 'basic' for L1 speed, 'advanced' for L2
      max_results: 5,
    }),
  });
  return res.json();
}
```

---

## API Routes

```
POST /api/analyze/pulse     -- L1: single chunk, streaming JSON
POST /api/analyze/deep      -- L2: accumulated chunks + Tavily verification
POST /api/analyze/patterns  -- L3: full transcript, pattern detection
```

Each route uses `streamText` or `generateObject` from Vercel AI SDK.

---

## Frontend Structure

```
app/
  page.tsx              -- main layout, two-panel (input | analysis)
  components/
    TranscriptInput.tsx -- paste area or live mic input
    PulseFeed.tsx       -- scrolling L1 results
    AnalysisPanel.tsx   -- L2 expandable sections
    PatternsPanel.tsx   -- L3 trajectory + patterns
    ConfidenceMeter.tsx -- small inline bar
    Flag.tsx            -- claim flag badge
```

### Design Language

Inspired by Factory AI. No decoration, no gradients, no rounded corners
on cards. The information is the interface.

```
Font:        JetBrains Mono (monospace throughout)
Background:  #0a0a0a (near black)
Surface:     #141414 (panels)
Border:      #222222 (1px solid, sharp corners)
Text:        #e5e5e5 (primary), #666666 (secondary)
Accent:      #ff4400 (warnings/flags only)
Green:       #00cc66 (supported claims only)
Yellow:      #ffaa00 (partial support only)
```

No color for decoration. Color only carries meaning.

---

## Build Sequence (2 hours)

```
00:00 - 00:15   Scaffold Next.js, install deps, wire Nebius provider
00:15 - 00:35   L1 Pulse route + PulseFeed component (streaming)
00:35 - 00:55   L2 Analysis route with Tavily + AnalysisPanel
00:55 - 01:10   L3 Patterns route + PatternsPanel with trajectory
01:10 - 01:30   UI polish, connect tabs, demo content
01:30 - 01:50   Test full flow, fix edge cases
01:50 - 02:00   Prep demo, record if needed
```

---

## Prompts (condensed)

### L1 System Prompt

```
You are a real-time claim analyzer. Given a transcript segment, return
valid JSON only. No explanation, no markdown.

{
  "claims": ["string"],
  "flags": [{ "type": "vague|stat|prediction|attribution|logic|contradiction", "label": "string" }],
  "tone": "string",
  "confidence": 0.0-1.0
}

Flag types:
- vague: no specifics given
- stat: statistic without source or methodology
- prediction: unfalsifiable future claim
- attribution: unnamed or unverifiable source
- logic: logical fallacy or non-sequitur
- contradiction: conflicts with earlier claims
```

### L2 System Prompt

```
You are a rhetorical analyst. Given accumulated transcript segments and
optional Tavily search results for verification, produce a structured
analysis.

Return valid JSON:
{
  "tldr": "string (1-2 sentences, core claim)",
  "corePoints": ["string"],
  "underlyingStatement": "string (what they actually want you to believe)",
  "evidenceTable": [{ "claim": "string", "evidence": "string" }],
  "appeals": { "ethos": "string", "pathos": "string", "logos": "string" },
  "assumptions": ["string"],
  "steelman": "string",
  "missing": ["string"]
}
```

### L3 System Prompt

```
You are a pattern detection system. Given the full transcript of a
session, identify cross-claim patterns, contradictions, narrative arcs,
and confidence trajectory.

Return valid JSON:
{
  "patterns": [{ "type": "escalation|contradiction|narrative-arc|cherry-picking", "description": "string" }],
  "trustTrajectory": [0.0-1.0],
  "overallAssessment": "string"
}
```

---

## Demo Script

1. Paste a transcript from a recent tech keynote or product launch
2. Watch L1 flags appear in real-time as chunks process
3. Switch to Analysis tab to show L2 deep breakdown with verified claims
4. Switch to Patterns tab to show L3 cross-session pattern detection
5. Pitch: "Nemotron Super's 1M context window and 400 tok/s on Nebius
   lets us run three tiers of analysis concurrently. The reasoning engine
   and the verification engine share the same Nebius stack."

---

## Dependencies

```json
{
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "ai": "latest",
    "@ai-sdk/openai-compatible": "latest",
    "zod": "latest"
  }
}
```

Tavily is a simple REST call. No SDK needed.

---

## Environment Variables

```
NEBIUS_API_KEY=       # Nebius Token Factory
TAVILY_API_KEY=       # Tavily search
```

That is the entire stack. Two API keys. One model. Three thinking levels.
