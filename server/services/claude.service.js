import Anthropic from '@anthropic-ai/sdk';

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function generateContent(systemPrompt, userMessage, maxTokens = 2000) {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userMessage }],
    system: systemPrompt,
  });

  const text = response.content.map((c) => (c.type === 'text' ? c.text : '')).join('');

  // Most generation calls return JSON — attempt parse, fall back to raw.
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return { success: true, data: JSON.parse(trimmed), raw: text, usage: response.usage };
  } catch {
    return { success: true, data: null, raw: text, usage: response.usage };
  }
}

export async function generateBatch(prompts) {
  return Promise.all(
    prompts.map(({ system, user, maxTokens }) =>
      generateContent(system, user, maxTokens)
    )
  );
}

export async function loadBrandContext(campaignOverride = null) {
  const { supabaseAdmin } = await import('./supabase.service.js');
  const [{ data: brand }, { data: offers }] = await Promise.all([
    supabaseAdmin.from('brand_memory').select('*').limit(1).maybeSingle(),
    supabaseAdmin.from('offer_stack').select('*').order('sort_order', { ascending: true }),
  ]);

  const { buildBrandContext } = await import('../prompts/brand-memory.js');
  return buildBrandContext(brand, offers || [], campaignOverride);
}
