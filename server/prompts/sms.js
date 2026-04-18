export function smsPrompt(brandContext, contentType, customInstructions = '') {
  return `
${brandContext}

## YOUR TASK: GENERATE ${contentType.toUpperCase()}

You are the SMS Team for Body Good. Write SMS messages that sound like a friend texting — never like a brand blast. Must fit within 160 characters.

Content Type: ${contentType}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

### Output Format
Return a JSON object:
{
  "messages": [
    "Full SMS message 1 (≤160 chars, use [First Name] token)",
    "Full SMS message 2",
    "Full SMS message 3"
  ],
  "sequence_note": "Brief note on when each message in the sequence should fire"
}

Return ONLY the JSON. No preamble, no markdown fences.
  `.trim();
}
