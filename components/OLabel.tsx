// Mirrors Origin/Components/OLabel.swift
"use client";

import { clsx } from "@/lib/clsx";

interface OLabelProps {
  text: string;
  variant?: "default" | "accent";
  className?: string;
}

export function OLabel({ text, variant = "default", className }: OLabelProps) {
  return (
    <span
      className={clsx(
        "uppercase font-medium font-ui text-[10px]",
        variant === "accent" ? "text-accent" : "text-ink-3",
        className,
      )}
      style={{ letterSpacing: "0.1em" }}
    >
      {text}
    </span>
  );
}
