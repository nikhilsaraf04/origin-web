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

  // New-age wave: mostly launched 2016 onwards, D2C and online-first roasters,
  // estate roasters shipping direct, and regional pioneers beyond the metros.

  // Delhi NCR
  {
    name: "Quick Brown Fox Coffee Roasters",
    city: "New Delhi",
    state: "Delhi NCR",
    founded: 2017,
    note: "Internet-first roaster-café from Dhan Mill, working with Indian estate arabica.",
    website: "https://qbfcoffee.com",
    tags: ["Single origin", "Café roaster"],
  },
  {
    name: "Rossette Coffee",
    city: "New Delhi",
    state: "Delhi NCR",
    founded: 2022,
    note: "Roast-to-order lab sourcing lots from Karnataka, Tamil Nadu and Nagaland.",
    website: "https://rossettecoffee.com",
    tags: ["Roast to order", "Small batch"],
  },
  {
    name: "Beanly Coffee",
    city: "Gurugram",
    state: "Delhi NCR",
    founded: 2018,
    note: "D2C brand known for pour-over and dip-bag formats with freshness-focused packaging.",
    website: "https://beanlycoffee.com",
    tags: ["D2C", "Pour over"],
  },
  {
    name: "Cohoma Coffee",
    city: "Ghaziabad",
    state: "Delhi NCR",
    founded: 2019,
    note: "D2C specialty roaster and brewing-gear maker with quick-brew home formats.",
    website: "https://cohomacoffee.com",
    tags: ["D2C", "Everyday"],
  },
  {
    name: "Kilta Coffee Co",
    city: "New Delhi",
    state: "Delhi NCR",
    founded: 2020,
    note: "D2C roaster selling freshly roasted single origins and blends online.",
    website: "https://kiltacoffeeco.com",
    tags: ["D2C", "Single origin"],
  },

  // Rajasthan
  {
    name: "Half Light Coffee Roasters",
    city: "Jaipur",
    state: "Rajasthan",
    founded: 2018,
    note: "Single-origin arabica roaster-café that grew from wholesale into its own roastery.",
    website: "https://halflightcoffee.com",
    tags: ["Single origin", "Café roaster"],
  },
  {
    name: "First Crack Coffee Roasters",
    city: "Jodhpur",
    state: "Rajasthan",
    founded: 2021,
    note: "Artisan roaster bringing specialty coffee to Rajasthan, ships pan-India.",
    website: "https://firstcrackcoffeeroasters.com",
    tags: ["Small batch", "D2C"],
  },

  // Chandigarh
  {
    name: "Ikkis Coffee",
    city: "Chandigarh",
    state: "Chandigarh",
    founded: 2020,
    note: "Small-batch roaster of traceable single-origin arabica.",
    website: "https://ikkis.coffee",
    tags: ["Single origin", "Small batch"],
  },
  {
    name: "Bloom Coffee Roasters",
    city: "Chandigarh",
    state: "Chandigarh",
    founded: 2020,
    note: "Independent roaster with a cult following and playful packaging, ships across India.",
    website: "https://bloomcoffeeroasters.in",
    tags: ["Small batch", "D2C"],
  },

  // Maharashtra
  {
    name: "Grey Soul Coffee Roasters",
    city: "Pune",
    state: "Maharashtra",
    founded: 2021,
    note: "Pour-over-focused roaster sourcing Nagaland, Sikkim and Odisha lots, now with cafés.",
    website: "https://greysoul.coffee",
    tags: ["Pour over", "Single origin"],
  },
  {
    name: "Bombay Island Coffee Company",
    city: "Mumbai",
    state: "Maharashtra",
    founded: 2018,
    note: "Small-batch arabica roastery that grew from Malad into a café.",
    website: "https://bombayisland.com",
    tags: ["Small batch", "Café roaster"],
  },
  {
    name: "Toffee Coffee Roasters",
    city: "Mumbai",
    state: "Maharashtra",
    note: "Online-first roaster promising beans soon after roast, ships pan-India.",
    website: "https://toffeecoffeeroasters.com",
    tags: ["D2C", "Fresh roast"],
  },

  // Goa
  {
    name: "G-Shot Coffee Roastery",
    city: "North Goa",
    state: "Goa",
    founded: 2018,
    note: "Micro-roastery roasting specialty microlots from Indian estates, fresh to order.",
    website: "https://gshotcoffeeroastery.com",
    tags: ["Microlots", "Roast to order"],
  },

  // Madhya Pradesh
  {
    name: "Siolim Specialty Coffee",
    city: "Indore",
    state: "Madhya Pradesh",
    founded: 2022,
    note: "Central India microlot roaster with a co-roasting space and experimental ferments.",
    website: "https://siolim.coffee",
    tags: ["Microlots", "Experimental"],
  },

  // Gujarat
  {
    name: "Kaffa Coffee Roasters",
    city: "Ahmedabad",
    state: "Gujarat",
    note: "Ahmedabad live roastery where guests pick the beans and the brew method.",
    website: "https://kaffacoffee.com",
    tags: ["Café roaster"],
  },

  // Karnataka
  {
    name: "Genetics Coffee",
    city: "Bengaluru",
    state: "Karnataka",
    note: "Small-batch Bengaluru roastery sourcing traceable Indian and world single origins.",
    website: "https://genetics.coffee",
    tags: ["Single origin", "Small batch"],
  },
  {
    name: "Naivo Coffee Company",
    city: "Bengaluru",
    state: "Karnataka",
    founded: 2016,
    note: "Family roastery led by a certified Q grader, roasting on Probat and Bühler.",
    website: "https://naivo.in",
    tags: ["Single origin", "Q grader"],
  },
  {
    name: "Kohi Roasters",
    city: "Bengaluru",
    state: "Karnataka",
    founded: 2018,
    note: "Works with family estates in the Baba Budan and Shevaroy hills, small-batch Indian arabica.",
    website: "https://kohiroasters.in",
    tags: ["Single origin", "Small batch"],
  },
  {
    name: "Bili Hu",
    city: "Bengaluru",
    state: "Karnataka",
    founded: 2016,
    note: "Named after the white coffee flower, partners with Chikmagalur planters and screens lots for defects.",
    website: "https://bilihu.in",
    tags: ["Single origin", "Traceable"],
  },
  {
    name: "GB Roasters",
    city: "Bengaluru",
    state: "Karnataka",
    note: "Micro-roastery of single origins, rare varietals and microlots, with brew gear and education.",
    website: "https://gbroastery.com",
    tags: ["Microlots", "Rare varietals"],
  },
  {
    name: "Fraction 9 Coffee Roasters",
    city: "Chikmagalur",
    state: "Karnataka",
    note: "Farm-to-cup roaster from the family-run Kalyan Cool Estate, shipping direct from the farm.",
    website: "https://fraction9coffee.com",
    tags: ["Estate grown", "Farm to cup"],
  },
  {
    name: "Kerehaklu",
    city: "Chikmagalur",
    state: "Karnataka",
    note: "Fourth-generation estate known for experimental fermentation microlots.",
    website: "https://kerehaklu.com",
    tags: ["Estate grown", "Experimental"],
  },
  {
    name: "Estate Monkeys",
    city: "Kodagu",
    state: "Karnataka",
    note: "Single-origin Coorg estate roaster that roasts and grinds to order.",
    website: "https://estatemonkeys.com",
    tags: ["Estate grown", "Roast to order"],
  },

  // Tamil Nadu
  {
    name: "Beachville Coffee Roasters",
    city: "Chennai",
    state: "Tamil Nadu",
    founded: 2018,
    note: "Roastery-café working directly with Indian specialty estates in small batches.",
    website: "https://beachvillecoffee.com",
    tags: ["Single origin", "Café roaster"],
  },
  {
    name: "Kat & Kin Coffee Roasters",
    city: "Chennai",
    state: "Tamil Nadu",
    founded: 2020,
    note: "Family-owned roaster started during lockdown, premium roasted specialty coffee.",
    website: "https://katandkincoffee.com",
    tags: ["Small batch", "Family owned"],
  },

  // Kerala
  {
    name: "Ffox Coffee",
    city: "Kochi",
    state: "Kerala",
    founded: 2019,
    note: "Kerala roaster of single-estate and organic beans, including Baba Budangiri lots.",
    website: "https://ffoxcoffee.com",
    tags: ["Single origin", "Organic"],
  },
  {
    name: "Kapiberry",
    city: "Kochi",
    state: "Kerala",
    note: "Kerala micro-batch roaster of single-origin and blended specialty coffees.",
    website: "https://kapiberry.com",
    tags: ["Micro batch", "Single origin"],
  },

  // Telangana
  {
    name: "Black Fuel",
    city: "Hyderabad",
    state: "Telangana",
    note: "Jubilee Hills micro-roastery and café sourcing direct from small South Indian farms.",
    website: "https://blackfuel.coffee",
    tags: ["Café roaster", "Single origin"],
  },

  // Andhra Pradesh
  {
    name: "Native Araku Coffee",
    city: "Visakhapatnam",
    state: "Andhra Pradesh",
    note: "D2C brand selling hand-picked roasted Araku Valley coffee via farmer producer groups.",
    website: "https://nativearakucoffee.com",
    tags: ["D2C", "Cooperative"],
  },

  // Odisha
  {
    name: "Kruti Coffee",
    city: "Bhubaneswar",
    state: "Odisha",
    founded: 2013,
    note: "Odisha's homegrown specialty brand building Koraput as an origin, cafés and D2C.",
    website: "https://kruticoffee.com",
    tags: ["Single origin", "D2C"],
  },

  // West Bengal
  {
    name: "Yours Truly Coffee Roaster",
    city: "Kolkata",
    state: "West Bengal",
    note: "Bean-to-brew roastery and café-bakery in a heritage Kolkata bungalow.",
    website: "https://yourstrulycoffee.in",
    tags: ["Café roaster", "Bean to brew"],
  },

  // Nagaland
  {
    name: "Été Coffee",
    city: "Dimapur",
    state: "Nagaland",
    founded: 2016,
    note: "One of Northeast India's first specialty roasters, D2C online.",
    website: "https://etecoffeeroasters.com",
    tags: ["Single origin", "D2C"],
  },
  {
    name: "Brewed Awakening",
    city: "Kohima",
    state: "Nagaland",
    note: "Works directly with small growers in Nagaland and Arunachal, small-batch roasts.",
    website: "https://brewedawaken.in",
    tags: ["Direct trade", "Small batch"],
  },

  // Meghalaya
  {
    name: "7000 Steps Coffee",
    city: "Shillong",
    state: "Meghalaya",
    founded: 2019,
    note: "Roasts direct-from-farmer beans across Assam, Nagaland and Meghalaya.",
    website: "https://7000steps.com",
    tags: ["Direct trade", "Northeast origins"],
  },
  {
    name: "Smoky Falls Tribe Coffee",
    city: "Shillong",
    state: "Meghalaya",
    founded: 2015,
    note: "Woman-founded Meghalaya roaster supplying cafés across the Northeast.",
    tags: ["Small batch", "Northeast origins"],
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
