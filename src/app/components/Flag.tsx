"use client";

import type { PulseFlag } from "@/lib/types";

const FLAG_STYLES: Record<PulseFlag["type"], { bg: string; text: string }> = {
  vague: { bg: "bg-[#ffaa00]/15", text: "text-[#ffaa00]" },
  stat: { bg: "bg-[#ff4400]/15", text: "text-[#ff4400]" },
  prediction: { bg: "bg-[#ffaa00]/15", text: "text-[#ffaa00]" },
  attribution: { bg: "bg-[#ff4400]/15", text: "text-[#ff4400]" },
  logic: { bg: "bg-[#ff4400]/15", text: "text-[#ff4400]" },
  contradiction: { bg: "bg-[#ff4400]/15", text: "text-[#ff4400]" },
};

const FLAG_LABELS: Record<PulseFlag["type"], string> = {
  vague: "VAGUE",
  stat: "UNVERIFIED STAT",
  prediction: "PREDICTION",
  attribution: "ATTRIBUTION",
  logic: "LOGIC",
  contradiction: "CONTRADICTION",
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
