#!/usr/bin/env python3
"""
DocFinder Strict US Streaming Audit & Cleanup
---------------------------------------------
Eliminates non-US and expired-catalog streaming links by:
  1. Removing all UK BBC -> CuriosityStream false mappings.
  2. Removing all Wikidata P750 (international/historical distributor) and
     non-original P1874 (global/expired Netflix catalog ID) links.
  3. Querying Wikidata STRICTLY for P449 (Original Broadcaster/Platform)
     and only attaching a direct Netflix URL (P1874) when Netflix is the
     ORIGINAL broadcaster/producer (i.e. genuine Netflix Originals that
     stream permanently in the US).
  4. Preserving verified US curated links, US PBS strands, and official
     YouTube documentary channels.
"""

import json
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMDB_JS = ROOT / "imdb-catalog.js"
LINKS_JS = ROOT / "streaming-links.js"
USER_AGENT = "DocFinderCatalogBuilder/1.1 (https://github.com/john-rm-short/docfinder; strict-us-audit)"

BATCH_SIZE = 180
DELAY_SEC = 1.8

# Strict US-only original broadcaster/platform mapping (NO BBC, NO ITV, NO Channel 4, NO Sky, NO international distributors)
US_ORIGINAL_BROADCASTERS = [
    (r"^netflix$", "netflix"),
    (r"^(hbo|hbo max|max|hbo documentary films)$", "max"),
    (r"^hulu$", "hulu"),
    (r"^(disney\+|disney plus|national geographic|national geographic channel|nat geo wild)$", "disney"),
    (r"^(pbs|public broadcasting service)$", "pbs"),
    (r"^(apple tv\+|apple tv)$", "appletv"),
    (r"^(amazon prime video|prime video|amazon studios)$", "prime"),
    (r"^peacock$", "peacock"),
    (r"^(paramount\+|paramount plus|showtime|smithsonian channel)$", "paramount"),
    (r"^(curiositystream|curiosity stream)$", "curiosity"),
    (r"^tubi$", "tubi"),
    (r"^pluto tv$", "pluto"),
    (r"^youtube$", "youtube"),
]

# Curated verified US streaming links for our flagship catalog-data.js titles
CURATED_US_LINKS = {
    "ourplanet": {"netflix": "https://www.netflix.com/title/80049832"},
    "myoctopusteacher": {"netflix": "https://www.netflix.com/title/81045007"},
    "thecivilwar": {"pbs": "https://www.pbs.org/kenburns/the-civil-war/"},
    "thevietnamwar": {"pbs": "https://www.pbs.org/kenburns/the-vietnam-war/"},
    "summerofsoul": {"hulu": "https://www.hulu.com/search?q=Summer+of+Soul", "disney": "https://www.disneyplus.com/search?q=Summer+of+Soul"},
    "goingclearscientologyandtheprisonofbelief": {"max": "https://www.hbomax.com/search?q=Going%20Clear"},
    "thelastdance": {"netflix": "https://www.netflix.com/title/80203144"},
    "freesolo": {"disney": "https://www.disneyplus.com/search?q=Free+Solo", "hulu": "https://www.hulu.com/search?q=Free+Solo"},
    "therescue": {"disney": "https://www.disneyplus.com/search?q=The+Rescue", "hulu": "https://www.hulu.com/search?q=The+Rescue"},
    "icarus": {"netflix": "https://www.netflix.com/title/80168079"},
    "chefstable": {"netflix": "https://www.netflix.com/title/80007945"},
    "saltfatacidheat": {"netflix": "https://www.netflix.com/title/80198288"},
    "fireoflove": {"disney": "https://www.disneyplus.com/search?q=Fire+of+Love", "hulu": "https://www.hulu.com/search?q=Fire+of+Love"},
    "13th": {"netflix": "https://www.netflix.com/title/80091741", "youtube": "https://www.youtube.com/watch?v=krfcq5pF8u8"},
    "thesocialdilemma": {"netflix": "https://www.netflix.com/title/81254224"},
    "20daysinmariupol": {"pbs": "https://www.pbs.org/wgbh/frontline/documentary/20-days-in-mariupol/", "youtube": "https://www.youtube.com/watch?v=gvAyykRvPBo"},
    "navalny": {"max": "https://www.hbomax.com/search?q=Navalny"},
    "30for30": {"hulu": "https://www.hulu.com/search?q=30+for+30", "disney": "https://www.disneyplus.com/search?q=30+for+30"},
    "formula1drivetosurvive": {"netflix": "https://www.netflix.com/title/80204890"},
    "thebeatlesgetback": {"disney": "https://www.disneyplus.com/search?q=The+Beatles+Get+Back"},
    "cripcampadisabilityrevolution": {"netflix": "https://www.netflix.com/title/81001496", "youtube": "https://www.youtube.com/watch?v=OFS8SpwioZ4"},
    "americanfactory": {"netflix": "https://www.netflix.com/title/81090071"},
    "mindingthegap": {"hulu": "https://www.hulu.com/search?q=Minding+the+Gap"},
    "boysstate": {"appletv": "https://tv.apple.com/us/search?term=Boys%20State"},
    "prehistoricplanet": {"appletv": "https://tv.apple.com/us/search?term=Prehistoric%20Planet"},
    "howtowithjohnwilson": {"max": "https://www.hbomax.com/search?q=How%20To%20with%20John%20Wilson"},
    "secretsofthewhales": {"disney": "https://www.disneyplus.com/search?q=Secrets+of+the+Whales"},
    "thevelvetunderground": {"appletv": "https://tv.apple.com/us/search?term=The%20Velvet%20Underground"},
    "abstracttheartofdesign": {"netflix": "https://www.netflix.com/title/80057883"},
    "frontline": {"pbs": "https://www.pbs.org/wgbh/frontline/documentaries/", "youtube": "https://www.youtube.com/@frontline"},
    "americanexperience": {"pbs": "https://www.pbs.org/wgbh/americanexperience/"},
    "nature": {"pbs": "https://www.pbs.org/wnet/nature/"},
    "davidattenboroughalifeonourplanet": {"netflix": "https://www.netflix.com/title/80216393"},
    "insidebillsbraindecodingbillgates": {"netflix": "https://www.netflix.com/title/80184771"},
    "welcometowrexham": {"hulu": "https://www.hulu.com/search?q=Welcome+to+Wrexham", "disney": "https://www.disneyplus.com/search?q=Welcome+to+Wrexham"},
    "sunderlandtilidie": {"netflix": "https://www.netflix.com/title/80207046"},
    "14peaksnothingisimpossible": {"netflix": "https://www.netflix.com/title/81464765"},
    "thevolcanorescuefromwhakaari": {"netflix": "https://www.netflix.com/title/81410405"},
    "ourgreatnationalparks": {"netflix": "https://www.netflix.com/title/81086133"},
    "athletea": {"netflix": "https://www.netflix.com/title/81034185"},
    "secretsofthesaqqaratomb": {"netflix": "https://www.netflix.com/title/81095101"},
    "unknowncosmictimemachine": {"netflix": "https://www.netflix.com/title/81473680"},
    "thedeepestbreath": {"netflix": "https://www.netflix.com/title/81630917"},
    "willharper": {"netflix": "https://www.netflix.com/title/81760197"},
    "supermanthechristopherreevestory": {"max": "https://www.hbomax.com/search?q=Super%2FMan"},
    "sugarcane": {"disney": "https://www.disneyplus.com/search?q=Sugarcane", "hulu": "https://www.hulu.com/search?q=Sugarcane"},
    "theterritory": {"disney": "https://www.disneyplus.com/search?q=The+Territory", "hulu": "https://www.hulu.com/search?q=The+Territory"},
    "allthatbreathes": {"max": "https://www.hbomax.com/search?q=All%20That%20Breathes"},
    "makingamurderer": {"netflix": "https://www.netflix.com/title/80000770"},
    "thejinxthelifeanddeathsofrobertdurst": {"max": "https://www.hbomax.com/search?q=The%20Jinx"},
    "wildwildcountry": {"netflix": "https://www.netflix.com/title/80145240"},
    "virunga": {"netflix": "https://www.netflix.com/title/80009431"},
    "dickjohnsonisdead": {"netflix": "https://www.netflix.com/title/80234465"},
    "ouruniverse": {"netflix": "https://www.netflix.com/title/81121172"},
    "earthatnightincolor": {"appletv": "https://tv.apple.com/us/search?term=Earth%20at%20Night%20in%20Color"},
    "onestrangerock": {"disney": "https://www.disneyplus.com/search?q=One+Strange+Rock"},
}


def norm_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (title or "").lower())


def match_us_original(label: str):
    low = (label or "").strip().lower()
    for pat, pid in US_ORIGINAL_BROADCASTERS:
        if re.match(pat, low):
            return pid
    return None


def sparql_strict_originals(imdb_ids):
    values = " ".join(f'"{i}"' for i in imdb_ids)
    # Query STRICTLY P449 (original broadcaster) + P1874 (Netflix ID, used ONLY if P449 is Netflix)
    query = f"""
SELECT ?imdbID
       (SAMPLE(?nf) AS ?netflixID)
       (GROUP_CONCAT(DISTINCT ?broadLabel; separator="|") AS ?broads)
WHERE {{
  VALUES ?imdbID {{ {values} }}
  ?item wdt:P345 ?imdbID .
  ?item wdt:P449 ?broad .
  ?broad rdfs:label ?broadLabel .
  FILTER(LANG(?broadLabel) = "en")
  OPTIONAL {{ ?item wdt:P1874 ?nf . }}
}}
GROUP BY ?imdbID
"""
    body = urllib.parse.urlencode({"query": query, "format": "json"}).encode("utf-8")
    req = urllib.request.Request(
        "https://query.wikidata.org/sparql",
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
        except Exception as e:
            time.sleep(4.0 * (attempt + 1))
    return None


def load_js(path: Path):
    text = path.read_text(encoding="utf-8")
    raw = text[text.find("=") + 1 :].strip()
    if raw.endswith(";"):
        raw = raw[:-1]
    return json.loads(raw)


def load_clean_tvmaze_networks():
    """Load original pre-Wikidata TVMaze networks from commit a75a4a7 so stale P750 values are purged."""
    raw_js = subprocess.check_output(
        ["git", "show", "a75a4a7:imdb-catalog.js"],
        cwd=str(ROOT),
        text=True,
        encoding="utf-8",
    )
    raw = raw_js[raw_js.find("=") + 1 :].strip()
    if raw.endswith(";"):
        raw = raw[:-1]
    clean_docs = json.loads(raw)
    return {d["imdbId"]: d.get("network", "") for d in clean_docs if d.get("imdbId")}


def main():
    imdb_docs = load_js(IMDB_JS)
    clean_tvmaze_net = load_clean_tvmaze_networks()
    real_ids = [d["imdbId"] for d in imdb_docs if re.match(r"^tt\d+$", str(d.get("imdbId", "")))]
    print(f"[US Audit] Restored {sum(1 for v in clean_tvmaze_net.values() if v)} clean TVMaze networks from a75a4a7.")
    print(f"[US Audit] Querying strict P449 original broadcasters for {len(real_ids)} IMDb IDs...")

    strict_by_imdb = {}
    for start in range(0, len(real_ids), BATCH_SIZE):
        batch = real_ids[start : start + BATCH_SIZE]
        data = sparql_strict_originals(batch)
        if data and "results" in data:
            for row in data["results"].get("bindings", []):
                iid = row.get("imdbID", {}).get("value")
                if not iid:
                    continue
                strict_by_imdb[iid] = {
                    "netflixId": row.get("netflixID", {}).get("value", ""),
                    "broads": [x for x in row.get("broads", {}).get("value", "").split("|") if x],
                }
        if start + BATCH_SIZE < len(real_ids):
            time.sleep(DELAY_SEC)

    stream_links = {k: dict(v) for k, v in CURATED_US_LINKS.items()}
    stripped_count = 0
    verified_us_count = 0
    verified_nf_originals = 0

    for d in imdb_docs:
        had_plats = bool(d.get("platforms"))
        nk = norm_key(d["title"])
        iid = d.get("imdbId", "")

        # Reset network strictly to clean pre-Wikidata TVMaze original broadcaster (eliminates all stale P750 leaks)
        net = clean_tvmaze_net.get(iid, "")
        if net:
            d["network"] = net
        elif "network" in d:
            del d["network"]

        new_plats = set()

        # 1. Keep curated US flagship links
        if nk in CURATED_US_LINKS:
            new_plats.update(CURATED_US_LINKS[nk].keys())

        # 2. Check clean TVMaze original US network/webChannel (STRICT US-only list — excludes BBC, ITV, Sky, Channel 4, CBC, etc.)
        net_pid = match_us_original(net)
        if net_pid:
            new_plats.add(net_pid)

        # 3. Check Wikidata STRICT P449 original broadcaster (NO P750 international distributors!)
        wd = strict_by_imdb.get(iid)
        if wd:
            for b in wd["broads"]:
                pid = match_us_original(b)
                if pid:
                    new_plats.add(pid)
                    if not d.get("network"):
                        d["network"] = b
            # Only attach direct Netflix /title/<id> URL if Netflix is the ORIGINAL broadcaster (Netflix Original)
            if "netflix" in new_plats and wd["netflixId"] and re.match(r"^\d+$", wd["netflixId"]):
                stream_links.setdefault(nk, {})
                if "netflix" not in stream_links[nk]:
                    stream_links[nk]["netflix"] = f"https://www.netflix.com/title/{wd['netflixId']}"
                    verified_nf_originals += 1

        if new_plats:
            d["platforms"] = sorted(new_plats)
            verified_us_count += 1
        else:
            if "platforms" in d:
                del d["platforms"]
            if had_plats:
                stripped_count += 1

    print(f"[US Audit] Stripped non-US / unverified platform tags from {stripped_count} titles.")
    print(f"[US Audit] Verified US-original platform titles in imdb-catalog.js: {verified_us_count}")
    print(f"[US Audit] Verified Netflix Original direct URLs: {verified_nf_originals}")

    IMDB_JS.write_text(
        f"/* DocFinder Bulk Documentary Index ({len(imdb_docs)} IMDb + TVMaze Documentary Series & Feature Films, Strictly Audited US Originals) */\n"
        f"window.DOCFINDER_IMDB_CATALOG = "
        + json.dumps(imdb_docs, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    LINKS_JS.write_text(
        f"/* DocFinder Verified US Streaming Direct & Search Links ({len(stream_links)} strictly US-verified titles) */\n"
        f"window.DOCFINDER_STREAMING_LINKS = "
        + json.dumps(stream_links, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(f"[Done] imdb-catalog.js ({IMDB_JS.stat().st_size // 1024} KB), streaming-links.js ({LINKS_JS.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
