import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

const TEAMS = [
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
  { id: 'socials', label: 'Socials' },
  { id: 'ads', label: 'Ads' },
  { id: 'seo', label: 'SEO' },
  { id: 'creatives', label: 'Creatives' },
  { id: 'video', label: 'Video' },
  { id: 'landing_pages', label: 'Landing Pages' },
  { id: 'research', label: 'Research' },
];

export default function QCCenter() {
  const [campaign, setCampaign] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState('email');
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data: campaigns } = await api.get('/api/campaigns');
      const active = (campaigns || []).find((c) =>
        ['approved', 'active'].includes(c.status)
      );
      setCampaign(active || null);

      if (active) {
        const { data: itemList } = await api.get(
          `/api/content?campaign_id=${active.id}`
        );
        setItems(itemList || []);
      } else {
        setItems([]);
      }
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

  const countsByTeam = useMemo(() => {
    const map = {};
    for (const t of TEAMS) map[t.id] = { pending: 0, approved: 0 };
    for (const it of items) {
      if (!map[it.team]) map[it.team] = { pending: 0, approved: 0 };
      if (it.status === 'pending_review') map[it.team].pending += 1;
      if (it.status === 'approved') map[it.team].approved += 1;
    }
    return map;
  }, [items]);

  const visibleItems = items.filter((i) => i.team === activeTeam);

  async function approve(item) {
    setBusyId(item.id);
    try {
      const { data } = await api.patch(`/api/content/${item.id}/approve`);
      setItems((arr) => arr.map((x) => (x.id === item.id ? data : x)));
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setBusyId(null);
    }
  }
  async function reject(item) {
    setBusyId(item.id);
    try {
      const { data } = await api.patch(`/api/content/${item.id}/reject`);
      setItems((arr) => arr.map((x) => (x.id === item.id ? data : x)));
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setBusyId(null);
    }
  }
  async function regenerate(item) {
    setBusyId(item.id);
    try {
      const { data } = await api.post(`/api/content/${item.id}/regenerate`);
      setItems((arr) => [
        ...arr.map((x) => (x.id === item.id ? { ...x, status: 'regenerated' } : x)),
        data.item,
      ]);
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function exportZip() {
    if (!campaign) return;
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    const resp = await fetch(`/api/campaigns/${campaign.id}/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      setErr(`Export failed (${resp.status})`);
      return;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Week-${campaign.week_of || 'export'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout
      title="QC Center"
      subtitle="Review, edit, approve, export."
      activeCampaign={campaign?.name}
    >
      {err && (
        <div className="text-xs text-[#ED1B1B] border border-[#ED1B1B]/30 bg-[#ED1B1B]/5 rounded-md px-3 py-2 mb-4">
          {err}
        </div>
      )}
      {loading && <div className="text-xs text-gray-400">Loading…</div>}

      {!loading && !campaign && (
        <div className="border border-gray-200 rounded-lg p-10 text-xs text-gray-400 text-center">
          No active campaign. Approve one from Ops Manager first.
        </div>
      )}

      {!loading && campaign && (
        <>
          <CampaignBanner campaign={campaign} onExport={exportZip} />

          <div className="flex gap-1 mt-6 border-b border-gray-200">
            {TEAMS.map((t) => {
              const isActive = activeTeam === t.id;
              const pending = countsByTeam[t.id]?.pending || 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTeam(t.id)}
                  className={[
                    'px-3 py-2 text-xs border-b-2 -mb-px',
                    isActive
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-800',
                  ].join(' ')}
                >
                  {t.label}
                  {pending > 0 && (
                    <span
                      className="ml-1.5 text-[9px] text-white rounded-full px-1.5 py-0.5"
                      style={{ backgroundColor: '#ED1B1B' }}
                    >
                      {pending}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3">
            {visibleItems.length === 0 && (
              <div className="border border-gray-200 rounded-lg p-6 text-xs text-gray-400 text-center">
                Nothing in this team yet.
              </div>
            )}
            {visibleItems.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onApprove={() => approve(item)}
                onReject={() => reject(item)}
                onRegenerate={() => regenerate(item)}
              />
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}

function CampaignBanner({ campaign, onExport }) {
  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-gray-500">
            Active campaign · week of {campaign.week_of}
          </div>
          <div className="text-sm font-medium mt-1">{campaign.name}</div>
          <div className="text-xs text-gray-700 mt-2 leading-snug">
            {campaign.core_message}
          </div>
        </div>
        <button
          onClick={onExport}
          className="text-xs text-gray-700 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-white bg-white"
        >
          Export folder
        </button>
      </div>
    </div>
  );
}

function ContentCard({ item, busy, onApprove, onReject, onRegenerate }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor =
    item.status === 'approved'
      ? '#10b981'
      : item.status === 'rejected'
      ? '#ED1B1B'
      : item.status === 'regenerated'
      ? '#9ca3af'
      : '#f59e0b';

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span
          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: statusColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-gray-500">
            {item.content_type} · {item.status.replace('_', ' ')}
          </div>
          <div className="text-sm font-medium mt-0.5 truncate">
            {item.title || '(untitled)'}
          </div>
          <div
            className={[
              'text-xs text-gray-700 mt-2 whitespace-pre-wrap font-mono leading-snug',
              expanded ? '' : 'line-clamp-4',
            ].join(' ')}
          >
            {item.content}
          </div>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[11px] text-gray-500 underline mt-1"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      {item.status === 'pending_review' && (
        <div className="flex gap-2 mt-3 justify-end">
          <button
            onClick={onRegenerate}
            disabled={busy}
            className="text-xs text-gray-700 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
          >
            {busy ? '…' : 'Regenerate'}
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="text-xs text-gray-700 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            disabled={busy}
            className="text-xs font-medium text-white rounded-md px-3 py-1.5 disabled:opacity-60"
            style={{ backgroundColor: '#ED1B1B' }}
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}

function apiError(e) {
  return e.response?.data?.error || e.response?.data?.detail || e.message;
}
