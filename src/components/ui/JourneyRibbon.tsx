"use client";

import { motion } from "framer-motion";
import { useTrip } from "@/store/tripStore";

export function JourneyRibbon() {
  const blob = useTrip((s) => s.blob);
  const dataset = useTrip((s) => s.dataset);
  if (!dataset) return null;

  const gateway = dataset.meta.gateway.split(" ")[0];
  const dest = dataset.meta.name;
  const enroute = dataset.places
    .filter((p) => p.category === "enroute" && blob.selectedPlaceIds.includes(p.id))
    .sort((a, b) => a.routeOrder - b.routeOrder)
    .map((p) => p.canonicalName);

  const nodes = [
    { label: "Home", glyph: "🏠" },
    { label: gateway, glyph: "✈️" },
    ...enroute.map((e) => ({ label: e, glyph: "🚙" })),
    { label: dest, glyph: "🏔️" },
    { label: gateway, glyph: "🚙" },
    { label: "Home", glyph: "✈️" },
  ];

  return (
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto py-2">
      {nodes.map((n, i) => (
        <div key={i} className="flex items-center gap-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-ink-800 text-lg">
              {n.glyph}
            </span>
            <span className="max-w-[72px] truncate text-center text-[11px] text-paper-200/60">{n.label}</span>
          </motion.div>
          {i < nodes.length - 1 && <span className="mb-4 text-paper-200/25">→</span>}
        </div>
      ))}
    </div>
  );
}
