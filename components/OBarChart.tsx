// Mirrors Origin/Components/OBarChart.swift
"use client";

import { useEffect, useState } from "react";

export interface OBarChartItem {
  id: string;
  label: string;
  value: number; // 0-1
  displayValue: string;
}

export function OBarChart({ items }: { items: OBarChartItem[] }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setAnimated(true), 16);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-3">
          <span
            className="font-ui text-[11px] text-ink-2 text-right truncate"
            style={{ width: 74 }}
          >
            {item.label}
          </span>

          <div className="flex-1 h-[3px] bg-bg-4 rounded-r1 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-r1 bg-accent/80 transition-[width]"
              style={{
                width: animated ? `${item.value * 100}%` : 0,
                transitionDuration: "600ms",
                transitionDelay: `${idx * 80}ms`,
                transitionTimingFunction: "ease-out",
              }}
            />
          </div>

          <span
            className="font-mono text-[10px] text-ink-3 text-right"
            style={{ width: 28 }}
          >
            {item.displayValue}
          </span>
        </div>
      ))}
    </div>
  );
}
