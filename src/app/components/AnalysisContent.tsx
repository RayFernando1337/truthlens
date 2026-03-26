"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AnalysisSnapshot } from "@/lib/types";

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-semibold uppercase tracking-widest text-text-secondary">
      {children}
    </span>
  );
}

function AppealsToggle({ appeals }: { appeals: AnalysisSnapshot["appeals"] }) {
  const [open, setOpen] = useState<"ethos" | "pathos" | "logos" | null>(null);
  return (
    <div>
      <Lbl>Appeals</Lbl>
      <div className="mt-1 flex gap-1.5">
        {(["ethos", "pathos", "logos"] as const).map((k) => (
          <button
            key={k} type="button"
            onClick={() => setOpen((o) => (o === k ? null : k))}
            className={cn(
              "border px-2 py-1 text-sm font-semibold uppercase tracking-widest transition-colors",
              open === k
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground hover:border-text-secondary",
            )}
          >
            {k}
          </button>
        ))}
      </div>
      {open && (
        <p className="mt-1.5 max-w-md text-base leading-snug text-foreground">
          {appeals[open]}
        </p>
      )}
    </div>
  );
}

function GapsAndAssumptions({ snapshot }: { snapshot: AnalysisSnapshot }) {
  if (snapshot.missing.length === 0 && snapshot.assumptions.length === 0)
    return null;
  return (
    <div className="space-y-2">
      {snapshot.missing.length > 0 && (
        <div>
          <Lbl>Gaps</Lbl>
          <ol className="mt-1 space-y-0.5 border-l-2 border-brand/40 pl-2">
            {snapshot.missing.map((m, i) => (
              <li key={i} className="text-base leading-snug text-brand">
                <span className="mr-1.5 text-text-secondary">{i + 1}.</span>{m}
              </li>
            ))}
          </ol>
        </div>
      )}
      {snapshot.assumptions.length > 0 && (
        <div>
          <Lbl>Assumptions</Lbl>
          <ol className="mt-1 space-y-0.5 border-l-2 border-yellow/40 pl-2">
            {snapshot.assumptions.map((a, i) => (
              <li key={i} className="text-base leading-snug text-yellow">
                <span className="mr-1.5 text-text-secondary">{i + 1}.</span>{a}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function EmotionalAppealsSection({ items }: { items: AnalysisSnapshot["emotionalAppeals"] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <Lbl>Emotional techniques</Lbl>
      {items.map((ea, i) => (
        <div key={i} className="mt-1 border-l-2 border-yellow pl-2">
          <p className="text-base font-medium text-yellow">{ea.type}</p>
          <p className="text-sm italic text-muted-foreground">&ldquo;{ea.quote}&rdquo;</p>
          <p className="text-sm text-text-secondary">{ea.technique}</p>
        </div>
      ))}
    </div>
  );
}

function FallaciesSection({ items }: { items: AnalysisSnapshot["namedFallacies"] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <Lbl>Fallacies</Lbl>
      {items.map((f, i) => (
        <div key={i} className="mt-1 border-l-2 border-brand pl-2">
          <p className="text-base font-medium text-brand">{f.name}</p>
          <p className="text-sm italic text-muted-foreground">&ldquo;{f.quote}&rdquo;</p>
          <p className="text-sm text-text-secondary">{f.impact}</p>
        </div>
      ))}
    </div>
  );
}

function BiasesSection({ items }: { items: AnalysisSnapshot["cognitiveBiases"] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <Lbl>Cognitive biases</Lbl>
      {items.map((b, i) => (
        <div key={i} className="mt-1 border-l-2 border-yellow pl-2">
          <p className="text-base font-medium text-yellow">{b.name}</p>
          <p className="text-sm italic text-muted-foreground">&ldquo;{b.quote}&rdquo;</p>
          <p className="text-sm text-text-secondary">{b.influence}</p>
        </div>
      ))}
    </div>
  );
}

export function AnalysisContent({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="space-y-3 px-4 py-3">
      <p className="text-base leading-relaxed text-foreground">{snapshot.tldr}</p>
      {snapshot.speakerIntent && (
        <p className="border-l-2 border-brand pl-2 text-base italic leading-snug text-brand">
          &ldquo;{snapshot.speakerIntent}&rdquo;
        </p>
      )}
      <div>
        <Lbl>Core points</Lbl>
        <ul className="mt-1 space-y-0.5">
          {snapshot.corePoints.map((p, i) => (
            <li key={i} className="text-base leading-snug text-foreground">
              <span className="mr-1.5 text-text-secondary">{i + 1}.</span>{p}
            </li>
          ))}
        </ul>
      </div>
      {snapshot.evidenceTable.length > 0 && (
        <div>
          <Lbl>Evidence</Lbl>
          {snapshot.evidenceTable.map((r, i) => (
            <div key={i} className="mt-1 border-l-2 border-input pl-2">
              <p className="text-base font-medium text-foreground">{r.claim}</p>
              <p className="text-sm text-text-secondary">{r.evidence}</p>
              {r.quote && (
                <p className="text-sm italic text-muted-foreground">&ldquo;{r.quote}&rdquo;</p>
              )}
            </div>
          ))}
        </div>
      )}
      <GapsAndAssumptions snapshot={snapshot} />
      <AppealsToggle appeals={snapshot.appeals} />
      <EmotionalAppealsSection items={snapshot.emotionalAppeals} />
      <FallaciesSection items={snapshot.namedFallacies} />
      <BiasesSection items={snapshot.cognitiveBiases} />
      <div className="border border-green/30 bg-green/5 p-2.5">
        <Lbl>Steelman</Lbl>
        <p className="mt-1 text-base leading-snug text-foreground">
          {snapshot.steelman}
        </p>
      </div>
    </div>
  );
}
