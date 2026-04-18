import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { supabaseAdmin } from '../services/supabase.service.js';
import { regenerateContentItem } from '../services/generate.service.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    let q = supabaseAdmin
      .from('content_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.query.campaign_id) q = q.eq('campaign_id', req.query.campaign_id);
    if (req.query.team) q = q.eq('team', req.query.team);
    if (req.query.status) q = q.eq('status', req.query.status);

    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('content_items')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'content_not_found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/approve', requireRole('ceo', 'operations'), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('content_items')
      .update({
        status: 'approved',
        reviewed_by: req.profile.id,
        qc_notes: req.body?.qc_notes || null,
      })
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/reject', requireRole('ceo', 'operations'), async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('content_items')
      .update({
        status: 'rejected',
        reviewed_by: req.profile.id,
        qc_notes: req.body?.qc_notes || null,
      })
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('ceo', 'operations'), async (req, res, next) => {
  try {
    const payload = {};
    if (typeof req.body.content === 'string') payload.content = req.body.content;
    if (typeof req.body.title === 'string') payload.title = req.body.title;
    const { data, error } = await supabaseAdmin
      .from('content_items')
      .update(payload)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/regenerate', requireRole('ceo', 'operations'), async (req, res, next) => {
  try {
    const regenerated = await regenerateContentItem(req.params.id, {
      customInstructions: req.body?.customInstructions,
    });
    res.json(regenerated);
  } catch (err) {
    next(err);
  }
});

export default router;
