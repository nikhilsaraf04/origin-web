// Mirrors Origin/Design/DesignTokens.swift exactly.
// All hex values, sizes, spacing constants stay identical to the iOS app.

export const Palette = {
  dark: {
    bg0: "#0A0F18",
    bg1: "#101828",
    bg2: "#182030",
    bg3: "#202C3E",
    bg4: "#2A3850",
    ink1: "#EEF2F6",
    ink2: "#8FA4B8",
    ink3: "#52687A",
    ink4: "#2C3D4C",
    line1: "#162030",
    line2: "#1E2D3E",
    line3: "#2C3E52",
    accent: "#7A90C4",
    accentInk: "#0A0F18",
    accentDim: "rgba(122, 144, 196, 0.12)",
    accentBorder: "rgba(122, 144, 196, 0.30)",
  },
} as const;

export const TypeSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xl2: 34,
  xl3: 42,
  xl4: 52,
} as const;

export const Tracking = {
  label: 1.4,
  chip: 0.8,
  display: 0.3,
  mono: -0.3,
} as const;

export const Spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 32,
  s8: 48,
  s9: 64,
} as const;

export const Radius = {
  r1: 2,
  r2: 3,
  r3: 4,
  r4: 8,
  pill: 999,
} as const;

export const AppLayout = {
  screenHPad: 20,
  tabBarHeight: 88,
  thumbnailW: 70,
  thumbnailH: 94,
  scanFabSize: 50,
  rowPadV: 16,
  sectionGap: 24,
} as const;

export const Motion = {
  fast: 0.1,
  base: 0.18,
  slow: 0.3,
  scanLineDuration: 2.5,
  fieldStagger: 0.13,
} as const;

// Bag color variants — used for placeholder thumbnails when no photo is uploaded
export interface BagColorVariant {
  bg: string;
  text: string;
}

export const BagColors: BagColorVariant[] = [
  { bg: "#0C0F18", text: "#A8BDD0" },
  { bg: "#070B10", text: "#90BABB" },
  { bg: "#0C1008", text: "#A0B890" },
  { bg: "#100C0A", text: "#C0A898" },
  { bg: "#080808", text: "#C8C8C4" },
  { bg: "#090C12", text: "#B0B8CC" },
  { bg: "#0C0A08", text: "#C0B898" },
  { bg: "#060C10", text: "#88BACA" },
];

export function bagVariantFor(index: number): BagColorVariant {
  const len = BagColors.length;
  const i = ((index % len) + len) % len;
  return BagColors[i];
}

// Stable string-hash function (mirrors Swift's String.hashValue use-cases — we
// just need a deterministic integer per string for picking a bag color).
export function stringHashIndex(str: string, mod: number = BagColors.length): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % mod;
}
