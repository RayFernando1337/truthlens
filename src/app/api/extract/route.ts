import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { isYouTubeUrl, extractVideoId, fetchYouTubeTranscript } from "@/lib/youtube";

export const maxDuration = 30;

interface ExtractedContent {
  title: string;
  text: string;
  excerpt: string;
}

async function tryYouTubeTranscript(url: string): Promise<ExtractedContent | null> {
  if (!isYouTubeUrl(url)) return null;
  const videoId = extractVideoId(url);
  if (!videoId) return null;
  try { return await fetchYouTubeTranscript(videoId); }
  catch { return null; }
}

async function extractWithReadability(url: string): Promise<ExtractedContent | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TruthLens/1.0; +https://truthlens.dev)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const html = await res.text();
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document).parse();
  if (!article || !article.textContent?.trim()) return null;
  return {
    title: article.title ?? "",
    text: article.textContent.trim(),
    excerpt: article.excerpt ?? "",
  };
}

function validateUrl(url: unknown): string | null {
  if (!url || typeof url !== "string") return "url is required";
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "Only HTTP/HTTPS URLs are supported";
  } catch {
    return "Invalid URL";
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    const err = validateUrl(url);
    if (err) return Response.json({ error: err }, { status: 400 });

    const result = await tryYouTubeTranscript(url) ?? await extractWithReadability(url);
    if (!result) {
      return Response.json(
        { error: "Could not extract content from this URL" },
        { status: 422 },
      );
    }
    return Response.json(result);
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return Response.json({ error: "URL fetch timed out" }, { status: 504 });
    }
    const message = e instanceof Error ? e.message : "Extraction failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
