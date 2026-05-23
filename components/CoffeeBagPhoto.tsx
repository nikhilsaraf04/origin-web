// Mirrors Origin/Components/CoffeeBagPhoto.swift
"use client";

import { bagVariantFor } from "@/lib/design-tokens";

interface CoffeeBagPhotoProps {
  width: number;
  height: number;
  colorIndex: number;
  country?: string | null;
  roaster?: string | null;
  photoDataUrl?: string | null;
  className?: string;
}

export function CoffeeBagPhoto({
  width,
  height,
  colorIndex,
  country,
  roaster,
  photoDataUrl,
  className,
}: CoffeeBagPhotoProps) {
  const variant = bagVariantFor(colorIndex);
  return (
    <div
      className={`relative overflow-hidden rounded-r1 ${className ?? ""}`}
      style={{ width, height, background: variant.bg }}
    >
      {photoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoDataUrl}
          alt={country ?? "Coffee bag"}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-stretch justify-between px-[6px] py-[6px] pointer-events-none">
          <div className="flex-1" />
          {country ? (
            <div
              className="font-display text-[13px] text-center uppercase"
              style={{ color: variant.text, letterSpacing: "2px" }}
            >
              {country}
            </div>
          ) : null}
          <div className="flex-1" />
          {roaster ? (
            <div
              className="font-ui text-[7px] truncate self-start"
              style={{ color: variant.text, opacity: 0.5 }}
            >
              {roaster}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
