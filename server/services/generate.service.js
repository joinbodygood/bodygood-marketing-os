import { supabaseAdmin } from './supabase.service.js';
import { generateContent, loadBrandContext } from './claude.service.js';

import { emailPrompt } from '../prompts/email.js';
import { smsPrompt } from '../prompts/sms.js';
import { socialsPrompt } from '../prompts/socials.js';
import { adsPrompt } from '../prompts/ads.js';
import { seoPrompt } from '../prompts/seo.js';
import { creativesPrompt } from '../prompts/creatives.js';
import { videoPrompt } from '../prompts/video.js';
import { landingPagesPrompt } from '../prompts/landing-pages.js';
import { researchPrompt } from '../prompts/research.js';

const BUILDERS = {
  email: emailPrompt,
  sms: smsPrompt,
  socials: socialsPrompt,
  ads: adsPrompt,
  seo: seoPrompt,
  creatives: creativesPrompt,
  video: videoPrompt,
  landing_pages: landingPagesPrompt,
  research: researchPrompt,
};

const MAX_TOKENS = {
  seo: 4000,        // blog posts need room
  landing_pages: 3000,
  video: 1200,
  sms: 600,
  default: 1500,
};

export const SUPPORTED_TEAMS = Object.keys(BUILDERS);

function titleFor(team, data, contentType) {
  if (!data) return contentType;
  if (team === 'email') return data.subject || contentType;
  if (team === 'ads') return data.headline_1 || contentType;
  if (team === 'seo') return data.title || contentType;
  if (team === 'landing_pages') return data.hero?.headline || contentType;
  if (team === 'socials') return data.hook?.slice(0, 80) || contentType;
  if (team === 'video') return data.hook || contentType;
  if (team === 'research') return data.headline || contentType;
  if (team === 'creatives') return data.concept_name || contentType;
  return contentType;
}

export async function generateForTeam({
  team,
  contentType,
  customInstructions = '',
  campaignId = null,
  submittedBy = null,
  isAutomated = false,
}) {
  const build = BUILDERS[team];
  if (!build) throw new Error(`unsupported_team: ${team}`);

  // Load active campaign if requested, else no campaign-level override
  let campaign = null;
  if (campaignId) {
    const { data } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .maybeSingle();
    campaign = data || null;
  }

  const brandContext = await loadBrandContext(campaign);
  const prompt = build(brandContext, contentType, customInstructions);
  const maxTokens = MAX_TOKENS[team] || MAX_TOKENS.default;

  const result = await generateContent(prompt, 'Generate now.', maxTokens);

  const contentString = result.data
    ? JSON.stringify(result.data, null, 2)
    : result.raw;

  const row = {
    campaign_id: campaignId,
    team,
    content_type: contentType,
    title: titleFor(team, result.data, contentType),
    content: contentString,
    status: 'pending_review',
    submitted_by: submittedBy,
    is_automated: isAutomated,
  };

  const { data, error } = await supabaseAdmin
    .from('content_items')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;

  return { item: data, parsed: result.data, usage: result.usage };
}

export async function regenerateContentItem(id, { customInstructions = '' } = {}) {
  const { data: original, error } = await supabaseAdmin
    .from('content_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!original) throw new Error('content_not_found');

  const newItem = await generateForTeam({
    team: original.team,
    contentType: original.content_type,
    customInstructions,
    campaignId: original.campaign_id,
    isAutomated: original.is_automated,
  });

  // Mark the original as regenerated
  await supabaseAdmin
    .from('content_items')
    .update({ status: 'regenerated' })
    .eq('id', id);

  return newItem;
}
