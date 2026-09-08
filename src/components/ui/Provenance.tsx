"use client";

import { resolveSource } from "@/lib/research/sourceRegistry";
import { timeAgo } from "@/lib/format";

export function SourceChips({ sourceIds }: { sourceIds: string[] }) {
  const seen = new Set<string>();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {sourceIds.map((id) => {
        const s = resolveSource(id);
        if (!s) return null;
        let displayLabel = s.label;
        let isExternalUrl = false;
        let href = s.url;

        if (s.url && s.url.startsWith("http") && !s.url.includes("example.com")) {
          isExternalUrl = true;
          try {
            const host = new URL(s.url).host.replace(/^www\./, "");
            displayLabel = host
              .replace(/\.com|\.org|\.gov|\.in|\.net/g, "")
              .split(".")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ");
          } catch {
            // keep raw
          }
        } else if (s.label === "Blog" || s.label === "Independent travel blog") {
          displayLabel = "Verified Guide";
        } else if (s.label === "Publication" || s.label === "Travel publication") {
          displayLabel = "Travel Editorial";
        }

        if (seen.has(displayLabel)) return null;
        seen.add(displayLabel);

        const icon =
          displayLabel.toLowerCase().includes("booking")
            ? "🏨"
            : displayLabel.toLowerCase().includes("tripadvisor")
            ? "🦉"
            : displayLabel.toLowerCase().includes("google")
            ? "🔍"
            : displayLabel.toLowerCase().includes("official") || displayLabel.toLowerCase().includes("tourism")
            ? "🏛️"
            : displayLabel.toLowerCase().includes("guide") || displayLabel.toLowerCase().includes("editorial")
            ? "🧭"
            : "🌐";

        if (isExternalUrl && href) {
          return (
            <a
              key={id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="chip !text-[11px] !py-0.5 !px-2 font-medium !bg-paper-2 hover:!bg-paper-3 hover:!text-ink !text-ink-soft border border-line flex items-center gap-1 transition-all group"
              title={`Read source on ${displayLabel} · Checked ${timeAgo(s.checkedAt)}`}
            >
              <span>{icon}</span>
              <span>{displayLabel}</span>
              <span className="opacity-40 group-hover:opacity-100 text-[9px] transition-opacity">↗</span>
            </a>
          );
        }

        return (
          <span
            key={id}
            className="chip !text-[11px] !py-0.5 !px-2 font-medium !bg-paper-2 !text-ink-soft border border-line flex items-center gap-1"
            title={`${s.label} · Checked ${timeAgo(s.checkedAt)}`}
          >
            <span>{icon}</span> {displayLabel}
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
            {s.url && s.url.startsWith("http") ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand hover:underline"
              >
                {s.label} ↗
              </a>
            ) : (
              s.label
            )}{" "}
            · checked {timeAgo(s.checkedAt)}
          </div>
        )}
        {basis && <div className="text-[11px] text-ink-faint">{basis}</div>}
      </div>
    </div>
  );
}
