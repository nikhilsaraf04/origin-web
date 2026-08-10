// One-time build of the world geometry the map renders.
//
// Converts Natural Earth 110m country polygons (via world-atlas topojson) into
// a compact GeoJSON committed to lib/data/world-geo.json, plus a centroid per
// country so origins can be plotted without a second data source.
//
// Coordinates are rounded to 1dp and rings under a minimum vertex count are
// dropped: at the size this map renders (a phone, a few hundred pixels wide)
// the extra precision is invisible but triples the bundle.
//
// Run with: node scripts/build-world-geo.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";

const RAW = JSON.parse(
  readFileSync("node_modules/world-atlas/countries-110m.json", "utf8"),
);
const fc = feature(RAW, RAW.objects.countries);

const round = (n) => Math.round(n * 10) / 10;

/** Drop consecutive duplicate points left behind by rounding. */
function dedupe(ring) {
  const out = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out;
}

/** Bounding-box span of a ring, in degrees. */
function span(ring) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return Math.max(maxX - minX, maxY - minY);
}

// Below this, a landmass is under a pixel on a phone-width map.
const MIN_SPAN_DEG = 1.5;
// Douglas-Peucker tolerance in degrees. Most of the bytes are in detailed
// coastlines that this map never renders large enough to show.
const DP_TOLERANCE = 0.35;

/** Perpendicular distance from p to the segment ab. */
function perpDistance(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const cl = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + cl * dx), py - (ay + cl * dy));
}

function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      maxDist = d;
      idx = i;
    }
  }
  if (maxDist <= tolerance) return [points[0], points[points.length - 1]];
  const left = douglasPeucker(points.slice(0, idx + 1), tolerance);
  const right = douglasPeucker(points.slice(idx), tolerance);
  return [...left.slice(0, -1), ...right];
}

/** Simplify a closed ring, keeping it closed. */
function simplifyRing(ring) {
  const closed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const open = closed ? ring.slice(0, -1) : ring;
  if (open.length <= 3) return ring;
  const simplified = douglasPeucker(open, DP_TOLERANCE);
  return [...simplified, simplified[0]];
}

/** Rounded rings, no size filtering — used for centroids so that city-states
 *  (Singapore) keep a plottable point even when their shape is too small to
 *  draw. */
function roundRings(rings) {
  return rings
    .map((r) => dedupe(r.map(([x, y]) => [round(x), round(y)])))
    .filter((r) => r.length >= 4);
}

function simplifyRings(rings) {
  const rounded = roundRings(rings);
  // Drop the whole polygon when its outer ring is too small to see. Inner
  // rings (holes) ride along with whichever outer ring survives.
  if (rounded.length === 0 || span(rounded[0]) < MIN_SPAN_DEG) return [];
  return rounded.map(simplifyRing).filter((r) => r.length >= 4);
}

/** Area-weighted centroid of the largest ring, which for our purposes reads
 *  as "where the label goes" better than a true multipolygon centroid. */
function centroidOf(polys) {
  let best = null;
  let bestArea = -1;
  for (const rings of polys) {
    const ring = rings[0];
    if (!ring || ring.length < 4) continue;
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[i + 1];
      const f = x0 * y1 - x1 * y0;
      area += f;
      cx += (x0 + x1) * f;
      cy += (y0 + y1) * f;
    }
    area /= 2;
    if (Math.abs(area) < 1e-9) continue;
    const c = [cx / (6 * area), cy / (6 * area)];
    if (Math.abs(area) > bestArea) {
      bestArea = Math.abs(area);
      best = c;
    }
  }
  return best ? [round(best[0]), round(best[1])] : null;
}

// Natural Earth 110m has no polygon for states below a size threshold, so a
// few real coffee places are simply absent. Hand-placed centroids keep them
// plottable; they get a pin but no country shape, which is correct at this
// scale anyway.
const CENTROID_OVERRIDES = {
  Singapore: [103.8, 1.35],
  "Hong Kong": [114.2, 22.3],
  Bahrain: [50.6, 26.1],
  Malta: [14.4, 35.9],
  Mauritius: [57.6, -20.3],
  "Cape Verde": [-23.6, 15.1],
  "São Tomé and Príncipe": [6.6, 0.3],
  Comoros: [43.3, -11.6],
};

const shapes = [];
const centroids = {};

for (const f of fc.features) {
  const name = f.properties?.name;
  if (!name) continue;

  const polys =
    f.geometry.type === "Polygon"
      ? [f.geometry.coordinates]
      : f.geometry.type === "MultiPolygon"
        ? f.geometry.coordinates
        : [];

  const simplified = polys
    .map((rings) => simplifyRings(rings))
    .filter((rings) => rings.length > 0);

  if (simplified.length > 0) shapes.push({ n: name, p: simplified });

  // Centroid comes from the UNFILTERED geometry, so a country whose shape was
  // too small to draw still has a point to plot. Singapore is the case that
  // matters here: a real coffee city, four pixels of land.
  const full = polys.map((rings) => roundRings(rings)).filter((r) => r.length > 0);
  const c = centroidOf(full.length > 0 ? full : simplified);
  if (c) centroids[name] = c;
}

for (const [name, c] of Object.entries(CENTROID_OVERRIDES)) {
  if (!centroids[name]) centroids[name] = c;
}

const out = { shapes, centroids };
writeFileSync("lib/data/world-geo.json", JSON.stringify(out));

const bytes = JSON.stringify(out).length;
console.log(
  `countries: ${shapes.length}, centroids: ${Object.keys(centroids).length}, ${(bytes / 1024).toFixed(0)} KB`,
);
