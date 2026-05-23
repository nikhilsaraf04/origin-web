// Mirrors Origin/Components/OMatchBadge.swift
"use client";

interface OMatchBadgeProps {
  pct: number | null;
  reason: string;
}

export function OMatchBadge({ pct, reason }: OMatchBadgeProps) {
  const hasScore = pct !== null && pct !== undefined;
  return (
    <div className="flex flex-col gap-s2">
      <div className="flex items-baseline gap-1">
        <span
          className="font-display text-[52px] leading-none"
          style={{ color: hasScore ? "var(--accent)" : "var(--ink-4)" }}
        >
          {hasScore ? pct : "—"}
        </span>
        <div className="flex flex-col gap-[1px]">
          <span
            className="font-ui text-[12px]"
            style={{ color: hasScore ? "var(--ink-3)" : "var(--ink-4)" }}
          >
            %
          </span>
          <span
            className="font-ui font-medium text-[10px] uppercase"
            style={{
              color: hasScore ? "var(--ink-3)" : "var(--ink-4)",
              letterSpacing: "0.1em",
            }}
          >
            match
          </span>
        </div>
      </div>
      <div className="w-[40px] h-[0.5px] bg-line-3" />
      <p
        className="font-ui text-[12px] leading-[1.5]"
        style={{ color: hasScore ? "var(--ink-3)" : "var(--ink-4)" }}
      >
        {reason}
      </p>
    </div>
  );
}
