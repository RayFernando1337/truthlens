"use client";

function getColor(value: number): string {
  if (value >= 0.7) return "#00cc66";
  if (value >= 0.4) return "#ffaa00";
  return "#ff4400";
}

export default function ConfidenceMeter({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const color = getColor(value);
  const pct = Math.round(value * 100);

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-[#666]">
          {label}
        </span>
      )}
      <div className="relative h-1 w-16 bg-[#222]">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="text-[10px] font-semibold tabular-nums"
        style={{ color }}
      >
        {pct}
      </span>
    </div>
  );
}
