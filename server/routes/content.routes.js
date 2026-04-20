import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { supabaseAdmin } from '../services/supabase.service.js';
import { regenerateContentItem } from '../services/generate.service.js';
import { buildDesignBrief, DESIGNABLE_TEAMS } from '../services/design-brief.service.js';

const DESIGNS_BUCKET = 'designs';
const MAX_DESIGN_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'application/pdf',
]);
const MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

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

// ---------------------------------------------------------------------------
// Design attachments (Claude Design flow)
// ---------------------------------------------------------------------------

// Get a ready-to-paste Markdown brief for claude.ai/design.
router.get('/:id/design-brief', async (req, res, next) => {
  try {
    const brief = await buildDesignBrief(req.params.id);
    res.json(brief);
  } catch (err) {
    if (/^(content_not_found|team_not_designable)/.test(err.message)) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// Upload a designed asset (base64 JSON body — simpler than multer, fine for
// one-off files). Server uploads to Supabase Storage under
//   designs/{content_item_id}/{uuid}.{ext}
// then appends the public URL to content_items.design_urls.
router.post('/:id/designs', requireRole('ceo', 'operations'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mimeType, data, filename } = req.body || {};
    if (!mimeType || !data) {
      return res.status(400).json({ error: 'mimeType_and_data_required' });
    }
    if (!ALLOWED_MIMES.has(mimeType)) {
      return res.status(400).json({ error: 'unsupported_mime_type', mimeType });
    }
    const buf = Buffer.from(data, 'base64');
    if (buf.length > MAX_DESIGN_BYTES) {
      return res.status(413).json({ error: 'file_too_large', bytes: buf.length });
    }

    const { data: item } = await supabaseAdmin
      .from('content_items')
      .select('id, team, design_urls')
      .eq('id', id)
      .maybeSingle();
    if (!item) return res.status(404).json({ error: 'content_not_found' });

    const ext = MIME_EXT[mimeType] || 'bin';
    const key = `${id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(DESIGNS_BUCKET)
      .upload(key, buf, { contentType: mimeType, upsert: false });
    if (uploadErr) throw uploadErr;

    const { data: pub } = supabaseAdmin.storage.from(DESIGNS_BUCKET).getPublicUrl(key);
    const publicUrl = pub.publicUrl;

    const newUrls = [...(item.design_urls || []), publicUrl];
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('content_items')
      .update({ design_urls: newUrls })
      .eq('id', id)
      .select('*')
      .single();
    if (updateErr) throw updateErr;

    res.status(201).json({
      item: updated,
      uploaded: { url: publicUrl, key, bytes: buf.length, filename: filename || null },
    });
  } catch (err) {
    next(err);
  }
});

// Remove a single design by URL.
router.delete('/:id/designs', requireRole('ceo', 'operations'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url_required' });

    const { data: item } = await supabaseAdmin
      .from('content_items')
      .select('id, design_urls')
      .eq('id', id)
      .maybeSingle();
    if (!item) return res.status(404).json({ error: 'content_not_found' });

    const urls = (item.design_urls || []).filter((u) => u !== url);

    // Attempt to remove the file from storage as well. Best-effort.
    const match = url.match(/\/storage\/v1\/object\/public\/designs\/(.+)$/);
    if (match) {
      await supabaseAdmin.storage.from(DESIGNS_BUCKET).remove([match[1]]);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('content_items')
      .update({ design_urls: urls })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Simple introspection — which teams can be designed.
router.get('/meta/designable-teams', (_req, res) => {
  res.json({ teams: Array.from(DESIGNABLE_TEAMS) });
});

export default router;
