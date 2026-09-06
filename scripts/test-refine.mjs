const destination = process.argv[2] || "Ladakh";
const request = process.argv[3] || "Buddhist monasteries and scenic viewpoints";
const res = await fetch("http://localhost:3000/api/refine", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ destination, request, existingNames: [] }),
});
console.log("HTTP", res.status);
if (!res.body) process.exit(1);
const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = "", result = null, err = null;
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
    if (ev === "progress") { const p = JSON.parse(data); console.log(`  [${p.agent}] ${p.status}`); }
    else if (ev === "done") result = JSON.parse(data);
    else if (ev === "error") err = JSON.parse(data);
  }
}
if (err) { console.log("ERROR", err); process.exit(1); }
console.log("\nQuery:", result.query);
console.log("New places found:", result.found);
for (const p of result.places) console.log(`  - ${p.canonicalName} [${p.category}] — ${p.blurb} (img: ${p.images[0]?.url.slice(0,50)})`);
