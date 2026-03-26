"use client";

import type { PulseFlag } from "@/lib/types";

const FLAG_STYLES: Record<PulseFlag["type"], { bg: string; text: string }> = {
  vague: { bg: "bg-yellow/15", text: "text-yellow" },
  stat: { bg: "bg-accent/15", text: "text-accent" },
  prediction: { bg: "bg-yellow/15", text: "text-yellow" },
  attribution: { bg: "bg-accent/15", text: "text-accent" },
  logic: { bg: "bg-accent/15", text: "text-accent" },
  contradiction: { bg: "bg-accent/15", text: "text-accent" },
  "emotional-appeal": { bg: "bg-accent/15", text: "text-accent" },
  "cognitive-bias": { bg: "bg-yellow/15", text: "text-yellow" },
  building: { bg: "bg-[#444]/15", text: "text-text-secondary" },
};

const FLAG_LABELS: Record<PulseFlag["type"], string> = {
  vague: "VAGUE",
  stat: "UNVERIFIED STAT",
  prediction: "PREDICTION",
  attribution: "ATTRIBUTION",
  logic: "LOGIC",
  contradiction: "CONTRADICTION",
  "emotional-appeal": "EMOTIONAL APPEAL",
  "cognitive-bias": "COGNITIVE BIAS",
  building: "DEVELOPING",
};

export default function Flag({ flag }: { flag: PulseFlag }) {
  const style = FLAG_STYLES[flag.type];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      <span className="opacity-60">{FLAG_LABELS[flag.type]}</span>
      <span className="opacity-40">|</span>
      <span>{flag.label}</span>
    </span>
  );
}
