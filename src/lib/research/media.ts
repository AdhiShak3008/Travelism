import type { MediaImage, ImageCategory, VideoAsset } from "../types";

// Curated Unsplash photo IDs grouped by theme. Using stable photo IDs so
// images are real and consistent (not AI-generated). Provenance is editorial.
const POOLS: Record<string, string[]> = {
  himalaya: [
    "photo-1544735716-392fe2489ffa",
    "photo-1506905925346-21bda4d32df4",
    "photo-1519681393784-d120267933ba",
    "photo-1470071459604-3b5ec3a7fe05",
    "photo-1454496522488-7a8e488e8606",
  ],
  monastery: [
    "photo-1526772662000-3f88f10405ff",
    "photo-1571536802807-30451e3955d8",
    "photo-1509233725247-49e657c54213",
  ],
  lake: [
    "photo-1439066615861-d1af74d74000",
    "photo-1465101162946-4377e57745c3",
    "photo-1470770841072-f978cf4d019e",
  ],
  road: [
    "photo-1502920917128-1aa500764cbd",
    "photo-1511497584788-876760111969",
    "photo-1516571748831-5d81767b788d",
  ],
  waterfall: ["photo-1432405972618-c60b0225b8f9", "photo-1508739773434-c26b3d09e071"],
  hotelroom: [
    "photo-1611892440504-42a792e24d32",
    "photo-1590490360182-c33d57733427",
    "photo-1582719478250-c89cae4dc85b",
  ],
  bathroom: ["photo-1620626011761-996317b8d101", "photo-1584622650111-993a426fbf0a"],
  food: [
    "photo-1504674900247-0877df9cc836",
    "photo-1517244683847-7456b63c5969",
    "photo-1526318472351-c75fcf070305",
  ],
  town: ["photo-1548013146-72479768bada", "photo-1524492412937-b28074a5d7da"],
  vehicle: ["photo-1533473359331-0135ef1b58bf", "photo-1449965408869-eaa3f722e40d"],
  buddha: ["photo-1558862107-d49ef2a04d72", "photo-1528181304800-259b08848526"],
};

function url(id: string, w = 1200): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
}

let counter = 0;
export function img(
  pool: keyof typeof POOLS,
  category: ImageCategory,
  provenance: MediaImage["provenance"] = "editorial",
  credit = "Unsplash"
): MediaImage {
  const ids = POOLS[pool] ?? POOLS.himalaya;
  const id = ids[counter % ids.length];
  counter++;
  return {
    id: `img_${category}_${counter}`,
    url: url(id),
    category,
    credit,
    provenance,
    date: new Date(Date.now() - Math.random() * 90 * 864e5).toISOString(),
  };
}

export function imgSet(
  pool: keyof typeof POOLS,
  category: ImageCategory,
  n: number,
  provenance: MediaImage["provenance"] = "editorial"
): MediaImage[] {
  return Array.from({ length: n }, () => img(pool, category, provenance));
}

// ---------------------------------------------------------------------------
// Videos — honest discovery assets. Thumbnails use real scenic imagery and the
// card links to a YouTube *search* for the title (discovery), not a fabricated
// exact video. A live provider would replace these with real result ids.
// ---------------------------------------------------------------------------
const KIND_POOL: Record<VideoAsset["kind"], keyof typeof POOLS> = {
  road: "road",
  walk: "monastery",
  attraction: "lake",
  room_tour: "hotelroom",
  review: "hotelroom",
  food: "food",
  vlog: "himalaya",
  seasonal: "himalaya",
};

let vc = 0;
export function video(
  relatesTo: string,
  title: string,
  creator: string,
  duration: string,
  why: string,
  kind: VideoAsset["kind"]
): VideoAsset {
  vc++;
  const thumb = img(KIND_POOL[kind] ?? "himalaya", "attraction").url;
  return {
    id: `vid_${vc}`,
    title,
    creator,
    thumbnail: thumb,
    duration,
    searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`,
    why,
    relatesTo,
    kind,
  };
}
