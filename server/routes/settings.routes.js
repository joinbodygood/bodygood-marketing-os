import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { supabaseAdmin } from '../services/supabase.service.js';

const router = Router();

// All settings endpoints require CEO or Operations.
router.use(requireAuth, requireRole('ceo', 'operations'));

// ---------- Brand Memory (single row) ----------
router.get('/brand-memory', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('brand_memory')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    res.json(data || null);
  } catch (err) {
    next(err);
  }
});

router.put('/brand-memory', async (req, res, next) => {
  try {
    const payload = { ...req.body, updated_at: new Date().toISOString() };
    delete payload.id;

    const { data: existing, error: selectErr } = await supabaseAdmin
      .from('brand_memory')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (selectErr) throw selectErr;

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('brand_memory')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      return res.json(data);
    }
    const { data, error } = await supabaseAdmin
      .from('brand_memory')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ---------- Offer Stack ----------
router.get('/offer-stack', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('offer_stack')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

router.post('/offer-stack', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('offer_stack')
      .insert(req.body)
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.put('/offer-stack/:id', async (req, res, next) => {
  try {
    const payload = { ...req.body };
    delete payload.id;
    delete payload.created_at;
    const { data, error } = await supabaseAdmin
      .from('offer_stack')
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

router.delete('/offer-stack/:id', async (req, res, next) => {
  try {
    const { error } = await supabaseAdmin
      .from('offer_stack')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------- Integrations status (derived from env) ----------
router.get('/integrations', (_req, res) => {
  const key = (v) => (v && v.length > 0 ? 'connected' : 'pending');
  res.json({
    supabase: key(process.env.SUPABASE_URL),
    anthropic: key(process.env.ANTHROPIC_API_KEY),
    windsor: key(process.env.WINDSOR_AI_API_KEY),
    apify: key(process.env.APIFY_API_TOKEN),
    stripe: key(process.env.STRIPE_SECRET_KEY),
    heygen: key(process.env.HEYGEN_API_KEY),
  });
});

// ---------- Team members ----------
router.get('/team', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, name, role, team, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

export default router;
