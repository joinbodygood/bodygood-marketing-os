import cron from 'node-cron';
import { supabaseAdmin } from './supabase.service.js';
import { generateSundayBrief } from './ops.service.js';
import { getWeeklyAdPerformance } from './windsor.service.js';
import { getCompetitorSnapshot } from './apify.service.js';

export function initCronJobs() {
  const tz = { timezone: 'America/New_York' };

  // Sunday 6 PM ET — pull Windsor + Apify snapshots
  cron.schedule(
    '0 18 * * 0',
    async () => {
      console.log('[cron] Sunday data pull starting');
      try {
        const [analytics, competitors] = await Promise.all([
          getWeeklyAdPerformance().catch((e) => ({ error: e.message })),
          getCompetitorSnapshot().catch((e) => ({ error: e.message })),
        ]);
        console.log('[cron] Sunday data pull complete', {
          analytics_source: analytics.source,
          competitors_source: competitors.source,
        });
      } catch (e) {
        console.error('[cron] Sunday data pull failed:', e.message);
      }
    },
    tz
  );

  // Sunday 7 PM ET — generate 3 campaign options
  cron.schedule(
    '0 19 * * 0',
    async () => {
      console.log('[cron] Generating Sunday brief options');
      try {
        const result = await generateSundayBrief();
        console.log(
          `[cron] Brief generated for week ${result.week_of} — ${result.options.length} options`
        );
      } catch (e) {
        console.error('[cron] Brief generation failed:', e.message);
      }
    },
    tz
  );

  // Monday 8 AM ET — QC queue reminder (just log for Phase 1 — Slack wired post-launch)
  cron.schedule(
    '0 8 * * 1',
    async () => {
      try {
        const { count } = await supabaseAdmin
          .from('content_items')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_review');
        console.log(`[cron] Monday QC reminder — ${count || 0} items pending`);
      } catch (e) {
        console.error('[cron] Monday reminder failed:', e.message);
      }
    },
    tz
  );

  // Wednesday 9 AM ET — competitor scrape
  cron.schedule(
    '0 9 * * 3',
    async () => {
      try {
        const snap = await getCompetitorSnapshot();
        console.log('[cron] Wednesday competitor scrape complete', {
          source: snap.source,
        });
      } catch (e) {
        console.error('[cron] Competitor scrape failed:', e.message);
      }
    },
    tz
  );

  // Friday 6 PM ET — performance data collection
  cron.schedule(
    '0 18 * * 5',
    async () => {
      try {
        const perf = await getWeeklyAdPerformance();
        console.log('[cron] Friday performance pull complete', {
          source: perf.source,
        });
      } catch (e) {
        console.error('[cron] Friday perf pull failed:', e.message);
      }
    },
    tz
  );

  console.log('[cron] 5 jobs scheduled (America/New_York)');
}
