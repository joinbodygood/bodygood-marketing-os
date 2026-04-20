import { Router } from 'express';
import archiver from 'archiver';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { supabaseAdmin } from '../services/supabase.service.js';

const router = Router();
router.use(requireAuth);

const TEAM_FOLDERS = {
  email: '01-Email-Team',
  sms: '02-SMS-Team',
  socials: '03-Socials-Team',
  ads: '04-Ads-Team',
  seo: '05-SEO-Team',
  research: '06-Research',
  creatives: '07-Creatives',
  video: '08-Video',
  landing_pages: '09-Landing-Pages',
};

router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('week_of', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!campaign) return res.status(404).json({ error: 'campaign_not_found' });

    const { data: items } = await supabaseAdmin
      .from('content_items')
      .select('*')
      .eq('campaign_id', req.params.id)
      .order('created_at', { ascending: true });

    res.json({ campaign, items: items || [] });
  } catch (err) {
    next(err);
  }
});

// Export a campaign as a zip with per-team folders
router.get('/:id/export', requireRole('ceo', 'operations'), async (req, res, next) => {
  try {
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (!campaign) return res.status(404).json({ error: 'campaign_not_found' });

    const { data: items } = await supabaseAdmin
      .from('content_items')
      .select('*')
      .eq('campaign_id', req.params.id)
      .eq('status', 'approved')
      .order('team', { ascending: true });

    const folder = `Week-${campaign.week_of || 'unknown'}-${slug(campaign.name)}`;
    res.attachment(`${folder}.zip`);
    res.type('application/zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (e) => next(e));
    archive.pipe(res);

    archive.append(briefText(campaign), { name: `${folder}/00-Campaign-Brief.txt` });

    for (const item of items || []) {
      const teamFolder = TEAM_FOLDERS[item.team] || `99-${item.team}`;
      const baseName = slug(item.title || item.content_type);
      archive.append(
        `${item.content_type.toUpperCase()}${item.title ? ` — ${item.title}` : ''}\n\n${item.content}\n`,
        { name: `${folder}/${teamFolder}/${baseName}.txt` }
      );

      // Attach any uploaded design files inline with the copy
      const designs = item.design_urls || [];
      for (let i = 0; i < designs.length; i++) {
        const url = designs[i];
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const buf = Buffer.from(await resp.arrayBuffer());
          const ext = extFromUrl(url) || 'png';
          archive.append(buf, {
            name: `${folder}/${teamFolder}/${baseName}-design-${i + 1}.${ext}`,
          });
        } catch (e) {
          console.warn('[export] design fetch failed:', url, e.message);
        }
      }
    }

    await archive.finalize();
  } catch (err) {
    next(err);
  }
});

function slug(s) {
  return (s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function extFromUrl(url) {
  const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return m ? m[1].toLowerCase() : null;
}

function briefText(c) {
  return `Campaign: ${c.name}
Week of: ${c.week_of || ''}
Status: ${c.status}

Goal:
${c.goal || ''}

Target Audience:
${c.target_audience || ''}

Core Message:
${c.core_message || ''}

Offer Focus:
${c.offer_details || ''}
`;
}

export default router;
