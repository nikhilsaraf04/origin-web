// Mirrors Origin/Components/OChip.swift
"use client";

import { clsx } from "@/lib/clsx";

interface OChipProps {
  text: string;
  highlighted?: boolean;
  onClick?: () => void;
  className?: string;
}

export function OChip({ text, highlighted = false, onClick, className }: OChipProps) {
  const inner = (
    <span
      className={clsx(
        "uppercase font-medium font-ui text-[10px] px-[10px] py-[4px] rounded-r2 border",
        highlighted
          ? "text-accent bg-[var(--accent-dim)] border-[var(--accent-border)]"
          : "text-ink-2 bg-bg-3 border-line-2",
        className,
      )}
      style={{ letterSpacing: "0.08em", borderWidth: "0.5px" }}
    >
      {text}
    </span>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="inline-flex">
        {inner}
      </button>
    );
  }
  return inner;
}
