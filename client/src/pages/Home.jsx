import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../lib/api.js';

const TEAM_LABEL = {
  email: 'Email',
  sms: 'SMS',
  socials: 'Socials',
  ads: 'Ads',
  seo: 'SEO',
  research: 'Research',
  creatives: 'Creatives',
  video: 'Video',
  landing_pages: 'Landing Pages',
};

export default function Home() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api
      .get('/api/dashboard/summary')
      .then(({ data }) => setSummary(data))
      .catch((e) =>
        setErr(e.response?.data?.error || e.message)
      );
  }, []);

  const greeting = greet();
  const firstName = (profile?.name || '').replace(/^Dr\.\s+/i, '').split(/\s+/)[0] || 'there';

  return (
    <Layout
      title={`${greeting}, ${firstName}.`}
      subtitle="Your marketing system at a glance."
      activeCampaign={summary?.active_campaign?.name}
    >
      {err && <ErrorBox>{err}</ErrorBox>}
      {!summary && !err && <div className="text-xs text-gray-400">Loading…</div>}
      {summary && (
        <>
          <KPIRow kpis={summary.kpis} />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <TeamStatus teamStatus={summary.team_status} campaign={summary.active_campaign} />
            <div className="space-y-4">
              <NextBriefCountdown iso={summary.kpis.next_brief_iso} />
              <ActivityFeed activity={summary.activity} />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function KPIRow({ kpis }) {
  const days = daysUntil(kpis.next_brief_iso);
  const cards = [
    { label: 'Pending QC', value: kpis.pending_qc },
    { label: 'Approved this week', value: kpis.approved_this_week },
    { label: 'Total campaigns', value: kpis.total_campaigns },
    { label: 'Days until Sunday brief', value: days },
  ];
  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="border border-gray-200 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-widest text-gray-500">
            {c.label}
          </div>
          <div className="text-2xl font-medium mt-1">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function TeamStatus({ teamStatus, campaign }) {
  return (
    <section className="border border-gray-200 rounded-lg">
      <header className="px-5 py-3 border-b border-gray-200">
        <div className="text-sm font-medium">Team status</div>
        <div className="text-[11px] text-gray-500">
          {campaign ? `For ${campaign.name}` : 'No active campaign'}
        </div>
      </header>
      <div className="divide-y divide-gray-200">
        {teamStatus.map((t) => (
          <div key={t.team} className="flex items-center px-5 py-2.5">
            <div className="text-sm flex-1">{TEAM_LABEL[t.team] || t.team}</div>
            <Badge tone="amber" count={t.pending} label="pending" />
            <Badge tone="green" count={t.approved} label="approved" />
          </div>
        ))}
      </div>
    </section>
  );
}

function Badge({ count, label, tone }) {
  const colors = tone === 'green' ? '#10b981' : '#f59e0b';
  if (!count) {
    return <span className="text-[11px] text-gray-400 ml-3">{label} 0</span>;
  }
  return (
    <span className="flex items-center gap-1 ml-3 text-[11px] text-gray-700">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors }} />
      {label} {count}
    </span>
  );
}

function NextBriefCountdown({ iso }) {
  const days = daysUntil(iso);
  return (
    <section className="border border-gray-200 rounded-lg p-5">
      <div className="text-[10px] uppercase tracking-widest text-gray-500">
        Next Sunday brief
      </div>
      <div className="text-2xl font-medium mt-1">
        {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
      </div>
      <div className="text-[11px] text-gray-500 mt-1">
        Generates Sunday 7 PM ET.
      </div>
    </section>
  );
}

function ActivityFeed({ activity }) {
  return (
    <section className="border border-gray-200 rounded-lg">
      <header className="px-5 py-3 border-b border-gray-200">
        <div className="text-sm font-medium">Recent activity</div>
      </header>
      <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
        {activity.length === 0 && (
          <div className="px-5 py-6 text-xs text-gray-400 text-center">
            No activity yet.
          </div>
        )}
        {activity.map((a) => (
          <div key={a.id} className="flex items-center px-5 py-2.5">
            <span
              className="w-1.5 h-1.5 rounded-full mr-3"
              style={{ backgroundColor: statusColor(a.status) }}
            />
            <div className="flex-1 min-w-0 text-xs">
              <span className="text-gray-800">{TEAM_LABEL[a.team] || a.team}</span>
              <span className="text-gray-400"> · </span>
              <span className="text-gray-600">{a.content_type}</span>
              {a.title && (
                <>
                  <span className="text-gray-400"> · </span>
                  <span className="text-gray-800 truncate">{a.title}</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-gray-400 ml-3">
              {timeAgo(a.created_at)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function statusColor(s) {
  switch (s) {
    case 'approved': return '#10b981';
    case 'pending_review': return '#f59e0b';
    case 'rejected': return '#ED1B1B';
    default: return '#9ca3af';
  }
}

function daysUntil(iso) {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function timeAgo(iso) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function greet() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function ErrorBox({ children }) {
  return (
    <div className="text-xs text-[#ED1B1B] border border-[#ED1B1B]/30 bg-[#ED1B1B]/5 rounded-md px-3 py-2">
      {children}
    </div>
  );
}
