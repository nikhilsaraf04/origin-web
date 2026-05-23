// Canonical flavor tag system, ported verbatim from Origin/Design/FlavorTaxonomy.swift.
// 72 tags across 15 groups (SCA Flavor Wheel based). Pattern matching in
// TasteProfile depends on exact string equality, so do not edit casually.

export const FlavorTaxonomy = {
  Fruity: {
    berry: ["blueberry", "strawberry", "raspberry", "blackberry", "cherry"],
    citrus: ["lemon", "lime", "orange", "grapefruit", "bergamot"],
    stone: ["peach", "apricot", "plum", "nectarine"],
    tropical: ["mango", "pineapple", "passionfruit", "lychee", "papaya"],
    dried: ["raisin", "fig", "date", "prune"],
  },
  Sweet: {
    chocolate: ["dark-chocolate", "milk-chocolate", "cocoa", "cacao-nib"],
    caramel: ["caramel", "toffee", "brown-sugar", "molasses", "honey"],
    other: ["vanilla", "marzipan", "maple"],
  },
  Floral: {
    floral: ["jasmine", "rose", "lavender", "elderflower", "hibiscus"],
  },
  Nutty: {
    nut: ["almond", "hazelnut", "walnut", "peanut", "pecan"],
    toasty: ["malt", "cereal", "biscuit", "toast", "grain"],
  },
  Spice: {
    spice: ["cinnamon", "clove", "cardamom", "black-pepper", "anise"],
  },
  Earthy: {
    earthy: ["earth", "mushroom", "cedar", "tobacco", "leather"],
    herbal: ["mint", "eucalyptus", "green-tea", "basil"],
    fermented: ["wine", "boozy", "funky", "vinegar"],
  },
} as const;

// Flat list used in UI pickers and Claude prompts
export const FlavorTagsAll: string[] = [
  ...FlavorTaxonomy.Fruity.berry,
  ...FlavorTaxonomy.Fruity.citrus,
  ...FlavorTaxonomy.Fruity.stone,
  ...FlavorTaxonomy.Fruity.tropical,
  ...FlavorTaxonomy.Fruity.dried,
  ...FlavorTaxonomy.Sweet.chocolate,
  ...FlavorTaxonomy.Sweet.caramel,
  ...FlavorTaxonomy.Sweet.other,
  ...FlavorTaxonomy.Floral.floral,
  ...FlavorTaxonomy.Nutty.nut,
  ...FlavorTaxonomy.Nutty.toasty,
  ...FlavorTaxonomy.Spice.spice,
  ...FlavorTaxonomy.Earthy.earthy,
  ...FlavorTaxonomy.Earthy.herbal,
  ...FlavorTaxonomy.Earthy.fermented,
];

export interface FlavorGroup {
  label: string;
  tags: readonly string[];
}

export const FlavorGroups: FlavorGroup[] = [
  { label: "Fruity — Berry", tags: FlavorTaxonomy.Fruity.berry },
  { label: "Fruity — Citrus", tags: FlavorTaxonomy.Fruity.citrus },
  { label: "Fruity — Stone", tags: FlavorTaxonomy.Fruity.stone },
  { label: "Fruity — Tropical", tags: FlavorTaxonomy.Fruity.tropical },
  { label: "Fruity — Dried", tags: FlavorTaxonomy.Fruity.dried },
  { label: "Sweet — Chocolate", tags: FlavorTaxonomy.Sweet.chocolate },
  { label: "Sweet — Caramel", tags: FlavorTaxonomy.Sweet.caramel },
  { label: "Sweet — Other", tags: FlavorTaxonomy.Sweet.other },
  { label: "Floral", tags: FlavorTaxonomy.Floral.floral },
  { label: "Nutty", tags: FlavorTaxonomy.Nutty.nut },
  { label: "Toasty", tags: FlavorTaxonomy.Nutty.toasty },
  { label: "Spice", tags: FlavorTaxonomy.Spice.spice },
  { label: "Earthy", tags: FlavorTaxonomy.Earthy.earthy },
  { label: "Herbal", tags: FlavorTaxonomy.Earthy.herbal },
  { label: "Fermented", tags: FlavorTaxonomy.Earthy.fermented },
];

export function flavorFamily(tag: string): string {
  const f = FlavorTaxonomy;
  if (
    f.Fruity.berry.includes(tag as any) ||
    f.Fruity.citrus.includes(tag as any) ||
    f.Fruity.stone.includes(tag as any) ||
    f.Fruity.tropical.includes(tag as any) ||
    f.Fruity.dried.includes(tag as any)
  )
    return "Fruity";
  if (
    f.Sweet.chocolate.includes(tag as any) ||
    f.Sweet.caramel.includes(tag as any) ||
    f.Sweet.other.includes(tag as any)
  )
    return "Sweet";
  if (f.Floral.floral.includes(tag as any)) return "Floral";
  if (f.Nutty.nut.includes(tag as any) || f.Nutty.toasty.includes(tag as any))
    return "Nutty/Toasty";
  if (f.Spice.spice.includes(tag as any)) return "Spice";
  if (
    f.Earthy.earthy.includes(tag as any) ||
    f.Earthy.herbal.includes(tag as any) ||
    f.Earthy.fermented.includes(tag as any)
  )
    return "Earthy";
  return "Other";
}
