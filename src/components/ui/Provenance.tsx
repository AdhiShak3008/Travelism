"use client";

import { research } from "@/lib/research/provider";
import { sourceReliabilityLabel } from "@/lib/research/sources";
import { timeAgo, cx } from "@/lib/format";

export function SourceChips({ sourceIds }: { sourceIds: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sourceIds.map((id) => {
        const s = research.getSource(id);
        if (!s) return null;
        const tone =
          s.reliability >= 0.9
            ? "!border-signal-good/30 !text-signal-good"
            : s.reliability >= 0.75
            ? "!border-alpine-400/30 !text-alpine-200"
            : "!border-white/10 !text-paper-200/60";
        return (
          <span key={id} className={cx("chip !text-[11px]", tone)} title={`${s.label} · checked ${timeAgo(s.checkedAt)}`}>
            {sourceReliabilityLabel(s.type)}
          </span>
        );
      })}
    </div>
  );
}

export function ProvenanceLine({
  label,
  value,
  sourceId,
  basis,
}: {
  label: string;
  value: string;
  sourceId?: string;
  basis?: string;
}) {
  const s = sourceId ? research.getSource(sourceId) : undefined;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-paper-200/60">{label}</span>
      <div className="text-right">
        <div className="font-semibold text-paper-50">{value}</div>
        {s && (
          <div className="text-[11px] text-paper-200/40">
            {s.label} · checked {timeAgo(s.checkedAt)}
          </div>
        )}
        {basis && <div className="text-[11px] text-paper-200/40">{basis}</div>}
      </div>
    </div>
  );
}
