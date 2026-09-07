"use client";

import { resolveSource } from "@/lib/research/sourceRegistry";
import { sourceReliabilityLabel } from "@/lib/research/sources";
import { timeAgo, cx } from "@/lib/format";

export function SourceChips({ sourceIds }: { sourceIds: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {sourceIds.map((id) => {
        const s = resolveSource(id);
        if (!s) return null;
        const tone =
          s.reliability >= 0.9 ? "text-good" : s.reliability >= 0.75 ? "text-brand" : "text-ink-faint";
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
  const s = sourceId ? resolveSource(sourceId) : undefined;
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <div className="text-right">
        <div className="font-semibold text-ink">{value}</div>
        {s && (
          <div className="text-[11px] text-ink-faint">
            {s.label} · checked {timeAgo(s.checkedAt)}
          </div>
        )}
        {basis && <div className="text-[11px] text-ink-faint">{basis}</div>}
      </div>
    </div>
  );
}
