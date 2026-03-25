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

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

function extractCaptionTracks(html: string): CaptionTrack[] | null {
  const marker = '"captionTracks":';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const arrStart = html.indexOf("[", start + marker.length);
  if (arrStart === -1 || arrStart > start + marker.length + 5) return null;

  let depth = 0;
  for (let i = arrStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(arrStart, i + 1)); }
        catch { return null; }
      }
    }
  }
  return null;
}

function selectTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  const enAuto = tracks.find((t) => t.languageCode === "en" && t.kind === "asr");
  const en = tracks.find((t) => t.languageCode === "en");
  return enAuto ?? en ?? tracks[0] ?? null;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function parseCaptionXml(xml: string): string[] {
  const out: string[] = [];
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const decoded = decodeXmlEntities(m[1]).replace(/\n/g, " ").trim();
    if (decoded) out.push(decoded);
  }
  return out;
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

function extractTitle(html: string): string {
  const m = html.match(/<title>([^<]*)<\/title>/);
  return m ? m[1].replace(/ - YouTube$/, "").trim() : "";
}

export async function fetchYouTubeTranscript(
  videoId: string,
): Promise<{ title: string; text: string; excerpt: string } | null> {
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TruthLens/1.0; +https://truthlens.dev)",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!pageRes.ok) return null;

  const html = await pageRes.text();
  const title = extractTitle(html);
  const tracks = extractCaptionTracks(html);
  if (!tracks || tracks.length === 0) return null;

  const track = selectTrack(tracks);
  if (!track?.baseUrl) return null;

  const captionUrl = track.baseUrl.replace(/\\u0026/g, "&");
  const capRes = await fetch(captionUrl, { signal: AbortSignal.timeout(10_000) });
  if (!capRes.ok) return null;

  const xml = await capRes.text();
  const segments = parseCaptionXml(xml);
  if (segments.length === 0) return null;

  const text = groupIntoParagraphs(segments);
  const excerpt = text.length > 300 ? text.slice(0, 297) + "\u2026" : text;
  return { title, text, excerpt };
}
