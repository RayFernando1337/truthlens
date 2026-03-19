"use client";

const TIERS = [
  {
    id: "asr",
    label: "ASR",
    model: "NVIDIA Riva NIM",
    protocol: "gRPC",
    endpoint: "grpc.nvcf.nvidia.com",
    color: "#76b900",
    desc: "Speech-to-text on 4s audio windows",
  },
  {
    id: "l1",
    label: "L1 · Pulse",
    model: "Nemotron 3 Super 49B",
    protocol: "REST",
    endpoint: "/api/analyze/pulse",
    color: "#00cc66",
    desc: "Per-chunk claim flags, tone, confidence",
    trigger: "Every chunk",
    latency: "< 1s",
  },
  {
    id: "l2",
    label: "L2 · Deep",
    model: "Nemotron 3 Super 49B",
    protocol: "REST",
    endpoint: "/api/analyze/deep",
    color: "#ffaa00",
    desc: "Rhetorical breakdown + Tavily search verification",
    trigger: "8 chunks, then every +4",
    latency: "5-15s",
    search: "Tavily (advanced depth, top 3 claims)",
  },
  {
    id: "l3",
    label: "L3 · Full Analysis",
    model: "Nemotron 3 Super 49B",
    protocol: "REST",
    endpoint: "/api/analyze/patterns",
    color: "#ff4400",
    desc: "Full-transcript rhetorical analysis + pattern detection",
    trigger: "6 chunks, then every +4",
    latency: "10-30s",
  },
] as const;

const STACK = [
  { label: "Frontend", value: "Next.js 16 + Vercel AI SDK" },
  { label: "Inference", value: "Nemotron 3 Super on Nebius Token Factory" },
  { label: "ASR", value: "NVIDIA Riva NIM via gRPC" },
  { label: "Search", value: "Tavily (agentic search)" },
  { label: "Structured Output", value: "Zod schema validation + retry" },
];

export default function ArchitectureDiagram({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-[#222] bg-[#0a0a0a] p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#666] transition-colors hover:text-[#e5e5e5]"
        >
          &times;
        </button>

        <h2 className="text-sm font-bold uppercase tracking-widest text-[#e5e5e5]">
          TruthLens Architecture
        </h2>
        <p className="mt-1 text-[11px] text-[#666]">
          3-tier concurrent analysis &middot; 1 model &middot; 2 API keys
        </p>

        {/* Flow diagram */}
        <div className="mt-6 flex flex-col items-center gap-0">
          {/* Input */}
          <div className="w-full max-w-md border border-[#333] bg-[#141414] p-3 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#888]">
              Content Input
            </span>
            <p className="mt-1 text-[10px] text-[#666]">
              Mic (live) &middot; Paste &middot; URL
            </p>
          </div>

          {/* Arrow down */}
          <div className="flex flex-col items-center py-1">
            <div className="h-4 w-px bg-[#333]" />
            <span className="text-[9px] text-[#444]">chunk every ~4s</span>
            <div className="h-4 w-px bg-[#333]" />
          </div>

          {/* ASR */}
          <div className="w-full max-w-md border p-3" style={{ borderColor: TIERS[0].color }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TIERS[0].color }}>
                {TIERS[0].label}
              </span>
              <span className="text-[9px] text-[#666]">{TIERS[0].protocol}</span>
            </div>
            <p className="mt-1 text-[10px] text-[#888]">{TIERS[0].model}</p>
            <p className="mt-0.5 text-[10px] text-[#555]">{TIERS[0].desc}</p>
          </div>

          {/* Arrow down */}
          <div className="flex flex-col items-center py-1">
            <div className="h-4 w-px bg-[#333]" />
            <span className="text-[9px] text-[#444]">text chunks</span>
            <div className="h-4 w-px bg-[#333]" />
          </div>

          {/* 3-tier split */}
          <div className="grid w-full grid-cols-3 gap-2">
            {TIERS.slice(1).map((tier) => (
              <div key={tier.id} className="border p-3" style={{ borderColor: tier.color }}>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: tier.color }}
                >
                  {tier.label}
                </span>
                <p className="mt-1.5 text-[10px] text-[#888]">{tier.model}</p>
                <p className="mt-0.5 text-[10px] text-[#555]">{tier.desc}</p>
                {"trigger" in tier && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="text-[9px] text-[#666]">
                      <strong className="text-[#888]">Trigger:</strong> {tier.trigger}
                    </span>
                    <span className="text-[9px] text-[#666]">
                      <strong className="text-[#888]">Latency:</strong> {tier.latency}
                    </span>
                  </div>
                )}
                {"search" in tier && (
                  <p className="mt-1.5 border-t border-[#222] pt-1.5 text-[9px] text-[#ffaa00]">
                    + {tier.search}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stack table */}
        <div className="mt-6">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
            Stack
          </span>
          <div className="mt-2 space-y-1">
            {STACK.map((row) => (
              <div key={row.label} className="flex gap-4 text-[11px]">
                <span className="w-28 shrink-0 text-[#666]">{row.label}</span>
                <span className="text-[#e5e5e5]">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API routes */}
        <div className="mt-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
            API Routes
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              "POST /api/transcribe",
              "POST /api/analyze/pulse",
              "POST /api/analyze/deep",
              "POST /api/analyze/patterns",
              "POST /api/extract",
            ].map((route) => (
              <span
                key={route}
                className="border border-[#333] bg-[#141414] px-2 py-1 text-[10px] text-[#888]"
              >
                {route}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-5 text-[10px] text-[#444]">
          All tiers run concurrently. One model (Nemotron 3 Super 49B on Nebius
          Token Factory). ASR via NVIDIA Riva NIM. Search via Tavily. Two API keys total.
        </p>
      </div>
    </div>
  );
}
