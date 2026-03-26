"use client";

const W = 600;
const H = 96;
const PAD = 2;

export function trustColor(v: number): string {
  if (v >= 0.7) return "#00cc66";
  if (v >= 0.4) return "#ffaa00";
  return "#ff4400";
}

function buildPath(data: number[]) {
  const step = (W - PAD * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => ({
    x: PAD + i * step,
    y: H - PAD - v * (H - PAD * 2),
  }));
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const fill = `${d} L ${pts.at(-1)!.x} ${H} L ${pts[0].x} ${H} Z`;
  return { d, fill, pts };
}

function TrustSvg({ main, overlayD, color, scores }: {
  main: ReturnType<typeof buildPath>; overlayD: string | null;
  color: string; scores: number[];
}) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="tp-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#222" strokeWidth="0.5" strokeDasharray="4 4" />
      <path d={main.fill} fill="url(#tp-fill)" />
      <path d={main.d} fill="none" stroke={color} strokeWidth="1.5" />
      {overlayD && (
        <path d={overlayD} fill="none" stroke="#e5e5e5" strokeWidth="0.75" strokeDasharray="3 2" opacity="0.35" />
      )}
      {main.pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={trustColor(scores[i])} />
      ))}
    </svg>
  );
}

export default function TrustChart({
  scores, overlay,
}: {
  scores: number[];
  overlay?: number[];
}) {
  if (scores.length === 0) return null;
  const latest = scores.at(-1)!;
  const color = trustColor(latest);
  const main = buildPath(scores);
  const overlayD = overlay && overlay.length > 1 ? buildPath(overlay).d : null;
  return (
    <div className="bg-card px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold uppercase tracking-widest text-text-secondary">Trust</span>
        <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
          {Math.round(latest * 100)}
        </span>
      </div>
      <TrustSvg main={main} overlayD={overlayD} color={color} scores={scores} />
    </div>
  );
}
