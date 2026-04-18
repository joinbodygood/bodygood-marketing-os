import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';

export default function Settings() {
  return (
    <Layout title="Settings" subtitle="Brand memory, offers, integrations, team.">
      <div className="space-y-6 max-w-4xl">
        <BrandMemorySection />
        <OfferStackSection />
        <IntegrationsSection />
        <TeamSection />
      </div>
    </Layout>
  );
}

// ============================================================
// Brand Memory
// ============================================================

const BRAND_TEXT_FIELDS = [
  ['brand_name', 'Brand name'],
  ['founder', 'Founder'],
  ['founder_credential_signal', 'Founder credential signal'],
  ['mission', 'Mission'],
  ['anchor_line', 'Anchor line'],
  ['brand_voice', 'Brand voice'],
  ['primary_icp', 'Primary ICP'],
  ['core_transformation', 'Core transformation'],
  ['competitive_position', 'Competitive position'],
];
const BRAND_ARRAY_FIELDS = [
  ['pain_points', 'Pain points'],
  ['tone_rules', 'Tone rules'],
  ['brand_keywords', 'Brand keywords'],
  ['content_pillars', 'Content pillars'],
  ['ad_compliance_rules', 'Ad compliance rules'],
];

function BrandMemorySection() {
  const [brand, setBrand] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/settings/brand-memory');
      setBrand(data);
      setForm(toForm(data));
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

  function toForm(b) {
    if (!b) return {};
    const f = {};
    for (const [k] of BRAND_TEXT_FIELDS) f[k] = b[k] || '';
    for (const [k] of BRAND_ARRAY_FIELDS) {
      f[k] = Array.isArray(b[k]) ? b[k].join('\n') : '';
    }
    f.visual_identity = JSON.stringify(b.visual_identity || {}, null, 2);
    return f;
  }

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      const payload = {};
      for (const [k] of BRAND_TEXT_FIELDS) payload[k] = form[k] || null;
      for (const [k] of BRAND_ARRAY_FIELDS) {
        payload[k] = (form[k] || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      try {
        payload.visual_identity = JSON.parse(form.visual_identity || '{}');
      } catch {
        throw new Error('visual_identity is not valid JSON');
      }
      const { data } = await api.put('/api/settings/brand-memory', payload);
      setBrand(data);
      setForm(toForm(data));
      setEditing(false);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title="Brand Memory"
      subtitle="Injected into every AI generation. Keep the anchor line sacred."
      action={
        loading ? null : editing ? (
          <div className="flex gap-2">
            <GhostButton
              onClick={() => {
                setEditing(false);
                setForm(toForm(brand));
                setErr(null);
              }}
            >
              Cancel
            </GhostButton>
            <PrimaryButton onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </PrimaryButton>
          </div>
        ) : (
          <PrimaryButton onClick={() => setEditing(true)}>Edit</PrimaryButton>
        )
      }
    >
      {loading && <Muted>Loading…</Muted>}
      {err && <ErrorBox>{err}</ErrorBox>}
      {!loading && !brand && <Muted>No brand memory yet.</Muted>}
      {!loading && brand && (
        <div className="space-y-4">
          {BRAND_TEXT_FIELDS.map(([key, label]) => (
            <Field key={key} label={label}>
              {editing ? (
                <TextArea
                  rows={key === 'brand_name' ? 1 : 3}
                  value={form[key] || ''}
                  onChange={(v) => setForm((s) => ({ ...s, [key]: v }))}
                />
              ) : (
                <ReadValue>{brand[key] || <Muted inline>—</Muted>}</ReadValue>
              )}
            </Field>
          ))}
          {BRAND_ARRAY_FIELDS.map(([key, label]) => (
            <Field key={key} label={label} hint="One per line">
              {editing ? (
                <TextArea
                  rows={4}
                  value={form[key] || ''}
                  onChange={(v) => setForm((s) => ({ ...s, [key]: v }))}
                />
              ) : (
                <ul className="text-sm text-gray-700 list-disc list-inside space-y-0.5">
                  {(brand[key] || []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                  {(!brand[key] || brand[key].length === 0) && (
                    <Muted inline>—</Muted>
                  )}
                </ul>
              )}
            </Field>
          ))}
          <Field label="Visual identity" hint="JSON object">
            {editing ? (
              <TextArea
                rows={8}
                mono
                value={form.visual_identity || '{}'}
                onChange={(v) =>
                  setForm((s) => ({ ...s, visual_identity: v }))
                }
              />
            ) : (
              <pre className="text-xs text-gray-700 bg-gray-50 rounded-md p-3 border border-gray-200 overflow-x-auto">
                {JSON.stringify(brand.visual_identity || {}, null, 2)}
              </pre>
            )}
          </Field>
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================
// Offer Stack
// ============================================================

const OFFER_FIELDS = [
  { key: 'offer_name', label: 'Offer name' },
  { key: 'price_display', label: 'Price display' },
  { key: 'target_audience', label: 'Target audience' },
  { key: 'key_benefit', label: 'Key benefit' },
  { key: 'cta', label: 'CTA' },
  { key: 'sort_order', label: 'Sort', numeric: true },
];

function OfferStackSection() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [err, setErr] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/api/settings/offer-stack');
      setOffers(data || []);
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

  async function toggleActive(offer) {
    try {
      const { data } = await api.put(`/api/settings/offer-stack/${offer.id}`, {
        is_active: !offer.is_active,
      });
      setOffers((arr) => arr.map((o) => (o.id === offer.id ? data : o)));
    } catch (e) {
      setErr(apiError(e));
    }
  }

  async function saveEdit() {
    try {
      const payload = { ...draft };
      if (payload.sort_order !== undefined && payload.sort_order !== '') {
        payload.sort_order = Number(payload.sort_order);
      }
      const { data } = await api.put(
        `/api/settings/offer-stack/${editingId}`,
        payload
      );
      setOffers((arr) => arr.map((o) => (o.id === editingId ? data : o)));
      setEditingId(null);
      setDraft({});
    } catch (e) {
      setErr(apiError(e));
    }
  }

  return (
    <SectionCard
      title="Offer Stack"
      subtitle="Active programs. Referenced in every AI generation."
    >
      {loading && <Muted>Loading…</Muted>}
      {err && <ErrorBox>{err}</ErrorBox>}
      {!loading && (
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          {offers.map((offer) => {
            const isEditing = editingId === offer.id;
            return (
              <div key={offer.id} className="p-4">
                {!isEditing ? (
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">
                          {offer.offer_name}
                        </div>
                        {!offer.is_active && (
                          <span className="text-[10px] uppercase tracking-widest text-gray-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {offer.price_display}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {offer.key_benefit}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleActive(offer)}
                        className="text-xs text-gray-600 hover:text-gray-900"
                      >
                        {offer.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(offer.id);
                          setDraft({
                            offer_name: offer.offer_name || '',
                            price_display: offer.price_display || '',
                            target_audience: offer.target_audience || '',
                            key_benefit: offer.key_benefit || '',
                            cta: offer.cta || '',
                            sort_order: offer.sort_order ?? 0,
                          });
                        }}
                        className="text-xs text-gray-900 underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {OFFER_FIELDS.map((f) => (
                      <Field key={f.key} label={f.label}>
                        <TextArea
                          rows={1}
                          value={String(draft[f.key] ?? '')}
                          onChange={(v) =>
                            setDraft((s) => ({ ...s, [f.key]: v }))
                          }
                        />
                      </Field>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <PrimaryButton onClick={saveEdit}>Save</PrimaryButton>
                      <GhostButton
                        onClick={() => {
                          setEditingId(null);
                          setDraft({});
                        }}
                      >
                        Cancel
                      </GhostButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {offers.length === 0 && (
            <div className="p-6 text-xs text-gray-400 text-center">
              No offers.
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================
// Integrations
// ============================================================

const INTEGRATIONS = [
  { key: 'supabase', label: 'Supabase' },
  { key: 'anthropic', label: 'Anthropic (Claude)' },
  { key: 'windsor', label: 'Windsor.ai' },
  { key: 'apify', label: 'Apify' },
  { key: 'stripe', label: 'Stripe (Phase 2)' },
  { key: 'heygen', label: 'HeyGen (Phase 2)' },
];

function IntegrationsSection() {
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api
      .get('/api/settings/integrations')
      .then(({ data }) => setStatus(data))
      .catch((e) => setErr(apiError(e)));
  }, []);

  return (
    <SectionCard
      title="Integrations"
      subtitle="Reads from server env. Green = configured."
    >
      {err && <ErrorBox>{err}</ErrorBox>}
      {!status && !err && <Muted>Loading…</Muted>}
      {status && (
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          {INTEGRATIONS.map((i) => {
            const connected = status[i.key] === 'connected';
            return (
              <div
                key={i.key}
                className="p-3 flex items-center justify-between"
              >
                <div className="text-sm">{i.label}</div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: connected ? '#10b981' : '#f59e0b',
                    }}
                  />
                  <span className="text-[11px] text-gray-600 capitalize">
                    {connected ? 'Connected' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================
// Team
// ============================================================

function TeamSection() {
  const [team, setTeam] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api
      .get('/api/settings/team')
      .then(({ data }) => setTeam(data))
      .catch((e) => setErr(apiError(e)));
  }, []);

  return (
    <SectionCard
      title="Team"
      subtitle="Managed in Supabase Auth + profiles table."
    >
      {err && <ErrorBox>{err}</ErrorBox>}
      {!team && !err && <Muted>Loading…</Muted>}
      {team && (
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          {team.map((m) => (
            <div key={m.id} className="p-3 flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0"
                style={{ backgroundColor: '#ED1B1B' }}
              >
                {(m.name || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.name}</div>
                <div className="text-[11px] text-gray-500 truncate">
                  {m.role}
                  {m.team ? ` · ${m.team}` : ''}
                </div>
              </div>
            </div>
          ))}
          {team.length === 0 && (
            <div className="p-6 text-xs text-gray-400 text-center">
              No team members.
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================
// Shared UI
// ============================================================

function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="border border-gray-200 rounded-lg bg-white">
      <header className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && (
            <div className="text-[11px] text-gray-500 mt-0.5">{subtitle}</div>
          )}
        </div>
        {action && <div>{action}</div>}
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-[11px] uppercase tracking-widest text-gray-500">
          {label}
        </label>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function TextArea({ rows = 2, value, onChange, mono }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={[
        'w-full border border-gray-200 rounded-md px-3 py-2 text-sm',
        'focus:outline-none focus:ring-1 focus:ring-gray-400',
        mono ? 'font-mono text-xs' : '',
      ].join(' ')}
    />
  );
}

function ReadValue({ children }) {
  return <div className="text-sm text-gray-800 leading-snug">{children}</div>;
}

function Muted({ children, inline }) {
  const C = inline ? 'span' : 'div';
  return <C className="text-xs text-gray-400">{children}</C>;
}

function ErrorBox({ children }) {
  return (
    <div className="text-xs text-[#ED1B1B] border border-[#ED1B1B]/30 bg-[#ED1B1B]/5 rounded-md px-3 py-2">
      {children}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-xs font-medium text-white rounded-md px-3 py-1.5 disabled:opacity-60"
      style={{ backgroundColor: '#ED1B1B' }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-gray-700 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function apiError(e) {
  return e.response?.data?.error || e.response?.data?.detail || e.message;
}
