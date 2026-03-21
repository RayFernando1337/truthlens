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

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.0, React 19.2.4, TypeScript 5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`), JetBrains Mono |
| AI SDK | Vercel AI SDK v6 (`ai`, `@ai-sdk/openai-compatible`) |
| Inference | Nemotron 3 Super 120B on Nebius Token Factory (~400 tok/s) |
| ASR | NVIDIA Riva Speech Recognition via gRPC (NIM) |
| Search/Verify | Tavily (agentic search, basic + advanced depth) |
| Content Extract | Mozilla Readability + linkedom |
| Validation | Zod v4 |
| Package Manager | Bun |
| Deployment | Vercel |

---

## Architecture

```
                     +-----------------------+
                     |     Content Input      |
                     |  paste / URL / voice   |
                     +-----------+-----------+
                                 |
               +-----------------+-----------------+
               |                 |                 |
           paste text      URL extract       voice (mic)
               |           /api/extract      4s PCM chunks
               |           Readability       /api/transcribe
               |                |            NVIDIA Riva ASR
               +--------+------+------+--------+
                        |             |
                   chunk in frontend  |
                        |             |
               +--------v---------+   |
               |   Chunk Router   |   |
               |   (page.tsx)     |   |
               +--+------+-----+-+   |
                  |      |     |     |
         L1 every|      |     |L3 every
         chunk   |      |     |6+ chunks
                  v      |     v
             +----+--+   |  +-+-------+
             |  L1   |   |  |   L3    |
             | Pulse |   |  | Pattern |
             +-------+   |  +---------+
                         |
                L2 every 3-4 chunks
                (voice: every 8, then +4)
                         |
                    +----v----+
                    |   L2    |
                    |  Deep   |
                    +---------+
```

### L1 -- Pulse (real-time, <1s response)

Fires on every chunk. Lightweight structured output, no tool use.

- **Route:** `POST /api/analyze/pulse`
- **Model:** `nvidia/nemotron-3-super-120b-a12b` via Nebius
- **Input:** `{ chunk: string }`
- **Output:** `{ claims[], flags[], tone, confidence }`
- **Rendering:** Inline badges per transcript segment (PulseFeed), severity dots in pulse strip (InsightsPanel)
- **Max duration:** 30s

### L2 -- Deep Analysis (5-15s, background)

Fires after 3-4 chunks accumulate (paste) or every 8 chunks then +4 (voice). Full rhetorical breakdown with claim verification.

- **Route:** `POST /api/analyze/deep`
- **Model:** same Nemotron Super
- **Input:** `{ chunks: string[], claims?: string[] }`
- **Tool:** Tavily search (advanced depth) for up to 3 claims in parallel
- **Output:** `{ tldr, corePoints, underlyingStatement, evidenceTable, appeals, assumptions, steelman, missing, sources[] }`
- **Rendering:** Expandable sections in AnalysisPanel, inline in InsightsPanel
- **Max duration:** 60s

### L3 -- Patterns (ongoing, leverages 1M context)

Fires after 6+ chunks. Sends full session transcript.

- **Route:** `POST /api/analyze/patterns`
- **Model:** same Nemotron Super
- **Input:** `{ transcript: string }`
- **Output:** `{ patterns[], trustTrajectory[], overallAssessment, fullAnalysis? }`
- **Rendering:** Trust trajectory chart, pattern cards, overall assessment
- **Max duration:** 60s

### Content Extraction

- **Route:** `POST /api/extract`
- **Input:** `{ url: string }` (HTTP/HTTPS only)
- **Logic:** Fetches with custom User-Agent (15s timeout), parses with Mozilla Readability + linkedom
- **Output:** `{ title, text, excerpt }`

### Speech-to-Text

- **Route:** `POST /api/transcribe`
- **Input:** FormData with `audio` (PCM Blob) and optional `sampleRate`
- **Logic:** Validates blob, converts to PCM buffer, skips buffers <320 bytes, calls NVIDIA Riva gRPC
- **Output:** `{ text: string }`
- **Max duration:** 30s

---

## Data Models

### Core Types (`src/lib/types.ts`)

```typescript
interface PulseFlag {
  type: "vague" | "stat" | "prediction" | "attribution" | "logic" | "contradiction";
  label: string;
}

interface PulseResult {
  claims: string[];
  flags: PulseFlag[];
  tone: string;
  confidence: number;       // 0.0 – 1.0
}

interface PulseEntry {
  id: string;
  chunk: string;
  result: PulseResult;
}

interface EvidenceRow {
  claim: string;
  evidence: string;
}

interface Appeals {
  ethos: string;
  pathos: string;
  logos: string;
}

interface TavilySource {
  query: string;
  title: string;
  url: string;
  snippet: string;           // first 300 chars of Tavily content
  score: number;
}

interface AnalysisResult {
  tldr: string;
  corePoints: string[];
  underlyingStatement: string;
  evidenceTable: EvidenceRow[];
  appeals: Appeals;
  assumptions: string[];
  steelman: string;
  missing: string[];
  sources?: TavilySource[];
}

interface PatternEntry {
  type: "escalation" | "contradiction" | "narrative-arc" | "cherry-picking";
  description: string;
}

interface PatternsResult {
  patterns: PatternEntry[];
  trustTrajectory: number[];  // array of 0.0–1.0 values
  overallAssessment: string;
  fullAnalysis?: AnalysisResult;
}
```

### Zod Schemas (`src/lib/schemas.ts`)

Three schemas mirror the types above and are used with `generateStructured` for AI output validation:

| Schema | Used By | Purpose |
|--------|---------|---------|
| `pulseSchema` | L1 `/api/analyze/pulse` | Validates claim extraction per chunk |
| `analysisSchema` | L2 `/api/analyze/deep` | Validates rhetorical breakdown |
| `patternsSchema` | L3 `/api/analyze/patterns` | Validates pattern detection + full analysis |

### Utility Types

| Type | File | Definition |
|------|------|-----------|
| `ChunkSeverity` | `src/lib/pulse-utils.ts` | `"ok" \| "warn" \| "flag"` |
| `Tab` | `src/app/page.tsx` | `"pulse" \| "analysis" \| "patterns"` |
| `ViewMode` | `src/app/page.tsx` | `"debug" \| "insights"` |
| `DemoKey` | `TranscriptInput.tsx` | `"generic" \| "andreessen" \| "lennypod"` |
| `InputMode` | `TranscriptInput.tsx` | `"text" \| "url" \| "voice"` |
| `UseVoiceInputOptions` | `src/hooks/useVoiceInput.ts` | `{ onChunkTranscribed, chunkDurationMs? }` |
| `RivaAlternative` | `src/lib/nvidia-asr.ts` | `{ transcript, confidence }` |
| `RivaResult` | `src/lib/nvidia-asr.ts` | `{ alternatives: RivaAlternative[] }` |
| `RivaRecognizeResponse` | `src/lib/nvidia-asr.ts` | `{ results: RivaResult[] }` |
| `TavilyResult` | `src/lib/tavily.ts` | `{ title, url, content, score }` |
| `TavilyResponse` | `src/lib/tavily.ts` | `{ results: TavilyResult[], query }` |

### API Request / Response Shapes

| Route | Request | Response |
|-------|---------|----------|
| `POST /api/analyze/pulse` | `{ chunk: string }` | `PulseResult` |
| `POST /api/analyze/deep` | `{ chunks: string[], claims?: string[] }` | `AnalysisResult & { sources: TavilySource[] }` |
| `POST /api/analyze/patterns` | `{ transcript: string }` | `PatternsResult` |
| `POST /api/extract` | `{ url: string }` | `{ title, text, excerpt }` |
| `POST /api/transcribe` | FormData (`audio`, `sampleRate`) | `{ text: string }` |

---

## Backend Modules (`src/lib/`)

### `nemotron.ts` -- LLM Provider

```typescript
const nemotron = createOpenAICompatible({
  name: 'nebius',
  baseURL: 'https://api.tokenfactory.nebius.com/v1/',
  headers: { Authorization: `Bearer ${process.env.NEBIUS_API_KEY}` },
});
export const model = nemotron.chatModel('nvidia/nemotron-3-super-120b-a12b');
```

### `structured-generate.ts` -- Output Parser

Wraps Vercel AI SDK `generateText()` with:
- JSON extraction from fenced or raw braces
- Zod validation
- Retry loop (up to 2 retries) injecting validation errors back into the prompt

### `nvidia-asr.ts` -- Speech Recognition

- NVIDIA Riva gRPC at `grpc.nvcf.nvidia.com:443`
- Config: LINEAR_PCM, `en-US`, automatic punctuation
- Auth: `NVIDIA_API_KEY` + optional `NVIDIA_ASR_FUNCTION_ID`

### `tavily.ts` -- Search & Verification

- REST POST to `https://api.tavily.com/search`
- Supports `basic` and `advanced` search depth
- Returns up to 5 results with title, url, content, score

### `prompts.ts` -- System Prompts

Three prompts, one per tier (L1/L2/L3). See [Prompts](#prompts) section below.

### `pulse-utils.ts` -- Severity Helpers

- `severityFromFlags(flags)`: maps flag types to `ChunkSeverity`
  - `logic`, `contradiction`, `stat`, `attribution` → `"flag"` (red)
  - `vague`, `prediction` → `"warn"` (yellow)
  - no flags → `"ok"` (green)
- `severityFromPulse(result)`: convenience wrapper

---

## Frontend Structure

```
src/
├── app/
│   ├── page.tsx                    -- main layout, state, chunk routing
│   ├── layout.tsx                  -- root layout, JetBrains Mono font
│   ├── globals.css                 -- Tailwind v4 theme, custom properties
│   ├── favicon.ico
│   ├── api/
│   │   ├── analyze/
│   │   │   ├── pulse/route.ts      -- L1 endpoint
│   │   │   ├── deep/route.ts       -- L2 endpoint
│   │   │   ├── patterns/route.ts   -- L3 endpoint
│   │   │   └── extract/route.ts    -- (duplicate, unused)
│   │   ├── extract/route.ts        -- URL content extraction
│   │   └── transcribe/route.ts     -- voice-to-text
│   └── components/
│       ├── TranscriptInput.tsx     -- input panel (paste / URL / voice)
│       ├── PulseFeed.tsx           -- L1 scrolling feed
│       ├── AnalysisPanel.tsx       -- L2 expandable sections
│       ├── PatternsPanel.tsx       -- L3 trust chart + patterns
│       ├── InsightsPanel.tsx       -- combined view of all tiers
│       ├── ArchitectureDiagram.tsx -- modal explaining 3-tier arch
│       ├── Flag.tsx                -- claim flag pill badge
│       └── ConfidenceMeter.tsx     -- 0-100% bar meter
├── hooks/
│   └── useVoiceInput.ts            -- mic capture, 4s chunking, transcribe
├── lib/
│   ├── nemotron.ts                 -- Nebius/Nemotron provider
│   ├── nvidia-asr.ts               -- Riva gRPC ASR client
│   ├── prompts.ts                  -- L1/L2/L3 system prompts
│   ├── schemas.ts                  -- Zod validation schemas
│   ├── structured-generate.ts      -- generateText + Zod retry loop
│   ├── tavily.ts                   -- Tavily search client
│   ├── types.ts                    -- shared TypeScript interfaces
│   └── pulse-utils.ts              -- severity calculation
├── proto/
│   └── riva_asr.proto              -- NVIDIA Riva protobuf definition
└── skill/
    └── rhetorical-analyzer/
        └── SKILL.md                -- rhetorical analysis skill reference
```

---

## UI Architecture

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ HEADER                                                            │
│ TRUTHLENS │ [Insights | Debug] │ "3-tier analysis" │ LIVE │ flags│
├──────────────────┬───────────────────────────────────────────────┤
│ LEFT (320-400px) │ RIGHT (flex-1)                                │
│                  │                                               │
│ TranscriptInput  │ [Insights mode]                               │
│  ├ demo buttons  │   InsightsPanel                               │
│  ├ input mode    │    ├ live pulse strip (clickable chunks)      │
│  │ (text/url/    │    ├ overall assessment + TrustChart          │
│  │  voice)       │    ├ detected patterns                        │
│  ├ textarea OR   │    └ deep analysis (TLDR, evidence, appeals)  │
│  │ voice feed    │                                               │
│  └ action bar    │ [Debug mode]                                  │
│                  │   Tabs: [Pulse] [Analysis] [Patterns]         │
│                  │    ├ PulseFeed (L1 entries)                    │
│                  │    ├ AnalysisPanel (L2 sections)               │
│                  │    └ PatternsPanel (L3 chart + patterns)       │
└──────────────────┴───────────────────────────────────────────────┘
```

### Component Hierarchy

```
Layout (JetBrains Mono)
└── Home (page.tsx) — all state lives here
    ├── Header
    │   ├── Logo: "TRUTHLENS"
    │   ├── View toggle: Insights / Debug
    │   ├── "3-tier analysis" → ArchitectureDiagram (modal)
    │   ├── LIVE badge (when recording)
    │   └── Total flags count
    ├── Left Column
    │   └── TranscriptInput
    │       ├── Demo buttons: "Tech pitch" / "Andreessen" / "Lenny Pod"
    │       ├── Mode selector: text / url / voice
    │       ├── Mic / Stop controls
    │       ├── Content area: textarea OR voice transcript (numbered chunks with severity borders)
    │       └── Action bar: Analyze / Fetch & Analyze / progress / "Scroll to live"
    └── Right Column
        ├── InsightsPanel (insights mode)
        │   ├── Live pulse strip (severity dots, click to seek)
        │   ├── Overall assessment block
        │   ├── TrustChart (SVG line/area)
        │   ├── Pattern cards
        │   └── Deep analysis: TLDR, core points, evidence table,
        │       appeals (ethos/pathos/logos toggles), steelman, gaps
        └── Debug Tabs (debug mode)
            ├── PulseFeed
            │   ├── Flag (per claim)
            │   └── ConfidenceMeter (per entry)
            ├── AnalysisPanel
            │   └── Section (collapsible per category)
            └── PatternsPanel
                └── TrustChart (SVG)
```

### Component Props

| Component | Key Props |
|-----------|-----------|
| `TranscriptInput` | `onAnalyze`, `onFetchUrl`, `isRecording`, `isProcessing`, `isFetchingUrl`, `voiceTranscript`, `voiceError`, `onStartRecording`, `onStopRecording`, `chunkProgress`, `insightsMode?`, `voiceChunkSeverities?` |
| `PulseFeed` | `entries: PulseEntry[]`, `processingChunk: string \| null` |
| `AnalysisPanel` | `result: AnalysisResult \| null`, `isLoading` |
| `PatternsPanel` | `result: PatternsResult \| null`, `isLoading` |
| `InsightsPanel` | `entries`, `processingChunk`, `analysisResult`, `patternsResult`, `isAnalysisLoading`, `isPatternsLoading`, `onSeekTranscriptChunk` |
| `ArchitectureDiagram` | `onClose` |
| `Flag` | `flag: PulseFlag` |
| `ConfidenceMeter` | `value: number`, `label?: string` |

### State Management

All state lives in `page.tsx` (no external store):

| Category | State |
|----------|-------|
| View | `viewMode: ViewMode`, `showArch: boolean`, `activeTab: Tab` |
| L1 Data | `pulseEntries: PulseEntry[]`, `processingChunk: string \| null` |
| L2 Data | `analysisResult: AnalysisResult \| null`, `isAnalysisLoading` |
| L3 Data | `patternsResult: PatternsResult \| null`, `isPatternsLoading` |
| Input | `voiceTranscript: string[]`, `voiceError: string \| null`, `isProcessing`, `isFetchingUrl`, `chunkProgress` |
| Refs | `abortRef`, `voiceChunksRef`, `voiceClaimsRef`, `voiceChunkIdRef`, `voiceLastL2AtChunkCountRef`, `voiceLastL3AtChunkCountRef` |

### Chunk Routing Logic (Frontend)

The frontend orchestrates when each analysis tier fires:

| Tier | Paste Mode | Voice Mode |
|------|-----------|------------|
| L1 Pulse | Every chunk | Every chunk |
| L2 Deep | After 3-4 chunks | After 8 chunks, then every +4 |
| L3 Patterns | After 6 chunks | After 6 chunks, then every +4 |

Voice mode collects claims from L1 results and passes them to L2 for Tavily verification.

### Design Language

Factory-inspired. No decoration, no gradients, no rounded corners on cards. The information is the interface.

```
Font:        JetBrains Mono (monospace throughout)
Background:  #0a0a0a (near black)
Surface:     #141414 (panels)
Border:      #222222 (1px solid, sharp corners)
Text:        #e5e5e5 (primary), #666666 (secondary)
Accent:      #ff4400 (warnings/flags only)
Green:       #00cc66 (supported claims / "ok" severity)
Yellow:      #ffaa00 (partial support / "warn" severity)
```

Color only carries meaning. Severity borders on voice transcript chunks use the same palette.

Selection highlight: `#ff440033` (subtle orange).

---

## Voice Input Pipeline

```
Mic (getUserMedia)
  → ScriptProcessorNode (Float32 → Int16 PCM)
  → Buffer every 4 seconds
  → POST /api/transcribe (FormData: audio blob + sampleRate)
  → NVIDIA Riva gRPC (en-US, punctuation)
  → transcript text
  → onChunkTranscribed callback
  → page.tsx routes chunk to L1 / L2 / L3
```

The `useVoiceInput` hook manages the entire mic → transcription pipeline. Default chunk duration is 4000ms.

---

## Prompts

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
optional search results for verification, produce a structured analysis.

Return valid JSON:
{
  "tldr": "string",
  "corePoints": ["string"],
  "underlyingStatement": "string",
  "evidenceTable": [{ "claim": "string", "evidence": "string" }],
  "appeals": { "ethos": "string", "pathos": "string", "logos": "string" },
  "assumptions": ["string"],
  "steelman": "string",
  "missing": ["string"]
}
```

### L3 System Prompt

```
You are a pattern detection and rhetorical analysis system. Given the
full transcript of a session, identify cross-claim patterns,
contradictions, narrative arcs, confidence trajectory, and provide a
comprehensive rhetorical analysis.

Return valid JSON:
{
  "patterns": [{ "type": "escalation|contradiction|narrative-arc|cherry-picking", "description": "string" }],
  "trustTrajectory": [0.0-1.0],
  "overallAssessment": "string",
  "fullAnalysis": { tldr, corePoints, underlyingStatement, evidenceTable, appeals, assumptions, steelman, missing }
}
```

---

## Configuration

### `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ["@mozilla/readability", "linkedom"],
};
```

### Tailwind v4

No `tailwind.config.ts`. Theme defined in `globals.css`:

```css
@import "tailwindcss";

@theme inline {
  --color-bg: #0a0a0a;
  --color-surface: #141414;
  --color-border: #222222;
  --color-text: #e5e5e5;
  --color-text-secondary: #666666;
  --color-accent: #ff4400;
  --color-green: #00cc66;
  --color-yellow: #ffaa00;
}
```

### ESLint

Uses `eslint-config-next` with core-web-vitals and TypeScript rules.

### TypeScript

Strict mode, bundler module resolution, `@/*` path alias to `./src/*`.

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEBIUS_API_KEY` | Nebius Token Factory (Nemotron inference) |
| `TAVILY_API_KEY` | Tavily search API |
| `NVIDIA_API_KEY` | NVIDIA Riva ASR |
| `NVIDIA_ASR_FUNCTION_ID` | Riva function ID (optional, has default) |

---

## Dependencies

```json
{
  "dependencies": {
    "@ai-sdk/openai-compatible": "^2.0.35",
    "@grpc/grpc-js": "^1.14.3",
    "@grpc/proto-loader": "^0.8.0",
    "@mozilla/readability": "^0.6.0",
    "ai": "^6.0.116",
    "linkedom": "^0.18.12",
    "next": "16.2.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## Roadmap: Auth & Persistence

### Phase 1: Clerk Authentication

Add user authentication via Clerk to gate access and identify users.

- **Provider:** Clerk (`@clerk/nextjs`)
- **Scope:** Wrap app in `<ClerkProvider>`, add `middleware.ts` for route protection
- **UI:** Sign-in/sign-up flow, user button in header
- **Protected routes:** All `/api/analyze/*` endpoints require authenticated session

### Phase 2: Convex Database

Add Convex as the backend database for usage tracking, session persistence, and eventual paywall enforcement.

**Proposed Convex schema:**

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("pro")),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  sessions: defineTable({
    userId: v.id("users"),
    inputMode: v.union(v.literal("text"), v.literal("url"), v.literal("voice")),
    sourceUrl: v.optional(v.string()),
    chunkCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  analyses: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    tier: v.union(v.literal("L1"), v.literal("L2"), v.literal("L3")),
    input: v.string(),
    result: v.string(),             // JSON-serialized result
    tokensUsed: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user_tier", ["userId", "tier"]),

  usageLimits: defineTable({
    userId: v.id("users"),
    period: v.string(),             // "2026-03" (monthly)
    analysisCount: v.number(),
    tokensConsumed: v.number(),
  })
    .index("by_user_period", ["userId", "period"]),
});
```

**Key Convex functions:**

| Function | Type | Purpose |
|----------|------|---------|
| `users.getOrCreate` | mutation | Upsert user from Clerk webhook / session |
| `sessions.create` | mutation | Start a new analysis session |
| `analyses.record` | mutation | Store L1/L2/L3 result after completion |
| `usageLimits.check` | query | Check if user is within free-tier limits |
| `usageLimits.increment` | mutation | Bump counters after each analysis |

### Phase 3: Paywall & Usage Gating

- Free tier: N analyses per month (exact limit TBD based on feedback)
- Track `analysisCount` and `tokensConsumed` in `usageLimits` table
- Check limits before running L2/L3 (L1 stays free to keep the hook)
- Upgrade prompt in-app when limits approached/reached

### Future Considerations

- **Session history:** Let users revisit past analyses stored in Convex
- **Sharing:** Generate shareable links to analysis results
- **Export:** PDF / markdown export of analysis reports
- **Multi-model:** Support alternative models (GPT-4o, Claude) as user-selectable options
- **Browser extension:** Analyze content directly on the page being viewed
- **Collaborative analysis:** Multiple users annotating the same content

---

## User Flow

```
1. Land on TruthLens
2. Choose input method:
   a. Paste text directly
   b. Paste a URL → extract article content
   c. Click mic → live voice transcription
3. Content is chunked and routed:
   - Each chunk → L1 Pulse (instant flags, claims, confidence)
   - Every 3-4 chunks → L2 Deep (rhetorical breakdown + Tavily verification)
   - Every 6+ chunks → L3 Patterns (cross-claim analysis, trust trajectory)
4. View results:
   - Insights mode: combined dashboard with pulse strip, assessment, analysis
   - Debug mode: tabbed view of raw L1/L2/L3 outputs
5. Interact:
   - Click pulse strip chunks to seek in transcript
   - Expand/collapse analysis sections
   - Toggle ethos/pathos/logos appeals
   - View architecture diagram
```

---

Three API keys. One model. Three thinking levels. Voice, text, and URL input. Real-time analysis as the content flows.
