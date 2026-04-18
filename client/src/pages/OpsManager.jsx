import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.js';

export default function OpsManager() {
  const { profile } = useAuth();
  const [weekOf, setWeekOf] = useState(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(null);
  const [err, setErr] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/ops/brief-options/latest');
      setWeekOf(data.week_of);
      setOptions(data.options);
      setErr(null);
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setErr(null);
    try {
      await api.post('/api/ops/brief-options/generate');
      await load();
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(id) {
    setApproving(id);
    setErr(null);
    try {
      await api.post(`/api/ops/brief-options/${id}/approve`);
      await load();
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setApproving(null);
    }
  }

  const isCEO = profile?.role === 'ceo';

  return (
    <Layout
      title="Ops Manager"
      subtitle={
        weekOf
          ? `Sunday brief — week of ${weekOf}`
          : 'Sunday brief — 3 data-backed campaign options.'
      }
    >
      <DataStrip />

      <div className="flex items-center justify-between mt-6 mb-3">
        <div className="text-[11px] uppercase tracking-widest text-gray-500">
          Campaign options
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="text-xs text-gray-700 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
        >
          {generating ? 'Generating…' : options.length ? 'Regenerate' : 'Generate options'}
        </button>
      </div>

      {err && (
        <div className="text-xs text-[#ED1B1B] border border-[#ED1B1B]/30 bg-[#ED1B1B]/5 rounded-md px-3 py-2 mb-4">
          {err}
        </div>
      )}

      {loading && <div className="text-xs text-gray-400">Loading…</div>}

      {!loading && options.length === 0 && !generating && (
        <div className="border border-gray-200 rounded-lg p-10 text-xs text-gray-400 text-center">
          No brief options yet. Click "Generate options" to create this week's 3.
        </div>
      )}

      {options.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {options.map((opt) => (
            <CampaignOption
              key={opt.id}
              option={opt}
              canApprove={isCEO}
              approving={approving === opt.id}
              onApprove={() => handleApprove(opt.id)}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

function CampaignOption({ option, canApprove, approving, onApprove }) {
  const selected = option.is_selected;
  const recommended = option.data_sources?.recommended === true;
  return (
    <div
      className="rounded-lg p-5 bg-white flex flex-col"
      style={{
        border: selected ? '2px solid #ED1B1B' : '1px solid #e5e7eb',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-widest text-gray-500">
          Option {option.option_number}
        </div>
        {recommended && (
          <div className="text-[10px] uppercase tracking-widest text-white bg-gray-900 rounded-full px-2 py-0.5">
            Recommended
          </div>
        )}
        {selected && (
          <div className="text-[10px] uppercase tracking-widest text-white rounded-full px-2 py-0.5" style={{ backgroundColor: '#ED1B1B' }}>
            Approved
          </div>
        )}
      </div>

      <div className="text-sm font-medium mb-2">{option.campaign_name}</div>

      <div className="text-xs text-gray-600 bg-gray-50 rounded-md p-3 mb-3 leading-snug">
        <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
          Why now
        </div>
        {option.why_now}
      </div>

      <KeyValue label="Audience">{option.target_audience}</KeyValue>
      <KeyValue label="Core message">{option.core_message}</KeyValue>

      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
          Deliverables
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(option.deliverables || {}).map(([k, v]) => (
            <span
              key={k}
              className="text-[10px] text-gray-600 border border-gray-200 rounded-full px-2 py-0.5"
            >
              {k} ×{v}
            </span>
          ))}
        </div>
      </div>

      {option.risk && (
        <div className="mt-3 text-[11px] text-gray-500 italic leading-snug">
          Risk: {option.risk}
        </div>
      )}

      <div className="flex-1" />

      {canApprove && !selected && (
        <button
          onClick={onApprove}
          disabled={approving}
          className="mt-4 text-xs font-medium text-white rounded-md py-2 disabled:opacity-60"
          style={{ backgroundColor: '#ED1B1B' }}
        >
          {approving ? 'Approving…' : 'Approve this option'}
        </button>
      )}
    </div>
  );
}

function KeyValue({ label, children }) {
  return (
    <div className="mb-2">
      <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">
        {label}
      </div>
      <div className="text-xs text-gray-800 leading-snug">{children}</div>
    </div>
  );
}

function DataStrip() {
  // Phase 1 stub KPIs — rewired to Windsor.ai in Step 12
  const cards = [
    { label: 'Meta spend (7d)', value: '$1,420' },
    { label: 'Meta ROAS', value: '2.8' },
    { label: 'Google ROAS', value: '3.4' },
    { label: 'Conversions (7d)', value: '38' },
  ];
  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="border border-gray-200 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-500">
            {c.label}
          </div>
          <div className="text-xl font-medium mt-1">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function apiError(e) {
  return e.response?.data?.error || e.response?.data?.detail || e.message;
}
