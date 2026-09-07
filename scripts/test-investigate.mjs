// Ad-hoc E2E test of the live investigation SSE endpoint.
const dream = process.argv[2] || "A relaxed 5 day trip to Gokarna with clean beachside stays and good local food";
const res = await fetch("http://localhost:3000/api/investigate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ dream }),
});
console.log("HTTP", res.status, res.headers.get("content-type"));
if (!res.body) { console.log("no body"); process.exit(1); }

const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = "";
let dataset = null;
let err = null;
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  let i;
  while ((i = buf.indexOf("\n\n")) !== -1) {
    const frame = buf.slice(0, i); buf = buf.slice(i + 2);
    let ev, data = "";
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) ev = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (ev === "progress") { const p = JSON.parse(data); console.log(`  [${p.agent}] ${p.phase} — ${p.status}${p.metric ? " ("+p.metric+")" : ""}`); }
    else if (ev === "done") { dataset = JSON.parse(data); }
    else if (ev === "error") { err = JSON.parse(data); }
  }
}
if (err) { console.log("ERROR:", err); process.exit(1); }
if (!dataset) { console.log("no dataset"); process.exit(1); }

console.log("\n===== RESULT =====");
console.log("Destination:", dataset.meta.name, "|", dataset.meta.region, "| gateway:", dataset.meta.gateway);
console.log("Tagline:", dataset.meta.tagline);
console.log("Live:", dataset.live, "| sources:", Object.keys(dataset.sources || {}).length);
console.log("Places:", dataset.places.length, "→", dataset.places.map(p => p.canonicalName).join(", "));
console.log("Hero:", dataset.meta.hero.slice(0, 90));
console.log("Sample place images:");
for (const p of dataset.places.slice(0, 3)) {
  console.log(`  ${p.canonicalName}: ${p.images.length} img — ${p.images[0]?.url.slice(0, 80)} [${p.images[0]?.credit}]`);
}
console.log("Hotels:", dataset.hotels.length, "→", dataset.hotels.map(h => `${h.name} (clean ${h.cleanliness}, bath ${h.bathroomScore}, ₹${h.pricePerNight})`).join(" | "));
console.log("Permits:", dataset.permits.map(p => p.name).join(", ") || "none");
console.log("Food:", dataset.food.map(f => f.name).join(", ") || "none");
console.log("Conflicts:", dataset.conflicts.length);
const f = dataset.flights[0];
if (f) console.log(`Flight sample: ${f.airline} ${f.depart}→${f.arrive} ${f.duration||''} stops=${f.stops} fare ${f.fareLow}-${f.fareHigh} est=${f.estimated}`);
console.log("Facts:", (dataset.meta.facts||[]).join(" · "));
