// Mirrors Origin/Components/ORating.swift
"use client";

interface ORatingProps {
  score: number;
}

export function ORating({ score }: ORatingProps) {
  return (
    <div className="flex items-baseline gap-[2px]">
      <span className="font-mono text-[36px] leading-none text-ink-1">{score}</span>
      <span className="font-mono text-[12px] text-ink-4">/100</span>
    </div>
  );
}
