"use client";

import type { PulseFlag } from "@/lib/types";

const FLAG_STYLES: Record<PulseFlag["type"], { bg: string; text: string }> = {
  vague: { bg: "bg-yellow/15", text: "text-yellow" },
  stat: { bg: "bg-brand/15", text: "text-brand" },
  prediction: { bg: "bg-yellow/15", text: "text-yellow" },
  attribution: { bg: "bg-brand/15", text: "text-brand" },
  logic: { bg: "bg-brand/15", text: "text-brand" },
  contradiction: { bg: "bg-brand/15", text: "text-brand" },
  "emotional-appeal": { bg: "bg-brand/15", text: "text-brand" },
  "cognitive-bias": { bg: "bg-yellow/15", text: "text-yellow" },
  building: { bg: "bg-muted/15", text: "text-text-secondary" },
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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-sm font-semibold uppercase tracking-widest ${style.bg} ${style.text}`}
    >
      <span className="opacity-60">{FLAG_LABELS[flag.type]}</span>
      <span className="opacity-40">|</span>
      <span>{flag.label}</span>
    </span>
  );
}
