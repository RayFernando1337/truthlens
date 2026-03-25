import { YoutubeTranscript } from "youtube-transcript";

const YOUTUBE_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/m\.youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
];

export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_PATTERNS.some((p) => p.test(url));
}

export function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function groupIntoParagraphs(segments: string[]): string {
  const paragraphs: string[] = [];
  let cur = "";
  for (const seg of segments) {
    if (cur.length + seg.length > 400 && cur) {
      paragraphs.push(cur.trim());
      cur = seg;
    } else {
      cur += (cur ? " " : "") + seg;
    }
  }
  if (cur.trim()) paragraphs.push(cur.trim());
  return paragraphs.join("\n\n");
}

async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TruthLens/1.0; +https://truthlens.dev)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const m = html.match(/<title>([^<]*)<\/title>/);
    return m ? m[1].replace(/ - YouTube$/, "").trim() : "";
  } catch {
    return "";
  }
}

export async function fetchYouTubeTranscript(
  videoId: string,
): Promise<{ title: string; text: string; excerpt: string } | null> {
  const [segments, title] = await Promise.all([
    YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }).catch(
      () => null,
    ),
    fetchVideoTitle(videoId),
  ]);

  if (!segments || segments.length === 0) return null;

  const lines = segments.map((s) => s.text);
  const text = groupIntoParagraphs(lines);
  const excerpt = text.length > 300 ? text.slice(0, 297) + "\u2026" : text;
  return { title, text, excerpt };
}
