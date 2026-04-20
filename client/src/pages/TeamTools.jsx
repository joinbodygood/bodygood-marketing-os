import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import DesignPanel from '../components/DesignPanel.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';

const TOOL_META = {
  email: {
    label: 'Email Studio',
    description: 'Campaign emails, nurture sequences, abandoned cart.',
    contentTypes: [
      'campaign_email',
      'welcome_email',
      'nurture_email',
      'abandoned_cart_email',
      'win_back_email',
    ],
  },
  sms: {
    label: 'SMS Studio',
    description: 'Conversational SMS sequences (160-char messages).',
    contentTypes: ['welcome_sms_sequence', 'appointment_reminder', 'promo_sms', 'refill_sms'],
  },
  socials: {
    label: 'Socials Studio',
    description: 'IG posts, carousels, Reels captions.',
    contentTypes: ['instagram_post', 'carousel', 'reel_caption', 'story'],
  },
  ads: {
    label: 'Ads Studio',
    description: 'Compliant Meta + Google ad copy.',
    contentTypes: ['meta_static_ad', 'meta_video_ad', 'google_rsa', 'retargeting_ad'],
  },
  seo: {
    label: 'SEO Studio',
    description: 'Long-form blog posts and FAQs.',
    contentTypes: ['blog_post', 'faq_page', 'city_page', 'comparison_post'],
  },
  creatives: {
    label: 'Creatives Studio',
    description: 'Static creative direction + copy on image.',
    contentTypes: ['static_ad_creative', 'billboard', 'editorial_image'],
  },
  video: {
    label: 'Video Studio',
    description: 'Short-form video scripts (Reels, TikTok, Shorts).',
    contentTypes: ['reel_script', 'tiktok_script', 'youtube_short'],
  },
  landing_pages: {
    label: 'Landing Pages Studio',
    description: 'Conversion-focused page copy.',
    contentTypes: ['product_landing_page', 'offer_landing_page', 'pre_launch_page'],
  },
  research: {
    label: 'Research Studio',
    description: 'Weekly intelligence briefs.',
    contentTypes: ['weekly_intel_brief', 'competitor_teardown', 'customer_voice_summary'],
  },
};

export default function TeamTools() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTool, setActiveTool] = useState(null);
  const [contentType, setContentType] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api
      .get('/api/generate/teams')
      .then(({ data }) => setTeams(data.teams || []))
      .catch((e) =>
        setErr(e.response?.data?.error || e.message)
      );
  }, []);

  async function handleGenerate() {
    if (!activeTool || !contentType) return;
    setSubmitting(true);
    setErr(null);
    setResult(null);
    try {
      const { data } = await api.post(`/api/generate/${activeTool}`, {
        contentType,
        customInstructions,
      });
      setResult(data);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout
      title="Team Tools"
      subtitle="Generate on-demand content. Ships to QC Center."
    >
      {err && (
        <div className="text-xs text-[#ED1B1B] border border-[#ED1B1B]/30 bg-[#ED1B1B]/5 rounded-md px-3 py-2 mb-4">
          {err}
        </div>
      )}

      {!activeTool && (
        <div className="grid grid-cols-3 gap-4">
          {teams.map((team) => {
            const meta = TOOL_META[team];
            if (!meta) return null;
            return (
              <button
                key={team}
                onClick={() => {
                  setActiveTool(team);
                  setContentType(meta.contentTypes[0]);
                  setResult(null);
                }}
                className="text-left border border-gray-200 rounded-lg p-5 hover:bg-gray-50"
              >
                <div className="text-sm font-medium">{meta.label}</div>
                <div className="text-xs text-gray-500 mt-1 leading-snug">
                  {meta.description}
                </div>
                <div className="mt-3 text-[10px] text-gray-400 uppercase tracking-widest">
                  Output
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {meta.contentTypes.slice(0, 4).map((ct) => (
                    <span
                      key={ct}
                      className="text-[10px] text-gray-600 border border-gray-200 rounded-full px-2 py-0.5"
                    >
                      {ct.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
          {teams.length === 0 && (
            <div className="col-span-3 border border-gray-200 rounded-lg p-6 text-xs text-gray-400 text-center">
              No tools available for your role.
            </div>
          )}
        </div>
      )}

      {activeTool && (
        <div className="max-w-3xl">
          <button
            onClick={() => {
              setActiveTool(null);
              setResult(null);
              setErr(null);
            }}
            className="text-xs text-gray-500 underline mb-3"
          >
            ← Back to tools
          </button>
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="text-sm font-medium">
              {TOOL_META[activeTool].label}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {TOOL_META[activeTool].description}
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-500 block mb-1">
                  Content type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                >
                  {TOOL_META[activeTool].contentTypes.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-gray-500 block mb-1">
                  Custom instructions{' '}
                  <span className="text-gray-400 normal-case">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Focus on tirzepatide, emphasize the 3-month price, target women who just saw our ad."
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={submitting || !contentType}
                className="text-xs font-medium text-white rounded-md px-4 py-2 disabled:opacity-60"
                style={{ backgroundColor: '#ED1B1B' }}
              >
                {submitting ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>

          {result && (
            <div className="mt-5 border border-gray-200 rounded-lg p-5">
              <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
                Generated · sent to QC Center
              </div>
              <div className="text-sm font-medium mb-2">
                {result.item?.title || '(untitled)'}
              </div>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-snug bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto">
                {result.item?.content}
              </pre>
              {result.usage && (
                <div className="text-[10px] text-gray-400 mt-2">
                  tokens: in {result.usage.input_tokens} · out{' '}
                  {result.usage.output_tokens}
                </div>
              )}
              <DesignPanel
                item={result.item}
                onItemUpdated={(next) =>
                  setResult((r) => (r ? { ...r, item: next } : r))
                }
              />
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
