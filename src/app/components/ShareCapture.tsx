"use client";

import { useState, useCallback } from "react";
import type { ShareFrameData, PulseFlag } from "@/lib/types";
import { trustColor } from "./TrustChart";

const W = 1200;
const H = 630;
const M = 48;

const FL: Record<PulseFlag["type"], string> = {
  vague: "VAGUE", stat: "STAT", prediction: "PRED",
  attribution: "ATTR", logic: "LOGIC", contradiction: "CONTRA",
  "emotional-appeal": "EMOTION", "cognitive-bias": "BIAS",
  building: "DEVELOPING",
};
const FC: Record<PulseFlag["type"], string> = {
  logic: "#ff4400", contradiction: "#ff4400", stat: "#ff4400",
  attribution: "#ff4400", "emotional-appeal": "#ff4400",
  vague: "#ffaa00", prediction: "#ffaa00",
  "cognitive-bias": "#ffaa00", building: "#666",
};

function wrapText(
  ctx: CanvasRenderingContext2D, text: string,
  x: number, y: number, maxW: number, lh: number,
): number {
  const words = text.split(" ");
  let line = "", curY = y;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, curY);
      line = w + " "; curY += lh;
    } else line = test;
  }
  if (line.trim()) { ctx.fillText(line.trim(), x, curY); curY += lh; }
  return curY;
}

function drawChart(
  ctx: CanvasRenderingContext2D, scores: number[],
  x: number, y: number, w: number, h: number,
) {
  if (scores.length === 0) return;
  const step = w / Math.max(scores.length - 1, 1);
  const pts = scores.map((v, i) => ({ x: x + i * step, y: y + h - v * h }));
  const color = trustColor(scores.at(-1)!);

  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, color + "1f");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineTo(pts.at(-1)!.x, y + h);
  ctx.lineTo(pts[0].x, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#222"; ctx.lineWidth = 0.5; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  for (const [i, p] of pts.entries()) {
    ctx.fillStyle = trustColor(scores[i]);
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHeader(ctx: CanvasRenderingContext2D, latest: number) {
  ctx.fillStyle = "#555"; ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "left"; ctx.fillText("T R U T H L E N S", M, 44);
  const color = trustColor(latest);
  ctx.fillStyle = color; ctx.font = "bold 64px system-ui, sans-serif";
  ctx.textAlign = "right"; ctx.fillText(String(Math.round(latest * 100)), W - M, 72);
  ctx.fillStyle = "#444"; ctx.font = "bold 10px system-ui, sans-serif";
  ctx.textAlign = "left"; ctx.fillText("T R U S T", M, 92);
}

function drawFlag(ctx: CanvasRenderingContext2D, data: ShareFrameData) {
  ctx.strokeStyle = "#222"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(M, 315); ctx.lineTo(W - M, 315); ctx.stroke();
  ctx.textAlign = "left";
  if (data.latestFlag) {
    const fc = FC[data.latestFlag.type] ?? "#ff4400";
    ctx.fillStyle = fc; ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText("!", M, 360);
    ctx.font = "bold 12px system-ui, sans-serif";
    const typeLabel = FL[data.latestFlag.type] ?? "";
    ctx.fillText(typeLabel, M + 24, 360);
    ctx.fillStyle = "#ccc"; ctx.font = "15px system-ui, sans-serif";
    const lx = M + 24 + ctx.measureText(typeLabel).width + 16;
    const label = data.latestFlag.label.length > 70
      ? data.latestFlag.label.slice(0, 67) + "\u2026" : data.latestFlag.label;
    ctx.fillText(label, lx, 360);
  } else {
    ctx.fillStyle = "#00cc66"; ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("No flags \u2014 the argument looks straight.", M, 360);
  }
  ctx.fillStyle = "#666"; ctx.font = "12px monospace";
  ctx.fillText(
    `${data.claimCount} claims  \u00B7  ${data.flagCount} flagged  \u00B7  ${data.verifiedCount} verified`,
    M, 410,
  );
}

function drawFooter(ctx: CanvasRenderingContext2D, data: ShareFrameData) {
  if (data.tldr) {
    ctx.fillStyle = "#888"; ctx.font = "14px system-ui, sans-serif"; ctx.textAlign = "left";
    wrapText(ctx, data.tldr.slice(0, 200), M, 460, W - M * 2, 22);
  }
  if (data.sourceTitle) {
    ctx.fillStyle = "#555"; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(data.sourceTitle.slice(0, 80), M, 570);
  }
  ctx.fillStyle = "#333"; ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right"; ctx.fillText("truthlens.dev", W - M, H - 24);
}

function renderCard(data: ShareFrameData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, H);
  drawHeader(ctx, data.scores.at(-1) ?? 0);
  drawChart(ctx, data.scores, M, 105, W - M * 2, 190);
  drawFlag(ctx, data);
  drawFooter(ctx, data);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

async function downloadOrShare(blob: Blob) {
  const file = new File([blob], "truthlens.png", { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "TruthLens" });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "truthlens.png"; a.click();
  URL.revokeObjectURL(url);
}

export default function ShareButton({ data }: { data: ShareFrameData }) {
  const [busy, setBusy] = useState(false);
  const handle = useCallback(async () => {
    setBusy(true);
    try {
      const blob = await renderCard(data);
      await downloadOrShare(blob);
    } finally { setBusy(false); }
  }, [data]);

  return (
    <button type="button" onClick={handle} disabled={busy || data.scores.length === 0}
      className="text-[10px] font-semibold uppercase tracking-widest text-[#555] transition-colors hover:text-[#e5e5e5] disabled:opacity-30">
      {busy ? "\u2026" : "Share"}
    </button>
  );
}
