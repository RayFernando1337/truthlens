import type { TranscriptSegment } from "@/lib/types";

export function makeSegment(
  segmentId: string,
  text: string,
  index: number
): TranscriptSegment {
  return { segmentId, text, index };
}

/** Fine-grained paragraph-level chunks for streaming, verification, and topic segmentation. */
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

const BATCH_SEGMENT_CHAR_LIMIT = 60_000;

/**
 * Coarse segmentation for batch analysis: returns the whole text as 1 segment
 * (or 2-3 segments for very long documents exceeding ~60K chars).
 * Preserves paragraph boundaries when splitting.
 */
export function splitForBatchAnalysis(text: string): string[] {
  if (text.length <= BATCH_SEGMENT_CHAR_LIMIT) return [text];

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  const segments: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length > BATCH_SEGMENT_CHAR_LIMIT && current) {
      segments.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) segments.push(current.trim());

  return segments;
}
