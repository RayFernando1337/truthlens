"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="border-b border-[#222]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#666]">
          {title}
        </span>
        <span className="text-[10px] text-[#444]">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function AnalysisPanel({
  result,
  isLoading,
}: {
  result: AnalysisResult | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
          <span className="text-[10px] uppercase tracking-widest text-[#444]">
            Running deep analysis with verification
          </span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[11px] uppercase tracking-widest text-[#333]">
          Triggers after 3-4 chunks
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-[#222] px-4 py-4">
        <p className="text-sm leading-relaxed text-[#e5e5e5]">
          {result.tldr}
        </p>
        <p className="mt-2 text-xs text-[#ff4400]">
          {result.underlyingStatement}
        </p>
      </div>

      <Section title="Core Points" defaultOpen>
        <ul className="space-y-1">
          {result.corePoints.map((point, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-[#e5e5e5]"
            >
              <span className="mt-0.5 text-[#666]">{i + 1}</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evidence Table" defaultOpen>
        <div className="space-y-2">
          {result.evidenceTable.map((row, i) => (
            <div key={i} className="border-l border-[#333] pl-3">
              <p className="text-xs font-medium text-[#e5e5e5]">
                {row.claim}
              </p>
              <p className="mt-0.5 text-[11px] text-[#666]">
                {row.evidence}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Rhetorical Appeals">
        <div className="space-y-2">
          {(["ethos", "pathos", "logos"] as const).map((key) => (
            <div key={key}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">
                {key}
              </span>
              <p className="mt-0.5 text-xs text-[#e5e5e5]">
                {result.appeals[key]}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Assumptions">
        <ul className="space-y-1">
          {result.assumptions.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[#ffaa00]">
              <span className="mt-0.5 text-[#444]">!</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Steelman">
        <p className="text-xs leading-relaxed text-[#00cc66]">
          {result.steelman}
        </p>
      </Section>

      <Section title="Missing Evidence">
        <ul className="space-y-1">
          {result.missing.map((m, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[#ff4400]">
              <span className="mt-0.5">?</span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
