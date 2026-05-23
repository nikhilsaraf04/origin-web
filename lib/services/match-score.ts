// Ported from Origin/Services/MatchScoreService.swift — bit-exact port.

import type { ScanResult } from "@/lib/types/models";
import {
  type TasteProfile,
  isProfileReady,
} from "@/lib/types/taste-profile";

export interface MatchScore {
  score: number;
  reason: string;
}

export function computeMatchScore(
  result: ScanResult,
  profile: TasteProfile | null | undefined,
): MatchScore {
  if (!isProfileReady(profile)) return { score: 0, reason: "" };

  let score = 50;
  const highlights: string[] = [];

  // Process affinity (±20)
  const procItem = profile.topProcesses.find((p) => p.label === result.process);
  if (procItem) {
    score += procItem.normalizedScore * 20 - 10;
    if (procItem.normalizedScore > 0.75)
      highlights.push(`${result.process} is your top process`);
  }

  // Origin affinity (±20)
  const originItem = profile.topOrigins.find(
    (p) => p.label === result.originCountry,
  );
  if (originItem) {
    score += originItem.normalizedScore * 20 - 10;
    if (originItem.normalizedScore > 0.75)
      highlights.push(`You love ${result.originCountry} coffees`);
  }

  // Roast affinity (±15)
  const roastItem = profile.topRoastLevels.find(
    (p) => p.label === result.roastLevel,
  );
  if (roastItem) {
    score += roastItem.normalizedScore * 15 - 7.5;
    if (roastItem.normalizedScore > 0.8)
      highlights.push(`${result.roastLevel} roast is your favourite`);
  }

  // Flavor overlap (±30)
  const profileTagSet = new Set(
    profile.topFlavorTags.slice(0, 15).map((t) => t.label),
  );
  const scanTagSet = new Set(result.roasterFlavorTags);
  const overlap = [...scanTagSet].filter((t) => profileTagSet.has(t));
  if (scanTagSet.size > 0) {
    const ratio = overlap.length / Math.min(scanTagSet.size, 6);
    score += ratio * 30 - 15;
    if (overlap.length > 0) {
      highlights.push(
        `Has ${overlap.slice(0, 2).join(" & ")} which you enjoy`,
      );
    }
  }

  const finalScore = Math.max(1, Math.min(99, Math.round(score)));
  const reason =
    highlights[0] ?? `Based on your ${profile.totalLogged} logged coffees`;
  return { score: finalScore, reason };
}
