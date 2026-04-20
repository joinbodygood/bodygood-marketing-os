// Generate a Markdown design brief optimized for pasting into claude.ai/design.
// The brief packages brand memory + campaign context + copy into a prompt that
// produces on-brand designs without additional context from the operator.

import { supabaseAdmin } from './supabase.service.js';

// Which teams get a design brief button. Others (email, sms, research, video)
// are copy-only in Phase 1.
export const DESIGNABLE_TEAMS = new Set([
  'ads',
  'socials',
  'creatives',
  'landing_pages',
  'seo',
]);

const SPECS = {
  ads: {
    formats: [
      { label: 'Meta square', w: 1080, h: 1080 },
      { label: 'Meta feed', w: 1200, h: 628 },
      { label: 'Google display', w: 1200, h: 1200 },
    ],
    artifactInstruction:
      'Render 3 PNG artifacts — one per format above. Each should be a production-ready static ad.',
  },
  creatives: {
    formats: [
      { label: 'Square social', w: 1080, h: 1080 },
      { label: 'Portrait social', w: 1080, h: 1350 },
    ],
    artifactInstruction:
      'Render as PNG artifact. Editorial photography composition with copy overlay.',
  },
  socials: {
    formats: [
      { label: 'Instagram post', w: 1080, h: 1080 },
      { label: 'Carousel slide', w: 1080, h: 1350 },
    ],
    artifactInstruction:
      'For a carousel, render one PNG per slide (10 slides total). For a single post, render one PNG.',
  },
  landing_pages: {
    formats: [{ label: 'Desktop hero section', w: 1440, h: 900 }],
    artifactInstruction:
      'Render as an HTML artifact — a real scrollable landing page mockup using the copy below. Use Tailwind or inline CSS. Mobile-first responsive.',
  },
  seo: {
    formats: [{ label: 'Blog header image', w: 1600, h: 900 }],
    artifactInstruction:
      'Render as a PNG artifact — a blog post hero image with no text overlay (Dr. Linda voice relies on the written headline, not the image).',
  },
};

function brandSection(brand) {
  if (!brand) return '';
  return `
## Brand
**${brand.brand_name}** — telehealth GLP-1 weight loss practice.
Founder: ${brand.founder || 'Dr. Linda Moleon'}

Voice: ${brand.brand_voice || ''}

Anchor line: "${brand.anchor_line || ''}"
  `.trim();
}

function audienceSection(brand) {
  if (!brand) return '';
  return `
## Audience
${brand.primary_icp || ''}

Pain points:
${(brand.pain_points || []).map((p) => `- ${p}`).join('\n')}
  `.trim();
}

function aestheticSection(brand) {
  const v = brand?.visual_identity || {};
  return `
## Aesthetic
- **Colors**: Cream canvas / white backgrounds, scarce red (${v.primary_color || '#ED1B1B'}) for CTAs only — never fill large areas with red
- **Typography**: ${v.typography_display || 'Poppins'} display · ${v.typography_body || 'Manrope'} body
- **Photography**: ${v.photography || 'Real women 35-60, diverse (Black and Latina primary), natural light, warm home settings, Ana Cuba editorial style. No stock photography feel. No before/after, no body objectification.'}
- **Mood**: warm, real, honest — not corporate, not clinical, not manufactured
- **Reference brands**: Hims, Hers, Ro.co — clean DTC telehealth
  `.trim();
}

function constraintsSection(brand) {
  return `
## Hard constraints
${(brand?.ad_compliance_rules || [])
  .map((r) => `- ${r}`)
  .join('\n')}
- Never use before/after weight-loss framing
- Never use urgency or scarcity language ("Act now!")
- Must feel like a message from Dr. Linda to her friends, not a brand campaign
  `.trim();
}

function formatsSection(team) {
  const spec = SPECS[team];
  if (!spec) return '';
  return `
## Asset specs
${spec.formats.map((f) => `- ${f.label}: ${f.w} × ${f.h} px`).join('\n')}
  `.trim();
}

function copyPayloadSection(team, item, parsedCopy) {
  // parsedCopy is the JSON Claude returned. Fall back to raw content if parsing
  // is missing.
  const pretty = parsedCopy
    ? JSON.stringify(parsedCopy, null, 2)
    : item.content;

  const label =
    {
      ads: 'Ad copy to render on the image',
      creatives: 'Creative concept + copy',
      socials: 'Social post / carousel copy',
      landing_pages: 'Landing page copy (render as real HTML)',
      seo: 'Blog post headline + topic for image direction',
    }[team] || 'Copy to render';

  return `
## ${label}

\`\`\`json
${pretty}
\`\`\`
  `.trim();
}

function campaignSection(campaign) {
  if (!campaign) return '';
  return `
## Campaign context
- **Name**: ${campaign.name}
- **Core message**: ${campaign.core_message || ''}
- **Target audience**: ${campaign.target_audience || ''}
- **Week of**: ${campaign.week_of || ''}
  `.trim();
}

function outputSection(team) {
  const spec = SPECS[team];
  return `
## Output instructions
${spec?.artifactInstruction || 'Render as a PNG artifact.'}

After rendering, I will download and upload back to the Marketing OS QC queue.
  `.trim();
}

export async function buildDesignBrief(contentItemId) {
  const { data: item, error: itemErr } = await supabaseAdmin
    .from('content_items')
    .select('*')
    .eq('id', contentItemId)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!item) throw new Error('content_not_found');

  if (!DESIGNABLE_TEAMS.has(item.team)) {
    throw new Error(`team_not_designable: ${item.team}`);
  }

  const [brandRes, campaignRes] = await Promise.all([
    supabaseAdmin.from('brand_memory').select('*').limit(1).maybeSingle(),
    item.campaign_id
      ? supabaseAdmin
          .from('campaigns')
          .select('*')
          .eq('id', item.campaign_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let parsed = null;
  try {
    parsed = JSON.parse(item.content);
  } catch {
    /* fall back to raw */
  }

  const sections = [
    `# Design Brief — Body Good ${item.content_type.replace(/_/g, ' ')}`,
    brandSection(brandRes.data),
    audienceSection(brandRes.data),
    aestheticSection(brandRes.data),
    campaignSection(campaignRes.data),
    formatsSection(item.team),
    copyPayloadSection(item.team, item, parsed),
    constraintsSection(brandRes.data),
    outputSection(item.team),
  ].filter(Boolean);

  return {
    brief_markdown: sections.join('\n\n'),
    claude_design_url: 'https://claude.ai/design',
    content_type: item.content_type,
    team: item.team,
  };
}
