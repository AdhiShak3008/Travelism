// Verify Travel DNA profile changes agent output for the same destination.
async function run(label, dream, profileHints) {
  const res = await fetch("http://localhost:3000/api/investigate", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dream, profileHints }),
  });
  const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ""; let dataset = null;
  while (true) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true });
    let i; while ((i = buf.indexOf("\n\n")) !== -1) { const frame = buf.slice(0, i); buf = buf.slice(i + 2);
      let ev, data = ""; for (const line of frame.split("\n")) { if (line.startsWith("event:")) ev = line.slice(6).trim(); else if (line.startsWith("data:")) data += line.slice(5).trim(); }
      if (ev === "done") dataset = JSON.parse(data); } }
  if (!dataset) { console.log(label, "-> no dataset"); return; }
  const prices = dataset.hotels.slice(0, 5).map((h) => h.pricePerNight);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / (prices.length || 1));
  console.log(`\n### ${label}`);
  console.log("  Hotel avg/night:", "₹" + avg, "| sample:", prices.map((p) => "₹" + p).join(", "));
  console.log("  Food:", dataset.food.slice(0, 4).map((f) => f.name).join(" | "));
  console.log("  Food why[0]:", dataset.food[0]?.whyRecommended?.slice(0, 90) || "-");
}

const dream = "explore Jaipur for 4 days";
await run("VALUE HUNTER (economical, veg)", dream, {
  budgetTier: "economical", pace: "balanced", priorities: ["food", "heritage"], dietary: ["Vegetarian", "Jain"], avoidEarlyFlights: true,
});
await run("LUXURY (premium, no diet)", dream, {
  budgetTier: "premium", pace: "comfortable", priorities: ["heritage", "wellness"], dietary: [],
});
