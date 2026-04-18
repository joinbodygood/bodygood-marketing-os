import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireTeamScope } from '../middleware/role.middleware.js';
import { generateForTeam, SUPPORTED_TEAMS } from '../services/generate.service.js';
import { supabaseAdmin } from '../services/supabase.service.js';

const router = Router();
router.use(requireAuth);

// Team listing — used by Team Tools page to decide which tools to render
router.get('/teams', async (req, res) => {
  const role = req.profile.role;
  const ownTeam = req.profile.team;
  let available = SUPPORTED_TEAMS;
  if (role === 'team_member') {
    available = ownTeam ? [ownTeam] : [];
  }
  res.json({ teams: available, all: SUPPORTED_TEAMS, role });
});

router.post('/:team', requireTeamScope, async (req, res, next) => {
  try {
    const { team } = req.params;
    if (!SUPPORTED_TEAMS.includes(team)) {
      return res.status(400).json({ error: 'unsupported_team' });
    }
    const { contentType, customInstructions, campaignId } = req.body || {};
    if (!contentType) return res.status(400).json({ error: 'contentType_required' });

    // Resolve active campaign if not provided
    let resolvedCampaignId = campaignId;
    if (!resolvedCampaignId) {
      const { data } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .in('status', ['approved', 'active'])
        .order('week_of', { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedCampaignId = data?.id || null;
    }

    const result = await generateForTeam({
      team,
      contentType,
      customInstructions: customInstructions || '',
      campaignId: resolvedCampaignId,
      submittedBy: req.profile.id,
      isAutomated: false,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
