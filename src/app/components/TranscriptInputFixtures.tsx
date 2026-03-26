"use client";

import { DEMO_FIXTURES } from "@/lib/demo-fixtures";
import type { DemoFixture, DemoInputMode } from "@/lib/types";

const DEMO_SECTIONS: ReadonlyArray<{ mode: DemoInputMode; label: string }> = [
  { mode: "text", label: "Paste text" },
  { mode: "url", label: "URL fetch" },
  { mode: "voice-prompt", label: "Voice test" },
];

export function TranscriptDemoMenu({
  onSelect,
}: {
  onSelect: (fixture: DemoFixture) => void;
}) {
  return (
    <div className="absolute right-0 top-full z-20 mt-1 min-w-[220px] border border-[#333] bg-surface py-1 shadow-lg">
      {DEMO_SECTIONS.map(({ mode, label }) => {
        const fixtures = DEMO_FIXTURES.filter((fixture) => fixture.inputMode === mode);
        if (fixtures.length === 0) return null;
        return (
          <div key={mode}>
            <p className="px-4 pb-1 pt-2 text-[9px] uppercase tracking-[0.2em] text-[#555]">
              {label}
            </p>
            {fixtures.map((fixture) => (
              <button
                key={fixture.key}
                type="button"
                onClick={() => onSelect(fixture)}
                data-testid={`demo-${fixture.key}`}
                className="block w-full px-4 py-1.5 text-left text-[11px] text-[#888] transition-colors hover:bg-[#1a1a1a] hover:text-foreground"
              >
                {fixture.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function TranscriptFixtureCard({
  fixture,
  onClear,
}: {
  fixture: DemoFixture;
  onClear: () => void;
}) {
  return (
    <div data-testid="fixture-card" className="border border-border bg-[#111] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-secondary">
            {fixture.inputMode === "voice-prompt"
              ? "Voice protocol"
              : fixture.inputMode === "url"
                ? "URL fixture"
                : "Text fixture"}
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground">{fixture.label}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] uppercase tracking-widest text-[#555] transition-colors hover:text-[#aaa]"
        >
          Clear
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[#999]">{fixture.description}</p>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-[#555]">
        {fixture.expectedTraits.join(" / ")}
      </p>
      {fixture.inputMode !== "text" && (
        <div className="mt-3 border border-[#1a1a1a] bg-bg p-3">
          <p className="whitespace-pre-wrap wrap-break-word text-[11px] leading-relaxed text-[#ccc]">
            {fixture.content}
          </p>
        </div>
      )}
      {fixture.inputMode === "voice-prompt" && (
        <p className="mt-3 text-[10px] leading-relaxed text-text-secondary">
          Press Mic to begin. When the run settles, export the trace with
          <span className="mx-1 text-[#999]">window.truthlens.downloadLatestTrace()</span>
          in devtools.
        </p>
      )}
    </div>
  );
}
