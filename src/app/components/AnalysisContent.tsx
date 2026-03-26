"use client";

import { useState } from "react";
import type { AnalysisSnapshot } from "@/lib/types";

export function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-widest text-text-secondary">
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
            className={`border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors ${
              open === k
                ? "border-foreground bg-foreground text-bg"
                : "border-[#333] text-[#888] hover:border-text-secondary"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      {open && (
        <p className="mt-1.5 max-w-md text-[11px] leading-snug text-foreground">
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
          <ol className="mt-1 space-y-0.5 border-l-2 border-accent/40 pl-2">
            {snapshot.missing.map((m, i) => (
              <li key={i} className="text-[11px] leading-snug text-accent">
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
              <li key={i} className="text-[11px] leading-snug text-yellow">
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
        <div key={i} className="mt-1 border-l-2 border-[#ffaa00] pl-2">
          <p className="text-[11px] font-medium text-[#ffaa00]">{ea.type}</p>
          <p className="text-[10px] italic text-[#888]">&ldquo;{ea.quote}&rdquo;</p>
          <p className="text-[10px] text-text-secondary">{ea.technique}</p>
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
        <div key={i} className="mt-1 border-l-2 border-accent pl-2">
          <p className="text-[11px] font-medium text-accent">{f.name}</p>
          <p className="text-[10px] italic text-[#888]">&ldquo;{f.quote}&rdquo;</p>
          <p className="text-[10px] text-text-secondary">{f.impact}</p>
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
        <div key={i} className="mt-1 border-l-2 border-[#ffaa00] pl-2">
          <p className="text-[11px] font-medium text-[#ffaa00]">{b.name}</p>
          <p className="text-[10px] italic text-[#888]">&ldquo;{b.quote}&rdquo;</p>
          <p className="text-[10px] text-text-secondary">{b.influence}</p>
        </div>
      ))}
    </div>
  );
}

export function AnalysisContent({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="space-y-3 px-4 py-3">
      <p className="text-xs leading-relaxed text-foreground">{snapshot.tldr}</p>
      {snapshot.speakerIntent && (
        <p className="border-l-2 border-accent pl-2 text-[11px] italic leading-snug text-accent">
          &ldquo;{snapshot.speakerIntent}&rdquo;
        </p>
      )}
      <div>
        <Lbl>Core points</Lbl>
        <ul className="mt-1 space-y-0.5">
          {snapshot.corePoints.map((p, i) => (
            <li key={i} className="text-[11px] leading-snug text-foreground">
              <span className="mr-1.5 text-text-secondary">{i + 1}.</span>{p}
            </li>
          ))}
        </ul>
      </div>
      {snapshot.evidenceTable.length > 0 && (
        <div>
          <Lbl>Evidence</Lbl>
          {snapshot.evidenceTable.map((r, i) => (
            <div key={i} className="mt-1 border-l-2 border-[#333] pl-2">
              <p className="text-[11px] font-medium text-foreground">{r.claim}</p>
              <p className="text-[10px] text-text-secondary">{r.evidence}</p>
              {r.quote && (
                <p className="text-[10px] italic text-[#888]">&ldquo;{r.quote}&rdquo;</p>
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
        <p className="mt-1 text-[11px] leading-snug text-foreground">
          {snapshot.steelman}
        </p>
      </div>
    </div>
  );
}
