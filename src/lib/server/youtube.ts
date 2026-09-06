import "server-only";
import { ENV, CAP } from "./env";
import type { VideoAsset } from "../types";

// ============================================================================
// YouTube Data API v3 (optional). When no key is present, returns [] and the
// UI honestly shows no videos rather than fabricating them.
// ============================================================================

interface YtQuery {
  q: string;
  relatesTo: string;
  kind: VideoAsset["kind"];
  why: string;
  max?: number;
}

export async function searchVideos(queries: YtQuery[], signal?: AbortSignal): Promise<VideoAsset[]> {
  if (!CAP.youtube || !ENV.YOUTUBE_API_KEY) return [];
  const out: VideoAsset[] = [];
  for (const query of queries) {
    // eslint-disable-next-line no-await-in-loop
    const vids = await one(query, signal);
    out.push(...vids);
  }
  return out;
}

async function one(query: YtQuery, signal?: AbortSignal): Promise<VideoAsset[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query.q);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(query.max ?? 2));
  url.searchParams.set("relevanceLanguage", "en");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("key", ENV.YOUTUBE_API_KEY!);
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; thumbnails?: { high?: { url?: string } } } }[];
    };
    return (data.items ?? [])
      .filter((it) => it.id?.videoId)
      .map((it) => ({
        id: `yt_${it.id!.videoId}`,
        title: it.snippet?.title ?? query.q,
        creator: it.snippet?.channelTitle ?? "YouTube",
        thumbnail: it.snippet?.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${it.id!.videoId}/hqdefault.jpg`,
        duration: "",
        searchUrl: `https://www.youtube.com/watch?v=${it.id!.videoId}`,
        why: query.why,
        relatesTo: query.relatesTo,
        kind: query.kind,
      }));
  } catch {
    return [];
  }
}
