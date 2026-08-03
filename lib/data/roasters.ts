// A curated, hand-picked directory of independent specialty coffee roasters
// in India, RANKED on a balanced five-axis scorecard.
//
// The list is a static reference (not synced, not user-editable yet), meant
// to help you discover bags worth scanning. It intentionally favours
// genuinely independent, specialty-focused roasters over café chains and
// commodity brands.
//
// Ranking rubric (balanced scorecard, five equally weighted axes, each 0-20,
// so a roaster's score is out of 100):
//   cup        Cup Quality & Craft: roast consistency and sensory quality.
//   sourcing   Sourcing & Traceability: direct trade, estate transparency,
//              green-bean quality, farmer relationships.
//   innovation Innovation & Range: experimental processing, microlots, rare
//              varietals, breadth of offering.
//   reputation Reputation & Recognition: awards, use by national barista and
//              brewers champions, press, barista and community esteem.
//   influence  Influence & Pioneering: role in shaping Indian specialty
//              coffee, longevity, education and community.
//
// Scores were assigned from a web-research pass (competition results, awards,
// barista and expert opinion, press, sourcing depth) against shared
// calibration anchors, so they are directional and inevitably subjective.
// Newer or smaller roasters can cup beautifully yet rank lower here because
// recognition and influence take years to build. Treat it as a map, not a
// verdict.
//
// No em dashes in user-facing copy (house rule); commas and colons only.

import {
  emptyScanResult,
  type ScanResult,
  type CoffeeProcess,
  type RoastLevel,
} from "@/lib/types/models";

export interface RoasterScore {
  cup: number; // 0-20
  sourcing: number; // 0-20
  innovation: number; // 0-20
  reputation: number; // 0-20
  influence: number; // 0-20
}

/** The roaster's flagship / highest-rated whole-bean offering. Attributes use
 *  the app's enums and flavor taxonomy so the match algorithm can score it
 *  against the user's taste profile directly. */
export interface FlagshipCoffee {
  /** Product name as sold, e.g. "Vienna Roast", "Attikan Estate". */
  name: string;
  kind: "single-origin" | "blend";
  originCountry: string;
  originRegion?: string;
  process: CoffeeProcess;
  roastLevel: RoastLevel;
  /** Canonical flavor-taxonomy tags (lowercase-with-hyphens). */
  flavorTags: string[];
  /** True when we could not confirm a specific flagship and fell back to the
   *  roaster's typical house bean. */
  approx?: boolean;
}

/** Build a ScanResult-shaped object from a flagship so computeMatchScore can
 *  score it. Only the fields the matcher reads are meaningful. */
export function flagshipScanResult(f: FlagshipCoffee): ScanResult {
  return {
    ...emptyScanResult(),
    coffeeName: f.name,
    originCountry: f.originCountry,
    originRegion: f.originRegion ?? "",
    process: f.process,
    roastLevel: f.roastLevel,
    roasterFlavorTags: f.flavorTags,
  };
}

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
  /** Five-axis rubric scores (each 0-20). Total is derived, never stored. */
  scores: RoasterScore;
}

export interface RankedRoaster extends Roaster {
  /** 1-based position in the overall ranking. */
  rank: number;
  /** Sum of the five axes, out of 100. */
  score: number;
  /** The roaster's flagship whole-bean coffee, if known. */
  flagship?: FlagshipCoffee;
}

/** The five rubric axes, with the short labels used in the UI breakdown. */
export const RANK_AXES = [
  { key: "cup", label: "Cup" },
  { key: "sourcing", label: "Source" },
  { key: "innovation", label: "Innov" },
  { key: "reputation", label: "Rep" },
  { key: "influence", label: "Influence" },
] as const satisfies ReadonlyArray<{ key: keyof RoasterScore; label: string }>;

/** Total score, out of 100, for a roaster. */
export function roasterScore(r: Roaster): number {
  const s = r.scores;
  return s.cup + s.sourcing + s.innovation + s.reputation + s.influence;
}

export const ROASTERS: Roaster[] = [
  {
    name: "Blue Tokai Coffee Roasters",
    city: "New Delhi",
    state: "Delhi NCR",
    founded: 2013,
    note: "One of India's original third-wave roasters, farm to cup from single estates across the south.",
    website: "https://bluetokaicoffee.com",
    tags: ["Single estate", "Pan-India"],
    scores: { cup: 17, sourcing: 18, innovation: 16, reputation: 20, influence: 20 },
  },
  {
    name: "Subko Specialty Coffee",
    city: "Mumbai",
    state: "Maharashtra",
    note: "Roaster, bakery and craft micro-lot program obsessed with Indian terroir and processing.",
    website: "https://subko.coffee",
    tags: ["Micro lots", "Craft"],
    scores: { cup: 16, sourcing: 18, innovation: 19, reputation: 19, influence: 17 },
  },
  {
    name: "Corridor Seven Coffee Roasters",
    city: "Nagpur",
    state: "Maharashtra",
    note: "Central India's specialty pioneer, founder is a national barista champion.",
    website: "https://corridorseven.coffee",
    tags: ["Single origin", "Champion roaster"],
    scores: { cup: 18, sourcing: 16, innovation: 15, reputation: 18, influence: 13 },
  },
  {
    name: "KC Roasters",
    city: "Mumbai",
    state: "Maharashtra",
    note: "Koinonia coffee: small-batch roasting with a strong espresso and filter focus.",
    website: "https://kcroasters.com",
    tags: ["Small batch", "Espresso"],
    scores: { cup: 17, sourcing: 15, innovation: 14, reputation: 14, influence: 11 },
  },
  {
    name: "Savorworks Roasters",
    city: "Gurugram",
    state: "Delhi NCR",
    note: "Roaster and café group known for a considered filter and espresso lineup.",
    tags: ["Filter", "Café roaster"],
    scores: { cup: 16, sourcing: 14, innovation: 14, reputation: 13, influence: 9 },
  },
  {
    name: "Devans North Indian Coffee & Tea",
    city: "New Delhi",
    state: "Delhi NCR",
    founded: 1962,
    note: "A South Indian coffee institution in Delhi, roasting beans since the 1960s.",
    tags: ["Heritage"],
    scores: { cup: 14, sourcing: 13, innovation: 12, reputation: 13, influence: 15 },
  },
  {
    name: "Sleepy Owl Coffee",
    city: "New Delhi",
    state: "Delhi NCR",
    note: "Best known for cold brew and easy-brew formats, alongside roasted whole-bean lines.",
    tags: ["Cold brew", "Everyday"],
    scores: { cup: 12, sourcing: 11, innovation: 13, reputation: 15, influence: 11 },
  },
  {
    name: "Black Baza Coffee",
    city: "Bengaluru",
    state: "Karnataka",
    note: "Conservation-first coffee, shade grown in the Western Ghats and tied to biodiversity.",
    website: "https://blackbazacoffee.com",
    tags: ["Shade grown", "Conservation"],
    scores: { cup: 15, sourcing: 19, innovation: 14, reputation: 16, influence: 14 },
  },
  {
    name: "Maverick & Farmer Coffee",
    city: "Bengaluru",
    state: "Karnataka",
    note: "Estate-owning roaster experimenting with unusual ferments and varietals from Coorg.",
    website: "https://maverickandfarmer.com",
    tags: ["Estate grown", "Experimental"],
    scores: { cup: 17, sourcing: 16, innovation: 18, reputation: 16, influence: 13 },
  },
  {
    name: "The Flying Squirrel",
    city: "Bengaluru",
    state: "Karnataka",
    note: "Grows and roasts its own estate coffee from the hills of Coorg.",
    website: "https://flyingsquirrel.in",
    tags: ["Estate grown"],
    scores: { cup: 15, sourcing: 16, innovation: 13, reputation: 14, influence: 14 },
  },
  {
    name: "Halli Berri",
    city: "Chikmagalur",
    state: "Karnataka",
    note: "Small, all-woman estate roaster from the Baba Budan hills, prized for a clean, sweet cup.",
    tags: ["Estate grown"],
    scores: { cup: 17, sourcing: 17, innovation: 13, reputation: 13, influence: 11 },
  },
  {
    name: "Ainmane Coffee",
    city: "Kodagu",
    state: "Karnataka",
    note: "Family estate coffee from Coorg, roasted in small batches.",
    tags: ["Estate grown", "Small batch"],
    scores: { cup: 14, sourcing: 16, innovation: 12, reputation: 10, influence: 9 },
  },
  {
    name: "Araku Coffee",
    city: "Araku Valley",
    state: "Andhra Pradesh",
    note: "Organic, tribal-grown coffee from the Eastern Ghats, an international award winner.",
    website: "https://arakucoffee.in",
    tags: ["Organic", "Cooperative"],
    scores: { cup: 16, sourcing: 18, innovation: 15, reputation: 18, influence: 16 },
  },
  {
    name: "Roastery Coffee House",
    city: "Hyderabad",
    state: "Telangana",
    note: "Café and roaster spotlighting Indian single origins, now expanding abroad.",
    tags: ["Single origin", "Café roaster"],
    scores: { cup: 16, sourcing: 14, innovation: 13, reputation: 15, influence: 13 },
  },
  {
    name: "Kapi Kottai",
    city: "Kodaikanal",
    state: "Tamil Nadu",
    note: "Micro-roaster championing South Indian single origins, a cult barista favourite.",
    tags: ["Micro roaster", "Single origin"],
    scores: { cup: 18, sourcing: 17, innovation: 15, reputation: 17, influence: 13 },
  },
  {
    name: "Seven Beans Co.",
    city: "Puducherry",
    state: "Puducherry",
    note: "Boutique roaster and café on the southeast coast, Indian beans to Italian profiles.",
    tags: ["Boutique", "Café roaster"],
    scores: { cup: 14, sourcing: 14, innovation: 12, reputation: 9, influence: 9 },
  },
  {
    name: "Curious Life Coffee Roasters",
    city: "Pune",
    state: "Maharashtra",
    note: "Independent roaster and café with a rotating single-origin menu.",
    tags: ["Single origin", "Café roaster"],
    scores: { cup: 16, sourcing: 15, innovation: 14, reputation: 13, influence: 13 },
  },
  {
    name: "Marc's Coffees",
    city: "Pune",
    state: "Maharashtra",
    note: "Q-grader-led direct trade from an early Indian-specialty pioneer out of Auroville.",
    tags: ["Single origin", "Direct trade"],
    scores: { cup: 16, sourcing: 17, innovation: 15, reputation: 13, influence: 16 },
  },

  // New-age wave: mostly launched 2016 onwards, D2C and online-first roasters,
  // estate roasters shipping direct, and regional pioneers beyond the metros.

  // Delhi NCR
  {
    name: "Quick Brown Fox Coffee Roasters",
    city: "New Delhi",
    state: "Delhi NCR",
    founded: 2017,
    note: "Internet-first roaster-café from Dhan Mill, a pro favourite for direct-trade microlots.",
    website: "https://qbfcoffee.com",
    tags: ["Single origin", "Café roaster"],
    scores: { cup: 17, sourcing: 16, innovation: 16, reputation: 15, influence: 12 },
  },
  {
    name: "Rossette Coffee",
    city: "New Delhi",
    state: "Delhi NCR",
    founded: 2022,
    note: "Roast-to-order lab sourcing rare species from Karnataka, Tamil Nadu and Nagaland.",
    website: "https://rossettecoffee.com",
    tags: ["Roast to order", "Small batch"],
    scores: { cup: 14, sourcing: 14, innovation: 15, reputation: 9, influence: 8 },
  },
  {
    name: "Beanly Coffee",
    city: "Gurugram",
    state: "Delhi NCR",
    founded: 2018,
    note: "D2C brand known for pour-over and dip-bag formats with freshness-focused packaging.",
    website: "https://beanlycoffee.com",
    tags: ["D2C", "Pour over"],
    scores: { cup: 13, sourcing: 12, innovation: 13, reputation: 12, influence: 9 },
  },
  {
    name: "Cohoma Coffee",
    city: "Ghaziabad",
    state: "Delhi NCR",
    founded: 2019,
    note: "D2C specialty roaster and brewing-gear maker with quick-brew home formats.",
    website: "https://cohomacoffee.com",
    tags: ["D2C", "Everyday"],
    scores: { cup: 13, sourcing: 13, innovation: 12, reputation: 9, influence: 8 },
  },
  {
    name: "Kilta Coffee Co",
    city: "New Delhi",
    state: "Delhi NCR",
    founded: 2020,
    note: "D2C roaster selling freshly roasted single origins and blends online.",
    website: "https://kiltacoffeeco.com",
    tags: ["D2C", "Single origin"],
    scores: { cup: 13, sourcing: 13, innovation: 12, reputation: 9, influence: 8 },
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
    scores: { cup: 14, sourcing: 14, innovation: 12, reputation: 9, influence: 8 },
  },
  {
    name: "First Crack Coffee Roasters",
    city: "Jodhpur",
    state: "Rajasthan",
    founded: 2021,
    note: "Artisan roaster bringing specialty coffee to Rajasthan, ships pan-India.",
    website: "https://firstcrackcoffeeroasters.com",
    tags: ["Small batch", "D2C"],
    scores: { cup: 13, sourcing: 14, innovation: 12, reputation: 8, influence: 8 },
  },

  // Chandigarh
  {
    name: "Ikkis Coffee",
    city: "Chandigarh",
    state: "Chandigarh",
    founded: 2020,
    note: "Small-batch roaster of traceable single-origin arabica, an enthusiast favourite.",
    website: "https://ikkis.coffee",
    tags: ["Single origin", "Small batch"],
    scores: { cup: 16, sourcing: 16, innovation: 14, reputation: 12, influence: 10 },
  },
  {
    name: "Bloom Coffee Roasters",
    city: "Chandigarh",
    state: "Chandigarh",
    founded: 2020,
    note: "Independent roaster and busy B2B supplier with a barista-training bent.",
    website: "https://bloomcoffeeroasters.in",
    tags: ["Small batch", "Wholesale"],
    scores: { cup: 15, sourcing: 14, innovation: 13, reputation: 12, influence: 12 },
  },

  // Maharashtra
  {
    name: "Grey Soul Coffee Roasters",
    city: "Pune",
    state: "Maharashtra",
    founded: 2021,
    note: "Pour-over-focused roaster, first to process and roast Nagaland lots, now with cafés.",
    website: "https://greysoul.coffee",
    tags: ["Pour over", "Single origin"],
    scores: { cup: 16, sourcing: 15, innovation: 16, reputation: 13, influence: 12 },
  },
  {
    name: "Bombay Island Coffee Company",
    city: "Mumbai",
    state: "Maharashtra",
    founded: 2018,
    note: "Small-batch arabica roastery that grew from Malad into a café.",
    website: "https://bombayisland.com",
    tags: ["Small batch", "Café roaster"],
    scores: { cup: 14, sourcing: 13, innovation: 12, reputation: 11, influence: 10 },
  },
  {
    name: "Toffee Coffee Roasters",
    city: "Mumbai",
    state: "Maharashtra",
    note: "Online-first roaster promising beans soon after roast, with strong mainstream press.",
    website: "https://toffeecoffeeroasters.com",
    tags: ["D2C", "Fresh roast"],
    scores: { cup: 15, sourcing: 14, innovation: 13, reputation: 14, influence: 12 },
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
    scores: { cup: 15, sourcing: 15, innovation: 13, reputation: 10, influence: 11 },
  },

  // Madhya Pradesh
  {
    name: "Siolim Specialty Coffee",
    city: "Indore",
    state: "Madhya Pradesh",
    founded: 2022,
    note: "Central India microlot roaster with a co-roasting space, barista school and barrel ageing.",
    website: "https://siolim.coffee",
    tags: ["Microlots", "Experimental"],
    scores: { cup: 15, sourcing: 15, innovation: 16, reputation: 11, influence: 11 },
  },

  // Gujarat
  {
    name: "Kaffa Coffee Roasters",
    city: "Ahmedabad",
    state: "Gujarat",
    note: "Ahmedabad live roastery where guests pick the beans and the brew method.",
    website: "https://kaffacoffee.com",
    tags: ["Café roaster"],
    scores: { cup: 12, sourcing: 11, innovation: 11, reputation: 8, influence: 8 },
  },

  // Karnataka
  {
    name: "Genetics Coffee",
    city: "Bengaluru",
    state: "Karnataka",
    note: "Small-batch Bengaluru roastery sourcing traceable Indian and world single origins.",
    website: "https://genetics.coffee",
    tags: ["Single origin", "Small batch"],
    scores: { cup: 15, sourcing: 15, innovation: 13, reputation: 10, influence: 10 },
  },
  {
    name: "Naivo Coffee Company",
    city: "Bengaluru",
    state: "Karnataka",
    founded: 2016,
    note: "Family roastery led by a certified Q grader, roasting on Probat and Bühler.",
    website: "https://naivo.in",
    tags: ["Single origin", "Q grader"],
    scores: { cup: 16, sourcing: 15, innovation: 13, reputation: 11, influence: 11 },
  },
  {
    name: "Kohi Roasters",
    city: "Bengaluru",
    state: "Karnataka",
    founded: 2018,
    note: "Works with family estates in the Baba Budan and Shevaroy hills, small-batch Indian arabica.",
    website: "https://kohiroasters.in",
    tags: ["Single origin", "Small batch"],
    scores: { cup: 14, sourcing: 14, innovation: 12, reputation: 9, influence: 9 },
  },
  {
    name: "Bili Hu",
    city: "Bengaluru",
    state: "Karnataka",
    founded: 2016,
    note: "Named after the white coffee flower, UV-screened Chikmagalur lots served at top hotels.",
    website: "https://bilihu.in",
    tags: ["Single origin", "Traceable"],
    scores: { cup: 16, sourcing: 15, innovation: 14, reputation: 15, influence: 13 },
  },
  {
    name: "GB Roasters",
    city: "Bengaluru",
    state: "Karnataka",
    note: "Q-grader-run micro-roastery of single origins, rare varietals and microlots, with education.",
    website: "https://gbroastery.com",
    tags: ["Microlots", "Rare varietals"],
    scores: { cup: 15, sourcing: 15, innovation: 14, reputation: 11, influence: 11 },
  },
  {
    name: "Fraction 9 Coffee Roasters",
    city: "Chikmagalur",
    state: "Karnataka",
    note: "Farm-to-cup roaster from the family-run Kalyan Cool Estate, shipping direct from the farm.",
    website: "https://fraction9coffee.com",
    tags: ["Estate grown", "Farm to cup"],
    scores: { cup: 13, sourcing: 15, innovation: 11, reputation: 8, influence: 9 },
  },
  {
    name: "Kerehaklu",
    city: "Chikmagalur",
    state: "Karnataka",
    note: "Renowned estate whose experimental-ferment lots are roasted by top roasters worldwide.",
    website: "https://kerehaklu.com",
    tags: ["Estate grown", "Experimental"],
    scores: { cup: 15, sourcing: 19, innovation: 18, reputation: 15, influence: 13 },
  },
  {
    name: "Estate Monkeys",
    city: "Kodagu",
    state: "Karnataka",
    note: "Single-origin Coorg estate roaster that roasts and grinds to order.",
    website: "https://estatemonkeys.com",
    tags: ["Estate grown", "Roast to order"],
    scores: { cup: 12, sourcing: 14, innovation: 10, reputation: 7, influence: 7 },
  },

  // Tamil Nadu
  {
    name: "Beachville Coffee Roasters",
    city: "Chennai",
    state: "Tamil Nadu",
    founded: 2018,
    note: "Chennai's first specialty roastery-café, direct estate sourcing on India's first Slayer.",
    website: "https://beachvillecoffee.com",
    tags: ["Single origin", "Café roaster"],
    scores: { cup: 16, sourcing: 15, innovation: 14, reputation: 14, influence: 14 },
  },
  {
    name: "Kat & Kin Coffee Roasters",
    city: "Chennai",
    state: "Tamil Nadu",
    founded: 2020,
    note: "Family-owned roaster started during lockdown, premium roasted specialty coffee.",
    website: "https://katandkincoffee.com",
    tags: ["Small batch", "Family owned"],
    scores: { cup: 13, sourcing: 13, innovation: 12, reputation: 8, influence: 8 },
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
    scores: { cup: 12, sourcing: 13, innovation: 11, reputation: 7, influence: 7 },
  },
  {
    name: "Kapiberry",
    city: "Kochi",
    state: "Kerala",
    note: "Kerala micro-batch roaster of single-origin and blended specialty coffees.",
    website: "https://kapiberry.com",
    tags: ["Micro batch", "Single origin"],
    scores: { cup: 13, sourcing: 13, innovation: 12, reputation: 8, influence: 7 },
  },

  // Telangana
  {
    name: "Black Fuel",
    city: "Hyderabad",
    state: "Telangana",
    note: "Jubilee Hills micro-roastery and café sourcing direct from small South Indian farms.",
    website: "https://blackfuel.coffee",
    tags: ["Café roaster", "Single origin"],
    scores: { cup: 15, sourcing: 14, innovation: 13, reputation: 11, influence: 9 },
  },

  // Andhra Pradesh
  {
    name: "Native Araku Coffee",
    city: "Visakhapatnam",
    state: "Andhra Pradesh",
    note: "D2C brand selling hand-picked roasted Araku Valley coffee via farmer producer groups.",
    website: "https://nativearakucoffee.com",
    tags: ["D2C", "Cooperative"],
    scores: { cup: 13, sourcing: 15, innovation: 11, reputation: 9, influence: 9 },
  },

  // Odisha
  {
    name: "Kruti Coffee",
    city: "Bhubaneswar",
    state: "Odisha",
    founded: 2013,
    note: "Odisha's homegrown brand building Koraput as an origin, a national fine-cup award winner.",
    website: "https://kruticoffee.com",
    tags: ["Single origin", "Award winner"],
    scores: { cup: 16, sourcing: 16, innovation: 14, reputation: 14, influence: 14 },
  },

  // West Bengal
  {
    name: "Yours Truly Coffee Roaster",
    city: "Kolkata",
    state: "West Bengal",
    note: "Bean-to-brew roastery and café-bakery in a heritage Kolkata bungalow.",
    website: "https://yourstrulycoffee.in",
    tags: ["Café roaster", "Bean to brew"],
    scores: { cup: 15, sourcing: 14, innovation: 15, reputation: 11, influence: 9 },
  },

  // Nagaland
  {
    name: "Été Coffee",
    city: "Dimapur",
    state: "Nagaland",
    founded: 2016,
    note: "One of Northeast India's first specialty roasters, with cafés, a flavour lab and coffee schools.",
    website: "https://etecoffeeroasters.com",
    tags: ["Single origin", "Northeast origins"],
    scores: { cup: 15, sourcing: 15, innovation: 15, reputation: 12, influence: 15 },
  },
  {
    name: "Brewed Awakening",
    city: "Kohima",
    state: "Nagaland",
    note: "Works directly with small growers in Nagaland and Arunachal, small-batch roasts.",
    website: "https://brewedawaken.in",
    tags: ["Direct trade", "Small batch"],
    scores: { cup: 14, sourcing: 15, innovation: 13, reputation: 9, influence: 9 },
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
    scores: { cup: 14, sourcing: 15, innovation: 13, reputation: 10, influence: 11 },
  },
  {
    name: "Smoky Falls Tribe Coffee",
    city: "Shillong",
    state: "Meghalaya",
    founded: 2015,
    note: "Woman-founded Meghalaya roaster and social enterprise supplying cafés across the Northeast.",
    tags: ["Small batch", "Northeast origins"],
    scores: { cup: 13, sourcing: 15, innovation: 11, reputation: 11, influence: 13 },
  },
];

/** Each roaster's flagship / highest-rated whole-bean offering, keyed by the
 *  roaster's exact `name`. Compiled from a web-research pass over each
 *  roaster's shop and reviews; `approx: true` marks a house-bean fallback
 *  where a specific flagship could not be confirmed. */
export const FLAGSHIPS: Record<string, FlagshipCoffee> = {
  "Blue Tokai Coffee Roasters": { name: "Vienna Roast", kind: "blend", originCountry: "India", process: "Washed", roastLevel: "Dark", flavorTags: ["dark-chocolate", "cocoa", "caramel"] },
  "Subko Specialty Coffee": { name: "Kalledevarapura Koji Naturals", kind: "single-origin", originCountry: "India", originRegion: "Chikmagalur", process: "Natural", roastLevel: "Medium-Light", flavorTags: ["rose", "lychee", "passionfruit"] },
  "Corridor Seven Coffee Roasters": { name: "Baarbara Estate Washed", kind: "single-origin", originCountry: "India", originRegion: "Chikmagalur", process: "Washed", roastLevel: "Medium-Dark", flavorTags: ["caramel", "apricot", "dark-chocolate"] },
  "KC Roasters": { name: "Marvahulla Estate", kind: "single-origin", originCountry: "India", originRegion: "Nilgiris", process: "Washed", roastLevel: "Dark", flavorTags: ["dark-chocolate", "molasses", "caramel"] },
  "Savorworks Roasters": { name: "Boss's Wife", kind: "blend", originCountry: "India", process: "Washed", roastLevel: "Medium-Dark", flavorTags: ["dark-chocolate", "caramel", "cocoa"] },
  "Devans North Indian Coffee & Tea": { name: "Premium Blend", kind: "blend", originCountry: "India", process: "Washed", roastLevel: "Medium", flavorTags: ["earth", "dark-chocolate", "malt"] },
  "Sleepy Owl Coffee": { name: "Original Medium Roast", kind: "blend", originCountry: "India", process: "Washed", roastLevel: "Medium", flavorTags: ["milk-chocolate", "cocoa", "brown-sugar"] },
  "Black Baza Coffee": { name: "Ficus", kind: "blend", originCountry: "India", process: "Washed", roastLevel: "Medium-Dark", flavorTags: ["dark-chocolate", "walnut", "cocoa"] },
  "Maverick & Farmer Coffee": { name: "Sunkissed", kind: "single-origin", originCountry: "India", originRegion: "Coorg", process: "Honey", roastLevel: "Medium", flavorTags: ["orange", "honey", "apricot"] },
  "The Flying Squirrel": { name: "Aromatique", kind: "single-origin", originCountry: "India", originRegion: "Coorg", process: "Natural", roastLevel: "Medium-Dark", flavorTags: ["strawberry", "caramel", "wine"] },
  "Halli Berri": { name: "Kambihalli Estate", kind: "single-origin", originCountry: "India", originRegion: "Chikmagalur", process: "Washed", roastLevel: "Medium-Light", flavorTags: ["jasmine", "almond", "honey"] },
  "Ainmane Coffee": { name: "Plantation Gold", kind: "blend", originCountry: "India", originRegion: "Coorg", process: "Washed", roastLevel: "Medium", flavorTags: ["orange", "caramel"] },
  "Araku Coffee": { name: "Signature", kind: "blend", originCountry: "India", originRegion: "Araku Valley", process: "Washed", roastLevel: "Medium", flavorTags: ["cocoa", "cherry", "green-tea"] },
  "Roastery Coffee House": { name: "House single origin", kind: "single-origin", originCountry: "India", originRegion: "Chikmagalur", process: "Washed", roastLevel: "Medium", flavorTags: ["dark-chocolate", "caramel", "almond"], approx: true },
  "Kapi Kottai": { name: "Mind = Blown", kind: "single-origin", originCountry: "India", originRegion: "Mooleh Manay Estate, Coorg", process: "Carbonic Maceration", roastLevel: "Medium", flavorTags: ["peach", "vanilla", "wine"] },
  "Seven Beans Co.": { name: "Mishta", kind: "blend", originCountry: "India", originRegion: "Chikmagalur", process: "Natural", roastLevel: "Medium", flavorTags: ["blueberry", "caramel", "brown-sugar"] },
  "Curious Life Coffee Roasters": { name: "Ratnagiri Estate", kind: "single-origin", originCountry: "India", originRegion: "Ratnagiri Estate, Chikmagalur", process: "Washed", roastLevel: "Light", flavorTags: ["jasmine", "bergamot", "strawberry"] },
  "Marc's Coffees": { name: "Julien Peak", kind: "single-origin", originCountry: "India", originRegion: "Shevaroy Hills", process: "Washed", roastLevel: "Medium", flavorTags: ["orange", "cinnamon", "molasses"] },
  "Quick Brown Fox Coffee Roasters": { name: "SLN 5B Natural", kind: "single-origin", originCountry: "India", originRegion: "C&T Estate, Chikmagalur", process: "Anaerobic", roastLevel: "Light", flavorTags: ["plum", "cherry", "blackberry"] },
  "Rossette Coffee": { name: "Truffle Twilight", kind: "blend", originCountry: "India", originRegion: "Baarbara & Attikan Estates", process: "Washed", roastLevel: "Medium-Dark", flavorTags: ["dark-chocolate", "caramel", "fig"] },
  "Beanly Coffee": { name: "Master Blend", kind: "blend", originCountry: "India", originRegion: "Chikmagalur, Coorg", process: "Washed", roastLevel: "Medium", flavorTags: ["walnut", "orange", "cedar"] },
  "Cohoma Coffee": { name: "Signature Custom Roast", kind: "single-origin", originCountry: "India", originRegion: "Karnataka", process: "Washed", roastLevel: "Medium", flavorTags: ["dark-chocolate", "lemon", "honey"] },
  "Kilta Coffee Co": { name: "House Blend", kind: "blend", originCountry: "India", process: "Other", roastLevel: "Medium", flavorTags: ["dark-chocolate", "caramel", "hazelnut"] },
  "Half Light Coffee Roasters": { name: "MS Estate", kind: "single-origin", originCountry: "India", originRegion: "Chikmagalur", process: "Washed", roastLevel: "Medium", flavorTags: ["blackberry", "peach", "walnut"] },
  "First Crack Coffee Roasters": { name: "Jodhpur Blend", kind: "blend", originCountry: "India", process: "Other", roastLevel: "Medium-Dark", flavorTags: ["dark-chocolate", "caramel", "almond"] },
  "Ikkis Coffee": { name: "Morning Mist", kind: "single-origin", originCountry: "India", originRegion: "Ratnagiri Estate, Chikmagalur", process: "Washed", roastLevel: "Light", flavorTags: ["jasmine", "apricot", "wine"] },
  "Bloom Coffee Roasters": { name: "Signature House Blend", kind: "blend", originCountry: "India", process: "Washed", roastLevel: "Medium-Light", flavorTags: ["cocoa", "caramel", "blueberry"] },
  "Grey Soul Coffee Roasters": { name: "Roasters Espresso", kind: "blend", originCountry: "India", process: "Other", roastLevel: "Medium-Dark", flavorTags: ["milk-chocolate", "caramel", "brown-sugar"] },
  "Bombay Island Coffee Company": { name: "Community Blend", kind: "blend", originCountry: "India", originRegion: "Chikmagalur", process: "Other", roastLevel: "Dark", flavorTags: ["dark-chocolate", "cedar", "tobacco"] },
  "Toffee Coffee Roasters": { name: "Fudge Blend", kind: "blend", originCountry: "India", process: "Other", roastLevel: "Medium-Dark", flavorTags: ["dark-chocolate", "caramel", "toffee"] },
  "G-Shot Coffee Roastery": { name: "Ratnagiri Estate", kind: "single-origin", originCountry: "India", originRegion: "Ratnagiri Estate, Chikmagalur", process: "Natural", roastLevel: "Medium-Light", flavorTags: ["caramel", "apricot", "milk-chocolate"] },
  "Siolim Specialty Coffee": { name: "Anjuna Blend", kind: "blend", originCountry: "India", process: "Other", roastLevel: "Medium-Dark", flavorTags: ["dark-chocolate", "raisin", "hazelnut"] },
  "Kaffa Coffee Roasters": { name: "House Blend", kind: "blend", originCountry: "India", process: "Other", roastLevel: "Medium", flavorTags: ["dark-chocolate", "caramel", "almond"], approx: true },
  "Genetics Coffee": { name: "House Blend", kind: "blend", originCountry: "India", originRegion: "Karnataka", process: "Washed", roastLevel: "Medium", flavorTags: ["milk-chocolate", "caramel", "orange", "date"] },
  "Naivo Coffee Company": { name: "Bold & Beautiful", kind: "blend", originCountry: "India", originRegion: "Karnataka", process: "Washed", roastLevel: "Medium-Dark", flavorTags: ["dark-chocolate", "almond", "cedar"] },
  "Kohi Roasters": { name: "KōHi Standard", kind: "single-origin", originCountry: "India", process: "Washed", roastLevel: "Medium", flavorTags: ["milk-chocolate", "blackberry", "orange"] },
  "Bili Hu": { name: "Aghora Estate", kind: "single-origin", originCountry: "India", originRegion: "Chikmagalur", process: "Natural", roastLevel: "Medium", flavorTags: ["raisin", "brown-sugar", "caramel", "almond"] },
  "GB Roasters": { name: "Ekata Estate Natural", kind: "single-origin", originCountry: "India", originRegion: "Ekata Estate", process: "Natural", roastLevel: "Medium-Light", flavorTags: ["raspberry", "cherry", "raisin"] },
  "Fraction 9 Coffee Roasters": { name: "Kaapi", kind: "blend", originCountry: "India", originRegion: "Chikmagalur", process: "Washed", roastLevel: "Dark", flavorTags: ["hazelnut", "plum", "cocoa"] },
  "Kerehaklu": { name: "Kerehaklu Estate", kind: "single-origin", originCountry: "India", originRegion: "Chikmagalur", process: "Washed", roastLevel: "Medium", flavorTags: ["plum", "brown-sugar", "orange"] },
  "Estate Monkeys": { name: "Signature Blend", kind: "blend", originCountry: "India", originRegion: "Coorg", process: "Washed", roastLevel: "Medium", flavorTags: ["milk-chocolate", "apricot", "orange", "almond"] },
  "Beachville Coffee Roasters": { name: "Nachammai", kind: "single-origin", originCountry: "India", originRegion: "Nachammai Estate", process: "Washed", roastLevel: "Medium-Light", flavorTags: ["dark-chocolate", "jasmine", "cocoa"] },
  "Kat & Kin Coffee Roasters": { name: "Signature Blend", kind: "blend", originCountry: "India", originRegion: "Chandragiri", process: "Washed", roastLevel: "Medium", flavorTags: ["vanilla", "caramel", "walnut"] },
  "Ffox Coffee": { name: "Das Fox Kaffee", kind: "single-origin", originCountry: "India", originRegion: "Araku Valley", process: "Natural", roastLevel: "Medium-Dark", flavorTags: ["dark-chocolate", "plum", "caramel"] },
  "Kapiberry": { name: "Signature", kind: "blend", originCountry: "India", process: "Washed", roastLevel: "Light", flavorTags: ["jasmine", "orange", "honey"] },
  "Black Fuel": { name: "House single origin", kind: "single-origin", originCountry: "India", originRegion: "Araku Valley", process: "Natural", roastLevel: "Medium", flavorTags: ["dark-chocolate", "caramel", "orange"], approx: true },
  "Native Araku Coffee": { name: "Araku Valley Single Origin", kind: "single-origin", originCountry: "India", originRegion: "Araku Valley", process: "Natural", roastLevel: "Medium", flavorTags: ["milk-chocolate", "honey", "orange"] },
  "Kruti Coffee": { name: "Select Farm Naturals", kind: "single-origin", originCountry: "India", originRegion: "Koraput", process: "Natural", roastLevel: "Medium-Dark", flavorTags: ["blackberry", "orange", "dark-chocolate"] },
  "Yours Truly Coffee Roaster": { name: "House single origin", kind: "single-origin", originCountry: "India", originRegion: "Ratnagiri Estate", process: "Washed", roastLevel: "Medium", flavorTags: ["milk-chocolate", "caramel", "orange"], approx: true },
  "Été Coffee": { name: "House single origin", kind: "single-origin", originCountry: "India", originRegion: "Nagaland", process: "Natural", roastLevel: "Medium", flavorTags: ["honey", "orange", "milk-chocolate"], approx: true },
  "Brewed Awakening": { name: "House single origin", kind: "single-origin", originCountry: "India", originRegion: "Nagaland", process: "Washed", roastLevel: "Medium", flavorTags: ["jasmine", "orange", "honey"], approx: true },
  "7000 Steps Coffee": { name: "Meghalaya Single Origin", kind: "single-origin", originCountry: "India", originRegion: "Meghalaya", process: "Natural", roastLevel: "Medium", flavorTags: ["lime", "grapefruit", "orange"] },
  "Smoky Falls Tribe Coffee": { name: "House single origin", kind: "single-origin", originCountry: "India", originRegion: "East Khasi Hills", process: "Washed", roastLevel: "Medium", flavorTags: ["milk-chocolate", "almond", "caramel"], approx: true },
};

/** All roasters ordered best-first, each annotated with rank and total score.
 *  Ties break on reputation, then cup quality, then name, so ranks are stable
 *  and deterministic. */
export function rankedRoasters(): RankedRoaster[] {
  return [...ROASTERS]
    .map((r) => ({ ...r, score: roasterScore(r), flagship: FLAGSHIPS[r.name] }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.scores.reputation - a.scores.reputation ||
        b.scores.cup - a.scores.cup ||
        a.name.localeCompare(b.name),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

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
