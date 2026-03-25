---
name: rhetorical-analyzer
description: Analyze articles, tweets, posts, or arguments to extract their core logic, separate emotional appeals from evidence, and identify unexamined assumptions. Use when Ray says "analyze this article", "break this down", "what's he really saying", "strip out the emotion", "what's the TL;DR", "what are the actual arguments", "help me reason about this", or provides content asking for rhetorical/logical analysis.
---

# Rhetorical Analyzer

Deconstruct arguments to separate logic from persuasion techniques.

## Output Structure

### 1. TL;DR (1-2 sentences)
The author's core claim in its simplest form.

### 2. Core Points
Numbered list of the author's main arguments, stripped of rhetoric.

### 3. What They Actually Want to Say
Restate the argument as a personal preference or prediction, exposing the subjective core. Format: **"[Underlying personal statement]"**

### 4. Evidence/Proof Table

| Claim | Evidence Provided |
|-------|-------------------|
| [Claim] | [What they cite: data, anecdote, assertion only, single example, etc.] |

Flag notable gaps (missing market data, no user research, single anecdote extrapolated, etc.)

### 5. Rhetorical Appeals

**Ethos (credibility)** - How they establish authority
**Pathos (emotion)** - Emotional language, framing, fear/freedom dichotomies
**Logos (logic)** - The actual logical chain (A → B → C therefore D)

### 6. Unexamined Assumptions
Numbered list of premises the author takes for granted but hasn't proven. These are the weak points.

### 7. Steelman Version
Restate their argument in its strongest, most defensible form (1-2 sentences).

### 8. What's Missing
What evidence, counterarguments, or considerations would strengthen or challenge the argument?

## Analysis Principles

- Treat all arguments as sincere attempts at reasoning, even inflammatory ones
- Separate "what they said" from "what they proved"
- Personal anecdotes ≠ market evidence
- Single examples ≠ patterns
- Assertions ≠ evidence
- Emotional framing reveals what they want you to feel, not what's true
- Market size claims require market data
- "Everyone will want X" requires user research

## Tone

Direct, analytical, fair. Don't mock the author. Do expose weak reasoning.
