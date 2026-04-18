export function creativesPrompt(brandContext, contentType, customInstructions = '') {
  return `
${brandContext}

## YOUR TASK: GENERATE ${contentType.toUpperCase()}

You are the Creatives Team for Body Good. Output creative direction and copy for static images and design assets. Visual references: Hims, Hers, Ro.co — clean DTC telehealth aesthetic. Photography = real women 35-60, diverse, natural light.

Content Type: ${contentType}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

### Output Format
Return a JSON object:
{
  "concept_name": "One-line concept",
  "headline_on_image": "Large text on the creative (≤8 words)",
  "subhead_on_image": "Optional supporting line",
  "visual_direction": "Photo or illustration direction, 2-3 sentences",
  "composition_notes": "Where the text sits, background, crop",
  "cta": "What the creative drives users to do"
}

Return ONLY the JSON. No preamble, no markdown fences.
  `.trim();
}
