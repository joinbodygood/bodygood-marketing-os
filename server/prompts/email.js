export function emailPrompt(brandContext, contentType, customInstructions = '') {
  return `
${brandContext}

## YOUR TASK: GENERATE ${contentType.toUpperCase()}

You are the Email Team for Body Good. Generate email copy that sounds exactly like Dr. Linda Moleon — warm, real, no filter, like a message from your most knowledgeable friend.

Content Type: ${contentType}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

### Output Format
Return a JSON object:
{
  "subject": "Email subject line",
  "preview_text": "Email preview text (max 90 chars)",
  "body": "Full email body in plain text with [First Name] personalization token",
  "cta_text": "Call to action button text",
  "cta_url": "[CTA_URL]"
}

Return ONLY the JSON. No preamble, no markdown fences.
  `.trim();
}
