<!-- BEGIN:nextjs-agent-rules -->
# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated - the docs are the source of truth.
<!-- END:nextjs-agent-rules -->

# Package Manager

This project uses **bun**, not npm or yarn. Always use `bun install`, `bun add`, `bun run`, `bunx`, etc. Never use `npm` or `npx`.

## Cursor Cloud specific instructions

### Overview

TruthLens is a single Next.js 16 application (no database, no Docker). It provides real-time rhetorical analysis of text, URLs, and voice input using the Vercel AI Gateway.

### Required environment variables

- `AI_GATEWAY_API_KEY` — used by `@ai-sdk/gateway` for all LLM inference (analysis, verification, summarization). Without it, all `/api/analyze/*` and `/api/verify/*` routes fail.
- `EXA_API_KEY` — optional, used for web-based claim verification in `/api/verify`. Falls back gracefully to "unverifiable" if missing.
- `NVIDIA_API_KEY` — optional, only needed for voice/transcription via `/api/transcribe`.

### Running the app

- `bun run dev` starts the Next.js dev server on port 3000.
- `bun run build` produces a production build (Turbopack).
- `bun run lint` runs ESLint.
- `bun run smoke:readiness` runs offline smoke checks (stubs external deps).

### Gotchas

- Bun must be installed separately (`curl -fsSL https://bun.sh/install | bash`); it is not provided by nvm/node.
- The `gateway()` helper from `ai` reads `AI_GATEWAY_API_KEY` from the environment automatically — no `.env` file or explicit wiring is needed as long as the env var is set.
- There is no database or Docker; all session state lives in browser `localStorage`.
