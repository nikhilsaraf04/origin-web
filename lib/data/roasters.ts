// A curated, hand-picked directory of independent specialty coffee roasters
// in India. This is a static reference list (not synced, not user-editable
// yet), meant to help you discover bags worth scanning. It is intentionally
// not exhaustive: it favours genuinely independent, specialty-focused roasters
// over café chains and commodity brands.
//
// No em dashes in user-facing copy (house rule); commas and colons only.

export interface Roaster {
  /** Roaster name as it appears on the bag. */
  name: string;
  /** Roastery / home base city. */
  city: string;
  /** State or union territory, used for the region filter. */
  state: string;
  /** Year founded, where reliably known. */
  founded?: number;
  /** One-line descriptor. Keep it factual and short. */
  note: string;
  /** Official site, where confidently known. Cards without one link to a
   *  web search so every entry still leads somewhere useful. */
  website?: string;
  /** Short descriptive chips, e.g. "Estate grown", "Single origin". */
  tags: string[];
}

// Sorted roughly by how established / widely available each roaster is, but the
// screen re-groups them by region, so order here is only a gentle default.
export const ROASTERS: Roaster[] = [
  {
    name: "Blue Tokai Coffee Roasters",
    city: "New Delhi",
    state: "Delhi NCR",
    founded: 2013,
    note: "One of India's original third-wave roasters, farm to cup from single estates across the south.",
    website: "https://bluetokaicoffee.com",
    tags: ["Single estate", "Pan-India"],
  },
  {
    name: "Subko Specialty Coffee",
    city: "Mumbai",
    state: "Maharashtra",
    note: "Roaster, bakery and craft micro-lot program obsessed with Indian terroir and processing.",
    website: "https://subko.coffee",
    tags: ["Micro lots", "Craft"],
  },
  {
    name: "Corridor Seven Coffee Roasters",
    city: "Nagpur",
    state: "Maharashtra",
    note: "Central India's specialty pioneer, roasting single-origin Indian beans in small batches.",
    website: "https://corridorseven.coffee",
    tags: ["Single origin"],
  },
  {
    name: "KC Roasters",
    city: "Mumbai",
    state: "Maharashtra",
    note: "Koinonia coffee: small-batch roasting with a strong espresso and filter focus.",
    website: "https://kcroasters.com",
    tags: ["Small batch", "Espresso"],
  },
  {
    name: "Savorworks Roasters",
    city: "Gurugram",
    state: "Delhi NCR",
    note: "Roaster and café group known for a considered filter and espresso lineup.",
    tags: ["Filter", "Café roaster"],
  },
  {
    name: "Devans North Indian Coffee & Tea",
    city: "New Delhi",
    state: "Delhi NCR",
    founded: 1962,
    note: "A South Indian coffee institution in Delhi, roasting beans since the 1960s.",
    tags: ["Heritage"],
  },
  {
    name: "Sleepy Owl Coffee",
    city: "New Delhi",
    state: "Delhi NCR",
    note: "Best known for cold brew and easy-brew formats, alongside roasted whole-bean lines.",
    tags: ["Cold brew", "Everyday"],
  },
  {
    name: "Black Baza Coffee",
    city: "Bengaluru",
    state: "Karnataka",
    note: "Conservation-first coffee, shade grown in the Western Ghats and tied to biodiversity.",
    website: "https://blackbazacoffee.com",
    tags: ["Shade grown", "Conservation"],
  },
  {
    name: "Maverick & Farmer Coffee",
    city: "Bengaluru",
    state: "Karnataka",
    note: "Estate-owning roaster experimenting with unusual ferments and varietals from Coorg.",
    website: "https://maverickandfarmer.com",
    tags: ["Estate grown", "Experimental"],
  },
  {
    name: "The Flying Squirrel",
    city: "Bengaluru",
    state: "Karnataka",
    note: "Grows and roasts its own estate coffee from the hills of Coorg.",
    website: "https://flyingsquirrel.in",
    tags: ["Estate grown"],
  },
  {
    name: "Halli Berri",
    city: "Chikmagalur",
    state: "Karnataka",
    note: "Small estate roaster from the Baba Budan hills of Chikmagalur.",
    tags: ["Estate grown"],
  },
  {
    name: "Ainmane Coffee",
    city: "Kodagu",
    state: "Karnataka",
    note: "Family estate coffee from Coorg, roasted in small batches.",
    tags: ["Estate grown", "Small batch"],
  },
  {
    name: "Araku Coffee",
    city: "Araku Valley",
    state: "Andhra Pradesh",
    note: "Organic, tribal-grown coffee from a farmer cooperative in the Eastern Ghats.",
    website: "https://arakucoffee.in",
    tags: ["Organic", "Cooperative"],
  },
  {
    name: "Roastery Coffee House",
    city: "Hyderabad",
    state: "Telangana",
    note: "Café and roaster spotlighting Indian single origins and pour-over.",
    tags: ["Single origin", "Café roaster"],
  },
  {
    name: "Kapi Kottai",
    city: "Kodaikanal",
    state: "Tamil Nadu",
    note: "Micro-roaster championing South Indian single origins from the hills.",
    tags: ["Micro roaster", "Single origin"],
  },
  {
    name: "Seven Beans Co.",
    city: "Puducherry",
    state: "Puducherry",
    note: "Boutique roaster and café on the southeast coast.",
    tags: ["Boutique", "Café roaster"],
  },
  {
    name: "Curious Life Coffee Roasters",
    city: "Pune",
    state: "Maharashtra",
    note: "Independent roaster and café with a rotating single-origin menu.",
    tags: ["Single origin", "Café roaster"],
  },
  {
    name: "Marc's Coffees",
    city: "Pune",
    state: "Maharashtra",
    note: "Independent Pune roaster with a wide range of single origins and blends.",
    tags: ["Single origin", "Blends"],
  },
];

/** Distinct states in display order: most-represented first, then alphabetical. */
export function roasterStates(): string[] {
  const counts = new Map<string, number>();
  for (const r of ROASTERS) counts.set(r.state, (counts.get(r.state) ?? 0) + 1);
  return Array.from(counts.keys()).sort((a, b) => {
    const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
}

/** A link that always resolves: the official site when known, else a search. */
export function roasterLink(r: Roaster): string {
  if (r.website) return r.website;
  const q = encodeURIComponent(`${r.name} coffee roasters India`);
  return `https://www.google.com/search?q=${q}`;
}

/** The label shown for the link: the bare domain, or a search affordance. */
export function roasterLinkLabel(r: Roaster): string {
  if (!r.website) return "Find online";
  return r.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
