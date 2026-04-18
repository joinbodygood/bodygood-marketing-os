import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { supabaseAdmin } from '../services/supabase.service.js';
import { generateSundayBrief } from '../services/ops.service.js';

const router = Router();
router.use(requireAuth);

// Read access: CEO + operations
router.get('/brief-options/latest', requireRole('ceo', 'operations'), async (_req, res, next) => {
  try {
    // Return the 3 options for the most recent week_of
    const { data: recent } = await supabaseAdmin
      .from('brief_options')
      .select('week_of')
      .order('week_of', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!recent) return res.json({ week_of: null, options: [] });

    const { data: options, error } = await supabaseAdmin
      .from('brief_options')
      .select('*')
      .eq('week_of', recent.week_of)
      .order('option_number', { ascending: true });
    if (error) throw error;

    res.json({ week_of: recent.week_of, options: options || [] });
  } catch (err) {
    next(err);
  }
});

// Generate 3 options via Claude (CEO or operations can manually trigger)
router.post('/brief-options/generate', requireRole('ceo', 'operations'), async (_req, res, next) => {
  try {
    const result = await generateSundayBrief();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// CEO approves one option → creates a campaign + marks the option selected
router.post('/brief-options/:id/approve', requireRole('ceo'), async (req, res, next) => {
  try {
    const { data: option, error: fetchErr } = await supabaseAdmin
      .from('brief_options')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!option) return res.status(404).json({ error: 'option_not_found' });

    // Create campaign
    const { data: campaign, error: campaignErr } = await supabaseAdmin
      .from('campaigns')
      .insert({
        name: option.campaign_name,
        goal: option.why_now,
        target_audience: option.target_audience,
        core_message: option.core_message,
        tone_guidance: null,
        offer_details: null,
        week_of: option.week_of,
        status: 'approved',
        approved_by: req.profile.id,
        approved_at: new Date().toISOString(),
        ops_data: option.data_sources,
      })
      .select('*')
      .single();
    if (campaignErr) throw campaignErr;

    // Mark options: selected one = true, others for this week = false
    await supabaseAdmin
      .from('brief_options')
      .update({ is_selected: false })
      .eq('week_of', option.week_of);
    await supabaseAdmin
      .from('brief_options')
      .update({ is_selected: true })
      .eq('id', option.id);

    res.json({ campaign, option });
  } catch (err) {
    next(err);
  }
});

export default router;
