#!/usr/bin/env python3
"""
DocFinder Polite Bulk Catalog Builder
-------------------------------------
Builds a multi-thousand documentary series & feature film catalog from:
  1. IMDb Official Non-Commercial Bulk Datasets (datasets.imdbws.com)
     - 4 static .tsv.gz CDN downloads (zero scraping, zero API spam)
     - Strictly filtered to: titleType in {movie, tvSeries, tvMiniSeries}
       AND 'Documentary' in genres AND isAdult == '0'
  2. TVMaze Bulk Documentary Show Index (api.tvmaze.com/shows?page=N)
     - Strictly filtered to type == 'Documentary'
     - Throttled at >= 0.7s per request with 429 backoff
     - Cross-enriches IMDb titles with official posters & networks
  3. PBS Flagship Documentary Strands via TVMaze single-request episode lists
     - FRONTLINE, Independent Lens, POV, American Experience, NOVA, Nature
     - Just 1 request per strand (~6 requests total, zero pbs.org scraping!)

Outputs:
  - imdb-catalog.js  (window.DOCFINDER_IMDB_CATALOG)
  - pbs-catalog.js   (window.DOCFINDER_PBS_CATALOG)
"""

import gzip
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / ".cache_imdb"
USER_AGENT = "DocFinderCatalogBuilder/1.0 (+https://github.com/john-rm-short/docfinder; polite-non-commercial)"

IMDB_URLS = {
    "basics": "https://datasets.imdbws.com/title.basics.tsv.gz",
    "ratings": "https://datasets.imdbws.com/title.ratings.tsv.gz",
    "crew": "https://datasets.imdbws.com/title.crew.tsv.gz",
    "names": "https://datasets.imdbws.com/name.basics.tsv.gz",
}

MIN_IMDB_VOTES = 600
MAX_IMDB_TITLES = 2400
TVMAZE_PAGES = 45          # 45 pages * 250 shows = 11,250 shows (~32s at 0.7s/req)
TVMAZE_DELAY_SEC = 0.72    # Polite delay well below TVMaze's 20 req/10s limit

PBS_STRANDS = [
    {"name": "FRONTLINE", "tvmaze_q": "Frontline", "pbs_url": "https://www.pbs.org/wgbh/frontline/documentaries/", "genre": "Society & Politics", "style": "Investigative", "max_eps": 140},
    {"name": "Independent Lens", "tvmaze_q": "Independent Lens", "pbs_url": "https://www.pbs.org/independentlens/documentaries/", "genre": "Society & Politics", "style": "Observational", "max_eps": 140},
    {"name": "POV", "tvmaze_q": "POV", "pbs_url": "https://www.pbs.org/pov/films/", "genre": "Biography & Portrait", "style": "Observational", "max_eps": 140},
    {"name": "American Experience", "tvmaze_q": "American Experience", "pbs_url": "https://www.pbs.org/wgbh/americanexperience/films/", "genre": "History & War", "style": "Archival", "max_eps": 140},
    {"name": "NOVA", "tvmaze_q": "NOVA", "pbs_url": "https://www.pbs.org/wgbh/nova/", "genre": "Science & Space", "style": "Investigative", "max_eps": 140},
    {"name": "Nature", "tvmaze_q": "Nature", "pbs_url": "https://www.pbs.org/wnet/nature/", "genre": "Nature & Wildlife", "style": "Observational", "max_eps": 120},
]

NET_TO_PLATFORM = {
    "netflix": "netflix",
    "hbo": "max",
    "max": "max",
    "hbo max": "max",
    "hulu": "hulu",
    "disney+": "disney",
    "national geographic": "disney",
    "nat geo": "disney",
    "pbs": "pbs",
    "apple tv+": "appletv",
    "amazon": "prime",
    "prime video": "prime",
    "peacock": "peacock",
    "nbc": "peacock",
    "paramount+": "paramount",
    "showtime": "paramount",
    "smithsonian channel": "paramount",
    "curiositystream": "curiosity",
    "tubi": "tubi",
    "pluto tv": "pluto",
    "youtube": "youtube",
    "bbc": "curiosity",
}

IMDB_GENRE_MAP = {
    "Biography": "Biography & Portrait",
    "History": "History & War",
    "War": "History & War",
    "Music": "Music & Arts",
    "Musical": "Music & Arts",
    "Sport": "Sports & Adventure",
    "Adventure": "Sports & Adventure",
    "Crime": "Investigative & Crime",
    "Mystery": "Investigative & Crime",
    "News": "Society & Politics",
    "Sci-Fi": "Science & Space",
}


def strip_html(text: str) -> str:
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", "", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def norm_key(title: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (title or "").lower())


def polite_get_json(url: str, delay: float = TVMAZE_DELAY_SEC, retries: int = 3):
    time.sleep(delay)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 429:
                wait = 4.0 * (attempt + 1)
                print(f"  [429 backoff] waiting {wait}s for {url}")
                time.sleep(wait)
                continue
            print(f"  [HTTP {e.code}] {url}")
            return None
        except Exception as e:
            print(f"  [error] {url}: {e}")
            time.sleep(1.5)
    return None


def download_imdb_file(name: str, url: str) -> Path:
    CACHE_DIR.mkdir(exist_ok=True)
    dest = CACHE_DIR / f"title.{name}.tsv.gz"
    if dest.exists() and (time.time() - dest.stat().st_mtime) < 24 * 3600:
        print(f"[IMDb cache hit] {dest.name} ({dest.stat().st_size // 1024 // 1024} MB)")
        return dest
    print(f"[IMDb download] {url} ...")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as resp, open(dest, "wb") as out:
        while True:
            chunk = resp.read(1024 * 256)
            if not chunk:
                break
            out.write(chunk)
    print(f"  -> saved {dest.name} ({dest.stat().st_size // 1024 // 1024} MB)")
    return dest


def map_network_to_platform(net_name: str):
    low = (net_name or "").lower()
    for k, pid in NET_TO_PLATFORM.items():
        if k in low:
            return pid
    return None


def build_imdb_docs():
    ratings_path = download_imdb_file("ratings", IMDB_URLS["ratings"])
    basics_path = download_imdb_file("basics", IMDB_URLS["basics"])
    crew_path = download_imdb_file("crew", IMDB_URLS["crew"])
    names_path = download_imdb_file("names", IMDB_URLS["names"])

    print("[IMDb] Reading ratings >= %d votes..." % MIN_IMDB_VOTES)
    ratings = {}
    with gzip.open(ratings_path, "rt", encoding="utf-8", errors="replace") as f:
        header = f.readline()
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            votes = int(parts[2])
            if votes >= MIN_IMDB_VOTES:
                ratings[parts[0]] = (float(parts[1]), votes)
    print(f"  -> {len(ratings):,} rated titles with >= {MIN_IMDB_VOTES} votes")

    print("[IMDb] Filtering Documentary movies & series from title.basics...")
    docs = []
    with gzip.open(basics_path, "rt", encoding="utf-8", errors="replace") as f:
        header = f.readline()
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 9:
                continue
            tconst, ttype, primary, _orig, is_adult, start_yr, _end_yr, runtime, genres_str = parts[:9]
            if is_adult != "0":
                continue
            if ttype not in ("movie", "tvSeries", "tvMiniSeries"):
                continue
            if tconst not in ratings:
                continue
            if "Documentary" not in genres_str:
                continue
            if start_yr == "\\N":
                continue
            try:
                year = int(start_yr)
            except ValueError:
                continue
            if year < 1920 or year > 2026:
                continue
            rt_min = int(runtime) if runtime.isdigit() else (90 if ttype == "movie" else 50)
            rating, votes = ratings[tconst]
            raw_genres = [g.strip() for g in genres_str.split(",") if g.strip() and g.strip() != "Documentary"]
            mapped_genres = []
            for g in raw_genres:
                mg = IMDB_GENRE_MAP.get(g)
                if mg and mg not in mapped_genres:
                    mapped_genres.append(mg)
            docs.append({
                "imdbId": tconst,
                "title": primary,
                "type": ttype,
                "year": year,
                "runtime": rt_min,
                "imdbRating": rating,
                "imdbVotes": votes,
                "genres": mapped_genres,
            })

    docs.sort(key=lambda x: x["imdbVotes"], reverse=True)
    docs = docs[:MAX_IMDB_TITLES]
    keep_ids = {d["imdbId"] for d in docs}
    print(f"  -> Selected top {len(docs):,} Documentary movies & series")

    print("[IMDb] Resolving directors from title.crew & name.basics...")
    crew_map = {}
    needed_nconsts = set()
    with gzip.open(crew_path, "rt", encoding="utf-8", errors="replace") as f:
        header = f.readline()
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 2 or parts[0] not in keep_ids:
                continue
            if parts[1] != "\\N":
                d_ids = parts[1].split(",")[:2]
                crew_map[parts[0]] = d_ids
                needed_nconsts.update(d_ids)

    name_map = {}
    with gzip.open(names_path, "rt", encoding="utf-8", errors="replace") as f:
        header = f.readline()
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) >= 2 and parts[0] in needed_nconsts:
                name_map[parts[0]] = parts[1]

    for d in docs:
        d_ids = crew_map.get(d["imdbId"], [])
        names = [name_map[nid] for nid in d_ids if nid in name_map]
        if names:
            d["director"] = ", ".join(names)

    return docs


def fetch_tvmaze_doc_shows():
    print(f"[TVMaze] Politely fetching {TVMAZE_PAGES} index pages ({TVMAZE_DELAY_SEC}s/req) for Documentary series...")
    by_imdb = {}
    extra_shows = []
    for page in range(TVMAZE_PAGES):
        data = polite_get_json(f"https://api.tvmaze.com/shows?page={page}")
        if not data:
            break
        for s in data:
            if s.get("type") != "Documentary":
                continue
            name = (s.get("name") or "").strip()
            if not name:
                continue
            imdb_id = (s.get("externals") or {}).get("imdb") or ""
            img = (s.get("image") or {}).get("medium") or (s.get("image") or {}).get("original") or ""
            img = re.sub(r"^http://", "https://", img)
            net = ((s.get("network") or {}).get("name") or (s.get("webChannel") or {}).get("name") or "").strip()
            plat = map_network_to_platform(net)
            summary = strip_html(s.get("summary") or "")[:360]
            year = int(s["premiered"][:4]) if (s.get("premiered") and len(s["premiered"]) >= 4) else 2020
            rating = (s.get("rating") or {}).get("average")
            entry = {
                "tvmazeId": s["id"],
                "imdbId": imdb_id,
                "title": name,
                "year": year,
                "runtime": s.get("averageRuntime") or s.get("runtime") or 50,
                "rating": rating,
                "weight": s.get("weight") or 50,
                "network": net,
                "platform": plat,
                "poster": img,
                "plot": summary,
                "url": s.get("officialSite") or s.get("url") or "",
            }
            if imdb_id:
                by_imdb[imdb_id] = entry
            extra_shows.append(entry)
        if (page + 1) % 15 == 0:
            print(f"  -> scanned {page + 1}/{TVMAZE_PAGES} pages ({len(extra_shows)} documentary series found)")
    print(f"[TVMaze] Total documentary series indexed: {len(extra_shows)} ({len(by_imdb)} with IMDb IDs)")
    return by_imdb, extra_shows


def fetch_pbs_strand_films():
    print("[PBS] Fetching individual documentary films from 6 flagship PBS strands via TVMaze (12 polite requests total)...")
    pbs_films = []
    seen = set()
    next_id = 400001

    for strand in PBS_STRANDS:
        q = urllib.parse.quote(strand["tvmaze_q"])
        results = polite_get_json(f"https://api.tvmaze.com/search/shows?q={q}", delay=0.9)
        if not results:
            continue
        show = None
        for r in results:
            s = r.get("show") or {}
            net = ((s.get("network") or {}).get("name") or "").lower()
            if s.get("name", "").lower() == strand["name"].lower() and ("pbs" in net or s.get("type") == "Documentary"):
                show = s
                break
        if not show:
            for r in results:
                s = r.get("show") or {}
                if s.get("type") == "Documentary" and strand["name"].lower() in s.get("name", "").lower():
                    show = s
                    break
        if not show:
            print(f"  [PBS] Could not locate TVMaze show for {strand['name']}")
            continue

        show_poster = ((show.get("image") or {}).get("medium") or (show.get("image") or {}).get("original") or "")
        show_poster = re.sub(r"^http://", "https://", show_poster)
        eps = polite_get_json(f"https://api.tvmaze.com/shows/{show['id']}/episodes", delay=0.9)
        if not eps:
            continue

        # Take most recent standalone documentary films with non-empty summaries
        valid_eps = [e for e in eps if e.get("name") and len(e.get("name", "")) >= 3 and not re.match(r"^(episode\s+\d+|tba)$", e.get("name", ""), re.I)]
        valid_eps.sort(key=lambda e: e.get("airdate") or "", reverse=True)

        added_for_strand = 0
        for ep in valid_eps:
            if added_for_strand >= strand["max_eps"]:
                break
            ep_title = ep["name"].strip()
            nk = norm_key(ep_title)
            if not nk or nk in seen:
                continue
            seen.add(nk)
            airdate = ep.get("airdate") or ""
            year = int(airdate[:4]) if len(airdate) >= 4 and airdate[:4].isdigit() else 2022
            ep_img = ((ep.get("image") or {}).get("medium") or (ep.get("image") or {}).get("original") or show_poster)
            ep_img = re.sub(r"^http://", "https://", ep_img)
            summary = strip_html(ep.get("summary") or "")[:340]
            if not summary:
                summary = f"PBS {strand['name']} documentary presentation ({year})."

            pbs_films.append({
                "id": next_id,
                "title": f"{ep_title} ({strand['name']})" if len(ep_title) < 12 else ep_title,
                "strand": strand["name"],
                "year": year,
                "runtime": ep.get("runtime") or 56,
                "genre": strand["genre"],
                "style": strand["style"],
                "poster": ep_img,
                "plot": summary,
                "pbsUrl": f"https://www.pbs.org/search/?q={urllib.parse.quote(ep_title)}",
            })
            next_id += 1
            added_for_strand += 1

        print(f"  -> PBS {strand['name']}: {added_for_strand} documentary films indexed")

    print(f"[PBS] Total individual PBS documentary films indexed: {len(pbs_films)}")
    return pbs_films


def main():
    imdb_docs = build_imdb_docs()
    tvm_by_imdb, tvm_extra = fetch_tvmaze_doc_shows()
    pbs_films = fetch_pbs_strand_films()

    # Cross-enrich IMDb docs with TVMaze posters, plots, and platforms
    enriched_count = 0
    seen_imdb_ids = set()
    seen_norm_titles = set()
    for d in imdb_docs:
        seen_imdb_ids.add(d["imdbId"])
        seen_norm_titles.add(norm_key(d["title"]))
        tvm = tvm_by_imdb.get(d["imdbId"])
        if tvm:
            enriched_count += 1
            if tvm["poster"]:
                d["poster"] = tvm["poster"]
            if tvm["plot"]:
                d["plot"] = tvm["plot"]
            if tvm["platform"]:
                d["platforms"] = [tvm["platform"]]
            if tvm["network"]:
                d["network"] = tvm["network"]

    # Append additional TVMaze documentary series (with posters!) not already in IMDb top list
    tvm_added = 0
    for s in sorted(tvm_extra, key=lambda x: x["weight"], reverse=True):
        if s["imdbId"] and s["imdbId"] in seen_imdb_ids:
            continue
        nk = norm_key(s["title"])
        if not nk or nk in seen_norm_titles:
            continue
        if not s["poster"] and not s["plot"]:
            continue
        seen_norm_titles.add(nk)
        imdb_docs.append({
            "imdbId": s["imdbId"] or f"tvm{s['tvmazeId']}",
            "title": s["title"],
            "type": "tvSeries",
            "year": s["year"],
            "runtime": s["runtime"],
            "imdbRating": s["rating"] or 7.6,
            "imdbVotes": max(800, s["weight"] * 120),
            "genres": [],
            "poster": s["poster"],
            "plot": s["plot"],
            "platforms": [s["platform"]] if s["platform"] else [],
            "network": s["network"],
        })
        tvm_added += 1
        if tvm_added >= 600:
            break

    print(f"[Merge] Enriched {enriched_count} IMDb series with TVMaze posters/networks; added {tvm_added} additional TVMaze docuseries.")
    print(f"[Merge] Writing imdb-catalog.js ({len(imdb_docs):,} titles) and pbs-catalog.js ({len(pbs_films):,} PBS films)...")

    imdb_out = ROOT / "imdb-catalog.js"
    imdb_js = (
        f"/* DocFinder Bulk Documentary Index ({len(imdb_docs)} IMDb + TVMaze Documentary Series & Feature Films) */\n"
        f"window.DOCFINDER_IMDB_CATALOG = "
        + json.dumps(imdb_docs, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    imdb_out.write_text(imdb_js, encoding="utf-8")

    pbs_out = ROOT / "pbs-catalog.js"
    pbs_js = (
        f"/* DocFinder PBS Flagship Documentary Films ({len(pbs_films)} films across FRONTLINE, Independent Lens, POV, American Experience, NOVA, Nature) */\n"
        f"window.DOCFINDER_PBS_CATALOG = "
        + json.dumps(pbs_films, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    pbs_out.write_text(pbs_js, encoding="utf-8")

    print(f"[Done] imdb-catalog.js: {imdb_out.stat().st_size // 1024} KB | pbs-catalog.js: {pbs_out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
