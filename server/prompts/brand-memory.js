export function buildBrandContext(brandMemory, offerStack, campaign) {
  if (!brandMemory) return '';
  return `
## BODY GOOD BRAND CONTEXT — READ THIS FIRST BEFORE GENERATING ANYTHING

### Who We Are
${brandMemory.brand_name} is a telehealth GLP-1 weight loss practice founded by ${brandMemory.founder}

### Founder Credential Signal
"${brandMemory.founder_credential_signal}"

### Mission
${brandMemory.mission}

### Anchor Line (use sparingly but powerfully)
"${brandMemory.anchor_line}"

### Brand Voice
${brandMemory.brand_voice}

### Who We Are Talking To
${brandMemory.primary_icp}

### Their Pain Points
${(brandMemory.pain_points || []).map((p) => `- ${p}`).join('\n')}

### The Transformation We Deliver
${brandMemory.core_transformation}

### Tone Rules — NEVER VIOLATE THESE
${(brandMemory.tone_rules || []).map((r) => `- ${r}`).join('\n')}

### Content Pillars
${(brandMemory.content_pillars || []).join(' | ')}

### Competitive Position
${brandMemory.competitive_position}

### Active Programs & Pricing
${(offerStack || []).filter((o) => o.is_active).map((o) => `- ${o.offer_name}: ${o.price_display} — ${o.key_benefit}`).join('\n')}

${campaign ? `### This Week's Campaign
Name: ${campaign.name}
Goal: ${campaign.goal || ''}
Target Audience: ${campaign.target_audience || ''}
Core Message: ${campaign.core_message || ''}
Tone Guidance: ${campaign.tone_guidance || 'Default brand voice'}
Offer Focus: ${campaign.offer_details || ''}` : ''}

### Ad Compliance (Meta + Google)
${(brandMemory.ad_compliance_rules || []).map((r) => `- ${r}`).join('\n')}
  `.trim();
}
