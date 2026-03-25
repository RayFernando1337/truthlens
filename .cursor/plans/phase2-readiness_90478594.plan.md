---
name: phase2-readiness
overview: Stabilize the rearchitecture foundations before Phase 2 by reconciling the plan, making contracts canonical, aligning L1 behavior with the new model, and then implementing the unified analysis and verification backends on top of those fixed contracts.
todos:
  - id: reconcile-plan
    content: Normalize the rearchitecture plan so names, endpoints, scheduling ownership, and phase boundaries are consistent.
    status: pending
  - id: align-contracts
    content: Make the canonical analysis, summary, and claim contracts match exactly between src/lib/types.ts and src/lib/schemas.ts.
    status: pending
  - id: align-l1
    content: Bring the pulse API, prompt contract, and severity policy into sync around TranscriptSegment context and neutral building semantics.
    status: pending
  - id: clear-lint-blockers
    content: Fix the current effect-hook lint errors that would destabilize continued architecture work.
    status: pending
  - id: build-phase2a
    content: Implement the unified /api/analyze and /api/analyze/summarize routes plus shared pipeline policy utilities.
    status: pending
  - id: build-phase2b
    content: Implement the claim queue, pre-check, Exa verification flow, and remove Tavily from the new architecture.
    status: pending
isProject: false
---

# Phase 2 Readiness And Execution

## Goal

Get the TruthLens rearchitecture onto a single, internally consistent foundation so Phase 2 backend work does not build on drifted types, half-wired prompts, or duplicate architecture paths.

## Decisions To Lock

- Canonical merged analysis contract: [`src/lib/types.ts`](src/lib/types.ts) `AnalysisSnapshot` and [`src/lib/schemas.ts`](src/lib/schemas.ts) `analysisSnapshotSchema`.
- Canonical analysis endpoint: [`src/app/api/analyze/route.ts`](src/app/api/analyze/route.ts), not a long-term rewrite of [`src/app/api/analyze/deep/route.ts`](src/app/api/analyze/deep/route.ts).
- Canonical scheduling module: [`src/lib/pipeline-policy.ts`](src/lib/pipeline-policy.ts). Do not split cadence logic across a second scheduler file.
- Canonical structured generation path: use `generateObject()` for new Phase 2 routes instead of extending [`src/lib/structured-generate.ts`](src/lib/structured-generate.ts).
- Legacy types and routes remain only as short-lived migration shims and receive no new feature work.

## Pre-Phase-2 Cleanup

- Reconcile naming, endpoint, and phase boundaries in [`.cursor/plans/pipeline_rearchitecture_v2_1ebed30b.plan.md`](.cursor/plans/pipeline_rearchitecture_v2_1ebed30b.plan.md). Remove `UnifiedAnalysis`/`AnalysisSnapshot` ambiguity, `/api/analyze` vs `deep/route.ts` ambiguity, and `adaptive-scheduler.ts` vs `pipeline-policy.ts` ambiguity.
- Make [`src/lib/types.ts`](src/lib/types.ts) and [`src/lib/schemas.ts`](src/lib/schemas.ts) exact peers. Add the missing `AnalysisSnapshot` provenance fields, complete the `SessionSummary` schema shape, and add a `ClaimCandidate` schema.
- Align the L1 contract between [`src/lib/prompts.ts`](src/lib/prompts.ts), [`src/app/api/analyze/pulse/route.ts`](src/app/api/analyze/pulse/route.ts), and the future session model. The pulse route should accept the current segment plus optional prior context so the prompt matches the wire contract.
- Update [`src/lib/pulse-utils.ts`](src/lib/pulse-utils.ts) so `building` is neutral and the new flag types have an explicit severity policy aligned with the app’s fairness principles.
- Fix the current true blockers from lint: the `react-hooks/set-state-in-effect` errors in [`src/app/components/PulseFeed.tsx`](src/app/components/PulseFeed.tsx) and [`src/app/components/TranscriptInput.tsx`](src/app/components/TranscriptInput.tsx). Defer broad file-size cleanup that Phase 3/4 will naturally replace.

## Phase 2A Unified Analysis

- Create [`src/app/api/analyze/route.ts`](src/app/api/analyze/route.ts) as the single merged analysis endpoint.
- Accept a request shaped around `TranscriptSegment[]`, `runningSummary`, `mode`, and any optional prior pulse metadata needed for `flagRevisions`.
- Return a full `AnalysisSnapshot` with provenance fields populated.
- Move analysis generation to `generateObject()` and `analysisSnapshotSchema`.
- Remove Tavily from the analysis path entirely.
- Create [`src/app/api/analyze/summarize/route.ts`](src/app/api/analyze/summarize/route.ts) for rolling summary maintenance using the canonical `SessionSummary` contract.
- Add [`src/lib/pipeline-policy.ts`](src/lib/pipeline-policy.ts) with both sliding-window cadence and full-pass cadence helpers.

## Phase 2B Verification

- Create [`src/lib/exa.ts`](src/lib/exa.ts) for Exa-backed web verification.
- Create [`src/lib/claim-queue.ts`](src/lib/claim-queue.ts) to normalize, dedupe, prioritize, and cap claims using the canonical `ClaimCandidate` contract.
- Create [`src/app/api/verify/pre-check/route.ts`](src/app/api/verify/pre-check/route.ts) for LLM-only pre-verification using `LLMPreVerdict`.
- Create [`src/app/api/verify/route.ts`](src/app/api/verify/route.ts) to orchestrate pre-check plus Exa fallback and return the canonical verification result structure.
- Remove Tavily verification remnants only after the new verification flow is live.

## Integration Boundary

- Keep [`src/app/page.tsx`](src/app/page.tsx) and the current panel stack on a temporary compatibility layer during Phase 2.
- Do not do the full `useTruthSession` and `TruthPanel` rewire until the backend contracts are stable.
- Retire [`src/app/api/analyze/deep/route.ts`](src/app/api/analyze/deep/route.ts), [`src/app/api/analyze/patterns/route.ts`](src/app/api/analyze/patterns/route.ts), deprecated prompts, and deprecated schemas only after the new unified route is wired and validated.

## Ready-For-Phase-2 Gate

Phase 2 execution is considered safe to begin once these are true:

- The plan file uses one naming scheme and one phase scheme.
- Types and schemas match exactly for the new contracts.
- The L1 pulse route matches the updated prompt contract.
- New flag severities reflect intended product meaning.
- Current effect-hook lint blockers are fixed.

## Execution Order

1. Reconcile the plan document.
2. Fix contract parity in `types.ts` and `schemas.ts`.
3. Align the L1 pulse contract and severity policy.
4. Fix the current effect-hook lint blockers.
5. Implement unified analysis and summary routes.
6. Implement verification routes and shared libs.
7. Add compatibility glue only as needed, then remove legacy analysis paths.
