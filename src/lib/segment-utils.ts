import type { TranscriptSegment } from "@/lib/types";

export function makeSegment(
  segmentId: string,
  text: string,
  index: number
): TranscriptSegment {
  return { segmentId, text, index };
}

export function splitIntoChunks(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const para of paragraphs) {
    if (para.length > 500) {
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
      let current = "";
      for (const sentence of sentences) {
        if (current.length + sentence.length > 400 && current) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current += sentence;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    } else {
      chunks.push(para);
    }
  }
  return chunks;
}
