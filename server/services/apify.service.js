// Apify competitor scraping — real call to apify/facebook-ads-scraper.
// Falls back to stub data if APIFY_API_TOKEN not set.

const COMPETITORS = [
  { name: 'Found', page: 'Found.com' },
  { name: 'Alpha Medical', page: 'Alpha' },
  { name: 'Calibrate', page: 'joincalibrate' },
  { name: 'Yuca Health', page: 'yucahealth' },
];

const ACTOR_ID = 'apify~facebook-ads-scraper';
const SYNC_TIMEOUT_MS = 240_000; // 4 min — actor sync mode max is 5 min

export async function getCompetitorSnapshot({ maxAdsPerCompetitor = 10 } = {}) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return stubSnapshot();

  const body = {
    urls: COMPETITORS.map((c) => ({
      url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encodeURIComponent(c.name)}&search_type=keyword_exact_phrase`,
    })),
    count: maxAdsPerCompetitor * COMPETITORS.length,
    scrapeAdDetails: false,
    scrapePageAds: { activeStatus: 'active' },
    period: '',
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

    const resp = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`apify_${resp.status}: ${text.slice(0, 200)}`);
    }
    const items = await resp.json();

    return {
      source: 'apify',
      actor: ACTOR_ID,
      date: new Date().toISOString().slice(0, 10),
      competitors: COMPETITORS.map((c) => c.name),
      ads_found: countByAdvertiser(items),
      sample_ads: items.slice(0, 12).map(sanitizeAd),
      total: items.length,
    };
  } catch (err) {
    // Network / timeout / cost issues should not kill the Sunday brief —
    // return a clearly-marked fallback with the error.
    return {
      source: 'apify_error',
      error: err.message,
      date: new Date().toISOString().slice(0, 10),
      competitors: COMPETITORS.map((c) => c.name),
      ads_found: null,
    };
  }
}

function countByAdvertiser(items) {
  const counts = {};
  for (const item of items) {
    const name = item.pageName || item.advertiserName || 'unknown';
    counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}

function sanitizeAd(item) {
  return {
    advertiser: item.pageName || item.advertiserName || null,
    ad_text: (item.adText || item.body || '').slice(0, 220),
    cta: item.ctaType || null,
    started: item.startDate || item.start_date || null,
    image_url: item.imageUrl || null,
  };
}

function stubSnapshot() {
  return {
    source: 'stub',
    date: new Date().toISOString().slice(0, 10),
    competitors: COMPETITORS.map((c) => c.name),
    ads_found: {
      Found: 14,
      'Alpha Medical': 9,
      Calibrate: 23,
      'Yuca Health': 2,
    },
    notable: 'Calibrate launched new maintenance-dose messaging this week.',
  };
}
