import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { supabaseAdmin } from '../services/supabase.service.js';
import { getWeeklyAdPerformance } from '../services/windsor.service.js';

const router = Router();
router.use(requireAuth, requireRole('ceo', 'operations'));

router.get('/summary', async (_req, res, next) => {
  try {
    const ads = await getWeeklyAdPerformance();

    const { data: recentCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, week_of, status, performance_score')
      .order('week_of', { ascending: false })
      .limit(5);

    const { count: approvedCount } = await supabaseAdmin
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    res.json({
      ads,
      approved_content_total: approvedCount || 0,
      recent_campaigns: recentCampaigns || [],
    });
  } catch (err) {
    next(err);
  }
});

router.get('/content-scores', async (_req, res, next) => {
  try {
    const { data } = await supabaseAdmin
      .from('content_items')
      .select('id, team, content_type, title, performance_score, created_at')
      .not('performance_score', 'is', null)
      .order('performance_score', { ascending: false })
      .limit(50);
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

export default router;
