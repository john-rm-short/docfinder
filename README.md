# DocFinder Web Suite

A zero-build, static three-page **documentary series and documentary feature film** discovery, tracking, similarity graph, and exploration suite designed specifically for **GitHub Pages** same-origin shared storage.

Strictly limited to **non-fiction documentary series, limited docuseries, and documentary feature movies** (no podcasts, no scripted dramas).

## Suite Architecture

| File | Role |
|---|---|
| `index.html` | **Doc Hub & Catalog** — Global Documentary Search (`/`), Multi-Platform Catalog & Live Releases across 13 Streaming Platforms (`Netflix`, `Max / HBO`, `Hulu`, `Peacock`, `Disney+ / NatGeo`, `Paramount+ / Showtime`, `Prime Video`, `Apple TV+`, `PBS / Kanopy`, `CuriosityStream`, `Tubi`, `Pluto TV`, `YouTube`) + Format filter (`Docuseries`, `Feature Documentaries`, `Limited Series`) + Genre/Style filter + optional TMDB US JustWatch batch enricher, full local Mon–Sun 7-Day Documentary Broadcast Schedule, Personal Watchlist & Cloud Persistence, Doc Radar (Acclaimed Non-Fiction + Documentary Film Wire RSS + YouTube Trailer Hunter), Archives (By Era/Year 1970–2026 & By Network/Studio), and Multi-Source Documentary Detail Modal. |
| `vibe-graph.html` | **Documentary Vibe Graph** — Seedless 3-layer Documentary Taxonomy Find Vibe, Title & Watchlist Constellation seeding, high-DPI HTML5 Canvas (Force & pure-JS deterministic t-SNE), 5-slider DNA weights (`Subject Tags TF-IDF`, `Shared Directors / Filmmakers`, `Network / Studio Match`, `Genre Jaccard`, `Semantic Synopsis / MiniLM`), Reach Ceiling (`<100k` / `<55k`), emergent cluster halos, optional lazy-loaded WASM MiniLM (`Xenova/all-MiniLM-L6-v2` q8) embeddings, persistent Node Inspector with inline auto-saving Watchlist editor, Neighbor Expansion, Wikipedia attachment, and an accessible Table View fallback. |
| `eclectic-lab.html` | **Documentary Discovery Lab** — 2D Doc Vibe Map (`Style × Scope` & `Pacing × Reach` with pointer drag & arrow-key nudging), Director & Filmmaker Tree (10 curated documentarians + 5 craft buckets), Documentary Attribute Arithmetic (signed `+`/`−` equations with exclusion filters & negative penalties), and Blind Documentary Roulette (redacted titles & sealed poster art until reveal + blind Watchlist saving). |
| `shared-core.js` | **Shared Core Engine** — Unified `localStorage` (`docfinder_state_v1`) with non-destructive saves, live cross-tab `storage` events, standardized Watchlist statuses (`Watching`, `Watchlist`, `Watched`, `On Hold`, `Dropped`), per-record deletion tombstones, `TextEncoder`/`TextDecoder` Sync Codes, unified Private GitHub Gist auto-sync (`docfinder-sync.json`, boot auto-pull + 600ms debounced auto-push), shared `IndexedDB` (`DocFinderCacheDB` v2: `apiCache` + `vectors`), persistent global multi-select Streaming Service Filter Bar, Canonical Documentary Catalog + strict live TVMaze Documentary / Wikipedia / TMDB (`with_genres=99`) / OMDb enrichment, and accessible Detail Modal. |
| `catalog-data.js` | Curated expanded documentary series & feature films across Nature, Science, History, Music, Sports, Society, Biography, Environment, Food, and Investigative genres. |
| `imdb-catalog.js` | IMDb-verified documentary feature film and docuseries index with ratings, vote counts, directors, synopses, and direct IMDb links. |
| `streaming-links.js` | Verified US streaming platform links for catalog titles. |
| `styles.css` | Self-contained custom Archival Cinema dark UI stylesheet with zero external CDN fragility. |
| `.nojekyll` & `manifest.webmanifest` | GitHub Pages static-serving bypass and iOS/PWA home-screen install support. |

## Shared Storage on GitHub Pages

Hosting all files on GitHub Pages (`https://<username>.github.io/<repo>/`) places every page under the **same browser origin**, automatically sharing:
- **`localStorage` (`docfinder_state_v1`)** — Watchlist, ratings, episode progress, notes, streaming/style overrides, global streaming service filter, and settings sync live across open tabs via the browser `storage` event.
- **`IndexedDB` (`DocFinderCacheDB` v2)** — Cached API responses (`apiCache`) and 384-d MiniLM embeddings (`vectors`) are shared across all three pages.
- **Deep Links** — `?seed=<id>`, `?vibe=<query>`, `?mode=watchlist`, `?tab=<name>`, `?doc=<id>`, `?studio=<name>`, `?staff=<name>`, and `#sync=<base64>`.

## Deploy to GitHub Pages

1. Create a new repository on GitHub (for example, `docfinder`).
2. Inside this folder, push to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/docfinder.git
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `/ (root)`
   - Click **Save**.
4. Visit `https://<your-username>.github.io/docfinder/` — `index.html` loads automatically as the Doc Hub.
