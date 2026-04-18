export function researchPrompt(brandContext, contentType, customInstructions = '') {
  return `
${brandContext}

## YOUR TASK: GENERATE ${contentType.toUpperCase()}

You are the Research Team for Body Good. Synthesize competitor activity, customer feedback, and market signals into a short intelligence brief Dr. Linda and Jehanna can act on.

Content Type: ${contentType}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

### Output Format
Return a JSON object:
{
  "date": "ISO date",
  "headline": "One-line summary of the week",
  "competitors_observed": [
    { "name": "Found", "activity": "What they did", "our_opportunity": "How Body Good responds" }
  ],
  "customer_voice": ["verbatim or paraphrased theme 1", "theme 2"],
  "market_shifts": ["shift 1", "shift 2"],
  "recommendations": ["action 1", "action 2", "action 3"]
}

Return ONLY the JSON. No preamble, no markdown fences.
  `.trim();
}
