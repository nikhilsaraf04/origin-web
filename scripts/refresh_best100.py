#!/usr/bin/env python3
"""
refresh_best100.py - regenerate data/best100-seed.json from
theworlds100bestcoffeeshops.com (all four editions: World, Europe,
N. America, S. America).

Offline deterministic pipeline, stdlib only:

  1. Scrape the four list pages (/top-100-coffee-shops[-europe|-north|-south]/)
     for rank, name, country, and shop slug.
  2. Fetch each edition's custom post type via the WordPress REST API
     (/wp-json/wp/v2/locales[-europe|-north|-south]?per_page=100) for the
     shop description prose.
  3. Merge to unique shops (a shop can rank in several editions; slug
     variants across editions are merged by normalized name).
  4. Extract a best-effort city/locality from the site's own prose.
  5. Write the seed sorted by best rank (world-first).

The shop `id` is the normalized display name - it is the stable key the
app's local marks (visited/note/rating) hang off, so do not change the
normalization without a migration.

Run:  python3 scripts/refresh_best100.py
"""

import html
import json
import re
import sys
import urllib.request

BASE = "https://theworlds100bestcoffeeshops.com"
EDITIONS = {  # edition key -> (list page slug, REST post type)
    "world":  ("top-100-coffee-shops", "locales"),
    "europe": ("top-100-coffee-shops-europe", "locales-europe"),
    "north":  ("top-100-coffee-shops-north", "locales-north"),
    "south":  ("top-100-coffee-shops-south", "locales-south"),
}
OUT = "data/best100-seed.json"

# The site occasionally omits a country on the list page; patch here.
COUNTRY_OVERRIDES = {"dabov-specialty-coffee": "Bulgaria"}

COUNTRY_NORMALIZE = {"Texas (USA)": "USA", "The Philippines": "Philippines",
                     "Republic of Korea": "South Korea"}

CITY_STATE = {"Singapore"}  # places where city == country is legitimate
DEMONYM_BLOCK = {
    "Asian", "European", "American", "African", "Latin", "Western", "Eastern",
    "Southern", "Northern", "Panamanian", "Ethiopian", "Colombian", "Brazilian",
    "Peruvian", "Chilean", "Argentinian", "Mexican", "Spanish", "Italian",
    "French", "German", "Belgian", "Austrian", "Japanese", "Korean", "Taiwanese",
    "Thai", "Indian", "Australian", "Canadian", "British", "Scottish", "Irish",
    "Dutch", "Danish", "Swedish", "Norwegian", "Finnish", "Polish", "Portuguese",
    "Greek", "Turkish", "Qatari", "Honduran", "Guatemalan", "Nicaraguan",
    "Salvadoran", "Ecuadorian", "Venezuelan", "Bolivian", "Uruguayan",
}
US_STATES = {
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
    "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
    "Washington", "Wisconsin", "Wyoming", "New York", "New Jersey",
    "North Carolina", "South Carolina", "New Hampshire", "Rhode Island",
    "New Mexico", "West Virginia", "North Dakota", "South Dakota",
    "District of Columbia",
}

WORD = r"[A-ZÀ-Þ][\wÀ-ÿ'.-]*"
CON = r"(?: de| del| la| las| los| da| do| di| of| y| al| e)?"
PHRASE = rf"({WORD}(?:{CON} {WORD}){{0,3}}(?: {WORD})?)"
NOUN = (r"(?:café|Café|cafe|Cafe|coffee|Coffee|roastery|Roastery|roaster|Roaster|"
        r"shop|Shop|bar|Bar|studio|Studio|sanctuary|Sanctuary|spot|Spot|company|Company|"
        r"brand|Brand|lab|Lab|LAB|project|Project|house|House|space|Space|"
        r"tostaduría|Tostaduría|tostadores|Tostadores)")
STOP2 = {"the", "a", "an", "this", "that", "it", "they", "their", "there",
         "here", "downtown", "central", "old", "el", "la", "una", "un"}
GENERIC1 = {"heart", "south", "north", "east", "west", "mountains", "highlands",
            "tropics", "world", "city", "town", "capital", "region", "area",
            "part", "middle", "outskirts", "southern", "northern", "western",
            "eastern", "center", "centre", "neighbourhood", "neighborhood",
            "streets"}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "origin-coffee-refresh/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def norm(x):
    return re.sub(r"[^a-z0-9]", "", x.lower())


def parse_list_page(page_html, cpt):
    """Ordered shop entries from one edition list page."""
    pat = re.compile(r'href="' + BASE + r"/" + cpt + r'/([^/"]+)/"[^>]*>([^<]*)')
    entries, cur = [], None
    for slug, text in pat.findall(page_html):
        text = html.unescape(text).strip()
        if cur is None or cur["slug"] != slug:
            if cur:
                entries.append(cur)
            cur = {"slug": slug, "rank": None, "name": None, "country": None}
        if text.isdigit() and cur["rank"] is None:
            cur["rank"] = int(text)
        elif text and cur["name"] is None and not text.isdigit():
            cur["name"] = text
        elif text and cur["name"] is not None and cur["country"] is None:
            cur["country"] = text
    if cur:
        entries.append(cur)
    return entries


def extract_city(desc, country):
    """Best-effort locality from the site's own prose. None stays None -
    the app falls back to country. Patterns deliberately conservative;
    every candidate is a place the site's text names."""
    if not desc:
        return None
    first = desc[:400]
    cands = []

    def add(pattern, text):
        m = re.search(pattern, text)
        if m:
            cands.append(m.group(1))

    add(rf"[Ii]n the (?:heart|middle|center|centre|city center|city centre) of {PHRASE}(?:,|\.)", first)
    add(rf"(?:[Ff]ounded|[Ee]stablished|[Bb]orn|[Oo]pened|[Ll]aunched|[Ss]tarted|[Cc]reated|[Bb]egan)[^.,;]{{0,50}}?\bin {PHRASE}(?:,| in \d| \d|\.| and)", first)
    add(rf"\b[Ll]ocated[^.,;]{{0,70}}?\bin {PHRASE}(?:,|\.)", first)
    add(rf"{NOUN}s? in {PHRASE}(?:,| is| has| redefines| stands| offers| was| brings| serves|\.| and| -)", first)
    add(rf"\bbased in {PHRASE}(?:,|\.)", first)
    add(rf"{PHRASE}[ -]based", first)
    add(rf"\bof {PHRASE}[’']s", first)
    add(rf"\bin {PHRASE}[’']s", first)
    add(rf"\bin {PHRASE},", first)
    # full-desc strong patterns
    add(rf"[Uu]bicad[oa]s?[^.,;]{{0,60}}?\ben {PHRASE}(?:,|\.)", desc)
    add(rf"\ben el (?:corazón|centro) de {PHRASE}(?:,|\.)", desc)
    add(rf"\bin {PHRASE} [—–-] ", desc)
    add(rf"\bin {PHRASE} in \d{{4}}", desc)
    if country:
        m = re.search(rf"\b{PHRASE}, {re.escape(country)}\b", desc)
        if m:
            cands.append(m.group(1))
    m = re.search(rf"\b{PHRASE}, ({'|'.join(sorted(US_STATES, key=len, reverse=True))})\b", desc)
    if m:
        cands.append(m.group(1))
    m = re.search(r"\bof the City of (London)\b", desc)
    if m:
        cands.append(m.group(1))

    for c in cands:
        c = c.strip().strip(",").strip()
        if not c or len(c) > 30 or re.search(r"\d", c) or "•" in c:
            continue
        w = c.lower().split()
        if w[0] in STOP2 or (len(w) == 1 and w[0] in GENERIC1) or c in DEMONYM_BLOCK:
            continue
        if country and norm(c) == norm(country) and c not in CITY_STATE:
            continue
        return c
    return None


def name_suffix_city(name):
    m = re.search(r"[–—-]\s*([A-ZÀ-Þ][A-Za-zÀ-ÿ'. ]{2,24})$", name) or \
        re.search(r"\(([A-ZÀ-Þ][A-Za-zÀ-ÿ'. ]{2,24})\)$", name)
    return m.group(1).strip() if m else None


def blurb(desc):
    if not desc:
        return ""
    parts = re.split(r"(?<=[.!?]) ", desc.strip())
    return " ".join(parts[:2])[:300]


def main():
    shops = {}  # slug -> record
    for ed, (page_slug, cpt) in EDITIONS.items():
        page = fetch(f"{BASE}/{page_slug}/")
        entries = parse_list_page(page, cpt)
        posts = {p["slug"]: p for p in json.loads(
            fetch(f"{BASE}/wp-json/wp/v2/{cpt}?per_page=100"))}
        print(f"{ed}: {len(entries)} list entries, {len(posts)} posts", file=sys.stderr)
        for e in entries:
            slug = e["slug"]
            s = shops.setdefault(slug, {"slug": slug, "name": e["name"],
                                        "country": e["country"], "editions": {},
                                        "desc": None})
            s["editions"][ed] = e["rank"]
            if not s["country"]:
                s["country"] = COUNTRY_OVERRIDES.get(slug)
            if s["desc"] is None and slug in posts:
                raw = posts[slug]["content"]["rendered"]
                txt = html.unescape(re.sub(r"<[^>]+>", " ", raw))
                s["desc"] = re.sub(r"\s+", " ", txt).strip()

    # merge slug variants of the same shop (same normalized name)
    by_name = {}
    for s in list(shops.values()):
        by_name.setdefault(norm(s["name"]), []).append(s)
    for group in by_name.values():
        if len(group) < 2:
            continue
        prio = {ed: i for i, ed in enumerate(EDITIONS)}
        group.sort(key=lambda s: min(prio[e] for e in s["editions"]))
        keep = group[0]
        for other in group[1:]:
            for ed, r in other["editions"].items():
                keep["editions"].setdefault(ed, r)
            if not keep["desc"] and other["desc"]:
                keep["desc"] = other["desc"]
            del shops[other["slug"]]

    out = []
    for s in shops.values():
        country = COUNTRY_NORMALIZE.get(s["country"], s["country"])
        city = extract_city(s["desc"], country) or name_suffix_city(s["name"])
        if city and country and norm(city) == norm(country) and city not in CITY_STATE:
            city = None
        out.append({
            "id": norm(s["name"]),
            "name": s["name"],
            "city": city,
            "country": country,
            "editions": s["editions"],
            "blurb": blurb(s["desc"]),
        })

    prio = {ed: i for i, ed in enumerate(EDITIONS)}
    out.sort(key=lambda s: min((prio[e], r) for e, r in s["editions"].items()))
    seed = {"generated": __import__("datetime").date.today().isoformat(),
            "source": "theworlds100bestcoffeeshops.com",
            "editions": list(EDITIONS), "shops": out}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(seed, f, ensure_ascii=False, indent=1)
    covered = sum(1 for s in out if s["city"])
    print(f"wrote {OUT}: {len(out)} shops, {covered} with locality "
          f"({100 * covered / len(out):.0f}%)", file=sys.stderr)


if __name__ == "__main__":
    main()
