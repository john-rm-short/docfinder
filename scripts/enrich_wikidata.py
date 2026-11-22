#!/usr/bin/env python3
"""
DocFinder Polite Wikidata SPARQL Enricher
-----------------------------------------
Enriches imdb-catalog.js and streaming-links.js using sanctioned bulk
Wikidata SPARQL queries (batches of 150 IMDb IDs, 2.0s polite delay,
~16 total HTTP requests — zero scraping, zero API key).

Retrieves:
  - P1874 (Netflix ID) -> direct https://www.netflix.com/title/<id>
  - P750  (distributed by) -> streaming platform mapping
  - P449  (original broadcaster) -> streaming/network mapping
  - English schema:description -> clean synopsis fallback
"""

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMDB_JS = ROOT / "imdb-catalog.js"
LINKS_JS = ROOT / "streaming-links.js"
USER_AGENT = "DocFinderCatalogBuilder/1.0 (https://github.com/john-rm-short/docfinder; polite-sparql-batch)"

BATCH_SIZE = 150
DELAY_SEC = 2.0

ENTITY_TO_PLATFORM = [
    (r"\bnetflix\b", "netflix"),
    (r"\b(hbo|hbo max|max|hbo documentary)\b", "max"),
    (r"\bhulu\b", "hulu"),
    (r"\b(disney\+|disney plus|national geographic|nat geo)\b", "disney"),
    (r"\b(pbs|public broadcasting|kanopy|wgbh|wnet|itvs)\b", "pbs"),
    (r"\b(apple tv\+|apple tv|apple original)\b", "appletv"),
    (r"\b(amazon prime|prime video|amazon studios|amazon mgm)\b", "prime"),
    (r"\b(peacock|nbc|msnbc)\b", "peacock"),
    (r"\b(paramount\+|paramount plus|showtime|cbs|smithsonian)\b", "paramount"),
    (r"\b(curiositystream|curiosity stream|bbc|bbc two|bbc four|bbc one)\b", "curiosity"),
    (r"\b(tubi|filmrise)\b", "tubi"),
    (r"\b(pluto tv|a&e)\b", "pluto"),
    (r"\byoutube\b", "youtube"),
]


def norm_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (title or "").lower())


def match_platform(label: str):
    low = (label or "").lower()
    for pat, pid in ENTITY_TO_PLATFORM:
        if re.search(pat, low):
            return pid
    return None


def sparql_batch(imdb_ids):
    values = " ".join(f'"{i}"' for i in imdb_ids)
    query = f"""
SELECT ?imdbID
       (SAMPLE(?nf) AS ?netflixID)
       (SAMPLE(?desc) AS ?enDesc)
       (GROUP_CONCAT(DISTINCT ?distLabel; separator="|") AS ?dists)
       (GROUP_CONCAT(DISTINCT ?broadLabel; separator="|") AS ?broads)
WHERE {{
  VALUES ?imdbID {{ {values} }}
  ?item wdt:P345 ?imdbID .
  OPTIONAL {{ ?item wdt:P1874 ?nf . }}
  OPTIONAL {{
    ?item schema:description ?desc .
    FILTER(LANG(?desc) = "en")
  }}
  OPTIONAL {{
    ?item wdt:P750 ?dist .
    ?dist rdfs:label ?distLabel .
    FILTER(LANG(?distLabel) = "en")
  }}
  OPTIONAL {{
    ?item wdt:P449 ?broad .
    ?broad rdfs:label ?broadLabel .
    FILTER(LANG(?broadLabel) = "en")
  }}
}}
GROUP BY ?imdbID
"""
    url = "https://query.wikidata.org/sparql"
    body = urllib.parse.urlencode({"query": query, "format": "json"}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/sparql-results+json",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=35) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            wait = 5.0 * (attempt + 1)
            print(f"  [HTTP {e.code}] backing off {wait}s...")
            time.sleep(wait)
        except Exception as e:
            wait = 4.0 * (attempt + 1)
            print(f"  [error] {e}; retrying in {wait}s...")
            time.sleep(wait)
    return None


def load_js_assignment(path: Path):
    text = path.read_text(encoding="utf-8")
    idx = text.find("=")
    raw = text[idx + 1 :].strip()
    if raw.endswith(";"):
        raw = raw[:-1]
    return json.loads(raw)


def main():
    imdb_docs = load_js_assignment(IMDB_JS)
    stream_links = load_js_assignment(LINKS_JS)

    real_ids = [d["imdbId"] for d in imdb_docs if re.match(r"^tt\d+$", str(d.get("imdbId", "")))]
    print(f"[Wikidata] Querying {len(real_ids)} IMDb IDs in batches of {BATCH_SIZE} ({(len(real_ids) + BATCH_SIZE - 1) // BATCH_SIZE} polite requests)...")

    wd_by_imdb = {}
    for start in range(0, len(real_ids), BATCH_SIZE):
        batch = real_ids[start : start + BATCH_SIZE]
        batch_num = start // BATCH_SIZE + 1
        total_batches = (len(real_ids) + BATCH_SIZE - 1) // BATCH_SIZE
        data = sparql_batch(batch)
        if data and "results" in data:
            bindings = data["results"].get("bindings", [])
            for row in bindings:
                iid = row.get("imdbID", {}).get("value")
                if not iid:
                    continue
                wd_by_imdb[iid] = {
                    "netflixId": row.get("netflixID", {}).get("value", ""),
                    "desc": row.get("enDesc", {}).get("value", ""),
                    "dists": [x for x in row.get("dists", {}).get("value", "").split("|") if x],
                    "broads": [x for x in row.get("broads", {}).get("value", "").split("|") if x],
                }
            print(f"  Batch {batch_num}/{total_batches}: matched {len(bindings)} Wikidata records")
        else:
            print(f"  Batch {batch_num}/{total_batches}: failed")
        if start + BATCH_SIZE < len(real_ids):
            time.sleep(DELAY_SEC)

    newly_mapped_titles = 0
    netflix_direct_added = 0
    desc_added = 0

    for d in imdb_docs:
        iid = d.get("imdbId", "")
        info = wd_by_imdb.get(iid)
        if not info:
            continue

        existing_plats = set(d.get("platforms") or [])
        had_any = bool(existing_plats)

        if info["netflixId"] and re.match(r"^\d+$", info["netflixId"]):
            existing_plats.add("netflix")
            nk = norm_key(d["title"])
            if nk:
                stream_links.setdefault(nk, {})
                if "netflix" not in stream_links[nk]:
                    stream_links[nk]["netflix"] = f"https://www.netflix.com/title/{info['netflixId']}"
                    netflix_direct_added += 1

        for label in info["dists"] + info["broads"]:
            pid = match_platform(label)
            if pid:
                existing_plats.add(pid)
                if not d.get("network"):
                    d["network"] = label

        if existing_plats:
            d["platforms"] = sorted(existing_plats)
            if not had_any:
                newly_mapped_titles += 1

        if not d.get("plot") and info["desc"] and len(info["desc"]) >= 18:
            # Skip ultra-generic Wikidata descriptions like "2019 documentary film"
            if not re.match(r"^(19|20)\d{2}\s+(american\s+|british\s+)?documentary(\s+film|\s+series)?(\s+by\s+.*)?$", info["desc"], re.I):
                d["plot"] = info["desc"]
                desc_added += 1

    print(f"[Wikidata] Done! Matched {len(wd_by_imdb)} IMDb titles.")
    print(f"  -> Newly mapped to >=1 streaming platform: {newly_mapped_titles}")
    print(f"  -> Direct Netflix /title/<id> URLs added:  {netflix_direct_added}")
    print(f"  -> Enriched descriptions added:            {desc_added}")

    IMDB_JS.write_text(
        f"/* DocFinder Bulk Documentary Index ({len(imdb_docs)} IMDb + TVMaze + Wikidata Documentary Series & Feature Films) */\n"
        f"window.DOCFINDER_IMDB_CATALOG = "
        + json.dumps(imdb_docs, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    LINKS_JS.write_text(
        f"/* DocFinder Verified US Streaming Direct & Search Links ({len(stream_links)} titles) */\n"
        f"window.DOCFINDER_STREAMING_LINKS = "
        + json.dumps(stream_links, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(f"[Saved] imdb-catalog.js ({IMDB_JS.stat().st_size // 1024} KB), streaming-links.js ({LINKS_JS.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
