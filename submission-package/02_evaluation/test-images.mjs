const dream = process.argv[2] || "explore Miami for 4 days";
const res = await fetch("http://localhost:3000/api/investigate", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dream }),
});
const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let dataset = null;
while (true) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true });
  let i; while ((i = buf.indexOf("\n\n")) !== -1) { const frame = buf.slice(0, i); buf = buf.slice(i + 2);
    let ev, data = ""; for (const line of frame.split("\n")) { if (line.startsWith("event:")) ev = line.slice(6).trim(); else if (line.startsWith("data:")) data += line.slice(5).trim(); }
    if (ev === "done") dataset = JSON.parse(data); } }
if (!dataset) { console.log("no dataset"); process.exit(1); }
console.log("=== PLACE IMAGES (subject-lock check) ===");
for (const p of dataset.places) {
  const im = p.images[0];
  const host = im ? new URL(im.url).host : "";
  console.log(`${im ? "🖼️ " : "⬜ PLACEHOLDER"} ${p.canonicalName}${im ? `  [${im.credit}] ${host}` : ""}`);
}
