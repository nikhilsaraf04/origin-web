// The world view: where your coffee comes from, and where you drank it.
//
// Equirectangular projection, drawn as inline SVG. No map library and no tile
// server: the geometry is a 62 KB generated file (scripts/build-world-geo.mjs)
// and everything else is arithmetic, so the map works offline in the PWA.
//
// Two layers of meaning:
//   * origin countries, filled by how many coffees you have had from them
//   * arcs from an origin to the city you drank it in, for logged visits
//
// Arcs need both ends. Bags carry an origin but no place of drinking, so they
// shade the map without drawing a line; visits carry both. That asymmetry is
// deliberate and the legend says so rather than faking the missing end.

"use client";

import { useMemo } from "react";
import { WORLD_SHAPES } from "@/lib/data/geo";

// Antarctica and the high Arctic are dead space on a coffee map.
const LAT_MAX = 84;
const LAT_MIN = -58;
const VIEW_W = 800;
const VIEW_H = Math.round((VIEW_W * (LAT_MAX - LAT_MIN)) / 360);

export function project([lon, lat]: [number, number]): [number, number] {
  const x = ((lon + 180) / 360) * VIEW_W;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VIEW_H;
  return [x, y];
}

export interface OriginDatum {
  country: string;
  point: [number, number];
  count: number;
  /** Mean rating across that origin's coffees, 0-100, or null if unrated. */
  rating: number | null;
}

export interface PlaceDatum {
  key: string;
  label: string;
  point: [number, number];
  count: number;
  /** True when the pin is the country centroid rather than the city itself. */
  approximate: boolean;
}

export interface ArcDatum {
  key: string;
  from: [number, number];
  to: [number, number];
}

/** Quadratic bezier bowed perpendicular to the chord, so long hops arc like a
 *  flight path instead of cutting straight across. */
function arcPath(from: [number, number], to: [number, number]): string {
  const [x1, y1] = project(from);
  const [x2, y2] = project(to);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  // Bow proportional to distance, capped so short hops stay readable.
  const bow = Math.min(dist * 0.22, 90);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Perpendicular unit vector, always bowing "up" the page for consistency.
  const len = dist || 1;
  const px = -dy / len;
  const py = dx / len;
  const sign = py > 0 ? -1 : 1;
  const cx = mx + px * bow * sign;
  const cy = my + py * bow * sign;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** Country geometry is polygons -> rings -> points, so both levels have to be
 *  walked. Flattening only one level projects a whole ring as if it were a
 *  single point and yields NaN.
 *
 *  Rings that cross the antimeridian (Russia, Fiji, Antarctica) contain a step
 *  from +179 to -180. Projected naively that is a line straight across the
 *  whole map, which showed up as full-width horizontal streaks. Break the
 *  subpath at any step wider than half the world instead of drawing it. */
function shapePath(polys: number[][][][]): string {
  let d = "";
  for (const rings of polys) {
    for (const ring of rings) {
      if (ring.length < 4) continue;
      let penDown = false;
      for (let i = 0; i < ring.length; i++) {
        const lon = ring[i][0];
        const wrapped = i > 0 && Math.abs(lon - ring[i - 1][0]) > 180;
        const [x, y] = project(ring[i] as [number, number]);
        // Close the run before jumping the date line, otherwise the fill rule
        // bridges the gap and draws a diagonal across the break.
        if (wrapped && penDown) d += "Z ";
        d += `${!penDown || wrapped ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
        penDown = true;
      }
      d += "Z ";
    }
  }
  return d;
}

export function WorldMap({
  origins,
  places,
  arcs,
}: {
  origins: OriginDatum[];
  places: PlaceDatum[];
  arcs: ArcDatum[];
}) {
  // Precompute country outlines once: the geometry never changes.
  const paths = useMemo(
    () => WORLD_SHAPES.map((s) => ({ n: s.n, d: shapePath(s.p) })),
    [],
  );

  const maxCount = useMemo(
    () => origins.reduce((m, o) => Math.max(m, o.count), 0) || 1,
    [origins],
  );

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full h-auto block"
      role="img"
      aria-label="World map of coffee origins and places visited"
    >
      <defs>
        <radialGradient id="originGlow">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="arcFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
          <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.75" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Landmass */}
      <g>
        {paths.map((p) => (
          <path
            key={p.n}
            d={p.d}
            fill="var(--bg-2, #131c2b)"
            stroke="var(--line-2)"
            strokeWidth={0.4}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* Origin glow, sized by how many coffees came from there */}
      <g>
        {origins.map((o) => {
          const [x, y] = project(o.point);
          const scale = 0.35 + 0.65 * Math.sqrt(o.count / maxCount);
          return (
            <circle
              key={`glow-${o.country}`}
              cx={x}
              cy={y}
              r={26 * scale}
              fill="url(#originGlow)"
            />
          );
        })}
      </g>

      {/* Arcs: origin -> where you drank it */}
      <g fill="none" strokeLinecap="round">
        {arcs.map((a) => (
          <path
            key={a.key}
            d={arcPath(a.from, a.to)}
            stroke="url(#arcFade)"
            strokeWidth={1.1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* Origin markers */}
      <g>
        {origins.map((o) => {
          const [x, y] = project(o.point);
          const scale = 0.5 + 0.5 * Math.sqrt(o.count / maxCount);
          return (
            <circle
              key={`origin-${o.country}`}
              cx={x}
              cy={y}
              r={3.2 * scale}
              fill="var(--accent)"
              opacity={0.95}
            />
          );
        })}
      </g>

      {/* Places visited */}
      <g>
        {places.map((p) => {
          const [x, y] = project(p.point);
          return (
            <g key={p.key}>
              <circle
                cx={x}
                cy={y}
                r={4.4}
                fill="none"
                stroke="var(--ink-1)"
                strokeWidth={1}
                strokeDasharray={p.approximate ? "2 2" : undefined}
                vectorEffect="non-scaling-stroke"
                opacity={0.9}
              />
              <circle cx={x} cy={y} r={1.4} fill="var(--ink-1)" opacity={0.9} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
