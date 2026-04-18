import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [scores, setScores] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/analytics/summary'),
      api.get('/api/analytics/content-scores'),
    ])
      .then(([s, c]) => {
        setSummary(s.data);
        setScores(c.data || []);
      })
      .catch((e) => setErr(e.response?.data?.error || e.message));
  }, []);

  const ads = summary?.ads || {};

  return (
    <Layout title="Analytics" subtitle="Ad performance and content scores.">
      {err && <ErrorBox>{err}</ErrorBox>}
      {!summary && !err && <div className="text-xs text-gray-400">Loading…</div>}

      {summary && (
        <>
          {ads.source === 'stub' && (
            <div className="text-[11px] text-gray-500 border border-gray-200 rounded-md px-3 py-2 mb-4">
              Windsor.ai not configured — showing sample data. Add{' '}
              <code>WINDSOR_AI_API_KEY</code> to enable live metrics.
            </div>
          )}
          <div className="grid grid-cols-4 gap-4">
            <KPI label="Meta spend (7d)" value={currency(ads.meta_spend)} />
            <KPI label="Meta ROAS" value={num(ads.meta_roas, 2)} />
            <KPI label="Google ROAS" value={num(ads.google_roas, 2)} />
            <KPI
              label="Conversions (7d)"
              value={num(ads.total_conversions, 0)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Panel title="Top content scores">
              {scores.length === 0 && (
                <div className="text-xs text-gray-400 p-4 text-center">
                  No scored content yet.
                </div>
              )}
              {scores.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center px-4 py-2 border-b border-gray-200 last:border-b-0"
                >
                  <div className="flex-1 min-w-0 text-xs">
                    <span className="text-gray-500 capitalize">{c.team}</span>
                    <span className="text-gray-400"> · </span>
                    <span className="text-gray-800 truncate">{c.title}</span>
                  </div>
                  <ScoreBadge score={c.performance_score} />
                </div>
              ))}
            </Panel>

            <Panel title="Recent campaigns">
              {(summary.recent_campaigns || []).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center px-4 py-2 border-b border-gray-200 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{c.name}</div>
                    <div className="text-[10px] text-gray-500">
                      {c.week_of} · {c.status}
                    </div>
                  </div>
                  {c.performance_score != null && (
                    <ScoreBadge score={c.performance_score} />
                  )}
                </div>
              ))}
              {(!summary.recent_campaigns ||
                summary.recent_campaigns.length === 0) && (
                <div className="text-xs text-gray-400 p-4 text-center">
                  No campaigns yet.
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </Layout>
  );
}

function KPI({ label, value }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-widest text-gray-500">
        {label}
      </div>
      <div className="text-xl font-medium mt-1">{value}</div>
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <section className="border border-gray-200 rounded-lg">
      <header className="px-4 py-3 border-b border-gray-200">
        <div className="text-sm font-medium">{title}</div>
      </header>
      <div>{children}</div>
    </section>
  );
}
function ScoreBadge({ score }) {
  return (
    <span className="text-[11px] font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-0.5">
      {score}/10
    </span>
  );
}
function currency(n) {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function num(n, d = 0) {
  if (n == null) return '—';
  return Number(n).toFixed(d);
}
function ErrorBox({ children }) {
  return (
    <div className="text-xs text-[#ED1B1B] border border-[#ED1B1B]/30 bg-[#ED1B1B]/5 rounded-md px-3 py-2 mb-4">
      {children}
    </div>
  );
}
