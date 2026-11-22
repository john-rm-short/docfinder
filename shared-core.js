/* ==========================================================================
   DocFinder Web Suite — shared-core.js
   Unified storage (docfinder_state_v1), IndexedDB cache (DocFinderCacheDB v2),
   Private GitHub Gist auto-sync with tombstones (docfinder-sync.json),
   13-Platform Documentary Registry, Canonical Documentary Series & Feature
   Film Catalog + Strict Live TVMaze Documentary / Wikipedia / TMDB (genre 99)
   / OMDb Engine, 3-Layer Documentary Taxonomy Find Vibe, and Accessible
   Documentary Detail Modal.
   ========================================================================== */

(function (global) {
  'use strict';

  const STATE_KEY = 'docfinder_state_v1';
  const DB_NAME = 'DocFinderCacheDB';
  const DB_VERSION = 2;
  const GIST_FILENAME = 'docfinder-sync.json';
  const LEGACY_GIST_FILENAME = 'docfinder-state.json';

  const TTL_DYNAMIC = 20 * 60 * 1000;      // 20 min for live feeds
  const TTL_STABLE = 24 * 60 * 60 * 1000;  // 24 hours for taxonomy & metadata

  const WATCHLIST_STATUSES = [
    'Watching',
    'Watchlist',
    'Watched',
    'On Hold',
    'Dropped'
  ];

  // Documentary Style & Release Track classification options
  const DUB_OPTIONS = [
    '',
    'Observational',
    'Archival',
    'Investigative',
    'Essay',
    'Simul-Release',
    'Staggered Release'
  ];

  // Centralized 13-Platform Documentary Streaming Registry (No Podcasts)
  const PLATFORM_CONFIG = [
    {
      id: 'netflix',
      name: 'Netflix',
      licensedBy: 'Netflix',
      licensedByValues: ['Netflix'],
      aliases: ['netflix'],
      domains: ['netflix.com'],
      color: '#ef4444',
      freeWithAds: false,
      searchUrl: t => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`
    },
    {
      id: 'max',
      name: 'Max / HBO',
      licensedBy: 'HBO',
      licensedByValues: ['HBO', 'Max', 'HBO Documentary Films', 'HBO Max'],
      aliases: ['hbo', 'max', 'hbo max', 'hbo documentary'],
      domains: ['max.com', 'hbomax.com', 'hbo.com'],
      color: '#818cf8',
      freeWithAds: false,
      searchUrl: t => `https://www.hbomax.com/search?q=${encodeURIComponent(t)}`
    },
    {
      id: 'hulu',
      name: 'Hulu',
      licensedBy: 'Hulu',
      licensedByValues: ['Hulu', 'FX', 'ABC News Studios'],
      aliases: ['hulu', 'fx'],
      domains: ['hulu.com'],
      color: '#34d399',
      freeWithAds: false,
      searchUrl: t => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`
    },
    {
      id: 'disney',
      name: 'Disney+ / NatGeo',
      licensedBy: 'National Geographic',
      licensedByValues: ['Disney+', 'National Geographic', 'Nat Geo', 'NatGeo'],
      aliases: ['disney+', 'disney plus', 'national geographic', 'nat geo', 'natgeo'],
      domains: ['disneyplus.com', 'nationalgeographic.com'],
      color: '#38bdf8',
      freeWithAds: false,
      searchUrl: t => `https://www.disneyplus.com/search?q=${encodeURIComponent(t)}`
    },
    {
      id: 'pbs',
      name: 'PBS / Kanopy',
      licensedBy: 'PBS',
      licensedByValues: ['PBS', 'PBS / American Experience', 'NOVA', 'FRONTLINE', 'Kanopy', 'POV', 'Independent Lens'],
      aliases: ['pbs', 'kanopy', 'american experience', 'frontline', 'nova'],
      domains: ['pbs.org', 'kanopy.com'],
      color: '#2dd4bf',
      freeWithAds: true,
      searchUrl: t => `https://www.pbs.org/search/?q=${encodeURIComponent(t)}`
    },
    {
      id: 'appletv',
      name: 'Apple TV+',
      licensedBy: 'Apple TV+',
      licensedByValues: ['Apple TV+'],
      aliases: ['apple tv+', 'apple tv'],
      domains: ['tv.apple.com'],
      color: '#a855f7',
      freeWithAds: false,
      searchUrl: t => `https://tv.apple.com/us/search?term=${encodeURIComponent(t)}`
    },
    {
      id: 'prime',
      name: 'Prime Video',
      licensedBy: 'Prime Video',
      licensedByValues: ['Prime Video', 'Amazon Studios', 'Amazon Prime Video'],
      aliases: ['amazon', 'prime video', 'amazon prime'],
      domains: ['amazon.com', 'primevideo.com', 'watch.amazon.com'],
      color: '#0ea5e9',
      freeWithAds: false,
      searchUrl: t => `https://www.amazon.com/s?k=${encodeURIComponent(t)}&i=instant-video`
    },
    {
      id: 'peacock',
      name: 'Peacock',
      licensedBy: 'Peacock',
      licensedByValues: ['Peacock', 'NBC'],
      aliases: ['peacock', 'nbc'],
      domains: ['peacocktv.com'],
      color: '#60a5fa',
      freeWithAds: false,
      searchUrl: t => `https://www.peacocktv.com/watch/search?q=${encodeURIComponent(t)}`
    },
    {
      id: 'paramount',
      name: 'Paramount+ / Showtime',
      licensedBy: 'Paramount+',
      licensedByValues: ['Paramount+', 'Showtime', 'Smithsonian Channel'],
      aliases: ['paramount+', 'paramount plus', 'showtime', 'smithsonian'],
      domains: ['paramountplus.com', 'sho.com'],
      color: '#3b82f6',
      freeWithAds: false,
      searchUrl: t => `https://www.paramountplus.com/search/?q=${encodeURIComponent(t)}`
    },
    {
      id: 'curiosity',
      name: 'CuriosityStream',
      licensedBy: 'CuriosityStream',
      licensedByValues: ['CuriosityStream', 'BBC Studios'],
      aliases: ['curiositystream', 'curiosity stream'],
      domains: ['curiositystream.com'],
      color: '#f59e0b',
      freeWithAds: false,
      searchUrl: t => `https://curiositystream.com/search?q=${encodeURIComponent(t)}`
    },
    {
      id: 'tubi',
      name: 'Tubi',
      licensedBy: 'Tubi',
      licensedByValues: ['Tubi', 'Tubi TV'],
      aliases: ['tubi', 'tubi tv'],
      domains: ['tubitv.com'],
      color: '#c084fc',
      freeWithAds: true,
      searchUrl: t => `https://tubitv.com/search/${encodeURIComponent(t)}`
    },
    {
      id: 'pluto',
      name: 'Pluto TV',
      licensedBy: 'Pluto TV',
      licensedByValues: ['Pluto TV'],
      aliases: ['pluto', 'pluto tv'],
      domains: ['pluto.tv'],
      color: '#fbbf24',
      freeWithAds: true,
      searchUrl: t => `https://pluto.tv/us/search?q=${encodeURIComponent(t)}`
    },
    {
      id: 'youtube',
      name: 'YouTube',
      licensedBy: 'YouTube',
      licensedByValues: ['YouTube'],
      aliases: ['youtube', 'youtu.be'],
      domains: ['youtube.com', 'youtu.be'],
      color: '#f87171',
      freeWithAds: true,
      searchUrl: t => `https://www.youtube.com/results?search_query=${encodeURIComponent(t + ' full documentary')}&sp=EgQQARgC`
    }
  ];

  const PLATFORM_BY_ID = Object.fromEntries(PLATFORM_CONFIG.map(p => [p.id, p]));

  // --------------------------------------------------------------------------
  // SVG Poster Generator for Offline / Fallback Documentary Covers
  // --------------------------------------------------------------------------
  function makeDocPosterDataUri(title, subtitle, accentColor = '#0ea5e9', badgeText = 'DOCUMENTARY') {
    const cleanTitle = String(title || 'Documentary').slice(0, 42);
    const words = cleanTitle.split(/\s+/);
    let line1 = '', line2 = '', line3 = '';
    for (const w of words) {
      if ((line1 + ' ' + w).trim().length <= 16) line1 = (line1 + ' ' + w).trim();
      else if ((line2 + ' ' + w).trim().length <= 16) line2 = (line2 + ' ' + w).trim();
      else line3 = (line3 + ' ' + w).trim().slice(0, 18);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#111d2f"/>
          <stop offset="60%" stop-color="#090f19"/>
          <stop offset="100%" stop-color="#0d1b24"/>
        </linearGradient>
      </defs>
      <rect width="360" height="480" fill="url(#g)"/>
      <rect x="18" y="18" width="324" height="444" rx="14" fill="none" stroke="${accentColor}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="8 6"/>
      <circle cx="180" cy="145" r="54" fill="${accentColor}" fill-opacity="0.12" stroke="${accentColor}" stroke-opacity="0.6" stroke-width="2.5"/>
      <circle cx="180" cy="145" r="22" fill="none" stroke="#e2e8f0" stroke-width="2.2" opacity="0.8"/>
      <circle cx="180" cy="145" r="6" fill="#2dd4bf"/>
      <circle cx="180" cy="112" r="5" fill="${accentColor}"/>
      <circle cx="180" cy="178" r="5" fill="${accentColor}"/>
      <circle cx="147" cy="145" r="5" fill="#f59e0b"/>
      <circle cx="213" cy="145" r="5" fill="#f59e0b"/>
      <rect x="36" y="36" width="140" height="26" rx="5" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-opacity="0.6"/>
      <text x="106" y="54" text-anchor="middle" fill="#bae6fd" font-family="monospace" font-weight="700" font-size="11.5">${escapeHtml(badgeText)}</text>
      <text x="180" y="265" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="800" font-size="25">${escapeHtml(line1)}</text>
      ${line2 ? `<text x="180" y="298" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-weight="800" font-size="24">${escapeHtml(line2)}</text>` : ''}
      ${line3 ? `<text x="180" y="331" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-weight="700" font-size="21">${escapeHtml(line3)}</text>` : ''}
      <text x="180" y="420" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-weight="600" font-size="13">${escapeHtml(String(subtitle || 'NON-FICTION ARCHIVE').slice(0, 32))}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // --------------------------------------------------------------------------
  // Canonical Documentary Taxonomy & Flagship Curated Corpus
  // --------------------------------------------------------------------------
  const CANONICAL_GENRES = [
    'Nature & Wildlife',
    'Science & Space',
    'History & War',
    'Investigative & Crime',
    'Music & Arts',
    'Sports & Adventure',
    'Society & Politics',
    'Biography & Portrait',
    'Environment & Climate',
    'Food & Culture'
  ];

  const CANONICAL_TAGS = [
    { name: 'Cinema Verité', category: 'Style', description: 'Observational, fly-on-the-wall filmmaking with minimal narration and raw human moments.' },
    { name: 'Archival Footage', category: 'Style', description: 'Restored historical film reels, home videos, news broadcasts, and primary-source tape.' },
    { name: 'Investigative Journalism', category: 'Methodology', description: 'Long-form reporting, whistleblower interviews, FOIA records, and accountability exposés.' },
    { name: 'Deep Ocean & Wildlife', category: 'Natural World', description: 'Marine biology, polar expeditions, rainforests, and natural history cinematography.' },
    { name: 'Space Exploration', category: 'Science', description: 'NASA missions, telescopes, cosmology, astronauts, and planetary science.' },
    { name: 'World War II', category: 'History', description: 'Firsthand accounts, restored combat reels, and historical analyses of World War II.' },
    { name: 'Ancient Civilizations', category: 'History', description: 'Archaeology, tombs, prehistoric art, and lost ancient empires.' },
    { name: 'Music History', category: 'Culture', description: 'Concert films, studio sessions, iconic bands, and cultural music movements.' },
    { name: 'Extreme Sports', category: 'Adventure', description: 'Free solo climbing, Formula 1 racing, freediving, and high-stakes athletic feats.' },
    { name: 'Mountaineering & Survival', category: 'Adventure', description: 'Alpine expeditions, cave rescues, volcanoes, and human endurance in extreme environments.' },
    { name: 'Political Exposé', category: 'Society', description: 'Government surveillance, elections, geopolitics, and systemic power structures.' },
    { name: 'Corporate Whistleblower', category: 'Society', description: 'Insiders exposing corporate fraud, financial meltdowns, tech ethics, and institutional cover-ups.' },
    { name: 'Climate & Conservation', category: 'Natural World', description: 'Retreating glaciers, endangered habitats, rewilding, and environmental activism.' },
    { name: 'Tech & Silicon Valley', category: 'Science', description: 'Social media algorithms, computing pioneers, internet history, and engineering breakthroughs.' },
    { name: 'Art & Architecture', category: 'Culture', description: 'Design, photography, street art, visual essays, and creative craft.' },
    { name: 'Culinary & Travel', category: 'Culture', description: 'Master chefs, regional food traditions, global travel essays, and culinary craft.' },
    { name: 'Biographical Portrait', category: 'Focus', description: 'Intimate character studies of visionary artists, scientists, athletes, and everyday outsiders.' },
    { name: 'Social Justice', category: 'Society', description: 'Civil rights, disability advocacy, labor movements, and criminal justice reform.' },
    { name: 'Cult & Subculture', category: 'Society', description: 'Niche communities, high-control groups, underground scenes, and unconventional subcultures.' },
    { name: 'Cold War & Espionage', category: 'History', description: 'Intelligence agencies, nuclear brinkmanship, dissidents, and 20th-century geopolitics.' },
    { name: 'Medical & Neuroscience', category: 'Science', description: 'Public health, medicine, psychology, biology, and the human mind.' },
    { name: 'Human Rights', category: 'Society', description: 'War correspondence, refugee journeys, and struggles for fundamental human dignity.' },
    { name: 'Urban Life', category: 'Setting', description: 'City symphonies, municipal institutions, neighborhood portraits, and metropolitan culture.' },
    { name: '1970s Era', category: 'Historical Era', description: 'Documentaries filmed in or chronicling the 1970s.' },
    { name: '1980s Era', category: 'Historical Era', description: 'Documentaries filmed in or chronicling the 1980s.' },
    { name: '1990s Era', category: 'Historical Era', description: 'Documentaries filmed in or chronicling the 1990s.' },
    { name: 'Academy Award Winner', category: 'Recognition', description: 'Oscar-winning documentary features celebrated for craft and impact.' },
    { name: 'Sundance / Festival Hit', category: 'Recognition', description: 'Standout premieres from Sundance, Venice, Cannes, and major documentary festivals.' }
  ];

  // Flagship built-in documentaries (with YouTube trailer IDs for instant Trailer Hunter & Detail Modal playback)
  const RAW_DOC_CATALOG = [
    {
      id: 101,
      imdbId: 'tt7775622',
      title: 'Free Solo',
      format: 'FEATURE_DOC',
      status: 'FINISHED',
      docStyle: 'Observational',
      source: 'VERITE_FIELD',
      seasonYear: 2018,
      episodes: 1,
      duration: 100,
      averageScore: 89,
      popularity: 146000,
      countryOfOrigin: 'US',
      studio: 'National Geographic',
      platforms: ['disney', 'hulu', 'prime'],
      genres: ['Sports & Adventure', 'Biography & Portrait'],
      tags: [['Mountaineering & Survival', 99], ['Extreme Sports', 99], ['Academy Award Winner', 97], ['Cinema Verité', 92]],
      staff: [{ role: 'Director', name: 'Elizabeth Chai Vasarhelyi' }, { role: 'Director', name: 'Jimmy Chin' }],
      trailerId: 'urRVZ4SW7WU',
      description: 'Follows rock climber Alex Honnold as he prepares for and executes the unthinkable: climbing the 3,000-foot sheer granite face of Yosemite’s El Capitan completely without ropes or safety gear.'
    },
    {
      id: 102,
      imdbId: 'tt8760684',
      title: 'Apollo 11',
      format: 'FEATURE_DOC',
      status: 'FINISHED',
      docStyle: 'Archival',
      source: 'ARCHIVAL_FILM',
      seasonYear: 2019,
      episodes: 1,
      duration: 93,
      averageScore: 90,
      popularity: 110000,
      countryOfOrigin: 'US',
      studio: 'Neon',
      platforms: ['hulu', 'prime', 'appletv'],
      genres: ['Science & Space', 'History & War'],
      tags: [['Space Exploration', 99], ['Archival Footage', 99], ['Sundance / Festival Hit', 95]],
      staff: [{ role: 'Director', name: 'Todd Douglas Miller' }],
      trailerId: '3Co8Z8BQgWc',
      description: 'Crafted exclusively from newly discovered 70mm NASA film reels and 11,000 hours of uncatalogued Mission Control audio, Todd Douglas Miller recreates the 1969 Moon landing with zero modern narration.'
    },
    {
      id: 103,
      imdbId: 'tt5491994',
      title: 'Planet Earth II',
      format: 'MINI_SERIES',
      status: 'FINISHED',
      docStyle: 'Observational',
      source: 'NATURAL_HISTORY',
      seasonYear: 2016,
      episodes: 6,
      duration: 50,
      averageScore: 95,
      popularity: 168000,
      countryOfOrigin: 'GB',
      studio: 'BBC Studios',
      platforms: ['max', 'prime', 'appletv'],
      genres: ['Nature & Wildlife', 'Environment & Climate'],
      tags: [['Deep Ocean & Wildlife', 99], ['Climate & Conservation', 92], ['Urban Life', 82]],
      staff: [{ role: 'Narrator', name: 'David Attenborough' }, { role: 'Composer', name: 'Hans Zimmer' }],
      trailerId: 'c8aFcHFu8QM',
      description: 'Using ultra-high-definition drones and stabilized camera rigs, David Attenborough returns to reveal how animals survive across islands, mountains, jungles, deserts, grasslands, and modern cities.'
    },
    {
      id: 104,
      imdbId: 'tt12888462',
      title: 'My Octopus Teacher',
      format: 'FEATURE_DOC',
      status: 'FINISHED',
      docStyle: 'Observational',
      source: 'NATURAL_HISTORY',
      seasonYear: 2020,
      episodes: 1,
      duration: 85,
      averageScore: 87,
      popularity: 126000,
      countryOfOrigin: 'ZA',
      studio: 'Netflix',
      platforms: ['netflix'],
      genres: ['Nature & Wildlife', 'Biography & Portrait'],
      tags: [['Deep Ocean & Wildlife', 98], ['Academy Award Winner', 95], ['Biographical Portrait', 88], ['Climate & Conservation', 84]],
      staff: [{ role: 'Director', name: 'Pippa Ehrlich' }, { role: 'Director', name: 'James Reed' }],
      trailerId: '3s0LTDhqe5A',
      description: 'Academy Award-winning portrait of a burned-out South African filmmaker who free-dives daily into a freezing Atlantic kelp forest and forms an extraordinary bond with a wild common octopus.'
    },
    {
      id: 105,
      imdbId: 'tt1396484',
      title: 'Summer of Soul',
      format: 'FEATURE_DOC',
      status: 'FINISHED',
      docStyle: 'Archival',
      source: 'ARCHIVAL_FILM',
      seasonYear: 2021,
      episodes: 1,
      duration: 118,
      averageScore: 89,
      popularity: 94000,
      countryOfOrigin: 'US',
      studio: 'Hulu',
      platforms: ['hulu', 'disney'],
      genres: ['Music & Arts', 'History & War', 'Society & Politics'],
      tags: [['Music History', 99], ['Archival Footage', 99], ['Academy Award Winner', 97], ['Social Justice', 92], ['Sundance / Festival Hit', 95]],
      staff: [{ role: 'Director', name: 'Ahmir "Questlove" Thompson' }],
      trailerId: 'slFiJpAxZyQ',
      description: 'Questlove unearths 40 hours of forgotten 1969 Harlem Cultural Festival footage—featuring electrifying live sets by Stevie Wonder, Nina Simone, Sly and the Family Stone, and Mahalia Jackson.'
    },
    {
      id: 106,
      imdbId: 'tt1877514',
      title: 'The Vietnam War',
      format: 'MINI_SERIES',
      status: 'FINISHED',
      docStyle: 'Archival',
      source: 'ARCHIVAL_FILM',
      seasonYear: 2017,
      episodes: 10,
      duration: 100,
      averageScore: 92,
      popularity: 94000,
      countryOfOrigin: 'US',
      studio: 'Florentine Films',
      platforms: ['pbs', 'prime'],
      genres: ['History & War', 'Society & Politics'],
      tags: [['Archival Footage', 99], ['Cold War & Espionage', 94], ['Political Exposé', 90], ['1970s Era', 92]],
      staff: [{ role: 'Director', name: 'Ken Burns' }, { role: 'Director', name: 'Lynn Novick' }],
      trailerId: '1861922036',
      description: 'Over ten immersive episodes, Ken Burns and Lynn Novick present testimonies from nearly 80 witnesses—American soldiers, anti-war protesters, and North and South Vietnamese fighters—to tell the full history of the Vietnam War.'
    },
    {
      id: 107,
      imdbId: 'tt8420184',
      title: 'The Last Dance',
      format: 'MINI_SERIES',
      status: 'FINISHED',
      docStyle: 'Archival',
      source: 'ARCHIVAL_FILM',
      seasonYear: 2020,
      episodes: 10,
      duration: 50,
      averageScore: 91,
      popularity: 182000,
      countryOfOrigin: 'US',
      studio: 'ESPN Films (30 for 30)',
      platforms: ['netflix', 'hulu'],
      genres: ['Sports & Adventure', 'Biography & Portrait'],
      tags: [['Archival Footage', 98], ['1990s Era', 97], ['Biographical Portrait', 95]],
      staff: [{ role: 'Director', name: 'Jason Hehir' }],
      trailerId: 'JQk2hJs2ToA',
      description: 'Drawing on 500 hours of never-before-seen 1997–98 locker room film, this ten-part ESPN/Netflix event chronicles Michael Jordan and the Chicago Bulls’ quest for a sixth NBA championship.'
    },
    {
      id: 108,
      imdbId: 'tt1772925',
      title: 'Jiro Dreams of Sushi',
      format: 'FEATURE_DOC',
      status: 'FINISHED',
      docStyle: 'Observational',
      source: 'VERITE_FIELD',
      seasonYear: 2011,
      episodes: 1,
      duration: 81,
      averageScore: 86,
      popularity: 102000,
      countryOfOrigin: 'US',
      studio: 'Magnolia Pictures',
      platforms: ['hulu', 'prime', 'tubi'],
      genres: ['Food & Culture', 'Biography & Portrait'],
      tags: [['Culinary & Travel', 99], ['Biographical Portrait', 96], ['Art & Architecture', 86], ['Urban Life', 84]],
      staff: [{ role: 'Director', name: 'David Gelb' }],
      trailerId: 'I1UDS2kgqY8',
      description: 'A meditative portrait of 85-year-old sushi master Jiro Ono, whose ten-seat restaurant in a Tokyo subway station holds three Michelin stars, exploring his lifelong devotion to craft.'
    },
    {
      id: 109,
      imdbId: 'tt1629757',
      title: 'Fire of Love',
      format: 'FEATURE_DOC',
      status: 'FINISHED',
      docStyle: 'Archival',
      source: 'ARCHIVAL_FILM',
      seasonYear: 2022,
      episodes: 1,
      duration: 93,
      averageScore: 86,
      popularity: 68000,
      countryOfOrigin: 'US',
      studio: 'National Geographic',
      platforms: ['disney', 'hulu'],
      genres: ['Science & Space', 'Biography & Portrait', 'Nature & Wildlife'],
      tags: [['Archival Footage', 98], ['Biographical Portrait', 95], ['Sundance / Festival Hit', 95], ['1970s Era', 86], ['1980s Era', 88]],
      staff: [{ role: 'Director', name: 'Sara Dosa' }, { role: 'Narrator', name: 'Miranda July' }],
      trailerId: 'oMArx64RBO4',
      description: 'Assembled from dazzling 16mm footage shot by French volcanologists Katia and Maurice Krafft, Sara Dosa tells a poetic love story about two scientists who chased active eruptions across the planet.'
    },
    {
      id: 110,
      imdbId: 'tt13186482',
      title: '20 Days in Mariupol',
      format: 'FEATURE_DOC',
      status: 'FINISHED',
      docStyle: 'Observational',
      source: 'JOURNALISM',
      seasonYear: 2023,
      episodes: 1,
      duration: 95,
      averageScore: 91,
      popularity: 72000,
      countryOfOrigin: 'UA',
      studio: 'PBS / American Experience',
      platforms: ['pbs', 'youtube', 'prime'],
      genres: ['History & War', 'Society & Politics'],
      tags: [['Investigative Journalism', 99], ['Human Rights', 99], ['Academy Award Winner', 98], ['Sundance / Festival Hit', 95]],
      staff: [{ role: 'Director', name: 'Mstyslav Chernov' }],
      trailerId: '7OEjFgJHVJU',
      description: 'Associated Press video journalist Mstyslav Chernov and his team remain trapped as the last international reporters inside besieged Mariupol during the opening weeks of Russia’s 2022 invasion of Ukraine.'
    },
    {
      id: 111,
      imdbId: 'tt6333060',
      title: 'Icarus',
      format: 'FEATURE_DOC',
      status: 'FINISHED',
      docStyle: 'Investigative',
      source: 'JOURNALISM',
      seasonYear: 2017,
      episodes: 1,
      duration: 121,
      averageScore: 86,
      popularity: 92000,
      countryOfOrigin: 'US',
      studio: 'Netflix',
      platforms: ['netflix'],
      genres: ['Sports & Adventure', 'Investigative & Crime', 'Society & Politics'],
      tags: [['Corporate Whistleblower', 99], ['Academy Award Winner', 96], ['Cold War & Espionage', 90], ['Investigative Journalism', 95], ['Sundance / Festival Hit', 93]],
      staff: [{ role: 'Director', name: 'Bryan Fogel' }],
      trailerId: 'qXoRdSTrR-4',
      description: 'When amateur cyclist Bryan Fogel sets out to test doping protocols with Russian lab chief Grigory Rodchenkov, the experiment pivots into a geopolitical thriller exposing Russia’s state-sponsored Olympic doping program.'
    },
    {
      id: 112,
      imdbId: 'tt5895028',
      title: '13th',
      format: 'FEATURE_DOC',
      status: 'FINISHED',
      docStyle: 'Essay',
      source: 'ARCHIVAL_FILM',
      seasonYear: 2016,
      episodes: 1,
      duration: 100,
      averageScore: 88,
      popularity: 106000,
      countryOfOrigin: 'US',
      studio: 'Netflix',
      platforms: ['netflix', 'youtube'],
      genres: ['Society & Politics', 'History & War'],
      tags: [['Social Justice', 99], ['Political Exposé', 96], ['Human Rights', 95], ['Archival Footage', 92]],
      staff: [{ role: 'Director', name: 'Ava DuVernay' }],
      trailerId: 'krfcq5pF8u8',
      description: 'Ava DuVernay traces the 13th Amendment’s loophole from post-Civil War convict leasing through the War on Drugs to modern private prisons, revealing the architecture of mass incarceration in America.'
    }
  ];

  // Merge expanded catalog (catalog-data.js) deduplicating by normalized title
  const rawMerged = [];
  const seenRawTitles = new Set();
  for (const item of [...RAW_DOC_CATALOG, ...(Array.isArray(global.DOCFINDER_EXTRA_CATALOG) ? global.DOCFINDER_EXTRA_CATALOG : [])]) {
    if (!item || !item.title) continue;
    const nk = String(item.title).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenRawTitles.has(nk)) continue;
    seenRawTitles.add(nk);
    rawMerged.push(item);
  }

  // Normalize raw documentary catalog into unified media objects compatible across all 3 pages
  const CANONICAL_DOC_LIST = rawMerged.map(item => {
    const primaryPlat = PLATFORM_BY_ID[item.platforms?.[0]] || PLATFORM_CONFIG[0];
    const hasExplicitCover = Boolean(item.cover && /^https?:\/\//i.test(item.cover));
    const posterUri = hasExplicitCover
      ? item.cover
      : makeDocPosterDataUri(item.title, `${item.studio} · ${item.seasonYear}`, primaryPlat.color, (item.format === 'FEATURE_DOC' ? 'FEATURE DOC' : 'DOCUSERIES'));
    const normKey = String(item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const hasVerified = Boolean(global.DOCFINDER_STREAMING_LINKS && Object.prototype.hasOwnProperty.call(global.DOCFINDER_STREAMING_LINKS, normKey));
    const directMap = hasVerified ? (global.DOCFINDER_STREAMING_LINKS[normKey] || {}) : {};
    const matchedPlats = Array.from(new Set([
      ...(hasVerified ? Object.keys(directMap) : []),
      ...(item.platforms || [])
    ])).filter(pid => Boolean(PLATFORM_BY_ID[pid]));

    const extLinks = [];
    if (item.imdbId) {
      extLinks.push({ site: 'IMDb', url: `https://www.imdb.com/title/${item.imdbId}/`, type: 'INFO' });
    }
    for (const [pid, directUrl] of Object.entries(directMap)) {
      const p = PLATFORM_BY_ID[pid];
      if (p && directUrl) {
        extLinks.push({ site: p.name, platformId: pid, url: directUrl, isDirect: !/search/i.test(directUrl), type: 'STREAMING' });
      }
    }

    return {
      id: item.id,
      idMal: item.id,
      imdbId: item.imdbId || '',
      imdbRating: item.imdbRating || null,
      imdbVotes: item.imdbVotes || null,
      _needsPosterHydration: !hasExplicitCover,
      countryOfOrigin: item.countryOfOrigin || 'US',
      source: item.source || 'ARCHIVAL_FILM',
      docStyle: item.docStyle || 'Observational',
      title: {
        english: item.title,
        romaji: item.title,
        native: item.studio || ''
      },
      coverImage: {
        large: posterUri,
        medium: posterUri,
        color: primaryPlat.color
      },
      format: item.format || 'DOCUSERIES',
      status: item.status || 'FINISHED',
      episodes: item.episodes || 1,
      duration: item.duration || 52,
      season: 'ARCHIVE',
      seasonYear: item.seasonYear || 2020,
      averageScore: item.averageScore || 86,
      meanScore: item.averageScore || 86,
      popularity: item.popularity || 75000,
      favourites: Math.round((item.popularity || 50000) / 12),
      genres: item.genres || ['Society & Politics'],
      isAdult: false,
      description: item.description || '',
      trailer: item.trailerId ? { id: item.trailerId, site: 'youtube', thumbnail: `https://i.ytimg.com/vi/${item.trailerId}/hqdefault.jpg` } : null,
      studios: {
        nodes: [{ id: item.id * 10, name: item.studio || 'Independent Documentary' }]
      },
      tags: (item.tags || []).map(([name, rank]) => ({
        name,
        rank: rank || 80,
        isMediaSpoiler: false,
        isGeneralSpoiler: false
      })),
      externalLinks: extLinks,
      _verifiedStreaming: hasVerified,
      _matchedPlatforms: matchedPlats,
      nextAiringEpisode: item.nextAiringEpisode || null,
      relations: { edges: [] },
      characters: { edges: [] },
      staff: {
        edges: (item.staff || []).map((st, idx) => ({
          role: st.role,
          node: { id: item.id * 100 + idx, name: { full: st.name } }
        }))
      }
    };
  });

  const usedDocIds = new Set(CANONICAL_DOC_LIST.map(m => m.id));
  function allocateUniqueId(preferred) {
    let id = Number(preferred) || 100000;
    while (usedDocIds.has(id)) id++;
    usedDocIds.add(id);
    return id;
  }

  // Merge IMDb + TVMaze Bulk Documentary Dataset Index (imdb-catalog.js)
  if (Array.isArray(global.DOCFINDER_IMDB_CATALOG)) {
    const byNormTitle = new Map(
      CANONICAL_DOC_LIST.map(m => [String(m.title?.english || '').toLowerCase().replace(/[^a-z0-9]/g, ''), m])
    );
    for (const row of global.DOCFINDER_IMDB_CATALOG) {
      if (!row || !row.title) continue;
      const rawImdbId = String(row.imdbId || '');
      const realImdbId = /^tt\d+$/i.test(rawImdbId) ? rawImdbId : '';
      const normKey = String(row.title).toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = byNormTitle.get(normKey);
      if (existing) {
        if (realImdbId) existing.imdbId = realImdbId;
        if (row.imdbRating) existing.imdbRating = row.imdbRating;
        if (row.imdbVotes) existing.imdbVotes = row.imdbVotes;
        if (row.rt) existing.rottenTomatoes = row.rt;
        if (row.rated) existing.mpaaRated = row.rated;
        if (row.poster && String(existing.coverImage?.large || '').startsWith('data:image/svg+xml')) {
          existing.coverImage = { large: row.poster, medium: row.poster, color: existing.coverImage?.color || '#0ea5e9' };
          existing._needsPosterHydration = false;
        }
        continue;
      }
      const isMini = row.type === 'tvMiniSeries';
      const isTv = row.type === 'tvSeries' || isMini;
      const numericSeed = parseInt(rawImdbId.replace(/\D/g, ''), 10) || (CANONICAL_DOC_LIST.length + 1);
      const id = allocateUniqueId(3000000 + (numericSeed % 900000));
      const low = (row.title + ' ' + (row.plot || '')).toLowerCase();
      const docStyle = /investig|expos|fraud|murder|corrupt|scandal/.test(low)
        ? 'Investigative'
        : /archiv|history|war|196|197|198/.test(low)
          ? 'Archival'
          : 'Observational';

      const inferredTags = [];
      if (/ocean|whale|penguin|nature|wildlife|gorilla|planet|earth/.test(low)) inferredTags.push({ name: 'Deep Ocean & Wildlife', rank: 92 });
      if (/space|cosmos|physics|cern|mars|moon|telescope|universe/.test(low)) inferredTags.push({ name: 'Space Exploration', rank: 92 });
      if (/war|wwii|holocaust|aleppo|syria|afghanistan|vietnam/.test(low)) inferredTags.push({ name: 'World War II', rank: 86 });
      if (/music|band|concert|dylan|stones|punk|country|cuban|jazz|rock/.test(low)) inferredTags.push({ name: 'Music History', rank: 92 });
      if (/climate|environment|polar|glacier|ice|forest|landfill/.test(low)) inferredTags.push({ name: 'Climate & Conservation', rank: 90 });
      if (/food|sushi|fast food|agriculture|chef|culinary/.test(low)) inferredTags.push({ name: 'Culinary & Travel', rank: 90 });
      if (/investig|expos|journalist|whistleblower|scandal|corporation/.test(low)) inferredTags.push({ name: 'Investigative Journalism', rank: 88 });
      if (/rights|strike|miners|homeless|prison|justice/.test(low)) inferredTags.push({ name: 'Social Justice', rank: 88 });
      if (row.year >= 1970 && row.year < 1980) inferredTags.push({ name: '1970s Era', rank: 86 });
      else if (row.year >= 1980 && row.year < 1990) inferredTags.push({ name: '1980s Era', rank: 86 });
      else if (row.year >= 1990 && row.year < 2000) inferredTags.push({ name: '1990s Era', rank: 86 });
      if (!inferredTags.length) inferredTags.push({ name: 'Cinema Verité', rank: 84 });

      const bakedUrls = (global.DOCFINDER_STREAMING_LINKS && global.DOCFINDER_STREAMING_LINKS[normKey]) || {};
      const rowPlatforms = Array.from(new Set([...(row.platforms || []), ...Object.keys(bakedUrls)])).filter(pid => Boolean(PLATFORM_BY_ID[pid]));
      const primaryPlat = rowPlatforms.length ? PLATFORM_BY_ID[rowPlatforms[0]] : null;
      const hasPoster = Boolean(row.poster && /^https?:\/\//i.test(row.poster));
      const posterUri = hasPoster
        ? row.poster
        : makeDocPosterDataUri(row.title, `IMDb ★ ${row.imdbRating || '—'} · ${row.year}`, primaryPlat?.color || '#0ea5e9', isTv ? 'DOCUSERIES' : 'FEATURE DOC');
      const directors = row.director ? row.director.split(',').map(s => s.trim()).filter(Boolean) : [];
      const streamExtLinks = Object.entries(bakedUrls).map(([pid, directUrl]) => {
        const p = PLATFORM_BY_ID[pid];
        if (!p || !directUrl) return null;
        return { site: p.name, platformId: pid, url: directUrl, isDirect: !/search/i.test(directUrl), type: 'STREAMING' };
      }).filter(Boolean);

      const extLinks = [];
      if (realImdbId) extLinks.push({ site: 'IMDb', url: `https://www.imdb.com/title/${realImdbId}/`, type: 'INFO' });
      extLinks.push(...streamExtLinks);

      const node = {
        id,
        idMal: id,
        imdbId: realImdbId,
        imdbRating: row.imdbRating,
        imdbVotes: row.imdbVotes,
        rottenTomatoes: row.rt || '',
        mpaaRated: row.rated || '',
        _needsPosterHydration: !hasPoster,
        countryOfOrigin: 'US',
        source: 'ARCHIVAL_FILM',
        docStyle,
        title: { english: row.title, romaji: row.title, native: realImdbId ? `IMDb ${realImdbId}` : (row.network || 'Documentary') },
        coverImage: { large: posterUri, medium: posterUri, color: primaryPlat?.color || '#0ea5e9' },
        format: isMini ? 'MINI_SERIES' : (isTv ? 'DOCUSERIES' : 'FEATURE_DOC'),
        status: 'FINISHED',
        episodes: isTv ? null : 1,
        duration: row.runtime || (isTv ? 50 : 95),
        season: 'IMDB',
        seasonYear: row.year,
        averageScore: Math.round((row.imdbRating || 7.6) * 10),
        meanScore: Math.round((row.imdbRating || 7.6) * 10),
        popularity: row.imdbVotes || 5000,
        favourites: Math.round((row.imdbVotes || 5000) / 10),
        genres: row.genres && row.genres.length ? row.genres : ['Society & Politics'],
        isAdult: false,
        description: row.plot || `${realImdbId ? 'IMDb-verified ' : ''}${isTv ? 'Documentary Series' : 'Documentary Feature Film'} (${row.year}) rated ★ ${row.imdbRating || '—'}/10 across ${Number(row.imdbVotes || 0).toLocaleString()} votes.`,
        trailer: null,
        studios: { nodes: [{ id: id + 1, name: row.network || (primaryPlat ? primaryPlat.name : 'IMDb Documentary Index') }] },
        tags: inferredTags,
        externalLinks: extLinks,
        _verifiedStreaming: rowPlatforms.length > 0,
        _matchedPlatforms: rowPlatforms,
        nextAiringEpisode: null,
        relations: { edges: [] },
        characters: { edges: [] },
        staff: {
          edges: directors.map((dName, dIdx) => ({
            role: 'Director',
            node: { id: id * 10 + dIdx, name: { full: dName } }
          }))
        }
      };
      CANONICAL_DOC_LIST.push(node);
      byNormTitle.set(normKey, node);
    }
  }

  // Merge PBS Flagship Documentary Films (pbs-catalog.js: FRONTLINE, Independent Lens, POV, American Experience, NOVA, Nature)
  if (Array.isArray(global.DOCFINDER_PBS_CATALOG)) {
    const byNormTitle = new Map(
      CANONICAL_DOC_LIST.map(m => [String(m.title?.english || '').toLowerCase().replace(/[^a-z0-9]/g, ''), m])
    );
    for (const row of global.DOCFINDER_PBS_CATALOG) {
      if (!row || !row.title) continue;
      const normKey = String(row.title).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (byNormTitle.has(normKey)) continue;
      const id = allocateUniqueId(row.id || 400001);
      const hasPoster = Boolean(row.poster && /^https?:\/\//i.test(row.poster));
      const posterUri = hasPoster
        ? row.poster
        : makeDocPosterDataUri(row.title, `PBS ${row.strand} · ${row.year}`, '#2dd4bf', 'PBS DOC');
      const node = {
        id,
        idMal: id,
        imdbId: '',
        imdbRating: null,
        imdbVotes: null,
        _needsPosterHydration: !hasPoster,
        countryOfOrigin: 'US',
        source: row.strand === 'NOVA' ? 'SCIENCE_ARCHIVE' : row.strand === 'Nature' ? 'NATURAL_HISTORY' : row.strand === 'FRONTLINE' ? 'JOURNALISM' : 'ARCHIVAL_FILM',
        docStyle: row.style || 'Observational',
        title: { english: row.title, romaji: row.title, native: `PBS ${row.strand}` },
        coverImage: { large: posterUri, medium: posterUri, color: '#2dd4bf' },
        format: 'FEATURE_DOC',
        status: 'FINISHED',
        episodes: 1,
        duration: row.runtime || 56,
        season: 'PBS',
        seasonYear: row.year || 2022,
        averageScore: 84,
        meanScore: 84,
        popularity: 28000,
        favourites: 2400,
        genres: [row.genre || 'Society & Politics'],
        isAdult: false,
        description: row.plot || `PBS ${row.strand} documentary presentation (${row.year || ''}).`,
        trailer: null,
        studios: { nodes: [{ id: id + 1, name: `PBS (${row.strand})` }] },
        tags: [
          { name: row.strand === 'FRONTLINE' ? 'Investigative Journalism' : row.strand === 'NOVA' ? 'Space Exploration' : row.strand === 'Nature' ? 'Deep Ocean & Wildlife' : row.strand === 'American Experience' ? 'Archival Footage' : 'Cinema Verité', rank: 90 }
        ],
        externalLinks: row.pbsUrl ? [{ site: 'PBS / Kanopy', platformId: 'pbs', url: row.pbsUrl, isDirect: false, type: 'STREAMING' }] : [],
        _verifiedStreaming: true,
        _matchedPlatforms: ['pbs'],
        nextAiringEpisode: null,
        relations: { edges: [] },
        characters: { edges: [] },
        staff: { edges: [] }
      };
      CANONICAL_DOC_LIST.push(node);
      byNormTitle.set(normKey, node);
    }
  }

  // Merge Official Free Long-Form YouTube Documentary Channels (youtube-catalog.js)
  if (Array.isArray(global.DOCFINDER_YOUTUBE_CATALOG)) {
    const byNormTitle = new Map(
      CANONICAL_DOC_LIST.map(m => [String(m.title?.english || '').toLowerCase().replace(/[^a-z0-9]/g, ''), m])
    );
    for (const row of global.DOCFINDER_YOUTUBE_CATALOG) {
      if (!row || !row.title || !row.videoId) continue;
      const normKey = String(row.title).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (byNormTitle.has(normKey)) continue;
      const id = allocateUniqueId(row.id || 600001);
      const plats = row.isPbs ? ['youtube', 'pbs'] : ['youtube'];
      const node = {
        id,
        idMal: id,
        imdbId: '',
        imdbRating: null,
        imdbVotes: null,
        _needsPosterHydration: false,
        _youtubeVideoId: row.videoId,
        countryOfOrigin: 'US',
        source: 'YOUTUBE_DOC',
        docStyle: row.style || 'Investigative',
        title: { english: row.title, romaji: row.title, native: row.channel || 'YouTube Documentary' },
        coverImage: { large: row.poster, medium: row.poster, color: '#f87171' },
        format: 'FEATURE_DOC',
        status: 'FINISHED',
        episodes: 1,
        duration: 50,
        season: 'YOUTUBE',
        seasonYear: row.year || 2025,
        averageScore: 83,
        meanScore: 83,
        popularity: 24000,
        favourites: 2000,
        genres: [row.genre || 'Society & Politics'],
        isAdult: false,
        description: row.plot || `Full-length documentary from ${row.channel} on YouTube.`,
        trailer: { id: row.videoId, site: 'youtube', thumbnail: row.poster },
        studios: { nodes: [{ id: id + 1, name: row.channel || 'YouTube Documentary' }] },
        tags: [
          { name: row.style === 'Archival' ? 'Archival Footage' : row.style === 'Investigative' ? 'Investigative Journalism' : 'Cinema Verité', rank: 90 }
        ],
        externalLinks: [
          { site: 'YouTube', platformId: 'youtube', url: row.url, isDirect: true, type: 'STREAMING' }
        ],
        _verifiedStreaming: true,
        _matchedPlatforms: plats,
        nextAiringEpisode: null,
        relations: { edges: [] },
        characters: { edges: [] },
        staff: { edges: [] }
      };
      CANONICAL_DOC_LIST.push(node);
      byNormTitle.set(normKey, node);
    }
  }

  const CANONICAL_BY_ID = new Map(CANONICAL_DOC_LIST.map(m => [m.id, m]));

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function stripHtml(html) {
    if (!html) return '';
    return String(html)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/&quot;/g, '"')
      .replace(/&#039;|&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function getDisplayTitle(media) {
    if (!media) return 'Untitled Documentary';
    if (typeof media.title === 'string') return media.title;
    return media.title?.english || media.title?.romaji || media.title?.native || 'Untitled Documentary';
  }

  function safeUrl(rawUrl, fallback = '#') {
    if (!rawUrl || typeof rawUrl !== 'string') return fallback;
    const trimmed = rawUrl.trim();
    if (!trimmed) return fallback;
    if (trimmed.startsWith('./') || trimmed.startsWith('/') || trimmed.startsWith('data:image/svg+xml')) {
      return trimmed.replace(/^data:image\/svg\+xml;utf8,/i, 'data:image/svg+xml;charset=utf-8,');
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.href;
      }
    } catch {}
    return fallback;
  }

  function getCover(media) {
    if (!media) return '';
    const raw = typeof media.cover === 'string' && media.cover
      ? media.cover
      : (media.coverImage?.large || media.coverImage?.extraLarge || media.coverImage?.medium || '');
    if (raw && /^https?:\/\//i.test(raw)) {
      return raw.replace(/^http:\/\//i, 'https://');
    }
    if (raw && raw.startsWith('data:image/svg+xml')) {
      return raw.replace(/^data:image\/svg\+xml;utf8,/i, 'data:image/svg+xml;charset=utf-8,');
    }
    return makeDocPosterDataUri(getDisplayTitle(media), media.seasonYear || 'DOCUMENTARY', '#0ea5e9', media.format === 'FEATURE_DOC' ? 'FEATURE DOC' : 'DOCUSERIES');
  }

  if (typeof global.addEventListener === 'function') {
    global.addEventListener('error', (ev) => {
      const el = ev.target;
      if (el && el.tagName === 'IMG' && !el.dataset.fallbackApplied) {
        el.dataset.fallbackApplied = '1';
        el.src = makeDocPosterDataUri(el.alt || 'Documentary', 'NON-FICTION FILM', '#0ea5e9', 'DOCUMENTARY');
      }
    }, true);
  }

  function normalizeStatus(status) {
    if (!status) return 'Watchlist';
    const s = String(status).trim().toLowerCase();
    if (s === 'paused' || s === 'on hold') return 'On Hold';
    if (s === 'current' || s === 'watching' || s === 'repeating') return 'Watching';
    if (s === 'planning' || s === 'plan to watch' || s === 'watchlist') return 'Watchlist';
    if (s === 'completed' || s === 'watched') return 'Watched';
    if (s === 'dropped' || s === 'abandoned') return 'Dropped';
    return WATCHLIST_STATUSES.find(w => w.toLowerCase() === s) || 'Watchlist';
  }

  function formatCompactNumber(n) {
    if (!n && n !== 0) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function formatRelativeCountdown(unixSec) {
    const diffSec = unixSec - Math.floor(Date.now() / 1000);
    const abs = Math.abs(diffSec);
    const hrs = Math.floor(abs / 3600);
    const mins = Math.floor((abs % 3600) / 60);
    if (diffSec <= 0) {
      if (hrs < 1) return `${Math.max(1, mins)}m ago`;
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ${hrs % 24}h ago`;
    }
    if (hrs < 1) return `in ${Math.max(1, mins)}m`;
    if (hrs < 24) return `in ${hrs}h ${mins}m`;
    const days = Math.floor(hrs / 24);
    return `in ${days}d ${hrs % 24}h`;
  }

  function toast(message, type = 'info', duration = 3400) {
    let stack = document.getElementById('af-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'af-toast-stack';
      stack.className = 'toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s';
      setTimeout(() => el.remove(), 260);
    }, duration);
  }

  function encodeBase64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function decodeBase64Utf8(b64) {
    const binary = atob(b64.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  // --------------------------------------------------------------------------
  // Shared IndexedDB Cache (DocFinderCacheDB v2: apiCache + vectors)
  // --------------------------------------------------------------------------
  let dbPromise = null;

  function openCacheDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (!('indexedDB' in global)) {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (ev) => {
          const db = ev.target.result;
          if (!db.objectStoreNames.contains('apiCache')) {
            db.createObjectStore('apiCache', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('vectors')) {
            db.createObjectStore('vectors', { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return dbPromise;
  }

  function isEmptyCachePayload(data) {
    if (data == null) return true;
    if (Array.isArray(data) && data.length === 0) return true;
    if (typeof data === 'object' && Object.keys(data).length === 0) return true;
    return false;
  }

  async function cacheGet(key) {
    const db = await openCacheDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('apiCache', 'readonly');
        const req = tx.objectStore('apiCache').get(key);
        req.onsuccess = () => {
          const rec = req.result;
          if (!rec) return resolve(null);
          if (rec.ttl && Date.now() - rec.ts > rec.ttl) return resolve(null);
          resolve(rec.data);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function cacheSet(key, data, ttl = TTL_DYNAMIC) {
    if (isEmptyCachePayload(data)) return false;
    const db = await openCacheDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('apiCache', 'readwrite');
        tx.objectStore('apiCache').put({ key, data, ts: Date.now(), ttl });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  async function vectorGet(id) {
    const db = await openCacheDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('vectors', 'readonly');
        const req = tx.objectStore('vectors').get(Number(id));
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function vectorSet(id, vector, textHash) {
    if (!vector || !vector.length) return false;
    const db = await openCacheDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('vectors', 'readwrite');
        tx.objectStore('vectors').put({
          id: Number(id),
          vector: Array.from(vector),
          textHash: textHash || '',
          ts: Date.now()
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  async function cacheStats() {
    const db = await openCacheDB();
    if (!db) return { apiCount: 0, vectorCount: 0 };
    const countStore = (name) => new Promise((resolve) => {
      try {
        const tx = db.transaction(name, 'readonly');
        const req = tx.objectStore(name).count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
    const [apiCount, vectorCount] = await Promise.all([countStore('apiCache'), countStore('vectors')]);
    return { apiCount, vectorCount };
  }

  async function cacheClear(clearVectors = false) {
    const db = await openCacheDB();
    if (!db) return;
    const stores = clearVectors ? ['apiCache', 'vectors'] : ['apiCache'];
    await Promise.all(stores.map((name) => new Promise((resolve) => {
      try {
        const tx = db.transaction(name, 'readwrite');
        tx.objectStore(name).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    })));
  }

  // --------------------------------------------------------------------------
  // Shared localStorage State + Non-Destructive Save + Tombstone Conflict Merge
  // --------------------------------------------------------------------------
  const stateListeners = new Set();
  const syncStatusListeners = new Set();
  const streamingFilterListeners = new Set();
  let currentSyncStatus = { state: 'local', label: 'Local Storage' };
  let gistPushTimer = null;

  function defaultState() {
    return {
      version: 2,
      updatedAt: 0,
      dirtyForGist: false,
      watchlist: {},
      tombstones: {},
      overrides: {},
      settings: {
        tmdbKey: '',
        omdbKey: '',
        youtubeKey: '',
        gistToken: '',
        gistId: '',
        gistFilename: GIST_FILENAME,
        gistAutoSync: true,
        lastGistSync: 0,
        anilistUsername: '',
        streamingFilter: []
      }
    };
  }

  function readRawState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function sanitizeState(raw) {
    const base = defaultState();
    const out = { ...raw };
    out.version = 2;
    out.updatedAt = Number(raw.updatedAt) || 0;
    out.dirtyForGist = Boolean(raw.dirtyForGist);
    out.watchlist = {};
    if (raw.watchlist && typeof raw.watchlist === 'object') {
      for (const [k, item] of Object.entries(raw.watchlist)) {
        if (!item || typeof item !== 'object') continue;
        const id = Number(item.id || k);
        if (!id) continue;
        out.watchlist[id] = {
          id,
          title: item.title || 'Untitled Documentary',
          cover: safeUrl(item.cover || '', ''),
          format: item.format || '',
          docStyle: item.docStyle || '',
          episodes: item.episodes ?? null,
          averageScore: item.averageScore ?? null,
          popularity: item.popularity ?? null,
          seasonYear: item.seasonYear ?? null,
          genres: Array.isArray(item.genres) ? item.genres : [],
          status: normalizeStatus(item.status),
          rating: Number(item.rating) || 0,
          progress: Math.max(0, Number(item.progress) || 0),
          notes: typeof item.notes === 'string' ? item.notes : '',
          dubOverride: item.dubOverride || '',
          dubLag: (item.dubLag === '' || item.dubLag == null) ? null : Math.max(0, Number(item.dubLag)),
          dubDay: item.dubDay !== undefined && item.dubDay !== null ? String(item.dubDay) : '',
          customPlatforms: Array.isArray(item.customPlatforms) ? item.customPlatforms : [],
          customFreeWithAds: Boolean(item.customFreeWithAds),
          updatedAt: Number(item.updatedAt) || out.updatedAt || 0
        };
      }
    }
    out.tombstones = (raw.tombstones && typeof raw.tombstones === 'object') ? { ...raw.tombstones } : {};
    out.overrides = {};
    if (raw.overrides && typeof raw.overrides === 'object') {
      for (const [k, ovr] of Object.entries(raw.overrides)) {
        if (!ovr || typeof ovr !== 'object') continue;
        const id = Number(ovr.id || k);
        if (!id) continue;
        out.overrides[id] = {
          ...ovr,
          status: ovr.status ? normalizeStatus(ovr.status) : undefined,
          rating: ovr.rating !== undefined ? (Number(ovr.rating) || 0) : undefined,
          progress: ovr.progress !== undefined ? Math.max(0, Number(ovr.progress) || 0) : undefined,
          notes: typeof ovr.notes === 'string' ? ovr.notes : undefined,
          dubOverride: ovr.dubOverride || '',
          dubLag: (ovr.dubLag === '' || ovr.dubLag == null) ? null : Math.max(0, Number(ovr.dubLag)),
          dubDay: ovr.dubDay !== undefined && ovr.dubDay !== null ? String(ovr.dubDay) : '',
          customPlatforms: Array.isArray(ovr.customPlatforms) ? ovr.customPlatforms : [],
          customFreeWithAds: Boolean(ovr.customFreeWithAds),
          updatedAt: Number(ovr.updatedAt) || out.updatedAt || 0
        };
      }
    }

    const legacyGist = raw.gistConfig || raw.gist || {};
    out.settings = {
      ...base.settings,
      ...(raw.settings || {}),
      gistToken: (raw.settings?.gistToken ?? legacyGist.token ?? ''),
      gistId: (raw.settings?.gistId ?? legacyGist.gistId ?? legacyGist.id ?? ''),
      gistUser: raw.settings?.gistUser || '',
      gistUrl: safeUrl(raw.settings?.gistUrl || '', ''),
      gistFilename: GIST_FILENAME,
      gistAutoSync: raw.settings?.gistAutoSync !== undefined ? Boolean(raw.settings.gistAutoSync) : true,
      tmdbKey: raw.settings?.tmdbKey ?? raw.tmdbKey ?? '',
      omdbKey: raw.settings?.omdbKey ?? '',
      youtubeKey: raw.settings?.youtubeKey ?? '',
      lastGistSync: Number(raw.settings?.lastGistSync || 0),
      anilistUsername: raw.settings?.anilistUsername || '',
      streamingFilter: Array.isArray(raw.settings?.streamingFilter)
        ? Array.from(new Set(raw.settings.streamingFilter.filter(pid => pid === 'free' || Boolean(PLATFORM_BY_ID[pid]))))
        : []
    };
    return out;
  }

  function getState() {
    return sanitizeState(readRawState());
  }

  function saveState(nextState, { triggerGist = false, clearDirty = false, notify = true } = {}) {
    const existingRaw = readRawState();
    const dirtyFlag = clearDirty ? false : (triggerGist ? true : Boolean(nextState.dirtyForGist ?? existingRaw.dirtyForGist));
    const merged = {
      ...existingRaw,
      ...nextState,
      version: 2,
      updatedAt: Date.now(),
      dirtyForGist: dirtyFlag
    };
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error('Failed saving state:', e);
      toast('Storage quota exceeded — consider exporting a JSON backup.', 'error');
    }
    const clean = sanitizeState(merged);
    if (notify) {
      stateListeners.forEach(fn => {
        try { fn(clean); } catch (err) { console.error(err); }
      });
    }
    updateNavBadges(clean);
    if (triggerGist) {
      scheduleGistAutoPush();
    }
    return clean;
  }

  function onStateChange(fn) {
    stateListeners.add(fn);
    return () => stateListeners.delete(fn);
  }

  function setSyncStatus(state, label) {
    currentSyncStatus = { state, label };
    syncStatusListeners.forEach(fn => {
      try { fn(currentSyncStatus); } catch {}
    });
    const pill = document.getElementById('af-sync-pill');
    if (pill) {
      pill.dataset.state = state;
      const textEl = pill.querySelector('.sync-label');
      if (textEl) textEl.textContent = label;
    }
  }

  function onSyncStatus(fn) {
    syncStatusListeners.add(fn);
    fn(currentSyncStatus);
    return () => syncStatusListeners.delete(fn);
  }

  global.addEventListener('storage', (ev) => {
    if (ev.key === STATE_KEY) {
      const clean = getState();
      updateNavBadges(clean);
      syncGlobalStreamingFilterBar();
      stateListeners.forEach(fn => {
        try { fn(clean); } catch (err) { console.error(err); }
      });
    }
  });

  function upsertWatchlistItem(media, patch = {}) {
    const state = getState();
    const id = Number(media?.id || patch.id);
    if (!id) return null;
    const prev = state.watchlist[id] || {};
    const prevOvr = state.overrides[id] || {};
    const now = Date.now();
    const nextItem = {
      id,
      title: getDisplayTitle(media) || prev.title || 'Untitled Documentary',
      cover: getCover(media) || prev.cover || '',
      format: media?.format || prev.format || '',
      docStyle: media?.docStyle || prev.docStyle || '',
      episodes: media?.episodes ?? prev.episodes ?? null,
      averageScore: media?.averageScore ?? prev.averageScore ?? null,
      popularity: media?.popularity ?? prev.popularity ?? null,
      seasonYear: media?.seasonYear ?? prev.seasonYear ?? null,
      genres: Array.isArray(media?.genres) && media.genres.length ? media.genres : (prev.genres || []),
      status: normalizeStatus(patch.status ?? prev.status ?? 'Watchlist'),
      rating: patch.rating !== undefined ? Number(patch.rating) : (prev.rating || 0),
      progress: patch.progress !== undefined ? Math.max(0, Number(patch.progress)) : (prev.progress || 0),
      notes: patch.notes !== undefined ? String(patch.notes) : (prev.notes || ''),
      dubOverride: patch.dubOverride !== undefined ? patch.dubOverride : (prev.dubOverride ?? prevOvr.dubOverride ?? ''),
      dubLag: patch.dubLag !== undefined
        ? ((patch.dubLag === '' || patch.dubLag == null) ? null : Math.max(0, Number(patch.dubLag)))
        : (prev.dubLag ?? prevOvr.dubLag ?? null),
      dubDay: patch.dubDay !== undefined
        ? String(patch.dubDay ?? '')
        : String(prev.dubDay ?? prevOvr.dubDay ?? ''),
      customPlatforms: patch.customPlatforms !== undefined ? patch.customPlatforms : (prev.customPlatforms ?? prevOvr.customPlatforms ?? []),
      customFreeWithAds: patch.customFreeWithAds !== undefined ? Boolean(patch.customFreeWithAds) : Boolean(prev.customFreeWithAds ?? prevOvr.customFreeWithAds),
      updatedAt: now
    };

    state.watchlist[id] = nextItem;
    delete state.tombstones[id];

    state.overrides[id] = {
      status: nextItem.status,
      rating: nextItem.rating,
      progress: nextItem.progress,
      notes: nextItem.notes,
      dubOverride: nextItem.dubOverride,
      dubLag: nextItem.dubLag,
      dubDay: nextItem.dubDay,
      customPlatforms: nextItem.customPlatforms,
      customFreeWithAds: nextItem.customFreeWithAds,
      updatedAt: now
    };

    saveState(state, { triggerGist: true });
    return nextItem;
  }

  function removeWatchlistItem(mediaId) {
    const state = getState();
    const id = Number(mediaId);
    if (!id) return;
    delete state.watchlist[id];
    state.tombstones[id] = Date.now();
    saveState(state, { triggerGist: true });
  }

  function updateOverrides(mediaId, patch = {}) {
    const state = getState();
    const id = Number(mediaId);
    if (!id) return;
    const now = Date.now();
    const prev = state.overrides[id] || {};
    const prevWl = state.watchlist[id] || {};
    const next = {
      status: patch.status !== undefined ? normalizeStatus(patch.status) : (prev.status ?? prevWl.status),
      rating: patch.rating !== undefined ? (Number(patch.rating) || 0) : (prev.rating ?? prevWl.rating),
      progress: patch.progress !== undefined ? Math.max(0, Number(patch.progress) || 0) : (prev.progress ?? prevWl.progress),
      notes: patch.notes !== undefined ? String(patch.notes) : (prev.notes ?? prevWl.notes),
      dubOverride: patch.dubOverride !== undefined ? patch.dubOverride : (prev.dubOverride || ''),
      dubLag: patch.dubLag !== undefined
        ? ((patch.dubLag === '' || patch.dubLag == null) ? null : Math.max(0, Number(patch.dubLag)))
        : (prev.dubLag ?? null),
      dubDay: patch.dubDay !== undefined ? String(patch.dubDay ?? '') : String(prev.dubDay ?? ''),
      customPlatforms: patch.customPlatforms !== undefined ? patch.customPlatforms : (prev.customPlatforms || []),
      customFreeWithAds: patch.customFreeWithAds !== undefined ? Boolean(patch.customFreeWithAds) : Boolean(prev.customFreeWithAds),
      updatedAt: now
    };
    state.overrides[id] = next;
    if (state.watchlist[id]) {
      state.watchlist[id] = {
        ...state.watchlist[id],
        status: next.status ?? state.watchlist[id].status,
        rating: next.rating ?? state.watchlist[id].rating,
        progress: next.progress ?? state.watchlist[id].progress,
        notes: next.notes ?? state.watchlist[id].notes,
        dubOverride: next.dubOverride,
        dubLag: next.dubLag,
        dubDay: next.dubDay,
        customPlatforms: next.customPlatforms,
        customFreeWithAds: next.customFreeWithAds,
        updatedAt: now
      };
    }
    saveState(state, { triggerGist: true });
  }

  function updateSettings(patch) {
    const state = getState();
    state.settings = {
      ...state.settings,
      ...patch,
      gistFilename: GIST_FILENAME
    };
    saveState(state, { triggerGist: false });
    if (state.settings.gistToken && state.settings.gistId) {
      setSyncStatus('synced', 'Gist Ready');
    } else {
      setSyncStatus('local', 'Local Storage');
    }
    return state.settings;
  }

  function mergeRemotePayload(remoteRaw) {
    const local = getState();
    const remote = sanitizeState(remoteRaw || {});
    const mergedWatchlist = {};
    const mergedTombstones = { ...local.tombstones };

    for (const [id, ts] of Object.entries(remote.tombstones || {})) {
      const nTs = Number(ts) || 0;
      if (!mergedTombstones[id] || nTs > mergedTombstones[id]) {
        mergedTombstones[id] = nTs;
      }
    }

    const allIds = new Set([
      ...Object.keys(local.watchlist),
      ...Object.keys(remote.watchlist)
    ]);

    for (const id of allIds) {
      const l = local.watchlist[id];
      const r = remote.watchlist[id];
      const tombTs = Number(mergedTombstones[id] || 0);

      let winner = null;
      if (l && r) {
        winner = (Number(r.updatedAt) || 0) > (Number(l.updatedAt) || 0) ? r : l;
      } else {
        winner = l || r;
      }
      const winTs = Number(winner?.updatedAt || 0);
      if (winner && winTs >= tombTs) {
        mergedWatchlist[id] = { ...winner, status: normalizeStatus(winner.status) };
        if (winTs > tombTs) delete mergedTombstones[id];
      }
    }

    const mergedOverrides = { ...local.overrides };
    for (const [id, rOvr] of Object.entries(remote.overrides || {})) {
      const lOvr = mergedOverrides[id];
      if (!lOvr || (Number(rOvr.updatedAt) || 0) > (Number(lOvr.updatedAt) || 0)) {
        mergedOverrides[id] = rOvr;
      }
    }

    local.watchlist = mergedWatchlist;
    local.tombstones = mergedTombstones;
    local.overrides = mergedOverrides;
    return local;
  }

  // --------------------------------------------------------------------------
  // Unified GitHub Gist Auto-Sync (docfinder-sync.json)
  // --------------------------------------------------------------------------
  function buildPortableSyncPayload(state, includeSecrets = false) {
    const payload = {
      version: 2,
      updatedAt: state.updatedAt || Date.now(),
      watchlist: state.watchlist,
      tombstones: state.tombstones,
      overrides: state.overrides
    };
    if (includeSecrets) {
      payload.settings = state.settings;
    }
    return payload;
  }

  async function gistPull({ silent = false } = {}) {
    const state = getState();
    const { gistToken, gistId } = state.settings;
    if (!gistToken || !gistId) {
      if (!silent) toast('Configure GitHub PAT & Gist ID first.', 'warn');
      return null;
    }
    const hadUnpushedLocalEdits = Boolean(state.dirtyForGist);
    setSyncStatus('syncing', 'Syncing...');
    try {
      const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
        headers: {
          Authorization: `Bearer ${gistToken}`,
          Accept: 'application/vnd.github+json'
        }
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const gist = await res.json();
      const fileObj = gist.files?.[GIST_FILENAME] || gist.files?.[LEGACY_GIST_FILENAME];
      if (!fileObj || !fileObj.content) {
        setSyncStatus('synced', 'Gist Synced');
        if (hadUnpushedLocalEdits) await gistPush({ silent: true });
        return state;
      }
      const remoteData = JSON.parse(fileObj.content);
      const remoteTs = Number(remoteData?.updatedAt) || 0;
      const localTs = Number(state.updatedAt) || 0;
      const merged = mergeRemotePayload(remoteData);
      merged.settings.lastGistSync = Date.now();
      saveState(merged, { triggerGist: false, clearDirty: !hadUnpushedLocalEdits });
      setSyncStatus('synced', 'Gist Synced');
      if (hadUnpushedLocalEdits || localTs > remoteTs) {
        await gistPush({ silent: true });
      }
      if (!silent) toast(`Pulled ${Object.keys(merged.watchlist).length} documentaries from Gist.`, 'success');
      return merged;
    } catch (err) {
      console.error('Gist pull error:', err);
      setSyncStatus('error', 'Sync Error');
      if (!silent) toast(`Gist pull failed: ${err.message}`, 'error');
      return null;
    }
  }

  async function gistPush({ silent = false } = {}) {
    const state = getState();
    const { gistToken, gistId } = state.settings;
    if (!gistToken || !gistId) {
      if (!silent) toast('Configure GitHub PAT & Gist ID first.', 'warn');
      return false;
    }
    setSyncStatus('syncing', 'Pushing...');
    try {
      const body = {
        description: 'DocFinder Web Suite — Synced Documentary Watchlist & Overrides',
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(buildPortableSyncPayload(state, false), null, 2)
          }
        }
      };
      const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${gistToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      state.settings.lastGistSync = Date.now();
      saveState(state, { triggerGist: false, clearDirty: true, notify: false });
      setSyncStatus('synced', 'Gist Synced');
      if (!silent) toast('Pushed Watchlist & overrides to Private Gist.', 'success');
      return true;
    } catch (err) {
      console.error('Gist push error:', err);
      setSyncStatus('error', 'Sync Error');
      if (!silent) toast(`Gist push failed: ${err.message}`, 'error');
      return false;
    }
  }

  async function gistCreateNew(token) {
    if (!token) {
      toast('Enter a GitHub Personal Access Token (gist scope) first.', 'warn');
      return null;
    }
    setSyncStatus('syncing', 'Creating Gist...');
    try {
      const state = getState();
      const res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: 'DocFinder Web Suite — Synced Documentary Watchlist & Overrides',
          public: false,
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(buildPortableSyncPayload(state, false), null, 2)
            }
          }
        })
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const created = await res.json();
      updateSettings({
        gistToken: token,
        gistId: created.id,
        gistUrl: created.html_url || `https://gist.github.com/${created.id}`,
        gistUser: created.owner?.login || state.settings.gistUser || '',
        gistAutoSync: true,
        lastGistSync: Date.now()
      });
      setSyncStatus('synced', 'Gist Synced');
      toast(`Created private Gist (${created.id.slice(0, 8)}...)!`, 'success');
      return created.id;
    } catch (err) {
      setSyncStatus('error', 'Sync Error');
      toast(`Could not create Gist: ${err.message}`, 'error');
      return null;
    }
  }

  async function gistConnectAndSetup(token, { autoCreate = true } = {}) {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) throw new Error('Paste a GitHub Personal Access Token (gist scope) first.');
    setSyncStatus('syncing', 'Verifying GitHub...');

    const headers = {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github+json'
    };

    const userRes = await fetch('https://api.github.com/user', { headers });
    if (!userRes.ok) {
      setSyncStatus('error', 'Auth Failed');
      throw new Error(userRes.status === 401 ? 'Invalid or expired GitHub token.' : `GitHub auth error (${userRes.status})`);
    }
    const user = await userRes.json();
    const login = user.login || '';

    const gistsRes = await fetch('https://api.github.com/gists?per_page=100', { headers });
    let existing = null;
    if (gistsRes.ok) {
      const list = await gistsRes.json();
      if (Array.isArray(list)) {
        existing = list.find(g => g.files?.[GIST_FILENAME] || g.files?.[LEGACY_GIST_FILENAME]);
      }
    }

    if (existing) {
      updateSettings({
        gistToken: cleanToken,
        gistId: existing.id,
        gistUser: login,
        gistUrl: existing.html_url || `https://gist.github.com/${login}/${existing.id}`,
        gistAutoSync: true
      });
      const merged = await gistPull({ silent: true });
      await gistPush({ silent: true });
      return { mode: 'connected_existing', login, gistId: existing.id, htmlUrl: existing.html_url, count: Object.keys(merged?.watchlist || getState().watchlist).length };
    }

    if (!autoCreate) {
      updateSettings({ gistToken: cleanToken, gistUser: login });
      return { mode: 'verified_only', login, gistId: '', htmlUrl: '' };
    }

    const createdId = await gistCreateNew(cleanToken);
    if (!createdId) throw new Error('Token verified, but creating the private Gist failed. Confirm the "gist" scope is checked.');
    updateSettings({ gistUser: login });
    const st = getState();
    return {
      mode: 'created_new',
      login,
      gistId: createdId,
      htmlUrl: st.settings.gistUrl || `https://gist.github.com/${login}/${createdId}`,
      count: Object.keys(st.watchlist || {}).length
    };
  }

  function gistDisconnect() {
    updateSettings({ gistToken: '', gistId: '', gistUser: '', gistUrl: '', lastGistSync: 0 });
    setSyncStatus('local', 'Local Storage');
  }

  function scheduleGistAutoPush() {
    const { gistToken, gistId, gistAutoSync } = getState().settings;
    if (!gistToken || !gistId || !gistAutoSync) return;
    if (gistPushTimer) clearTimeout(gistPushTimer);
    setSyncStatus('syncing', 'Queued...');
    gistPushTimer = setTimeout(() => {
      gistPushTimer = null;
      gistPush({ silent: true });
    }, 600);
  }

  function generateSyncCode() {
    const payload = buildPortableSyncPayload(getState(), false);
    return encodeBase64Utf8(JSON.stringify(payload));
  }

  function applySyncCode(code) {
    const decoded = decodeBase64Utf8(code);
    const parsed = JSON.parse(decoded);
    const merged = mergeRemotePayload(parsed);
    saveState(merged, { triggerGist: true });
    return merged;
  }

  function checkHashSyncOnBoot() {
    const hash = global.location.hash || '';
    if (!hash.startsWith('#sync=')) return;
    try {
      const encoded = decodeURIComponent(hash.slice(6));
      if (!encoded) return;
      const merged = applySyncCode(encoded);
      history.replaceState(null, '', global.location.pathname + global.location.search);
      toast(`Merged ${Object.keys(merged.watchlist).length} documentaries from #sync link!`, 'success');
    } catch (err) {
      console.error('Invalid #sync hash:', err);
      toast('Could not decode #sync link.', 'error');
    }
  }

  // --------------------------------------------------------------------------
  // 13-Platform Streaming Detection & Documentary Style Classifier
  // --------------------------------------------------------------------------
  function detectPlatforms(media, extraStreaming = []) {
    const found = new Set();
    const state = getState();
    const id = Number(media?.id);
    const ovr = (id && (state.overrides[id] || state.watchlist[id])) || null;

    if (ovr?.customPlatforms?.length) {
      ovr.customPlatforms.forEach(pid => {
        if (PLATFORM_BY_ID[pid]) found.add(pid);
      });
    }

    const links = Array.isArray(media?.externalLinks) ? media.externalLinks : [];
    for (const link of links) {
      const site = String(link.site || '').toLowerCase();
      const url = String(link.url || '').toLowerCase();
      for (const p of PLATFORM_CONFIG) {
        if (p.aliases.some(a => site.includes(a)) || p.domains.some(d => url.includes(d))) {
          found.add(p.id);
        }
      }
    }

    if (Array.isArray(media?._matchedPlatforms)) {
      media._matchedPlatforms.forEach(pid => {
        if (PLATFORM_BY_ID[pid]) found.add(pid);
      });
    }

    if (!media?._verifiedStreaming) {
      const studioName = String(media?.studios?.nodes?.[0]?.name || '').toLowerCase();
      if (studioName) {
        for (const p of PLATFORM_CONFIG) {
          if (p.aliases.some(a => a.length >= 4 && studioName.includes(a))) {
            found.add(p.id);
          }
        }
      }
    }

    for (const name of extraStreaming) {
      const lower = String(name || '').toLowerCase();
      if (lower.includes('channel') || lower.includes('youtube tv')) continue;
      for (const p of PLATFORM_CONFIG) {
        if (p.aliases.some(a => lower.includes(a))) {
          found.add(p.id);
        }
      }
    }

    return Array.from(found).map(pid => PLATFORM_BY_ID[pid]).filter(Boolean);
  }

  function getStreamingLinks(media, extraLinks = [], extraStreaming = []) {
    const out = [];
    const byKey = new Map();
    const title = getDisplayTitle(media);
    const normKey = String(title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const bakedMap = (global.DOCFINDER_STREAMING_LINKS && global.DOCFINDER_STREAMING_LINKS[normKey]) || {};

    const upsertLink = (key, name, url, color, isDirect = false, freeWithAds = false) => {
      if (!url || !/^https?:\/\//i.test(url)) return;
      if (/justwatch\.com/i.test(url) && !isDirect) return;
      const k = String(key || name).toLowerCase();
      const existing = byKey.get(k);
      if (existing) {
        if (!existing.isDirect && isDirect) {
          existing.url = url;
          existing.isDirect = true;
        }
        return;
      }
      const entry = { name, url, color: color || '#2dd4bf', isDirect, freeWithAds };
      byKey.set(k, entry);
      out.push(entry);
    };

    for (const [pid, directUrl] of Object.entries(bakedMap)) {
      const p = PLATFORM_BY_ID[pid];
      if (p && directUrl) {
        upsertLink(p.id, p.name, directUrl, p.color, !/search/i.test(directUrl), Boolean(p.freeWithAds));
      }
    }

    for (const l of (media?.externalLinks || [])) {
      const site = String(l.site || '').trim();
      if (!site || !l.url || site.toLowerCase().includes('justwatch') || l.type === 'INFO') continue;
      const plat = (l.platformId && PLATFORM_BY_ID[l.platformId]) || PLATFORM_CONFIG.find(p =>
        p.aliases.some(a => site.toLowerCase().includes(a)) ||
        p.domains.some(d => String(l.url).toLowerCase().includes(d))
      );
      if (plat || l.type === 'STREAMING') {
        const direct = Boolean(l.isDirect) || (!/search/i.test(l.url) && !/justwatch/i.test(l.url));
        upsertLink(plat ? plat.id : site, plat ? plat.name : site, l.url, plat?.color, direct, Boolean(plat?.freeWithAds));
      }
    }

    for (const s of (extraLinks || [])) {
      if (!s?.name || !s?.url) continue;
      const plat = PLATFORM_CONFIG.find(p =>
        p.aliases.some(a => s.name.toLowerCase().includes(a)) ||
        p.domains.some(d => String(s.url).toLowerCase().includes(d))
      );
      upsertLink(plat ? plat.id : s.name, plat ? plat.name : s.name, s.url, plat?.color, true, Boolean(plat?.freeWithAds));
    }

    const state = getState();
    const id = Number(media?.id);
    const ovr = (id && (state.overrides[id] || state.watchlist[id])) || null;
    const extraPids = new Set(ovr?.customPlatforms || []);
    for (const name of (extraStreaming || [])) {
      const lower = String(name || '').toLowerCase();
      if (lower.includes('channel') || lower.includes('youtube tv')) continue;
      for (const p of PLATFORM_CONFIG) {
        if (p.aliases.some(a => a.length >= 4 && lower.includes(a))) extraPids.add(p.id);
      }
    }
    for (const pid of extraPids) {
      const p = PLATFORM_BY_ID[pid];
      if (!p) continue;
      const url = bakedMap[p.id] || (p.searchUrl ? p.searchUrl(title) : '');
      if (url) {
        upsertLink(p.id, p.name, url, p.color, Boolean(bakedMap[p.id] && !/search/i.test(bakedMap[p.id])), Boolean(p.freeWithAds));
      }
    }

    return out;
  }

  function isFreeWithAds(media, platforms) {
    const state = getState();
    const id = Number(media?.id);
    const ovr = id && (state.overrides[id] || state.watchlist[id]);
    if (ovr?.customFreeWithAds) return true;
    const list = platforms || detectPlatforms(media);
    return list.some(p => p.freeWithAds);
  }

  // --------------------------------------------------------------------------
  // Global Multi-Select Streaming Service Filter (persists across all pages)
  // --------------------------------------------------------------------------
  function getStreamingFilter() {
    return getState().settings.streamingFilter || [];
  }

  function setStreamingFilter(ids) {
    const clean = Array.from(new Set((Array.isArray(ids) ? ids : []).filter(pid => pid === 'free' || Boolean(PLATFORM_BY_ID[pid]))));
    const state = getState();
    state.settings = { ...state.settings, streamingFilter: clean };
    saveState(state, { triggerGist: false, notify: false });
    syncGlobalStreamingFilterBar();
    streamingFilterListeners.forEach(fn => {
      try { fn(clean); } catch (err) { console.error(err); }
    });
    return clean;
  }

  function toggleStreamingFilter(pid) {
    const cur = new Set(getStreamingFilter());
    if (cur.has(pid)) cur.delete(pid);
    else cur.add(pid);
    return setStreamingFilter(Array.from(cur));
  }

  function clearStreamingFilter() {
    return setStreamingFilter([]);
  }

  function matchesStreamingFilter(media, extraStreaming = []) {
    const filter = getStreamingFilter();
    if (!filter.length) return true;
    const platforms = detectPlatforms(media, extraStreaming);
    if (filter.includes('free') && isFreeWithAds(media, platforms)) return true;
    return platforms.some(p => filter.includes(p.id));
  }

  function getStreamingFilterSummary() {
    const filter = getStreamingFilter();
    if (!filter.length) return '';
    return filter.map(pid => pid === 'free' ? 'Free / PBS' : (PLATFORM_BY_ID[pid]?.name || pid)).join(' + ');
  }

  function onStreamingFilterChange(fn) {
    streamingFilterListeners.add(fn);
    return () => streamingFilterListeners.delete(fn);
  }

  function syncGlobalStreamingFilterBar() {
    const bar = document.getElementById('af-global-stream-bar');
    if (!bar) return;
    const active = new Set(getStreamingFilter());
    bar.querySelectorAll('[data-global-pf]').forEach(btn => {
      const isAct = active.has(btn.dataset.globalPf);
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-pressed', String(isAct));
    });
    const statusEl = bar.querySelector('#af-stream-filter-status');
    if (statusEl) {
      statusEl.textContent = active.size ? `${active.size} selected` : 'All Services';
      statusEl.className = active.size ? 'badge badge-accent' : 'badge badge-muted';
    }
    const clearBtn = bar.querySelector('#af-stream-filter-clear');
    if (clearBtn) {
      clearBtn.disabled = active.size === 0;
      clearBtn.classList.toggle('has-active', active.size > 0);
    }
  }

  function getDubLanguages() {
    return ['EN', 'CC'];
  }

  function classifyDub(media) {
    const state = getState();
    const id = Number(media?.id);
    const ovr = id && (state.overrides[id] || state.watchlist[id]);
    const hasLag = ovr && typeof ovr.dubLag === 'number' && !Number.isNaN(ovr.dubLag);

    if (hasLag) {
      if (ovr.dubLag === 0) return 'Simul-Release';
      if (ovr.dubLag > 0 && (!ovr.dubOverride || ovr.dubOverride === 'Simul-Release')) {
        return 'Staggered Release';
      }
    }
    if (ovr?.dubOverride) return ovr.dubOverride;
    if (media?.docStyle) return media.docStyle;
    const tags = (media?.tags || []).map(t => (t.name || '').toLowerCase());
    if (tags.some(t => t.includes('investigative') || t.includes('whistleblower'))) return 'Investigative';
    if (tags.some(t => t.includes('archival'))) return 'Archival';
    return 'Observational';
  }

  function getDubTrackInfo(media, currentSubEp = null) {
    const state = getState();
    const id = Number(media?.id);
    const ovr = (id && (state.overrides[id] || state.watchlist[id])) || {};
    const dub = classifyDub(media);
    const isSimuldub = dub === 'Simul-Release' || ovr.dubLag === 0;
    const dubLag = isSimuldub ? 0 : ((typeof ovr.dubLag === 'number' && !Number.isNaN(ovr.dubLag)) ? ovr.dubLag : null);
    const dubDay = ovr.dubDay !== undefined && ovr.dubDay !== '' ? Number(ovr.dubDay) : null;

    let dubEp = null;
    if (typeof currentSubEp === 'number' && currentSubEp > 0) {
      if (isSimuldub) dubEp = currentSubEp;
      else if (dubLag !== null && currentSubEp - dubLag >= 1) dubEp = currentSubEp - dubLag;
    }

    return {
      dub,
      hasEnDub: true,
      isSimuldub,
      dubLag,
      dubDay,
      dubEp,
      langs: getDubLanguages(),
      otherLangs: []
    };
  }

  // --------------------------------------------------------------------------
  // Strict Documentary Metadata & Live Multi-API Engine (TVMaze + TMDB + OMDb)
  // --------------------------------------------------------------------------
  const MEDIA_CARD_FIELDS = 'id title coverImage format status episodes duration seasonYear averageScore popularity genres description trailer studios tags externalLinks nextAiringEpisode staff';

  function formatSourceLabel(source) {
    const map = {
      NATURAL_HISTORY: 'Natural History Expedition',
      SCIENCE_ARCHIVE: 'Science & Research Film',
      ARCHIVAL_FILM: 'Archival Film & Oral History',
      VERITE_FIELD: 'Observational / Cinema Verité',
      JOURNALISM: 'Investigative Journalism',
      CONCERT_FILM: 'Live Concert & Performance',
      EXPERIMENTAL_DOC: 'Visual Essay / Non-Narrative',
      ORAL_HISTORY: 'Firsthand Oral History',
      YOUTUBE_DOC: 'Official YouTube Documentary',
      TVMAZE_LIVE: 'TVMaze Documentary Broadcast'
    };
    return map[source] || 'Documentary Non-Fiction';
  }

  function getTopSubgenreTags(media, max = 3) {
    return (media?.tags || [])
      .filter(t => t && !t.isMediaSpoiler && !t.isGeneralSpoiler && (t.rank || 0) >= 55)
      .sort((a, b) => (b.rank || 0) - (a.rank || 0))
      .slice(0, max)
      .map(t => t.name);
  }

  function getKeyStaff(media) {
    const edges = media?.staff?.edges || [];
    const out = [];
    const seen = new Set();
    for (const e of edges) {
      const name = e?.node?.name?.full;
      const role = e?.role || 'Director';
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({ role, name });
      if (out.length >= 4) break;
    }
    return out;
  }

  function isSequelOrRecap(media) {
    const title = getDisplayTitle(media);
    return /\b(season [2-9]|part [2-9]|volume [2-9]|recap|making of)\b/i.test(title);
  }

  async function fetchJsonSafe(url, timeoutMs = 5500) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Strict Documentary-ONLY filter for live TVMaze feeds
  const EXCLUDED_SHOW_TYPES = new Set(['Animation', 'Talk Show', 'Game Show', 'Sports', 'Variety', 'Award Show', 'Panel Show', 'Scripted', 'News']);
  const EXCLUDED_GENRES = new Set(['Comedy', 'Children', 'Anime', 'Science-Fiction', 'Fantasy', 'Supernatural', 'Soap']);

  function isAuthenticDocumentaryShow(s) {
    if (!s || !s.name) return false;
    if (s.type !== 'Documentary') return false;
    if (EXCLUDED_SHOW_TYPES.has(s.type)) return false;
    const genres = Array.isArray(s.genres) ? s.genres : [];
    if (genres.some(g => EXCLUDED_GENRES.has(g))) return false;
    return true;
  }

  function normalizeTvMazeShow(show) {
    if (!show || !show.id || !show.name) return null;
    const id = 500000 + Number(show.id);
    const netName = show.network?.name || show.webChannel?.name || 'Broadcast Network';
    const year = show.premiered ? Number(show.premiered.slice(0, 4)) : 2024;
    const score = show.rating?.average ? Math.round(show.rating.average * 10) : 82;
    const desc = stripHtml(show.summary || 'Documentary television series.');
    const low = (show.name + ' ' + desc + ' ' + (show.genres || []).join(' ')).toLowerCase();

    const inferredGenres = [];
    const inferredTags = [];
    if (/nature|wildlife|ocean|animal|earth|planet|wild/.test(low)) {
      inferredGenres.push('Nature & Wildlife');
      inferredTags.push({ name: 'Deep Ocean & Wildlife', rank: 90 });
    }
    if (/space|science|cosmos|tech|universe|nova|physics|brain/.test(low)) {
      inferredGenres.push('Science & Space');
      inferredTags.push({ name: 'Space Exploration', rank: 88 });
    }
    if (/history|war|ancient|empire|century|civil/.test(low)) {
      inferredGenres.push('History & War');
      inferredTags.push({ name: 'Archival Footage', rank: 88 });
    }
    if (/music|band|art|film|design|architect/.test(low)) {
      inferredGenres.push('Music & Arts');
      inferredTags.push({ name: 'Music History', rank: 86 });
    }
    if (/food|chef|cook|travel|culinary/.test(low)) {
      inferredGenres.push('Food & Culture');
      inferredTags.push({ name: 'Culinary & Travel', rank: 88 });
    }
    if (/sport|climb|race|football|basketball|olympic/.test(low)) {
      inferredGenres.push('Sports & Adventure');
      inferredTags.push({ name: 'Extreme Sports', rank: 86 });
    }
    if (/crime|murder|investig|fraud|scandal|court/.test(low)) {
      inferredGenres.push('Investigative & Crime');
      inferredTags.push({ name: 'Investigative Journalism', rank: 88 });
    }
    if (!inferredGenres.length) inferredGenres.push('Society & Politics');
    if (!inferredTags.length) inferredTags.push({ name: 'Cinema Verité', rank: 82 });

    const docStyle = /investig|expos|crime|scandal/.test(low) ? 'Investigative' : /history|war|archiv/.test(low) ? 'Archival' : 'Observational';
    const cover = show.image?.original || show.image?.medium || makeDocPosterDataUri(show.name, `${netName} · ${year}`, '#0ea5e9', 'DOCUSERIES');

    return {
      id,
      _tvmazeId: show.id,
      imdbId: show.externals?.imdb || '',
      countryOfOrigin: show.network?.country?.code || show.webChannel?.country?.code || 'US',
      source: 'TVMAZE_LIVE',
      docStyle,
      title: { english: show.name, romaji: show.name, native: netName },
      coverImage: { large: cover.replace(/^http:\/\//i, 'https://'), medium: cover.replace(/^http:\/\//i, 'https://'), color: '#0ea5e9' },
      format: 'DOCUSERIES',
      status: show.status === 'Running' ? 'RELEASING' : 'FINISHED',
      episodes: show.weight ? Math.max(4, Math.round(show.weight / 5)) : null,
      duration: show.averageRuntime || show.runtime || 50,
      seasonYear: year,
      averageScore: score,
      popularity: (show.weight || 50) * 1400,
      genres: inferredGenres,
      isAdult: false,
      description: desc,
      trailer: null,
      studios: { nodes: [{ id: show.network?.id || show.webChannel?.id || id, name: netName }] },
      tags: inferredTags,
      externalLinks: show.officialSite ? [{ site: netName, url: show.officialSite, type: 'STREAMING' }] : [],
      nextAiringEpisode: null,
      relations: { edges: [] },
      characters: { edges: [] },
      staff: { edges: [] }
    };
  }

  // Official US JustWatch / TMDB Watch Provider IDs for live TMDB Documentary Discover (genre 99 ONLY)
  const TMDB_PROVIDER_IDS = {
    netflix: '8',
    max: '1899',
    hulu: '15',
    disney: '337',
    pbs: '209',
    appletv: '350',
    prime: '9',
    peacock: '386',
    paramount: '531',
    curiosity: '190',
    tubi: '73',
    pluto: '300'
  };

  function normalizeTmdbItem(item, mediaType, platformHint = null) {
    if (!item || !item.id) return null;
    const isMovie = mediaType === 'movie';
    const title = isMovie ? (item.title || item.original_title) : (item.name || item.original_name);
    if (!title) return null;
    const id = (isMovie ? 9000000 : 8000000) + Number(item.id);
    const dateStr = isMovie ? item.release_date : item.first_air_date;
    const year = dateStr ? Number(dateStr.slice(0, 4)) : 2023;
    const score = item.vote_average ? Math.round(item.vote_average * 10) : 78;
    const cover = item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : makeDocPosterDataUri(title, `TMDB · ${year}`, '#0ea5e9', isMovie ? 'FEATURE DOC' : 'DOCUSERIES');
    const desc = stripHtml(item.overview || 'Documentary indexed via TMDB.');
    const low = (title + ' ' + desc).toLowerCase();
    const docStyle = /investig|expos|fraud|scandal/.test(low) ? 'Investigative' : /archiv|history|war/.test(low) ? 'Archival' : 'Observational';
    const tags = [{ name: 'Cinema Verité', rank: 84 }];
    if (/nature|ocean|wildlife|planet/.test(low)) tags.push({ name: 'Deep Ocean & Wildlife', rank: 90 });
    if (/space|nasa|cosmos|science/.test(low)) tags.push({ name: 'Space Exploration', rank: 90 });
    if (/history|war|ancient/.test(low)) tags.push({ name: 'Archival Footage', rank: 88 });
    if (/music|concert|art/.test(low)) tags.push({ name: 'Music History', rank: 88 });

    return {
      id,
      _tmdbId: item.id,
      countryOfOrigin: Array.isArray(item.origin_country) && item.origin_country[0] ? item.origin_country[0] : 'US',
      source: 'ARCHIVAL_FILM',
      docStyle,
      title: { english: title, romaji: title, native: isMovie ? 'TMDB Feature Documentary' : 'TMDB Docuseries' },
      coverImage: { large: cover, medium: cover, color: '#0ea5e9' },
      format: isMovie ? 'FEATURE_DOC' : 'DOCUSERIES',
      status: 'FINISHED',
      episodes: isMovie ? 1 : null,
      duration: isMovie ? 95 : 50,
      seasonYear: year,
      averageScore: score,
      popularity: Math.round((item.popularity || 15) * 2200),
      genres: ['Society & Politics'],
      isAdult: false,
      description: desc,
      trailer: null,
      studios: { nodes: [{ id: id + 1, name: platformHint && PLATFORM_BY_ID[platformHint] ? PLATFORM_BY_ID[platformHint].name : 'TMDB Documentary' }] },
      tags,
      externalLinks: [],
      _matchedPlatforms: platformHint && PLATFORM_BY_ID[platformHint] ? [platformHint] : [],
      nextAiringEpisode: null,
      relations: { edges: [] },
      characters: { edges: [] },
      staff: { edges: [] }
    };
  }

  // Live TMDB Discover strictly for Documentary Movies & Documentary Series (with_genres=99)
  async function fetchTmdbDocDiscover({ platformId = 'all', startYear = null, endYear = null, pages = 2 } = {}) {
    const tmdbKey = getState().settings.tmdbKey;
    if (!tmdbKey) return [];
    const cacheKey = `tmdb_doc_disc_v1_${platformId}_${startYear || 'all'}_${endYear || 'all'}_${pages}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const provId = TMDB_PROVIDER_IDS[platformId] || '';
    const provParam = provId ? `&watch_region=US&with_watch_providers=${provId}` : '';
    const collected = [];
    const seen = new Set();

    const tasks = [];
    for (let p = 1; p <= pages; p++) {
      const tvDates = `${startYear ? `&first_air_date.gte=${startYear}-01-01` : ''}${endYear ? `&first_air_date.lte=${endYear}-12-31` : ''}`;
      const mvDates = `${startYear ? `&primary_release_date.gte=${startYear}-01-01` : ''}${endYear ? `&primary_release_date.lte=${endYear}-12-31` : ''}`;
      tasks.push(
        fetchJsonSafe(`https://api.themoviedb.org/3/discover/tv?api_key=${encodeURIComponent(tmdbKey)}&with_genres=99&sort_by=popularity.desc&page=${p}${provParam}${tvDates}`, 5200)
          .then(d => (d?.results || []).map(r => normalizeTmdbItem(r, 'tv', provId ? platformId : null)))
      );
      tasks.push(
        fetchJsonSafe(`https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(tmdbKey)}&with_genres=99&sort_by=popularity.desc&page=${p}${provParam}${mvDates}`, 5200)
          .then(d => (d?.results || []).map(r => normalizeTmdbItem(r, 'movie', provId ? platformId : null)))
      );
    }

    const batches = await Promise.all(tasks);
    for (const list of batches) {
      for (const m of (list || [])) {
        if (!m) continue;
        const k = getDisplayTitle(m).toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        CANONICAL_BY_ID.set(m.id, m);
        collected.push(m);
      }
    }

    if (collected.length) await cacheSet(cacheKey, collected, TTL_STABLE);
    return collected;
  }

  let expandedTvMazePromise = null;
  async function fetchExpandedTvMazeCatalog(forceRefresh = false) {
    const cacheKey = 'tvmaze_expanded_doc_pool_v1';
    if (!forceRefresh) {
      const cached = await cacheGet(cacheKey);
      if (cached && cached.length) {
        cached.forEach(m => { if (!CANONICAL_BY_ID.has(m.id)) CANONICAL_BY_ID.set(m.id, m); });
        return cached;
      }
      if (expandedTvMazePromise) return expandedTvMazePromise;
    }

    const topics = ['planet', 'nature', 'history', 'cosmos', 'frontline', 'nova', 'ocean', 'space', 'war', 'music'];
    expandedTvMazePromise = (async () => {
      const seenTitles = new Set(CANONICAL_DOC_LIST.map(m => getDisplayTitle(m).toLowerCase()));
      const out = [];
      const results = await Promise.all(topics.map(t => fetchLiveTvMazeDocShows(t, 10)));
      for (const list of results) {
        for (const m of (list || [])) {
          const k = getDisplayTitle(m).toLowerCase();
          if (seenTitles.has(k)) continue;
          seenTitles.add(k);
          CANONICAL_BY_ID.set(m.id, m);
          out.push(m);
        }
      }
      if (out.length) await cacheSet(cacheKey, out, TTL_STABLE);
      return out;
    })();

    const data = await expandedTvMazePromise;
    expandedTvMazePromise = null;
    return data;
  }

  async function fetchLiveTvMazeDocShows(term = 'documentary', limit = 10) {
    const cacheKey = `tvmaze_doc_shows_v1_${term.toLowerCase()}_${limit}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const data = await fetchJsonSafe(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(term)}`, 4800);
    const items = (Array.isArray(data) ? data : [])
      .map(r => r.show)
      .filter(s => isAuthenticDocumentaryShow(s))
      .slice(0, limit)
      .map(normalizeTvMazeShow)
      .filter(Boolean);

    if (items.length) {
      items.forEach(m => { if (!CANONICAL_BY_ID.has(m.id)) CANONICAL_BY_ID.set(m.id, m); });
      await cacheSet(cacheKey, items, TTL_DYNAMIC);
    }
    return items;
  }

  // Live 7-Day US Documentary Broadcast Schedule (TVMaze /schedule strictly filtered to Documentary + Canonical Weekly Broadcasts)
  async function fetchLiveDocSchedule(startSec, endSec, { forceRefresh = false } = {}) {
    const cacheKey = `doc_schedule_v1_${Math.floor(startSec / 86400)}`;
    if (!forceRefresh) {
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;
    }

    const schedules = [];
    const seenKeys = new Set();

    const dayPromises = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date((startSec + d * 86400) * 1000);
      const isoDate = dt.toISOString().slice(0, 10);
      dayPromises.push(fetchJsonSafe(`https://api.tvmaze.com/schedule?country=US&date=${isoDate}`, 4200));
    }
    const dayPayloads = await Promise.all(dayPromises);

    for (const dayList of dayPayloads) {
      if (!Array.isArray(dayList)) continue;
      for (const ep of dayList) {
        const s = ep?.show;
        if (!isAuthenticDocumentaryShow(s)) continue;
        const media = normalizeTvMazeShow(s);
        if (!media) continue;
        CANONICAL_BY_ID.set(media.id, media);
        const airSec = ep.airstamp ? Math.floor(new Date(ep.airstamp).getTime() / 1000) : (startSec + 20 * 3600);
        if (airSec < startSec || airSec > endSec) continue;
        const key = `${media.id}_${ep.number || 1}_${Math.floor(airSec / 3600)}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        schedules.push({
          id: Number(ep.id) || (media.id * 10 + (ep.number || 1)),
          episode: ep.number || 1,
          airingAt: airSec,
          media
        });
      }
    }

    const weeklyCanonical = [
      { id: 284, dayOffset: 0, hour: 21, ep: 380 }, // Mon: American Experience (PBS)
      { id: 283, dayOffset: 1, hour: 22, ep: 780 }, // Tue: FRONTLINE (PBS)
      { id: 282, dayOffset: 2, hour: 21, ep: 850 }, // Wed: NOVA (PBS)
      { id: 285, dayOffset: 2, hour: 20, ep: 640 }, // Wed: Nature (PBS)
      { id: 291, dayOffset: 3, hour: 22, ep: 54 },  // Thu: Welcome to Wrexham
      { id: 235, dayOffset: 4, hour: 20, ep: 34 },  // Fri: Chef's Table
      { id: 256, dayOffset: 5, hour: 20, ep: 160 }, // Sat: 30 for 30
      { id: 103, dayOffset: 6, hour: 20, ep: 6 }    // Sun: Planet Earth II
    ];

    for (const item of weeklyCanonical) {
      const m = CANONICAL_BY_ID.get(item.id);
      if (!m) continue;
      const d = new Date((startSec + item.dayOffset * 86400) * 1000);
      d.setHours(item.hour, 0, 0, 0);
      const airSec = Math.floor(d.getTime() / 1000);
      schedules.push({
        id: m.id * 100 + item.dayOffset,
        episode: item.ep,
        airingAt: airSec,
        media: m
      });
    }

    schedules.sort((a, b) => a.airingAt - b.airingAt);
    await cacheSet(cacheKey, schedules, TTL_DYNAMIC);
    return schedules;
  }

  async function fetchAnimeById(id) {
    const numId = Number(id);
    if (CANONICAL_BY_ID.has(numId)) return CANONICAL_BY_ID.get(numId);

    const wlItem = getState().watchlist[numId];
    if (wlItem) {
      return {
        id: numId,
        title: { english: wlItem.title, romaji: wlItem.title },
        coverImage: { large: wlItem.cover, medium: wlItem.cover },
        format: wlItem.format || 'FEATURE_DOC',
        docStyle: wlItem.docStyle || 'Observational',
        episodes: wlItem.episodes || 1,
        seasonYear: wlItem.seasonYear || 2024,
        averageScore: wlItem.averageScore || 85,
        popularity: wlItem.popularity || 50000,
        genres: wlItem.genres || ['Society & Politics'],
        tags: [{ name: 'Cinema Verité', rank: 85 }],
        studios: { nodes: [{ id: 1, name: 'Documentary Archive' }] },
        description: wlItem.notes || 'Saved documentary.'
      };
    }

    if (numId >= 500000 && numId < 800000) {
      const tvmId = numId - 500000;
      const show = await fetchJsonSafe(`https://api.tvmaze.com/shows/${tvmId}`);
      if (show && isAuthenticDocumentaryShow(show)) {
        const norm = normalizeTvMazeShow(show);
        CANONICAL_BY_ID.set(norm.id, norm);
        return norm;
      }
    }
    return CANONICAL_DOC_LIST[0];
  }

  async function searchAnimeQuick(term, perPage = 10) {
    const q = String(term || '').trim().toLowerCase();
    if (!q) return [];

    const localHits = CANONICAL_DOC_LIST.filter(m => {
      const hay = `${getDisplayTitle(m)} ${m.description} ${(m.genres || []).join(' ')} ${(m.tags || []).map(t => t.name).join(' ')} ${(m.studios?.nodes || []).map(s => s.name).join(' ')} ${(m.staff?.edges || []).map(e => e.node?.name?.full).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });

    const tvHits = await fetchLiveTvMazeDocShows(term, 6);

    const seenTitles = new Set();
    const combined = [];
    for (const item of [...localHits, ...tvHits]) {
      const key = getDisplayTitle(item).toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      combined.push(item);
      if (combined.length >= perPage) break;
    }
    return combined;
  }

  async function anilistQuery(query, variables = {}, { cacheKey = null, ttl = TTL_DYNAMIC } = {}) {
    if (cacheKey) {
      const cached = await cacheGet(cacheKey);
      if (cached) return cached;
    }

    const qStr = String(query || '');
    let result = {};

    if (qStr.includes('airingSchedules') && !qStr.includes('activeOnas')) {
      const start = variables.start || (Math.floor(Date.now() / 1000) - 86400);
      const end = variables.end || (start + 7 * 86400);
      const sched = await fetchLiveDocSchedule(start, end);
      result = { p1: { airingSchedules: sched }, p2: { airingSchedules: [] }, p3: { airingSchedules: [] } };
    } else if (qStr.includes('past72h') && qStr.includes('activeOnas')) {
      const nowSec = Math.floor(Date.now() / 1000);
      const platHint = variables.platform || 'all';
      const [liveTvPool, tmdbDisc] = await Promise.all([
        fetchExpandedTvMazeCatalog(),
        fetchTmdbDocDiscover({ platformId: platHint, pages: 2 })
      ]);
      const recentSched = CANONICAL_DOC_LIST.slice(0, 12).map((m, idx) => ({
        id: m.id * 10 + idx,
        episode: m.episodes || 1,
        airingAt: nowSec - (idx * 5 + 3) * 3600,
        media: m
      }));
      const seenTitles = new Set();
      const pool = [];
      for (const m of [...CANONICAL_DOC_LIST, ...tmdbDisc, ...liveTvPool]) {
        const k = getDisplayTitle(m).toLowerCase();
        if (seenTitles.has(k)) continue;
        seenTitles.add(k);
        pool.push(m);
      }
      result = {
        past72h: { airingSchedules: recentSched },
        activeOnas: { media: pool.slice(0, 40) },
        catalog: { media: pool }
      };
    } else if (qStr.includes('Media(id:') || qStr.includes('Media(id :')) {
      const m = await fetchAnimeById(variables.id);
      const seedTags = new Set((m?.tags || []).map(t => t.name));
      const seedGenres = new Set(m?.genres || []);
      const recs = CANONICAL_DOC_LIST
        .filter(cand => cand.id !== m?.id)
        .map(cand => {
          let overlap = 0;
          for (const t of (cand.tags || [])) if (seedTags.has(t.name)) overlap += t.rank || 70;
          for (const g of (cand.genres || [])) if (seedGenres.has(g)) overlap += 45;
          return { cand, overlap };
        })
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, 16)
        .map(r => ({ mediaRecommendation: r.cand }));
      result = { Media: m ? { ...m, recommendations: { nodes: recs } } : null };
    } else if (qStr.includes('Studio(search:')) {
      const sTerm = String(variables.search || '').trim().toLowerCase();
      if (!sTerm) {
        result = { Studio: null };
      } else {
        let matched = CANONICAL_DOC_LIST.filter(m => {
          const studios = (m.studios?.nodes || []).map(s => String(s?.name || '').trim().toLowerCase()).filter(Boolean);
          return studios.some(st => st === sTerm || st.includes(sTerm) || sTerm.includes(st));
        });
        if (!matched.length) {
          matched = CANONICAL_DOC_LIST.filter(m => {
            const plats = (m._matchedPlatforms || [])
              .map(pid => String(PLATFORM_BY_ID[pid]?.name || '').trim().toLowerCase())
              .filter(Boolean);
            return plats.some(p => p === sTerm || p.includes(sTerm) || sTerm.includes(p));
          });
        }
        const liveTvRaw = await fetchLiveTvMazeDocShows(variables.search, 12);
        const liveTv = liveTvRaw.filter(m => {
          const net = String(m.studios?.nodes?.[0]?.name || '').trim().toLowerCase();
          return net && (net === sTerm || net.includes(sTerm) || sTerm.includes(net));
        });
        const seenTitles = new Set();
        const all = [];
        for (const node of [...matched, ...liveTv]) {
          const tKey = getDisplayTitle(node).toLowerCase();
          if (seenTitles.has(tKey)) continue;
          seenTitles.add(tKey);
          all.push(node);
        }
        result = {
          Studio: all.length ? {
            id: 900,
            name: variables.search,
            favourites: 14200,
            p1: { edges: all.map(node => ({ isMainStudio: true, node })) },
            p2: { edges: [] }
          } : null
        };
      }
    } else if (qStr.includes('staff(search:')) {
      const sTerm = String(variables.search || '').toLowerCase();
      const staffDirectory = new Map();
      for (const m of CANONICAL_DOC_LIST) {
        for (const e of (m.staff?.edges || [])) {
          const full = e.node?.name?.full;
          if (!full) continue;
          if (!staffDirectory.has(full)) {
            staffDirectory.set(full, {
              id: e.node.id,
              name: { full, native: e.role },
              image: {
                large: makeDocPosterDataUri(full, e.role, '#2dd4bf', 'FILMMAKER'),
                medium: makeDocPosterDataUri(full, e.role, '#2dd4bf', 'FILMMAKER')
              },
              primaryOccupations: [e.role, 'Documentary Filmmaker'],
              description: `${full} is an acclaimed documentary director, narrator, or producer represented in the DocFinder catalog.`,
              credits: []
            });
          }
          staffDirectory.get(full).credits.push({ staffRole: e.role, node: m });
        }
      }
      const hits = Array.from(staffDirectory.values()).filter(st => st.name.full.toLowerCase().includes(sTerm));
      result = {
        Page: {
          staff: hits.map(st => ({
            ...st,
            p1: { edges: st.credits },
            p2: { edges: [] }
          }))
        }
      };
    } else if (Array.isArray(variables.ids)) {
      const list = await Promise.all(variables.ids.map(id => fetchAnimeById(id)));
      result = { Page: { media: list.filter(Boolean) } };
    } else {
      let pool = [...CANONICAL_DOC_LIST];
      if (variables.start && variables.end) {
        const startYr = Math.floor(Number(variables.start) / 10000);
        const endYr = Math.floor(Number(variables.end) / 10000);
        pool = pool.filter(m => (m.seasonYear || 2020) >= startYr && (m.seasonYear || 2020) <= endYr);
      }
      if (variables.format) pool = pool.filter(m => m.format === variables.format);
      if (variables.genre) {
        const gl = variables.genre.toLowerCase();
        pool = pool.filter(m => (m.genres || []).some(g => g.toLowerCase() === gl));
      }
      result = { Page: { media: pool }, base: { media: pool } };
    }

    if (cacheKey && result) await cacheSet(cacheKey, result, ttl);
    return result;
  }

  // --------------------------------------------------------------------------
  // Live-Taxonomy Find Vibe (3-Layer Documentary Pipeline)
  // --------------------------------------------------------------------------
  const MOOD_LEXICON = {
    nature: ['Deep Ocean & Wildlife', 'Climate & Conservation', 'Nature & Wildlife'],
    ocean: ['Deep Ocean & Wildlife', 'Climate & Conservation', 'Nature & Wildlife'],
    wildlife: ['Deep Ocean & Wildlife', 'Climate & Conservation', 'Nature & Wildlife'],
    space: ['Space Exploration', 'Science & Space', 'Archival Footage'],
    nasa: ['Space Exploration', 'Archival Footage', 'Science & Space'],
    cosmos: ['Space Exploration', 'Science & Space'],
    war: ['World War II', 'Archival Footage', 'Cold War & Espionage', 'History & War'],
    history: ['Archival Footage', 'Ancient Civilizations', 'World War II', 'History & War'],
    ancient: ['Ancient Civilizations', 'Art & Architecture', 'History & War'],
    music: ['Music History', 'Art & Architecture', 'Music & Arts'],
    concert: ['Music History', 'Archival Footage', 'Music & Arts'],
    climb: ['Mountaineering & Survival', 'Extreme Sports', 'Sports & Adventure'],
    mountain: ['Mountaineering & Survival', 'Extreme Sports', 'Sports & Adventure'],
    survival: ['Mountaineering & Survival', 'Extreme Sports', 'Cinema Verité'],
    sports: ['Extreme Sports', 'Sports & Adventure', 'Biographical Portrait'],
    food: ['Culinary & Travel', 'Food & Culture', 'Biographical Portrait'],
    sushi: ['Culinary & Travel', 'Food & Culture'],
    chef: ['Culinary & Travel', 'Food & Culture'],
    climate: ['Climate & Conservation', 'Environment & Climate', 'Deep Ocean & Wildlife'],
    politics: ['Political Exposé', 'Social Justice', 'Society & Politics'],
    whistleblower: ['Corporate Whistleblower', 'Investigative Journalism', 'Political Exposé'],
    tech: ['Tech & Silicon Valley', 'Corporate Whistleblower', 'Science & Space'],
    art: ['Art & Architecture', 'Music & Arts', 'Biographical Portrait'],
    verite: ['Cinema Verité', 'Urban Life', 'Biographical Portrait'],
    oscar: ['Academy Award Winner', 'Sundance / Festival Hit'],
    sundance: ['Sundance / Festival Hit', 'Cinema Verité'],
    crime: ['Investigative Journalism', 'Corporate Whistleblower', 'Investigative & Crime']
  };

  async function getTaxonomy() {
    return { genres: CANONICAL_GENRES, tags: CANONICAL_TAGS };
  }

  function singularize(word) {
    if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
    if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
    return word;
  }

  function parseVibePrompt(prompt, taxonomy) {
    const raw = String(prompt || '').trim();
    const lower = raw.toLowerCase();
    const genreMap = new Map(taxonomy.genres.map(g => [g.toLowerCase(), g]));
    const tagMap = new Map(taxonomy.tags.map(t => [t.name.toLowerCase(), t.name]));
    const tagSingularMap = new Map(taxonomy.tags.map(t => [singularize(t.name.toLowerCase()), t.name]));

    const matchedGenres = new Set();
    const matchedTags = new Set();
    const explicitGenres = new Set();
    const explicitTags = new Set();
    const layersUsed = [];
    let decadeRange = null;

    const decMatch = lower.match(/\b(19[6-9]0|20[0-2]0|[6-9]0|00|10|20)s\b/);
    if (decMatch) {
      let yr = parseInt(decMatch[1], 10);
      if (yr < 30) yr += 2000;
      else if (yr < 100) yr += 1900;
      decadeRange = { start: yr * 10000, end: (yr + 9) * 10000 + 1231, label: `${yr}s` };
      if (yr === 1970) matchedTags.add('1970s Era');
      if (yr === 1980) matchedTags.add('1980s Era');
      if (yr === 1990) matchedTags.add('1990s Era');
    }

    const cleanWords = lower.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
    const ngrams = new Set([lower]);
    for (let i = 0; i < cleanWords.length; i++) {
      ngrams.add(cleanWords[i]);
      ngrams.add(singularize(cleanWords[i]));
      if (i + 1 < cleanWords.length) {
        const bi = `${cleanWords[i]} ${cleanWords[i + 1]}`;
        ngrams.add(bi);
        ngrams.add(singularize(bi));
      }
      if (i + 2 < cleanWords.length) {
        ngrams.add(`${cleanWords[i]} ${cleanWords[i + 1]} ${cleanWords[i + 2]}`);
      }
    }

    let layer1Hit = false;
    for (const candidate of ngrams) {
      if (genreMap.has(candidate)) {
        const g = genreMap.get(candidate);
        matchedGenres.add(g);
        explicitGenres.add(g);
        layer1Hit = true;
      }
      if (tagMap.has(candidate)) {
        const t = tagMap.get(candidate);
        matchedTags.add(t);
        explicitTags.add(t);
        layer1Hit = true;
      } else if (tagSingularMap.has(candidate) && candidate.length > 3) {
        const t = tagSingularMap.get(candidate);
        matchedTags.add(t);
        explicitTags.add(t);
        layer1Hit = true;
      }
    }
    if (layer1Hit) layersUsed.push('L1:DocTaxonomy');

    let layer2Hit = false;
    for (const [mood, expansions] of Object.entries(MOOD_LEXICON)) {
      if (lower.includes(mood)) {
        for (const term of expansions) {
          const tl = term.toLowerCase();
          if (genreMap.has(tl)) { matchedGenres.add(genreMap.get(tl)); layer2Hit = true; }
          else if (tagMap.has(tl)) { matchedTags.add(tagMap.get(tl)); layer2Hit = true; }
        }
      }
    }
    if (layer2Hit) layersUsed.push('L2:DocLexicon');

    if (matchedGenres.size === 0 && matchedTags.size === 0 && cleanWords.length > 0) {
      const stop = new Set(['doc', 'documentary', 'film', 'movie', 'series', 'show', 'like', 'with', 'about', 'that', 'from', 'very', 'good', 'best', 'vibe']);
      const meaningful = cleanWords.filter(w => w.length >= 3 && !stop.has(w));
      const scored = [];
      for (const t of taxonomy.tags) {
        const desc = (t.description + ' ' + t.name).toLowerCase();
        let score = 0;
        for (const w of meaningful) if (desc.includes(w)) score += 1;
        if (score > 0) scored.push({ name: t.name, score });
      }
      scored.sort((a, b) => b.score - a.score);
      scored.slice(0, 4).forEach(s => matchedTags.add(s.name));
      if (matchedTags.size > 0) layersUsed.push('L3:DocDescFallback');
    }

    return {
      raw,
      genres: Array.from(matchedGenres),
      tags: Array.from(matchedTags),
      explicitGenres: Array.from(explicitGenres),
      explicitTags: Array.from(explicitTags),
      decadeRange,
      layersUsed
    };
  }

  async function fetchVibeCandidates(parsed, { limit = 26, maxPopularity = null } = {}) {
    const tagSet = new Set((parsed.tags || []).map(t => t.toLowerCase()));
    const genreSet = new Set((parsed.genres || []).map(g => g.toLowerCase()));
    const rawWords = String(parsed.raw || '').toLowerCase().split(/\s+/).filter(w => w.length >= 3);

    let pool = [...CANONICAL_DOC_LIST];
    if (maxPopularity) {
      const sub = pool.filter(m => (m.popularity || 0) <= maxPopularity);
      if (sub.length >= 6) pool = sub;
    }

    const scored = pool.map(m => {
      let score = 0;
      let hits = 0;
      for (const t of (m.tags || [])) {
        if (tagSet.has(t.name.toLowerCase())) { score += (t.rank || 75) * 1.4; hits++; }
      }
      for (const g of (m.genres || [])) {
        if (genreSet.has(g.toLowerCase())) { score += 55; hits++; }
      }
      const text = `${getDisplayTitle(m)} ${m.description} ${(m.studios?.nodes || []).map(s => s.name).join(' ')}`.toLowerCase();
      for (const w of rawWords) {
        if (text.includes(w)) { score += 28; hits++; }
      }
      if (parsed.decadeRange) {
        const sy = Math.floor(parsed.decadeRange.start / 10000);
        const ey = Math.floor(parsed.decadeRange.end / 10000);
        if (m.seasonYear >= sy && m.seasonYear <= ey) score += 45;
      }
      if (hits >= 2) score *= (1 + Math.min(4, hits) * 0.14);
      score += (m.averageScore || 80) * 0.25;
      return { m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(x => x.m);
  }

  // Quick-Import Documentary Starter / Theme Pack into Watchlist
  async function importAniListWatchlist(packName) {
    const clean = String(packName || 'starter').trim();
    const low = clean.toLowerCase();
    let picks = [];
    if (low === 'starter' || low === 'essentials') {
      picks = CANONICAL_DOC_LIST.slice(0, 12);
    } else {
      picks = CANONICAL_DOC_LIST.filter(m => {
        const hay = `${getDisplayTitle(m)} ${(m.genres || []).join(' ')} ${(m.tags || []).map(t => t.name).join(' ')} ${(m.studios?.nodes || []).map(s => s.name).join(' ')} ${(m._matchedPlatforms || []).join(' ')}`.toLowerCase();
        return hay.includes(low);
      }).slice(0, 14);
    }
    if (!picks.length) throw new Error(`No documentaries matched pack "${clean}". Try "starter", "Nature", "Space", "History", "Music", "PBS", or "Netflix".`);

    const state = getState();
    let importedCount = 0;
    for (const m of picks) {
      const prev = state.watchlist[m.id] || {};
      state.watchlist[m.id] = {
        id: m.id,
        title: getDisplayTitle(m),
        cover: getCover(m),
        format: m.format || 'FEATURE_DOC',
        docStyle: m.docStyle || 'Observational',
        episodes: m.episodes ?? null,
        averageScore: m.averageScore ?? null,
        popularity: m.popularity ?? null,
        seasonYear: m.seasonYear ?? null,
        genres: m.genres || [],
        status: prev.status ? normalizeStatus(prev.status) : 'Watchlist',
        rating: prev.rating || 0,
        progress: prev.progress || 0,
        notes: prev.notes || `[Imported via "${clean}" Doc Pack]`,
        dubOverride: prev.dubOverride || m.docStyle || '',
        customPlatforms: prev.customPlatforms || m._matchedPlatforms || [],
        customFreeWithAds: Boolean(prev.customFreeWithAds),
        updatedAt: Date.now()
      };
      delete state.tombstones[m.id];
      importedCount++;
    }
    state.settings.anilistUsername = clean;
    saveState(state, { triggerGist: true });
    return importedCount;
  }

  // --------------------------------------------------------------------------
  // Multi-Source Detail Enrichment (TVMaze, Wikipedia, TMDB US, OMDb)
  // --------------------------------------------------------------------------
  function normalizeTitleKey(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\b(the|a|an|season|part|tv|docuseries|documentary)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titlesMatch(expectedTitles, candidate) {
    const cand = normalizeTitleKey(candidate);
    if (!cand || cand.length < 2) return false;
    const candWords = new Set(cand.split(' ').filter(w => w.length >= 2));
    for (const rawExp of expectedTitles) {
      const exp = normalizeTitleKey(rawExp);
      if (!exp) continue;
      if (cand === exp || cand.includes(exp) || exp.includes(cand)) return true;
      const expWords = exp.split(' ').filter(w => w.length >= 2);
      if (!expWords.length) continue;
      let hits = 0;
      for (const w of expWords) if (candWords.has(w)) hits++;
      if (hits / Math.max(expWords.length, candWords.size) >= 0.55) return true;
    }
    return false;
  }

  async function fetchWikipediaSummary(title) {
    if (!title) return null;
    const cleanTitle = title.replace(/\s*\(Season.*?\)/i, '').trim();
    const cacheKey = `wiki_doc_v1_${cleanTitle.toLowerCase()}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const trySummary = async (pageTitle) => {
      const data = await fetchJsonSafe(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`);
      if (data && data.extract && data.type !== 'disambiguation') {
        return {
          title: data.title,
          extract: data.extract,
          image: data.originalimage?.source || data.thumbnail?.source || '',
          url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}`
        };
      }
      return null;
    };

    const search = await fetchJsonSafe(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanTitle + ' documentary')}&limit=5&format=json&origin=*`);
    let rawCandidates = (Array.isArray(search?.[1]) ? search[1] : []).filter(c => c && !/^(list of|episodes of)\b/i.test(c));
    if (!rawCandidates.length) {
      const fallback = await fetchJsonSafe(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanTitle)}&limit=5&format=json&origin=*`);
      rawCandidates = (Array.isArray(fallback?.[1]) ? fallback[1] : []).filter(c => c && !/^(list of|episodes of)\b/i.test(c));
    }

    let result = null;
    for (const c of rawCandidates) {
      result = await trySummary(c);
      if (result) break;
    }
    if (result) await cacheSet(cacheKey, result, TTL_STABLE);
    return result;
  }

  async function fetchTmdbUsProviders(title, year, tmdbKey) {
    if (!tmdbKey || !title) return null;
    const cacheKey = `tmdb_doc_us_${title.toLowerCase()}_${year || ''}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const search = await fetchJsonSafe(`https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(tmdbKey)}&query=${encodeURIComponent(title)}`);
    const hit = (search?.results || []).find(r => (r.media_type === 'tv' || r.media_type === 'movie') && titlesMatch([title], r.name || r.title || r.original_name || r.original_title));
    if (!hit) return null;

    const prov = await fetchJsonSafe(`https://api.themoviedb.org/3/${hit.media_type}/${hit.id}/watch/providers?api_key=${encodeURIComponent(tmdbKey)}`);
    const us = prov?.results?.US;
    if (!us) return null;

    const collect = (arr) => (arr || []).map(p => p.provider_name);
    const out = {
      tmdbId: hit.id,
      mediaType: hit.media_type,
      link: us.link || '',
      flatrate: collect(us.flatrate),
      ads: collect(us.ads),
      free: collect(us.free),
      rent: collect(us.rent)
    };
    await cacheSet(cacheKey, out, TTL_STABLE);
    return out;
  }

  // Lazy poster hydrator (IndexedDB -> OMDb -> TVMaze IMDb lookup -> Wikipedia summary image)
  async function resolveImdbPosterUrl(media) {
    if (!media) return '';
    const keyPart = media.imdbId || String(media.id);
    const cacheKey = `poster_doc_v1_${keyPart}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      media.coverImage = { large: cached, medium: cached, color: media.coverImage?.color || '#0ea5e9' };
      media._needsPosterHydration = false;
      return cached;
    }

    let found = '';
    const omdbKey = getState().settings.omdbKey || '';
    if (omdbKey && media.imdbId) {
      const oData = await fetchJsonSafe(`https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&i=${encodeURIComponent(media.imdbId)}`, 4000);
      if (oData?.Poster && oData.Poster !== 'N/A') found = oData.Poster.replace(/^http:\/\//i, 'https://');
    }
    if (!found && media.imdbId && (media.format === 'DOCUSERIES' || media.format === 'MINI_SERIES')) {
      const tv = await fetchJsonSafe(`https://api.tvmaze.com/lookup/shows?imdb=${encodeURIComponent(media.imdbId)}`, 4000);
      if (tv?.image?.original || tv?.image?.medium) {
        found = (tv.image.original || tv.image.medium).replace(/^http:\/\//i, 'https://');
      }
    }
    if (!found) {
      const title = getDisplayTitle(media);
      const wData = await fetchJsonSafe(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, '_'))}`, 4000);
      const src = wData?.originalimage?.source || wData?.thumbnail?.source;
      if (src) found = src.split('?')[0];
    }
    if (found) {
      media.coverImage = { large: found, medium: found, color: media.coverImage?.color || '#0ea5e9' };
      media._needsPosterHydration = false;
      await cacheSet(cacheKey, found, TTL_STABLE);
    }
    return found;
  }

  // Polite rate-limited poster hydration queue (max 2 concurrent, 350ms spacing, IndexedDB cached)
  const posterQueue = [];
  let posterActive = 0;
  function enqueuePosterHydration(fn) {
    posterQueue.push(fn);
    pumpPosterQueue();
  }
  function pumpPosterQueue() {
    while (posterActive < 2 && posterQueue.length) {
      const task = posterQueue.shift();
      posterActive++;
      Promise.resolve().then(task).finally(() => {
        setTimeout(() => { posterActive--; pumpPosterQueue(); }, 350);
      });
    }
  }

  function hydrateCardPosters(container, itemsById) {
    if (!container || !itemsById) return;
    const cards = Array.from(container.querySelectorAll('.anime-card[data-anime-id], .anime-card[data-id]'));
    if (!cards.length) return;

    const hydrateOne = (card) => {
      const id = Number(card.dataset.animeId || card.dataset.id);
      const m = itemsById.get(id);
      if (!m || !m._needsPosterHydration) return;
      enqueuePosterHydration(async () => {
        const url = await resolveImdbPosterUrl(m);
        if (url) {
          const img = card.querySelector('img.anime-card-cover');
          if (img) img.src = url;
        }
      });
    };

    if (typeof IntersectionObserver !== 'undefined') {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            obs.unobserve(entry.target);
            hydrateOne(entry.target);
          }
        });
      }, { rootMargin: '150px' });
      cards.forEach(c => {
        const id = Number(c.dataset.animeId || c.dataset.id);
        if (itemsById.get(id)?._needsPosterHydration) obs.observe(c);
      });
    } else {
      cards.slice(0, 12).forEach(hydrateOne);
    }
  }

  async function fetchOmdbDetails(media, omdbKey) {
    if (!omdbKey || !media) return null;
    const imdbId = media.imdbId || '';
    const title = getDisplayTitle(media).replace(/\s*\(Season.*?\)/i, '').trim();
    const cacheKey = `omdb_doc_v1_${imdbId || title.toLowerCase()}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const url = imdbId
      ? `https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&i=${encodeURIComponent(imdbId)}&plot=short`
      : `https://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&t=${encodeURIComponent(title)}&plot=short`;
    const data = await fetchJsonSafe(url, 4800);
    if (!data || data.Response === 'False') return null;

    const rt = (data.Ratings || []).find(r => r.Source === 'Rotten Tomatoes')?.Value || '';
    const out = {
      imdbID: data.imdbID || imdbId,
      imdbRating: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : '',
      imdbVotes: data.imdbVotes && data.imdbVotes !== 'N/A' ? data.imdbVotes : '',
      rottenTomatoes: rt,
      metascore: data.Metascore && data.Metascore !== 'N/A' ? data.Metascore : '',
      rated: data.Rated && data.Rated !== 'N/A' ? data.Rated : '',
      awards: data.Awards && data.Awards !== 'N/A' ? data.Awards : '',
      plot: data.Plot && data.Plot !== 'N/A' ? data.Plot : '',
      poster: data.Poster && data.Poster !== 'N/A' ? data.Poster.replace(/^http:\/\//i, 'https://') : ''
    };
    await cacheSet(cacheKey, out, TTL_STABLE);
    return out;
  }

  async function fetchMultiSourceDetails(media) {
    if (!media || !media.id) return {};
    const cacheKey = `multisrc_doc_v1_${media.id}`;
    const st = getState().settings;
    const tmdbKey = st.tmdbKey || '';
    const omdbKey = st.omdbKey || '';
    const cached = await cacheGet(cacheKey);
    if (cached && (!tmdbKey || cached.tmdb !== undefined) && (!omdbKey || cached.omdb !== undefined)) return cached;

    const title = getDisplayTitle(media).replace(/\s*\(Season.*?\)/i, '').trim();

    const tvmazeTask = (async () => {
      if (media.format === 'FEATURE_DOC') return null;
      const results = await fetchJsonSafe(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title)}`, 4500);
      if (!Array.isArray(results)) return null;
      const hit = results.map(r => r.show).find(s => s && s.name && isAuthenticDocumentaryShow(s) && titlesMatch([title], s.name));
      if (!hit) return null;
      return {
        rating: hit.rating?.average,
        network: hit.network?.name || hit.webChannel?.name || '',
        status: hit.status,
        imdb: hit.externals?.imdb || '',
        officialSite: hit.officialSite || '',
        url: hit.url
      };
    })();

    const wikiTask = fetchWikipediaSummary(title);
    const tmdbTask = tmdbKey ? fetchTmdbUsProviders(title, media.seasonYear, tmdbKey) : Promise.resolve(undefined);
    const omdbTask = omdbKey ? fetchOmdbDetails(media, omdbKey) : Promise.resolve(undefined);

    const [tvmaze, wikipedia, tmdb, omdb] = await Promise.all([
      tvmazeTask, wikiTask, tmdbTask, omdbTask
    ]);

    const bundle = { tvmaze, wikipedia, tmdb, omdb };
    if (tvmaze || wikipedia || tmdb || omdb) {
      await cacheSet(cacheKey, bundle, TTL_STABLE);
    }
    return bundle;
  }

  // --------------------------------------------------------------------------
  // Accessible Shared Navigation Bar & Documentary Detail Modal
  // --------------------------------------------------------------------------
  function updateNavBadges(state) {
    const badge = document.getElementById('af-nav-wl-count');
    if (badge) badge.textContent = String(Object.keys(state.watchlist || {}).length);
  }

  function mountNav(activePage) {
    const host = document.getElementById('af-nav-host');
    if (!host) return;
    const state = getState();
    const wlCount = Object.keys(state.watchlist || {}).length;
    const hasGist = Boolean(state.settings.gistToken && state.settings.gistId);

    host.innerHTML = `
      <header class="af-nav" role="banner">
        <a class="af-brand" href="./index.html">
          <img src="./icon.svg" alt="" width="30" height="30">
          <span>DocFinder</span>
          <span class="af-brand-sub">Series &amp; Film</span>
        </a>
        <nav class="af-nav-links" aria-label="Primary Suite Navigation">
          <a class="af-nav-link ${activePage === 'hub' ? 'active' : ''}" href="./index.html" ${activePage === 'hub' ? 'aria-current="page"' : ''}>
            Doc Hub <span class="badge badge-muted" id="af-nav-wl-count" title="Saved Documentaries">${wlCount}</span>
          </a>
          <a class="af-nav-link ${activePage === 'graph' ? 'active' : ''}" href="./vibe-graph.html" ${activePage === 'graph' ? 'aria-current="page"' : ''}>
            Doc Vibe Graph
          </a>
          <a class="af-nav-link ${activePage === 'lab' ? 'active' : ''}" href="./eclectic-lab.html" ${activePage === 'lab' ? 'aria-current="page"' : ''}>
            Discovery Lab
          </a>
        </nav>
        <div class="af-nav-right">
          <a href="./index.html?tab=saved" id="af-sync-pill" class="sync-pill" data-state="${hasGist ? 'synced' : 'local'}" title="Storage &amp; Gist Sync Status">
            <span class="sync-dot" aria-hidden="true"></span>
            <span class="sync-label">${hasGist ? 'Gist Ready' : 'Local Storage'}</span>
          </a>
        </div>
      </header>
      <div class="af-stream-filter-bar" id="af-global-stream-bar" role="region" aria-label="Filter by Streaming Services">
        <div class="af-stream-filter-inner">
          <span class="af-stream-filter-label">
            Streaming:
            <span id="af-stream-filter-status" class="badge badge-muted">All Services</span>
          </span>
          <div class="af-stream-pills">
            <button type="button" class="af-stream-pill" data-global-pf="free" aria-pressed="false">★ Free / PBS</button>
            ${PLATFORM_CONFIG.map(p => `
              <button type="button" class="af-stream-pill" data-global-pf="${p.id}" aria-pressed="false">
                <span style="width:7px;height:7px;border-radius:50%;background:${p.color};display:inline-block;flex-shrink:0;"></span>
                ${escapeHtml(p.name)}
              </button>
            `).join('')}
          </div>
          <button type="button" class="af-stream-clear-btn" id="af-stream-filter-clear" disabled title="Reset streaming filter to show all services">✕ Clear (All Services)</button>
        </div>
      </div>
    `;

    const streamBar = host.querySelector('#af-global-stream-bar');
    if (streamBar) {
      streamBar.querySelectorAll('[data-global-pf]').forEach(btn => {
        btn.addEventListener('click', () => toggleStreamingFilter(btn.dataset.globalPf));
      });
      streamBar.querySelector('#af-stream-filter-clear')?.addEventListener('click', () => clearStreamingFilter());
      syncGlobalStreamingFilterBar();
    }

    checkHashSyncOnBoot();
    if (hasGist && state.settings.gistAutoSync) {
      gistPull({ silent: true });
    }

    if (!document.getElementById('af-back-to-top')) {
      const btn = document.createElement('button');
      btn.id = 'af-back-to-top';
      btn.type = 'button';
      btn.className = 'back-to-top-btn';
      btn.setAttribute('aria-label', 'Back to top and filters');
      btn.innerHTML = '↑ Top';
      btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      document.body.appendChild(btn);
      const toggleVis = () => btn.classList.toggle('visible', window.scrollY > 420);
      window.addEventListener('scroll', toggleVis, { passive: true });
    }
  }

  let lastFocusedEl = null;
  let activeModalAnime = null;
  let activeModalFlushFn = null;

  global.addEventListener('beforeunload', () => {
    if (typeof activeModalFlushFn === 'function') {
      try { activeModalFlushFn(); } catch {}
    }
  });

  function ensureDetailModal() {
    let backdrop = document.getElementById('af-detail-modal-backdrop');
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = 'af-detail-modal-backdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="af-modal-title" tabindex="-1">
        <div class="modal-header">
          <h3 id="af-modal-title" style="margin:0;font-size:17px;">Documentary Dossier</h3>
          <button type="button" class="btn btn-sm" id="af-modal-close" aria-label="Close modal">✕ Close <span class="kbd">Esc</span></button>
        </div>
        <div class="modal-body" id="af-modal-body"></div>
        <div class="modal-footer" id="af-modal-footer" hidden></div>
      </div>
    `;
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', (ev) => { if (ev.target === backdrop) closeDetailModal(); });
    backdrop.querySelector('#af-modal-close').addEventListener('click', closeDetailModal);
    backdrop.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); closeDetailModal(); return; }
      if (ev.key !== 'Tab') return;
      const focusables = backdrop.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    });
    return backdrop;
  }

  function closeDetailModal() {
    if (typeof activeModalFlushFn === 'function') {
      try { activeModalFlushFn(); } catch {}
      activeModalFlushFn = null;
    }
    const backdrop = document.getElementById('af-detail-modal-backdrop');
    if (!backdrop || !backdrop.classList.contains('open')) return;
    backdrop.classList.remove('open');
    activeModalAnime = null;
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
    lastFocusedEl = null;
  }

  async function openDetailModal(mediaOrId) {
    lastFocusedEl = document.activeElement;
    const backdrop = ensureDetailModal();
    const titleEl = backdrop.querySelector('#af-modal-title');
    const bodyEl = backdrop.querySelector('#af-modal-body');
    const footerEl = backdrop.querySelector('#af-modal-footer');
    backdrop.classList.add('open');
    bodyEl.innerHTML = `<div class="empty-state"><span class="spinner"></span> Opening documentary details...</div>`;
    if (footerEl) { footerEl.innerHTML = ''; footerEl.hidden = true; }
    backdrop.querySelector('.modal-dialog').focus();

    let media = typeof mediaOrId === 'object' ? mediaOrId : null;
    if (!media || !media.description) {
      try {
        const fetched = await fetchAnimeById(typeof mediaOrId === 'object' ? mediaOrId.id : mediaOrId);
        if (fetched) media = fetched;
      } catch (err) {
        if (!media) {
          bodyEl.innerHTML = `<div class="empty-state">Failed to load documentary: ${escapeHtml(err.message)}</div>`;
          return;
        }
      }
    }
    activeModalAnime = media;

    const state = getState();
    const wl = state.watchlist[media.id] || null;
    const ovr = state.overrides[media.id] || wl || {};
    const curStatus = wl?.status || ovr?.status || 'Watchlist';
    const curRating = Number(wl?.rating ?? ovr?.rating ?? 0);
    const curProgress = Number(wl?.progress ?? ovr?.progress ?? 0);
    const curNotes = wl?.notes ?? ovr?.notes ?? '';
    const title = getDisplayTitle(media);
    const cover = getCover(media);
    const studioNodes = media.studios?.nodes || [];
    const studiosHtml = studioNodes.length
      ? studioNodes.map(s => `<a href="./index.html?tab=archives&amp;studio=${encodeURIComponent(s.name)}" style="color:var(--cyan);font-weight:600;">${escapeHtml(s.name)}</a>`).join(', ')
      : 'Independent Production';
    const sourceLabel = formatSourceLabel(media.source);
    const keyStaff = getKeyStaff(media);
    const topTags = getTopSubgenreTags(media, 5);
    const platforms = detectPlatforms(media);
    const dubInfo = getDubTrackInfo(media, media.nextAiringEpisode ? Math.max(1, media.nextAiringEpisode.episode - 1) : null);
    const dubLabel = dubInfo.dub;
    const freeAds = isFreeWithAds(media, platforms);
    const DAY_OPTS = [
      { v: '', l: 'Same day as Broadcast' },
      { v: '0', l: 'Monday' }, { v: '1', l: 'Tuesday' }, { v: '2', l: 'Wednesday' },
      { v: '3', l: 'Thursday' }, { v: '4', l: 'Friday' }, { v: '5', l: 'Saturday' }, { v: '6', l: 'Sunday' }
    ];

    titleEl.textContent = title;

    const ytTrailerId = media.trailer?.site === 'youtube' && /^[a-zA-Z0-9_-]{11}$/.test(media.trailer.id) ? media.trailer.id : null;
    const justWatchUrl = `https://www.justwatch.com/us/search?q=${encodeURIComponent(title)}`;
    const initialStreamLinks = getStreamingLinks(media);
    const renderStreamChipsHtml = (links) => links.length
      ? links.map(s => `<a class="stream-link-chip" href="${escapeHtml(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer" title="${s.isDirect ? 'Open directly on ' + escapeHtml(s.name) : 'Search on ' + escapeHtml(s.name)}" style="border-color:${s.color};color:${s.color};">▶ ${escapeHtml(s.name)}${s.freeWithAds ? ' (Free)' : ''} ↗</a>`).join('')
      : `<span style="font-size:12px;color:var(--text-dim);">No US streaming service indexed yet — check JustWatch US below or add a custom override</span>`;
    const cleanSynopsis = stripHtml(media.description || '').trim() || 'No documentary synopsis available.';
    const isLongSynopsis = cleanSynopsis.length > 260;

    bodyEl.innerHTML = `
      <div class="detail-hero">
        <img class="detail-cover" src="${escapeHtml(cover)}" alt="${escapeHtml(title)} cover">
        <div style="display:flex;flex-direction:column;gap:10px;min-width:0;">
          <div class="meta-row">
            ${media.averageScore ? `<span class="badge badge-emerald">★ ${media.averageScore}% Rating</span>` : ''}
            ${media.format ? `<span class="badge badge-accent">${escapeHtml(media.format === 'FEATURE_DOC' ? 'FEATURE FILM' : media.format === 'MINI_SERIES' ? 'LIMITED SERIES' : 'DOCUSERIES')}</span>` : ''}
            ${sourceLabel ? `<span class="badge badge-purple">${escapeHtml(sourceLabel)}</span>` : ''}
            ${media.seasonYear ? `<span class="badge badge-muted">${media.seasonYear}</span>` : ''}
            ${media.episodes ? `<span class="badge badge-muted">${media.episodes === 1 ? 'Feature Film' : media.episodes + ' eps'}${media.duration ? ' · ' + media.duration + 'm' : ''}</span>` : ''}
            <span class="badge badge-cyan" id="af-modal-dub-badge">${escapeHtml(dubLabel)}</span>
            ${freeAds ? `<span class="badge badge-amber">Free / PBS</span>` : ''}
            <span class="badge badge-muted">Reach: ${formatCompactNumber(media.popularity)}</span>
          </div>
          <div class="meta-row" id="af-modal-stream-bar" style="gap:6px;align-items:center;">
            <span style="font-size:11.5px;color:var(--text-dim);font-weight:700;">WATCH / STREAM ON:</span>
            ${renderStreamChipsHtml(initialStreamLinks)}
          </div>
          <div style="font-size:12.5px;color:var(--text-muted);">
            <strong>Network / Studio:</strong> ${studiosHtml} &nbsp;•&nbsp; <strong>Subjects:</strong> ${escapeHtml((media.genres || []).join(', ') || 'Documentary')}
          </div>
          ${keyStaff.length ? `
            <div class="meta-row" style="gap:6px;">
              <span style="font-size:11.5px;color:var(--text-dim);font-weight:700;">DIRECTORS / FILMMAKERS:</span>
              ${keyStaff.map(st => `<a class="badge badge-muted" href="./eclectic-lab.html?tab=auteur&amp;staff=${encodeURIComponent(st.name)}" title="Open in Director &amp; Filmmaker Tree" style="text-decoration:none;"><strong style="color:var(--cyan);">${escapeHtml(st.role)}:</strong>&nbsp;${escapeHtml(st.name)} ↗</a>`).join('')}
            </div>
          ` : ''}
          ${topTags.length ? `
            <div class="meta-row" style="gap:5px;">
              <span style="font-size:11.5px;color:var(--text-dim);font-weight:700;">DOCUMENTARY TAGS:</span>
              ${topTags.map(t => `<a class="badge badge-accent" href="./vibe-graph.html?vibe=${encodeURIComponent(t)}" title="Explore #${escapeHtml(t)} in Doc Vibe Graph" style="text-decoration:none;">#${escapeHtml(t)}</a>`).join('')}
            </div>
          ` : ''}
          <p id="af-modal-synopsis" class="${isLongSynopsis ? 'synopsis-clamped' : ''}" style="margin:0;font-size:13px;color:#cbd5e1;white-space:pre-line;line-height:1.55;">
            ${escapeHtml(cleanSynopsis)}
          </p>
          ${isLongSynopsis ? `<button type="button" class="synopsis-toggle" id="af-synopsis-toggle">Read full synopsis ▾</button>` : ''}
          <div class="meta-row" style="margin-top:auto;">
            <a class="btn btn-primary btn-sm" href="./vibe-graph.html?seed=${media.id}">Explore in Vibe Graph</a>
            <a class="btn btn-cyan btn-sm" href="./eclectic-lab.html?tab=arithmetic&seed=${media.id}">Send to Doc Arithmetic</a>
            ${ytTrailerId ? `<button type="button" class="btn btn-sm" id="af-toggle-trailer">▶ Watch Official Trailer</button>` : ''}
            <a class="btn btn-sm" href="${justWatchUrl}" target="_blank" rel="noopener noreferrer">JustWatch US ↗</a>
            <a class="btn btn-sm" id="af-imdb-hero-link" href="${media.imdbId ? `https://www.imdb.com/title/${encodeURIComponent(media.imdbId)}/` : `https://www.imdb.com/find/?q=${encodeURIComponent(title)}`}" target="_blank" rel="noopener noreferrer" style="border-color:rgba(245,158,11,0.55);color:#fde68a;">IMDb${media.imdbRating ? ` ★ ${media.imdbRating}` : ''} ↗</a>
            <a class="btn btn-sm" href="https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">Wikipedia ↗</a>
          </div>
          <div id="af-trailer-slot"></div>
        </div>
      </div>

      <div class="detail-section">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
          <h4 style="margin:0;">Watchlist &amp; Personal Tracking</h4>
          <span id="af-autosave-badge" class="badge badge-muted" style="font-size:11px;">Changes auto-save on edit</span>
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label for="af-wl-status">Status</label>
            <select id="af-wl-status" class="select">
              ${WATCHLIST_STATUSES.map(st => `<option value="${st}" ${curStatus === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label for="af-wl-rating">My Rating (0–10)</label>
            <select id="af-wl-rating" class="select">
              <option value="0">Unrated</option>
              ${[10,9,8,7,6,5,4,3,2,1].map(r => `<option value="${r}" ${curRating === r ? 'selected' : ''}>${r} / 10</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label for="af-wl-progress">Episodes / Parts Watched</label>
            <div style="display:flex;gap:6px;">
              <input id="af-wl-progress" type="number" min="0" max="${media.episodes || 9999}" class="input input-full" value="${curProgress}">
              <button type="button" class="btn btn-sm" id="af-wl-inc" title="Increment episode">+1</button>
            </div>
          </div>
          <div class="form-field">
            <label for="af-wl-dub">Documentary Style / Track Override</label>
            <select id="af-wl-dub" class="select">
              ${DUB_OPTIONS.map(d => `<option value="${d}" ${(ovr.dubOverride || '') === d ? 'selected' : ''}>${d || 'Auto (' + dubLabel + ')'}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label for="af-wl-dublag">Release Delay (0 = Simul-Release)</label>
            <input id="af-wl-dublag" type="number" min="0" max="1500" class="input input-full" placeholder="Blank=unset, 0=Simul, 1=1w lag" value="${ovr.dubLag ?? ''}">
          </div>
          <div class="form-field">
            <label for="af-wl-dubday">Delayed Streaming Day</label>
            <select id="af-wl-dubday" class="select">
              ${DAY_OPTS.map(o => `<option value="${o.v}" ${String(ovr.dubDay ?? '') === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-field" style="margin-top:10px;">
          <label for="af-wl-notes">Personal Notes &amp; Takeaways</label>
          <textarea id="af-wl-notes" class="textarea" placeholder="Favorite scenes, key quotes, topics to research further...">${escapeHtml(curNotes)}</textarea>
        </div>
        <div class="form-field" style="margin-top:10px;">
          <label>Custom Streaming Platform Overrides</label>
          <div class="pills-row" id="af-custom-platforms">
            ${PLATFORM_CONFIG.map(p => {
              const active = (ovr.customPlatforms || []).includes(p.id);
              return `<button type="button" class="pill ${active ? 'active' : ''}" data-pid="${p.id}">${escapeHtml(p.name)}</button>`;
            }).join('')}
            <button type="button" class="pill ${ovr.customFreeWithAds ? 'active' : ''}" id="af-custom-free-ads">★ Free / Public Broadcast</button>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Streaming &amp; Multi-Source Documentary Metadata (TVMaze · Wikipedia · IMDb/OMDb · TMDB US)</h4>
        <div id="af-multisrc-area" style="font-size:13px;color:var(--text-muted);">
          <span class="spinner"></span> Querying Wikipedia, TVMaze${state.settings.tmdbKey ? ', TMDB US' : ''}${state.settings.omdbKey ? ', OMDb' : ''}...
        </div>
      </div>
    `;

    if (footerEl) {
      footerEl.hidden = false;
      footerEl.innerHTML = `
        <button type="button" class="btn btn-emerald" id="af-wl-save">${wl ? 'Update Watchlist' : '+ Add to Watchlist'}</button>
        <button type="button" class="btn btn-sm" id="af-ovr-only">Save Platform/Style Overrides Only</button>
        ${wl ? `<button type="button" class="btn btn-danger btn-sm" id="af-wl-remove" style="margin-left:auto;">Remove from Watchlist</button>` : ''}
      `;
    }

    const synToggle = bodyEl.querySelector('#af-synopsis-toggle');
    if (synToggle) {
      synToggle.addEventListener('click', () => {
        const p = bodyEl.querySelector('#af-modal-synopsis');
        const expanded = !p.classList.contains('synopsis-clamped');
        p.classList.toggle('synopsis-clamped', expanded);
        synToggle.textContent = expanded ? 'Read full synopsis ▾' : 'Show less ▴';
      });
    }

    const trailerBtn = bodyEl.querySelector('#af-toggle-trailer');
    if (trailerBtn && ytTrailerId) {
      trailerBtn.addEventListener('click', () => {
        const slot = bodyEl.querySelector('#af-trailer-slot');
        if (slot.innerHTML) {
          slot.innerHTML = '';
          trailerBtn.textContent = '▶ Watch Official Trailer';
        } else {
          slot.innerHTML = `<div class="trailer-embed-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytTrailerId)}?autoplay=1" title="Official Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
          trailerBtn.textContent = '✕ Hide Trailer';
        }
      });
    }

    const customSet = new Set(ovr.customPlatforms || []);
    let customFree = Boolean(ovr.customFreeWithAds);
    let modalAutoSaveTimer = null;
    let pendingAutoSaveMode = null;

    const readDubScheduleInputs = () => {
      const rawLag = bodyEl.querySelector('#af-wl-dublag')?.value.trim() ?? '';
      return {
        dubOverride: bodyEl.querySelector('#af-wl-dub').value,
        dubLag: rawLag === '' ? null : Math.max(0, Number(rawLag)),
        dubDay: bodyEl.querySelector('#af-wl-dubday')?.value ?? ''
      };
    };

    const readAllModalTrackingFields = () => ({
      status: bodyEl.querySelector('#af-wl-status')?.value || 'Watchlist',
      rating: Number(bodyEl.querySelector('#af-wl-rating')?.value) || 0,
      progress: Math.max(0, Number(bodyEl.querySelector('#af-wl-progress')?.value) || 0),
      notes: bodyEl.querySelector('#af-wl-notes')?.value ?? '',
      ...readDubScheduleInputs(),
      customPlatforms: Array.from(customSet),
      customFreeWithAds: customFree
    });

    const markAutoSavedBadge = (labelText = '✓ Auto-saved') => {
      const badge = bodyEl.querySelector('#af-autosave-badge');
      if (badge) { badge.className = 'badge badge-emerald'; badge.textContent = labelText; }
      const saveBtn = backdrop.querySelector('#af-wl-save');
      if (saveBtn && getState().watchlist[media.id]) saveBtn.textContent = '✓ Saved in Watchlist';
    };

    const syncModalHeroDubBadge = () => {
      const heroDubBadge = bodyEl.querySelector('#af-modal-dub-badge');
      if (heroDubBadge) heroDubBadge.textContent = classifyDub(media);
    };

    const persistModalChangesNow = (mode = 'watchlist') => {
      if (modalAutoSaveTimer) { clearTimeout(modalAutoSaveTimer); modalAutoSaveTimer = null; }
      pendingAutoSaveMode = null;
      if (!bodyEl.querySelector('#af-wl-status')) return;
      const fields = readAllModalTrackingFields();
      const inWl = Boolean(getState().watchlist[media.id]);
      if (mode === 'watchlist' || inWl) {
        upsertWatchlistItem(media, fields);
        markAutoSavedBadge('✓ Auto-saved to Watchlist');
      } else {
        updateOverrides(media.id, fields);
        markAutoSavedBadge('✓ Overrides auto-saved');
      }
      syncModalHeroDubBadge();
    };

    const scheduleModalAutoSave = (mode = 'watchlist', immediate = false) => {
      if (pendingAutoSaveMode !== 'watchlist') pendingAutoSaveMode = mode;
      if (immediate) { persistModalChangesNow(pendingAutoSaveMode); return; }
      const badge = bodyEl.querySelector('#af-autosave-badge');
      if (badge) { badge.className = 'badge badge-cyan'; badge.textContent = 'Saving...'; }
      if (modalAutoSaveTimer) clearTimeout(modalAutoSaveTimer);
      modalAutoSaveTimer = setTimeout(() => persistModalChangesNow(pendingAutoSaveMode || mode), 250);
    };

    activeModalFlushFn = () => {
      if (modalAutoSaveTimer || pendingAutoSaveMode) persistModalChangesNow(pendingAutoSaveMode || 'watchlist');
    };

    const refreshHeroStreamBar = (extraLinks = [], extraStreamNames = []) => {
      const bar = bodyEl.querySelector('#af-modal-stream-bar');
      if (!bar) return;
      const links = getStreamingLinks(media, extraLinks, extraStreamNames);
      bar.innerHTML = `<span style="font-size:11.5px;color:var(--text-dim);font-weight:700;">WATCH / STREAM ON:</span>${renderStreamChipsHtml(links)}`;
    };

    bodyEl.querySelectorAll('#af-custom-platforms [data-pid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.pid;
        if (customSet.has(pid)) { customSet.delete(pid); btn.classList.remove('active'); }
        else { customSet.add(pid); btn.classList.add('active'); }
        scheduleModalAutoSave('overrides', true);
        refreshHeroStreamBar();
      });
    });
    const freeBtn = bodyEl.querySelector('#af-custom-free-ads');
    freeBtn.addEventListener('click', () => {
      customFree = !customFree;
      freeBtn.classList.toggle('active', customFree);
      scheduleModalAutoSave('overrides', true);
    });

    bodyEl.querySelector('#af-wl-inc').addEventListener('click', () => {
      const inp = bodyEl.querySelector('#af-wl-progress');
      inp.value = String((Number(inp.value) || 0) + 1);
      scheduleModalAutoSave('watchlist', true);
    });

    ['#af-wl-status', '#af-wl-rating'].forEach(sel => {
      bodyEl.querySelector(sel)?.addEventListener('change', () => scheduleModalAutoSave('watchlist', true));
    });
    const dubSelect = bodyEl.querySelector('#af-wl-dub');
    const lagInput = bodyEl.querySelector('#af-wl-dublag');
    const dubDaySelect = bodyEl.querySelector('#af-wl-dubday');

    if (dubSelect) {
      dubSelect.addEventListener('change', () => {
        if (dubSelect.value === 'Simul-Release' && lagInput) {
          lagInput.value = '0';
          if (dubDaySelect) dubDaySelect.value = '';
        }
        scheduleModalAutoSave('overrides', true);
      });
    }
    if (dubDaySelect) dubDaySelect.addEventListener('change', () => scheduleModalAutoSave('overrides', true));
    const progInput = bodyEl.querySelector('#af-wl-progress');
    if (progInput) {
      progInput.addEventListener('input', () => scheduleModalAutoSave('watchlist', false));
      progInput.addEventListener('change', () => scheduleModalAutoSave('watchlist', true));
    }
    const notesInput = bodyEl.querySelector('#af-wl-notes');
    if (notesInput) {
      notesInput.addEventListener('input', () => scheduleModalAutoSave('watchlist', false));
      notesInput.addEventListener('blur', () => { if (modalAutoSaveTimer) persistModalChangesNow('watchlist'); });
    }
    if (lagInput) {
      const syncDubFromLag = (immediate) => {
        const raw = lagInput.value.trim();
        if (raw !== '') {
          const n = Math.max(0, Number(raw));
          if (n === 0) {
            if (dubSelect) dubSelect.value = 'Simul-Release';
            if (dubDaySelect) dubDaySelect.value = '';
          } else if (n > 0 && dubSelect && (dubSelect.value === '' || dubSelect.value === 'Simul-Release')) {
            dubSelect.value = 'Staggered Release';
          }
        }
        scheduleModalAutoSave('overrides', immediate);
      };
      lagInput.addEventListener('input', () => syncDubFromLag(false));
      lagInput.addEventListener('change', () => syncDubFromLag(true));
    }

    backdrop.querySelector('#af-wl-save').addEventListener('click', () => {
      persistModalChangesNow('watchlist');
      toast(`Saved "${title}" to Watchlist.`, 'success');
      closeDetailModal();
    });
    backdrop.querySelector('#af-ovr-only').addEventListener('click', () => {
      persistModalChangesNow('overrides');
      toast(`Saved overrides for "${title}".`, 'success');
    });
    const remBtn = backdrop.querySelector('#af-wl-remove');
    if (remBtn) {
      remBtn.addEventListener('click', () => {
        if (modalAutoSaveTimer) { clearTimeout(modalAutoSaveTimer); modalAutoSaveTimer = null; }
        pendingAutoSaveMode = null;
        activeModalFlushFn = null;
        removeWatchlistItem(media.id);
        toast(`Removed "${title}" from Watchlist.`, 'warn');
        closeDetailModal();
      });
    }

    try {
      const multi = await fetchMultiSourceDetails(media);
      if (!activeModalAnime || activeModalAnime.id !== media.id) return;
      const area = bodyEl.querySelector('#af-multisrc-area');
      const extraStreamNames = [
        multi.tvmaze?.network || '',
        ...(multi.tmdb?.flatrate || []),
        ...(multi.tmdb?.ads || []),
        ...(multi.tmdb?.free || [])
      ].filter(Boolean);
      const mergedPlatforms = detectPlatforms(media, extraStreamNames);
      const extraLinks = [];
      if (multi.tvmaze?.officialSite) extraLinks.push({ name: multi.tvmaze.network || 'Official Site', url: multi.tvmaze.officialSite });
      const streamLinks = getStreamingLinks(media, extraLinks, extraStreamNames);
      refreshHeroStreamBar(extraLinks, extraStreamNames);

      const resolvedImdbId = multi.omdb?.imdbID || media.imdbId || multi.tvmaze?.imdb || '';
      if (resolvedImdbId) {
        const imdbBtn = bodyEl.querySelector('#af-imdb-hero-link');
        if (imdbBtn) {
          imdbBtn.href = `https://www.imdb.com/title/${encodeURIComponent(resolvedImdbId)}/`;
          const ratingTxt = multi.omdb?.imdbRating || media.imdbRating || '';
          if (ratingTxt) imdbBtn.textContent = `IMDb ★ ${ratingTxt} ↗`;
        }
      }
      const coverImg = bodyEl.querySelector('.detail-cover');
      if (coverImg && coverImg.src.startsWith('data:image/svg+xml')) {
        if (multi.omdb?.poster) coverImg.src = multi.omdb.poster;
        else if (multi.wikipedia?.image) coverImg.src = multi.wikipedia.image;
      }

      area.innerHTML = `
        <div class="meta-row" style="margin-bottom:12px;">
          <strong style="color:var(--text);">Where to Watch:</strong>
          ${streamLinks.length
            ? streamLinks.map(s => `<a class="stream-link-chip" href="${escapeHtml(safeUrl(s.url))}" target="_blank" rel="noopener noreferrer" style="border-color:${s.color};color:${s.color};">${escapeHtml(s.name)} ↗</a>`).join('')
            : mergedPlatforms.length
              ? mergedPlatforms.map(p => `<span class="platform-tag" style="border-color:${p.color};color:${p.color};">${escapeHtml(p.name)}${p.freeWithAds ? ' (Free)' : ''}</span>`).join('')
              : '<span class="badge badge-muted">Check JustWatch US above or set custom platform overrides</span>'}
        </div>
        ${(multi.omdb || media.imdbId || multi.tvmaze?.imdb) ? `
          <div class="panel" style="padding:10px;margin-bottom:12px;border-color:rgba(245,158,11,0.35);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:11px;color:var(--amber);text-transform:uppercase;font-weight:700;">IMDb &amp; OMDb Ratings</span>
              ${resolvedImdbId ? `<a href="https://www.imdb.com/title/${encodeURIComponent(resolvedImdbId)}/" target="_blank" rel="noopener noreferrer" style="font-size:11.5px;color:var(--amber);">Open ${escapeHtml(resolvedImdbId)} on IMDb ↗</a>` : ''}
            </div>
            <div style="font-size:12.5px;color:var(--text);">
              <strong>IMDb:</strong> ${escapeHtml(multi.omdb?.imdbRating || (media.imdbRating ? String(media.imdbRating) : '—'))}/10
              ${(multi.omdb?.imdbVotes || media.imdbVotes) ? ` (${escapeHtml(multi.omdb?.imdbVotes || Number(media.imdbVotes).toLocaleString())} votes)` : ''}
              ${(multi.omdb?.rottenTomatoes || media.rottenTomatoes) ? ` &nbsp;·&nbsp; <strong>Rotten Tomatoes:</strong> ${escapeHtml(multi.omdb?.rottenTomatoes || media.rottenTomatoes)}` : ''}
              ${multi.omdb?.metascore ? ` &nbsp;·&nbsp; <strong>Metascore:</strong> ${escapeHtml(multi.omdb.metascore)}` : ''}
              ${(multi.omdb?.rated || media.mpaaRated) ? ` &nbsp;·&nbsp; <span class="badge badge-muted">${escapeHtml(multi.omdb?.rated || media.mpaaRated)}</span>` : ''}
            </div>
            ${multi.omdb?.awards ? `<div style="font-size:11.5px;color:var(--text-muted);margin-top:4px;">🏆 ${escapeHtml(multi.omdb.awards)}</div>` : ''}
          </div>
        ` : ''}
        ${multi.tvmaze ? `
          <div class="panel" style="padding:10px;margin-bottom:12px;">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;">TVMaze Documentary Series Index</div>
            <div style="font-weight:700;color:var(--text);margin-top:3px;">
              Rating: ${multi.tvmaze.rating ?? '—'} · ${escapeHtml(multi.tvmaze.status || 'Indexed')}
              ${multi.tvmaze.network ? ` · <a href="${escapeHtml(safeUrl(multi.tvmaze.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(multi.tvmaze.network)} ↗</a>` : ''}
            </div>
          </div>
        ` : ''}
        ${multi.tmdb ? `
          <div class="panel" style="padding:10px;margin-bottom:12px;">
            <div style="font-size:11px;color:var(--cyan);text-transform:uppercase;">TMDB US Watch Providers (JustWatch)</div>
            <div style="font-size:12.5px;color:var(--text);margin-top:4px;">
              <strong>Stream:</strong> ${escapeHtml(multi.tmdb.flatrate.join(', ') || '—')} &nbsp;|&nbsp;
              <strong>Free/Ads:</strong> ${escapeHtml([...multi.tmdb.free, ...multi.tmdb.ads].join(', ') || '—')}
            </div>
          </div>
        ` : ''}
        ${multi.wikipedia ? `
          <div class="panel" style="padding:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:11px;color:var(--cyan);text-transform:uppercase;">Wikipedia Summary</span>
              <a href="${escapeHtml(safeUrl(multi.wikipedia.url))}" target="_blank" rel="noopener noreferrer" style="font-size:11.5px;">Read full article ↗</a>
            </div>
            <p style="margin:0;font-size:12.5px;color:#cbd5e1;">${escapeHtml(multi.wikipedia.extract)}</p>
          </div>
        ` : '<div style="font-size:12px;color:var(--text-dim);">Use the Wikipedia link above to explore production history and awards.</div>'}
      `;
    } catch {
      const area = bodyEl.querySelector('#af-multisrc-area');
      if (area) area.textContent = 'Multi-source enrichment partially unavailable right now.';
    }
  }

  const coreApi = {
    STATE_KEY,
    DB_NAME,
    GIST_FILENAME,
    TTL_DYNAMIC,
    TTL_STABLE,
    WATCHLIST_STATUSES,
    DUB_OPTIONS,
    PLATFORM_CONFIG,
    PLATFORM_BY_ID,
    MEDIA_CARD_FIELDS,
    CANONICAL_DOC_LIST,
    CANONICAL_DOSSIER_LIST: CANONICAL_DOC_LIST,
    formatSourceLabel,
    getTopSubgenreTags,
    getKeyStaff,
    isSequelOrRecap,
    escapeHtml,
    stripHtml,
    safeUrl,
    getDisplayTitle,
    getCover,
    normalizeStatus,
    formatCompactNumber,
    formatRelativeCountdown,
    toast,
    encodeBase64Utf8,
    decodeBase64Utf8,
    cacheGet,
    cacheSet,
    vectorGet,
    vectorSet,
    cacheStats,
    cacheClear,
    getState,
    saveState,
    onStateChange,
    onSyncStatus,
    upsertWatchlistItem,
    removeWatchlistItem,
    updateOverrides,
    updateSettings,
    mergeRemotePayload,
    buildPortableSyncPayload,
    gistPull,
    gistPush,
    gistCreateNew,
    gistConnectAndSetup,
    gistDisconnect,
    generateSyncCode,
    applySyncCode,
    detectPlatforms,
    getStreamingLinks,
    isFreeWithAds,
    getStreamingFilter,
    setStreamingFilter,
    toggleStreamingFilter,
    clearStreamingFilter,
    matchesStreamingFilter,
    getStreamingFilterSummary,
    onStreamingFilterChange,
    classifyDub,
    getDubLanguages,
    getDubTrackInfo,
    anilistQuery,
    fetchAnimeById,
    searchAnimeQuick,
    getTaxonomy,
    parseVibePrompt,
    fetchVibeCandidates,
    importAniListWatchlist,
    fetchWikipediaSummary,
    fetchTmdbUsProviders,
    fetchTmdbDocDiscover,
    fetchExpandedTvMazeCatalog,
    fetchOmdbDetails,
    hydrateCardPosters,
    fetchMultiSourceDetails,
    mountNav,
    openDetailModal,
    closeDetailModal
  };

  global.DocFinderCore = coreApi;
  global.AnimeFinderCore = coreApi;
})(window);
