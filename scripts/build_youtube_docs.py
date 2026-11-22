#!/usr/bin/env python3
"""
DocFinder Polite Official YouTube Documentary Channel Feed Builder
------------------------------------------------------------------
Fetches official public YouTube Atom RSS feeds (/feeds/videos.xml?channel_id=...)
for premier free, full-length documentary channels (1 request per channel,
1.2s polite delay, zero scraping of search pages, zero API key).

Output:
  - youtube-catalog.js (window.DOCFINDER_YOUTUBE_CATALOG)
"""

import json
import re
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_JS = ROOT / "youtube-catalog.js"
USER_AGENT = "DocFinderCatalogBuilder/1.0 (+https://github.com/john-rm-short/docfinder; polite-rss)"

CHANNELS = [
    {"name": "DW Documentary", "handle": "@DWDocumentary", "channel_id": "UCW39zufHfsuGgpLviKh297Q", "genre": "Society & Politics", "style": "Investigative"},
    {"name": "FRONTLINE PBS", "handle": "@frontline", "channel_id": "UC3ScyryU9Oy9Wse3a8OAmYQ", "genre": "Society & Politics", "style": "Investigative"},
    {"name": "Free Documentary", "handle": "@FreeDocumentary", "channel_id": "UCijULR2EzrRcisnkG8U-S5g", "genre": "Nature & Wildlife", "style": "Observational"},
    {"name": "Real Stories", "handle": "@RealStories", "channel_id": "UCu4XcDBdnekt-xi-ucGduwg", "genre": "Biography & Portrait", "style": "Observational"},
    {"name": "Timeline - World History Documentaries", "handle": "@TimelineChannel", "channel_id": "UC88lvyii7aH13g377n9R7gA", "genre": "History & War", "style": "Archival"},
    {"name": "NOVA PBS Official", "handle": "@novapbs", "channel_id": "UCjHz5SVHeMT0AViCYZvsGDA", "genre": "Science & Space", "style": "Investigative"},
    {"name": "Spark", "handle": "@SparkDocs", "channel_id": "UCMV3LMZE58S8F9bE7w2s5Tw", "genre": "Science & Space", "style": "Observational"},
    {"name": "Absolute History", "handle": "@AbsoluteHistory", "channel_id": "UCr5qeBG9g7bGtMGyHG2GzbQ", "genre": "History & War", "style": "Archival"},
]

EXCLUDE_RE = re.compile(r"(#shorts|\bshorts\b|\btrailer\b|\bteaser\b|\bpreview\b|\bpromo\b|\bclip\b)", re.I)

NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


def fetch_text(url: str, delay: float = 1.2):
    time.sleep(delay)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return None
    except Exception:
        return None


def resolve_channel_id_from_handle(handle: str):
    html = fetch_text(f"https://www.youtube.com/{handle}", delay=1.4)
    if not html:
        return None
    m = re.search(r'"externalId":"(UC[a-zA-Z0-9_-]{22})"', html) or re.search(r'itemprop="identifier" content="(UC[a-zA-Z0-9_-]{22})"', html) or re.search(r'channel_id=(UC[a-zA-Z0-9_-]{22})', html)
    return m.group(1) if m else None


def main():
    docs = []
    seen_vids = set()
    next_id = 600001

    for ch in CHANNELS:
        cid = ch["channel_id"]
        xml_text = fetch_text(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}", delay=1.2)
        if not xml_text:
            resolved = resolve_channel_id_from_handle(ch["handle"])
            if resolved:
                cid = resolved
                xml_text = fetch_text(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}", delay=1.2)
        if not xml_text:
            print(f"  [skip] Could not fetch RSS for {ch['name']}")
            continue

        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            print(f"  [skip] Invalid XML for {ch['name']}")
            continue

        added = 0
        for entry in root.findall("atom:entry", NS):
            vid = entry.findtext("yt:videoId", default="", namespaces=NS).strip()
            title = entry.findtext("atom:title", default="", namespaces=NS).strip()
            published = entry.findtext("atom:published", default="", namespaces=NS).strip()
            if not vid or not title or vid in seen_vids:
                continue
            if EXCLUDE_RE.search(title):
                continue

            desc = ""
            mgroup = entry.find("media:group", NS)
            if mgroup is not None:
                desc = (mgroup.findtext("media:description", default="", namespaces=NS) or "").strip()
            desc_clean = re.sub(r"\s+", " ", desc).strip()[:340]
            if not desc_clean:
                desc_clean = f"Full-length documentary published by {ch['name']} on YouTube."

            year = int(published[:4]) if len(published) >= 4 and published[:4].isdigit() else 2025
            seen_vids.add(vid)
            docs.append({
                "id": next_id,
                "videoId": vid,
                "title": title,
                "channel": ch["name"],
                "channelId": cid,
                "year": year,
                "published": published[:10],
                "genre": ch["genre"],
                "style": ch["style"],
                "poster": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                "plot": desc_clean,
                "url": f"https://www.youtube.com/watch?v={vid}",
                "isPbs": "PBS" in ch["name"],
            })
            next_id += 1
            added += 1

        print(f"  -> {ch['name']} ({cid}): {added} documentaries indexed")

    OUT_JS.write_text(
        f"/* DocFinder Official Free Long-Form YouTube Documentary Catalog ({len(docs)} titles across {len(CHANNELS)} channels) */\n"
        f"window.DOCFINDER_YOUTUBE_CATALOG = "
        + json.dumps(docs, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(f"[Done] Wrote youtube-catalog.js ({len(docs)} titles, {OUT_JS.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
