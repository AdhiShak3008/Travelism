"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";

export function ScoreBar({ value, max = 10, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = pct >= 80 ? "bg-good" : pct >= 60 ? "bg-brand" : pct >= 40 ? "bg-warn" : "bg-bad";
  return (
    <div className="flex items-center gap-3">
      {label && <span className="w-28 shrink-0 text-xs text-ink-soft">{label}</span>}
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-3">
        <motion.div
          className={cx("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-ink">{value.toFixed(1)}</span>
    </div>
  );
}

export function ConfidencePill({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 85 ? "text-good" : pct >= 70 ? "text-brand" : "text-warn";
  return (
    <span className={cx("chip", tone)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {pct}% sure
    </span>
  );
}

export function AnimatedNumber({
  value,
  prefix = "₹",
  className,
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef<number>();

  useEffect(() => {
    const from = prev.current;
    const to = value;
    const start = performance.now();
    const dur = 650;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value]);

  return (
    <span className={className}>
      {prefix}
      {Math.round(display).toLocaleString("en-IN")}
    </span>
  );
}

export function Sparkle({ trend }: { trend: "improving" | "stable" | "declining" }) {
  const map = {
    improving: { t: "Loved lately", c: "text-good", a: "↗" },
    stable: { t: "Steady", c: "text-ink-faint", a: "→" },
    declining: { t: "Slipping", c: "text-bad", a: "↘" },
  }[trend];
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs font-medium", map.c)}>
      {map.a} {map.t}
    </span>
  );
}

export function StarRating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-gold">★</span>
      <span className="font-semibold tabular-nums text-ink">{value.toFixed(1)}</span>
    </span>
  );
}

export function SectionTitle({ eyebrow, title, hint }: { eyebrow?: string; title: string; hint?: string }) {
  return (
    <div className="mb-5">
      {eyebrow && <div className="label-eyebrow mb-2">{eyebrow}</div>}
      <h2 className="display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
      {hint && <p className="mt-1.5 max-w-2xl text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}
