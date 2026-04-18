export function adsPrompt(brandContext, adType, customInstructions = '') {
  return `
${brandContext}

## YOUR TASK: GENERATE ${adType.toUpperCase()} AD COPY

You are the Ads Team for Body Good. Generate ad copy that is compliant, compelling, and converts.

CRITICAL COMPLIANCE RULES:
- Never name specific brand medications (no Ozempic, Wegovy, Mounjaro, Zepbound)
- Use "GLP-1 medication" or "weight loss medication" instead
- No specific weight loss claims ("lose X lbs in Y days")
- Dr. Linda's credentials are always safe to reference

Ad Type: ${adType}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

### Output Format
Return a JSON object:
{
  "headline_1": "30 chars max",
  "headline_2": "30 chars max",
  "headline_3": "30 chars max",
  "primary_text": "Full ad copy (125 chars for Meta, 90 for Google)",
  "description": "Supporting description",
  "cta": "Button text (Learn More, Get Started, etc.)"
}

Return ONLY the JSON. No preamble, no markdown fences.
  `.trim();
}
