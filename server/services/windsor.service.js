// Windsor.ai — real integration. API pattern:
//   GET https://connectors.windsor.ai/<connector>?api_key=<key>&date_preset=last_7d&fields=...
// Returns { data: [...] } where rows are per-day-per-campaign.
//
// We aggregate Meta + Google Ads into a single weekly summary for the
// Ops Manager Sunday brief and the Analytics dashboard.

const BASE = 'https://connectors.windsor.ai';

export async function getWeeklyAdPerformance() {
  const key = process.env.WINDSOR_AI_API_KEY;
  if (!key) return stubSummary();

  try {
    const [meta, google, ga4] = await Promise.allSettled([
      fetchConnector('facebook', key, 'date,campaign,spend,clicks,actions'),
      fetchConnector('google_ads', key, 'date,campaign,spend,clicks,conversions,conversion_value'),
      fetchConnector('googleanalytics4', key, 'date,default_channel_group,sessions,conversions,purchase_revenue'),
    ]);

    const metaRows = settled(meta);
    const googleRows = settled(google);
    const ga4Rows = settled(ga4);

    const metaAgg = aggregateMeta(metaRows);
    const googleAgg = aggregateGoogle(googleRows);
    const ga4Agg = aggregateGA4(ga4Rows);

    return {
      source: 'windsor.ai',
      date_range: 'last_7d',
      meta: metaAgg,
      google_ads: googleAgg,
      ga4: ga4Agg,
      // Flat fields used by Analytics page + Ops prompt
      meta_spend: metaAgg.spend,
      meta_ctr: metaAgg.ctr,
      meta_roas: metaAgg.roas,
      google_spend: googleAgg.spend,
      google_ctr: googleAgg.ctr,
      google_roas: googleAgg.roas,
      total_conversions: (metaAgg.purchases || 0) + (googleAgg.conversions || 0),
      top_campaign: metaAgg.top_campaign || googleAgg.top_campaign || null,
    };
  } catch (err) {
    return {
      source: 'windsor_error',
      error: err.message,
      ...stubSummary(),
    };
  }
}

async function fetchConnector(connector, key, fields) {
  const url = `${BASE}/${connector}?api_key=${encodeURIComponent(key)}&date_preset=last_7d&fields=${encodeURIComponent(fields)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`windsor_${connector}_${resp.status}: ${text.slice(0, 120)}`);
  }
  const json = await resp.json();
  return json.data || [];
}

function settled(result) {
  if (result.status === 'fulfilled') return result.value;
  console.warn('[windsor] connector failed:', result.reason?.message);
  return [];
}

function aggregateMeta(rows) {
  let spend = 0;
  let clicks = 0;
  let purchases = 0;
  let purchase_value = 0;
  const byCampaign = {};

  for (const r of rows) {
    const s = parseFloat(r.spend || 0);
    const c = parseInt(r.clicks || 0, 10);
    spend += s;
    clicks += c;

    // Meta actions is an array of { action_type, value }
    const actions = Array.isArray(r.actions) ? r.actions : [];
    for (const a of actions) {
      if (a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase') {
        purchases += parseFloat(a.value || 0);
      }
      if (a.action_type === 'purchase') {
        // revenue comes from action_values typically — Meta doesn't always expose it on this endpoint
      }
    }

    if (r.campaign) {
      byCampaign[r.campaign] = byCampaign[r.campaign] || { spend: 0, clicks: 0 };
      byCampaign[r.campaign].spend += s;
      byCampaign[r.campaign].clicks += c;
    }
  }

  const impressions = clicks; // rough proxy; Windsor Meta fields don't expose impressions without configuration
  const ctr = clicks > 0 && impressions > 0 ? clicks / impressions : 0;
  const top = Object.entries(byCampaign).sort((a, b) => b[1].spend - a[1].spend)[0];

  // ROAS can only be computed if we pull action_values; leave null when unknown.
  return {
    spend: round2(spend),
    clicks,
    purchases,
    ctr: null, // TODO: pull impressions + ctr fields on next iteration
    roas: null,
    top_campaign: top ? top[0] : null,
  };
}

function aggregateGoogle(rows) {
  let spend = 0;
  let clicks = 0;
  let conversions = 0;
  let conversion_value = 0;
  const byCampaign = {};

  for (const r of rows) {
    const s = parseFloat(r.spend || 0);
    const c = parseInt(r.clicks || 0, 10);
    const cv = parseFloat(r.conversions || 0);
    const cvv = parseFloat(r.conversion_value || 0);
    spend += s;
    clicks += c;
    conversions += cv;
    conversion_value += cvv;
    if (r.campaign) {
      byCampaign[r.campaign] = byCampaign[r.campaign] || { spend: 0 };
      byCampaign[r.campaign].spend += s;
    }
  }
  const top = Object.entries(byCampaign).sort((a, b) => b[1].spend - a[1].spend)[0];
  return {
    spend: round2(spend),
    clicks,
    conversions: round2(conversions),
    conversion_value: round2(conversion_value),
    roas: spend > 0 ? round2(conversion_value / spend) : null,
    ctr: null,
    top_campaign: top ? top[0] : null,
  };
}

function aggregateGA4(rows) {
  let sessions = 0;
  let conversions = 0;
  let revenue = 0;
  const byChannel = {};
  for (const r of rows) {
    const s = parseInt(r.sessions || 0, 10);
    const c = parseFloat(r.conversions || 0);
    const rv = parseFloat(r.purchase_revenue || 0);
    sessions += s;
    conversions += c;
    revenue += rv;
    const ch = r.default_channel_group || 'unknown';
    byChannel[ch] = (byChannel[ch] || 0) + s;
  }
  return {
    sessions,
    conversions: round2(conversions),
    purchase_revenue: round2(revenue),
    top_channels: Object.entries(byChannel)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([channel, sess]) => ({ channel, sessions: sess })),
  };
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function stubSummary() {
  return {
    source: 'stub',
    date_range: 'last_7d',
    meta_spend: 1420.55,
    meta_roas: 2.8,
    meta_ctr: 0.031,
    google_spend: 612.1,
    google_roas: 3.4,
    google_ctr: 0.042,
    total_conversions: 38,
    top_campaign: 'semaglutide-educate-florida',
  };
}
