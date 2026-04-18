import { supabaseAdmin } from './supabase.service.js';
import { generateContent, loadBrandContext } from './claude.service.js';
import { opsBriefPrompt } from '../prompts/ops-manager.js';
import { getWeeklyAdPerformance } from './windsor.service.js';
import { getCompetitorSnapshot } from './apify.service.js';

export async function generateSundayBrief() {
  const weekOf = thisSundayISODate();

  const [brandContext, analytics, competitors] = await Promise.all([
    loadBrandContext(),
    getWeeklyAdPerformance().catch(() => ({ stub: true, note: 'Windsor.ai not configured' })),
    getCompetitorSnapshot().catch(() => ({ stub: true, note: 'Apify not configured' })),
  ]);

  const calendarEvents = []; // Phase 2 — pull from Google Calendar

  const prompt = opsBriefPrompt(brandContext, analytics, competitors, calendarEvents);
  const result = await generateContent(prompt, 'Generate the 3 options now.', 3000);

  if (!Array.isArray(result.data) || result.data.length !== 3) {
    throw new Error(
      `Claude did not return 3 options. Raw preview: ${result.raw?.slice(0, 200)}`
    );
  }

  // Clear any existing options for this week and insert fresh
  await supabaseAdmin.from('brief_options').delete().eq('week_of', weekOf);

  const rows = result.data.map((opt, i) => ({
    week_of: weekOf,
    option_number: opt.option_number ?? i + 1,
    campaign_name: opt.campaign_name,
    why_now: opt.why_now,
    target_audience: opt.target_audience,
    core_message: opt.core_message,
    deliverables: opt.deliverables,
    risk: opt.risk,
    data_sources: { analytics, competitors, recommended: opt.recommended === true },
  }));

  const { data, error } = await supabaseAdmin
    .from('brief_options')
    .insert(rows)
    .select('*');
  if (error) throw error;

  return { week_of: weekOf, options: data, usage: result.usage };
}

function thisSundayISODate() {
  const d = new Date();
  const diff = d.getUTCDay(); // Sunday = 0
  if (diff === 0) return d.toISOString().slice(0, 10);
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - diff);
  return sunday.toISOString().slice(0, 10);
}
