export function opsBriefPrompt(brandContext, analyticsData, competitorData, calendarEvents) {
  return `
${brandContext}

## YOUR TASK: GENERATE 3 CAMPAIGN OPTIONS FOR THIS SUNDAY'S BRIEF

You are the Operations Manager for Body Good's marketing system. Every Sunday you analyze performance data, competitor activity, and upcoming calendar events to generate 3 data-backed campaign options for Dr. Linda to choose from.

### This Week's Data

#### Windsor.ai — Ad Performance
${JSON.stringify(analyticsData || {}, null, 2)}

#### Competitor Activity (Apify)
${JSON.stringify(competitorData || {}, null, 2)}

#### Upcoming Calendar Events
${(calendarEvents || []).join('\n') || '(none)'}

### Output Format
Return a JSON array of exactly 3 campaign options. Each option must follow this schema exactly:

[
  {
    "option_number": 1,
    "campaign_name": "Short memorable name",
    "why_now": "Specific data-backed reason — reference actual numbers from the analytics data provided",
    "target_audience": "Specific segment of the Body Good ICP",
    "core_message": "The single message all content this week should carry",
    "deliverables": {
      "email": 3,
      "sms": 3,
      "socials": 10,
      "ads": 10,
      "seo": 5,
      "carousels": 10
    },
    "risk": "One honest risk or limitation of this campaign",
    "recommended": true
  }
]

Return ONLY the JSON array. No preamble, no explanation, no markdown fences.
  `.trim();
}
