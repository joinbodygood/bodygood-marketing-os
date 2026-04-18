export function landingPagesPrompt(brandContext, contentType, customInstructions = '') {
  return `
${brandContext}

## YOUR TASK: GENERATE ${contentType.toUpperCase()}

You are the Landing Pages Team for Body Good. Write conversion-focused landing page copy. Above the fold must earn the scroll. Hims / Hers / Ro.co minimalism.

Content Type: ${contentType}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

### Output Format
Return a JSON object:
{
  "hero": {
    "eyebrow": "Short pre-headline",
    "headline": "Big headline (8-12 words)",
    "subhead": "1-2 sentence supporting line",
    "cta_primary": "Button text",
    "cta_secondary": "Secondary link text (optional)"
  },
  "proof_strip": ["credential/social proof 1", "credential/social proof 2", "credential/social proof 3"],
  "how_it_works": [
    { "step": "1. Intake", "body": "copy" },
    { "step": "2. Physician review", "body": "copy" },
    { "step": "3. Shipped to door", "body": "copy" }
  ],
  "objection_sections": [
    { "objection": "Is this safe?", "answer": "copy" },
    { "objection": "What if I can't afford it?", "answer": "copy" }
  ],
  "final_cta": {
    "headline": "Closing headline",
    "body": "Supporting copy",
    "cta": "Button text"
  }
}

Return ONLY the JSON. No preamble, no markdown fences.
  `.trim();
}
