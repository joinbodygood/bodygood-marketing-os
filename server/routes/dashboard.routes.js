import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { supabaseAdmin } from '../services/supabase.service.js';

const router = Router();
router.use(requireAuth);

const TEAMS = [
  'email',
  'sms',
  'socials',
  'ads',
  'seo',
  'research',
  'creatives',
  'video',
  'landing_pages',
];

router.get('/summary', async (_req, res, next) => {
  try {
    // Active campaign = most recent approved or active campaign
    const { data: activeCampaign } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, week_of, status, core_message')
      .in('status', ['approved', 'active'])
      .order('week_of', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Per-team pending review counts for the active campaign
    let teamStatus = TEAMS.map((team) => ({
      team,
      pending: 0,
      approved: 0,
      rejected: 0,
    }));

    if (activeCampaign) {
      const { data: counts } = await supabaseAdmin
        .from('content_items')
        .select('team, status')
        .eq('campaign_id', activeCampaign.id);
      if (counts) {
        for (const row of counts) {
          const entry = teamStatus.find((t) => t.team === row.team);
          if (entry && (row.status in entry)) entry[row.status] += 1;
          else if (entry && row.status === 'pending_review') entry.pending += 1;
        }
      }
    }

    // KPIs
    const [{ count: pendingQC }, { count: approvedThisWeek }, { count: totalCampaigns }] =
      await Promise.all([
        supabaseAdmin
          .from('content_items')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_review'),
        supabaseAdmin
          .from('content_items')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('created_at', startOfWeekISO()),
        supabaseAdmin
          .from('campaigns')
          .select('id', { count: 'exact', head: true }),
      ]);

    // Recent activity (last 10 content items across statuses)
    const { data: activity } = await supabaseAdmin
      .from('content_items')
      .select('id, team, content_type, title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      kpis: {
        pending_qc: pendingQC || 0,
        approved_this_week: approvedThisWeek || 0,
        total_campaigns: totalCampaigns || 0,
        next_brief_iso: nextSundayBriefISO(),
      },
      active_campaign: activeCampaign || null,
      team_status: teamStatus,
      activity: activity || [],
    });
  } catch (err) {
    next(err);
  }
});

function startOfWeekISO() {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day; // Sunday = start of week
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return start.toISOString();
}

function nextSundayBriefISO() {
  // Next Sunday 19:00 America/New_York (when brief generation runs per cron)
  const now = new Date();
  const target = new Date(now);
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  target.setUTCDate(now.getUTCDate() + daysUntilSunday);
  // 19:00 ET ≈ 23:00 UTC during EST / 23:00 UTC during EDT
  target.setUTCHours(23, 0, 0, 0);
  return target.toISOString();
}

export default router;
