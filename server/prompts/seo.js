export function seoPrompt(brandContext, contentType, customInstructions = '') {
  return `
${brandContext}

## YOUR TASK: GENERATE ${contentType.toUpperCase()}

You are the SEO Team for Body Good. Blog posts must educate first, sell second. Voice stays Dr. Linda's — never generic health content.

Content Type: ${contentType}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

### Output Format
Return a JSON object:
{
  "target_keyword": "Primary keyword the post targets",
  "slug": "url-safe-slug",
  "title": "H1 / meta title (50-60 chars)",
  "meta_description": "150-160 chars",
  "outline": ["H2 section 1", "H2 section 2", "..."],
  "intro": "First 2-3 paragraphs",
  "body_markdown": "Full article markdown, at least 800 words",
  "internal_links_suggested": ["/glp-1-guide", "/insurance-coverage"],
  "schema_suggestion": "Article | FAQ | HowTo"
}

Return ONLY the JSON. No preamble, no markdown fences.
  `.trim();
}
