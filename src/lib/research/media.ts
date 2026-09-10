import type { MediaImage, ImageCategory, VideoAsset } from "../types";

// Curated verified high-resolution photography pools grouped by exact theme
const POOLS: Record<string, string[]> = {
  beach: [
    "photo-1507525428034-b723cf961d3e", // tropical white sand beach
    "photo-1519046904884-53103b34b206", // sunny beach with palms
    "photo-1510414842594-a61c69b5ae57", // ocean waves shoreline
    "photo-1506929562872-bb421503ef21", // turquoise sea
  ],
  coastal: [
    "photo-1507525428034-b723cf961d3e", // beach horizon
    "photo-1515238152791-8216bfdf89a7", // sunset over bay
    "photo-1506929562872-bb421503ef21", // coastal waters
  ],
  watersports: [
    "photo-1544551763-46a013bb70d5", // clear blue ocean diving
    "photo-1502680390469-be75c86b636f", // surfing ocean wave
    "photo-1568605117036-5fe5e7bab0b7", // watercraft ocean splash
    "photo-1534447677768-be436bb09401", // sailing boat on open sea
  ],
  rafting: [
    "photo-1530866495561-507c9faab2ed", // white water river rafting
    "photo-1508873696983-2df5293cb32f", // river rafting & mountain kayaking
    "photo-1544551763-46a013bb70d5", // rushing mountain river
  ],
  paragliding: [
    "photo-1544735716-392fe2489ffa", // mountain peaks panorama
    "photo-1464822759023-fed622ff2c3b", // high alpine mountain range
    "photo-1519681393784-d120267933ba", // soaring above snowy valleys
  ],
  adventure: [
    "photo-1464822759023-fed622ff2c3b", // dramatic snow capped peak
    "photo-1533240332313-0db49b459ad6", // hiking mountain trail
    "photo-1519681393784-d120267933ba", // high alpine ridge
    "photo-1506744038136-46273834b3fb", // sweeping scenic mountain valley
  ],
  landscape: [
    "photo-1506744038136-46273834b3fb", // sweeping valley & mountain scenery
    "photo-1470071459604-3b5ec3a7fe05", // misty pine mountain valley
    "photo-1464822759023-fed622ff2c3b", // high mountain ridge panorama
    "photo-1470770841072-f978cf4d019e", // pristine reflection landscape
    "photo-1439066615861-d1af74d74000", // turquoise alpine glacial view
  ],
  cycling: [
    "photo-1485965120184-e220f721d03e", // road bike scenic view
    "photo-1508974239320-0a029497e820", // countryside biking
    "photo-1544197150-b99a580bb7a8", // mountain biking trail
  ],
  city: [
    "photo-1502602898657-3e91760cbb34", // vibrant historic cityscape
    "photo-1514565131-fce0801e5785", // modern skyline night
    "photo-1477959858617-67f30bc75b82", // urban architecture
    "photo-1486406146926-c627a92ad1ab", // iconic architecture
  ],
  nightlife: [
    "photo-1517248135467-4c7edcad34c4", // warm ambient evening lounge
    "photo-1514565131-fce0801e5785", // illuminated evening skyline
    "photo-1502602898657-3e91760cbb34", // lit historic street
  ],
  theme_park: [
    "photo-1513889961551-628c1e5e2ee9", // roller coaster thrill
    "photo-1508873535684-277a3cbcc4e8", // amusement park lights
    "photo-1579783902614-a3fb3927b675", // ferris wheel
  ],
  wildlife: [
    "photo-1534177616072-ef7dc120449d", // safari wildlife
    "photo-1518709268805-4e9042af9f23", // marine life
    "photo-1564760055775-d63b17a55c44", // tropical nature & birds
  ],
  tour: [
    "photo-1503899036084-c55cdd92da26", // scenic landmark exploration
    "photo-1513584684374-8bab748fbf90", // historic landmark architecture
    "photo-1533240332313-0db49b459ad6", // guided trail walk
  ],
  cultural: [
    "photo-1513584684374-8bab748fbf90", // classical heritage architecture
    "photo-1541872703-74c5e44368f9", // historical monument & columns
    "photo-1503899036084-c55cdd92da26", // cultural heritage landmark
  ],
  himalaya: [
    "photo-1464822759023-fed622ff2c3b", // towering snowy himalayan peaks
    "photo-1519681393784-d120267933ba", // high altitude snow summit
    "photo-1544735716-392fe2489ffa", // prayer flags over snow range
    "photo-1470071459604-3b5ec3a7fe05", // misty pine mountain valley
    "photo-1454496522488-7a8e488e8606", // dramatic snow mountain
  ],
  monastery: [
    "photo-1544735716-392fe2489ffa", // himalayan monastery with prayer flags
    "photo-1582510003544-4d00b7f74220", // buddhist stupa & temple flags
    "photo-1558862107-d49ef2a04d72", // serene temple shrine
  ],
  buddha: [
    "photo-1558862107-d49ef2a04d72", // golden buddha statue
    "photo-1582510003544-4d00b7f74220", // buddhist shrine & flags
  ],
  lake: [
    "photo-1439066615861-d1af74d74000", // turquoise alpine glacial lake
    "photo-1470770841072-f978cf4d019e", // pristine mountain reflection lake
    "photo-1465101162946-4377e57745c3", // serene high-altitude tarn
  ],
  road: [
    "photo-1511497584788-876760111969", // misty mountain pass road
    "photo-1464822759023-fed622ff2c3b", // high mountain highway
    "photo-1470071459604-3b5ec3a7fe05", // valley road among pines
  ],
  waterfall: [
    "photo-1432405972618-c60b0225b8f9", // roaring mountain waterfall
    "photo-1508739773434-c26b3d09e071", // lush cascading gorge waterfall
  ],
  memorial: [
    "photo-1564507592333-c60657eea523", // historic memorial arch
    "photo-1486406146926-c627a92ad1ab", // iconic heritage landmark
    "photo-1503899036084-c55cdd92da26", // historic stone monument
  ],
  hotelroom: [
    "photo-1582719478250-c89cae4dc85b", // luxury suite with scenic view
    "photo-1611892440504-42a792e24d32", // modern king bedroom
    "photo-1590490360182-c33d57733427", // boutique hotel room
    "photo-1566073771259-6a8506099945", // resort room with mountain/valley view
  ],
  resort: [
    "photo-1566073771259-6a8506099945", // luxury resort
    "photo-1540555700478-4be289fbecef", // wellness spa retreat
    "photo-1571896349842-33c89424de2d", // boutique mountain & valley retreat
  ],
  bathroom: [
    "photo-1584622650111-993a426fbf0a",
    "photo-1620626011761-996317b8d101",
  ],
  food: [
    "photo-1504674900247-0877df9cc836", // appetizing hot food spread
    "photo-1517244683847-7456b63c5969", // vibrant cuisine dishes
    "photo-1526318472351-c75fcf070305", // fresh noodles / hot soup
    "photo-1555396273-367ea4eb4db5", // authentic local dining
  ],
  town: [
    "photo-1513584684374-8bab748fbf90", // historic town architecture
    "photo-1519671482749-fd09be7ccebf", // picturesque cobblestone town
    "photo-1502602898657-3e91760cbb34", // charming old town street
  ],
  vehicle: [
    "photo-1533473359331-0135ef1b58bf", // SUV mountain driving
    "photo-1511497584788-876760111969", // travel vehicle on mountain route
  ],
};

function url(id: string, w = 1200): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;
}

let counter = 0;
export function img(
  pool: string,
  category: ImageCategory,
  provenance: MediaImage["provenance"] = "editorial",
  credit = "Unsplash"
): MediaImage {
  const normalizedPool = pool.toLowerCase();
  const ids = POOLS[normalizedPool] ?? POOLS.landscape ?? POOLS.city;
  const id = ids[counter % ids.length];
  counter++;
  return {
    id: `img_${category}_${counter}_${hash(id)}`,
    url: url(id),
    category,
    credit,
    provenance,
    date: new Date(Date.now() - Math.random() * 90 * 864e5).toISOString(),
  };
}

export function imgSet(
  pool: string,
  category: ImageCategory,
  n: number,
  provenance: MediaImage["provenance"] = "editorial"
): MediaImage[] {
  const normalizedPool = pool.toLowerCase();
  const ids = POOLS[normalizedPool] ?? POOLS.landscape ?? POOLS.city;
  return Array.from({ length: n }, (_, i) => {
    const id = ids[(counter + i) % ids.length];
    return {
      id: `img_${category}_${counter + i}_${hash(id)}`,
      url: url(id),
      category,
      credit: "Unsplash",
      provenance,
      date: new Date(Date.now() - Math.random() * 90 * 864e5).toISOString(),
    };
  });
}

export function getCuratedExperienceImage(category: string, name: string): MediaImage {
  const text = `${category} ${name}`.toLowerCase();
  let pool = "tour";
  if (/raft|whitewater|rapids/i.test(text)) pool = "rafting";
  else if (/water|boat|dive|scuba|snork|jet\s*ski|surf|parasail|ocean|kayak|paddle/i.test(text)) pool = "watersports";
  else if (/beach|coast|sand|bay|cove/i.test(text)) pool = "beach";
  else if (/bike|cycling|bikepack/i.test(text)) pool = "cycling";
  else if (/monastery|gompa|monk|prayer|buddhis/i.test(text)) pool = "monastery";
  else if (/buddha|statue|shrine/i.test(text)) pool = "buddha";
  else if (/lake|tso|tarn|loch|reservoir/i.test(text)) pool = "lake";
  else if (/fall|cascade|waterfall|gorge/i.test(text)) pool = "waterfall";
  else if (/volcano|crag|seat|hill|ridge|cliff|lookout|viewpoint|overlook|vista|peak|summit|mountain/i.test(text)) pool = "landscape";
  else if (/pass|himalaya|snow|alps/i.test(text)) pool = "himalaya";
  else if (/memorial|war|hero|monument/i.test(text)) pool = "memorial";
  else if (/wildlife|safari|animal|zoo|gator|alligator|everglades/i.test(text)) pool = "wildlife";
  else if (/theme\s*park|roller\s*coaster|disney|universal|carnival/i.test(text)) pool = "theme_park";
  else if (/night|club|pub|bar|lounge|cocktail|party/i.test(text)) pool = "nightlife";
  else if (/food|wine|tasting|dining|culinary|bistro|thukpa|momo/i.test(text)) pool = "food";
  else if (/culture|temple|museum|art|heritage|history|gallery|castle|palace/i.test(text)) pool = "cultural";
  else if (/trek|hike|adventure|climb|canyon|zipline|trail|walk/i.test(text)) pool = "adventure";
  else if (/city|architecture|sightseeing|walk|square|plaza/i.test(text)) pool = "city";

  return img(pool, "attraction", "editorial", "Travelism Curated");
}

export function getCuratedPlaceImage(name: string, destination: string, category = "attraction"): MediaImage {
  const text = `${name} ${destination} ${category}`.toLowerCase();
  let pool = "landscape";

  if (/beach|coast|cove|island|sand|bay|shore|mallorca|ibiza|formentor|cala|playa/i.test(text)) pool = "beach";
  else if (/lake|como|bellagio|varenna|tso|tarn|reservoir|water|river|lucerne|loch|firth/i.test(text)) pool = "lake";
  else if (/boat|cruise|ferry|sail|yacht|harbor|port|kayak|canoe/i.test(text)) pool = "watersports";
  else if (/fall|cascade|waterfall|gorge|canyon|ravine/i.test(text)) pool = "waterfall";
  else if (/volcano|crag|seat|arthur|calton|hill|peak|summit|mountain|ridge|cliff|lookout|viewpoint|overlook|vista|panorama|highland|glen|moor|spiti/i.test(text)) pool = "landscape";
  else if (/pass|rohtang|khardung|chang|glacier|snow|alps|matterhorn|zermatt|himalaya/i.test(text)) pool = "himalaya";
  else if (/valley|solang|meadow|hike|trek|trail|walk|ramble|path/i.test(text)) pool = "adventure";
  else if (/monastery|gompa|monk|stupa|temple|shrine|church|cathedral|basilica|duomo|mosque|pagoda|abbey/i.test(text)) pool = "cultural";
  else if (/fort|palace|castle|citadel|fortress|chateau|schloss|monument|memorial|ruins|heritage|villa|balbianello|carlotta|colosseum|louvre|eiffel|holyrood/i.test(text)) pool = "cultural";
  else if (/museum|gallery|exhibition|theatre|theater|opera|concert|sculpture|art/i.test(text)) pool = "cultural";
  else if (/market|bazaar|mall|shopping/i.test(text)) pool = "city";
  else if (/park|garden|botanic|sanctuary|reserve|forest|safari|wildlife|meadows/i.test(text)) pool = "wildlife";
  else if (/hotel|resort|stay|cottage|camp|homestay|finca|inn|lodge/i.test(text)) pool = "resort";
  else if (/village|town|settlement|old town|historic|bourgh|borough/i.test(text)) pool = "town";
  else if (/road|highway|drive|street|avenue|promenade|mile/i.test(text)) pool = "city";
  else if (/city|capital|metropolis|centre|center|square|plaza/i.test(text)) pool = "city";

  return img(pool, "attraction", "editorial", "Travelism Curated");
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ---------------------------------------------------------------------------
// Videos — honest discovery assets
// ---------------------------------------------------------------------------
const KIND_POOL: Record<VideoAsset["kind"], string> = {
  road: "road",
  walk: "tour",
  attraction: "monastery",
  room_tour: "hotelroom",
  review: "hotelroom",
  food: "food",
  vlog: "himalaya",
  seasonal: "coastal",
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
  const thumb = img(KIND_POOL[kind] ?? "monastery", "attraction").url;
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
