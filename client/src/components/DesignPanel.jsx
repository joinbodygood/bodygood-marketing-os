import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const CLAUDE_DESIGN_URL = 'https://claude.ai/design';

const DESIGNABLE_TEAMS = new Set([
  'ads',
  'socials',
  'creatives',
  'landing_pages',
  'seo',
]);

export default function DesignPanel({ item, onItemUpdated }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const fileInput = useRef(null);

  if (!item || !DESIGNABLE_TEAMS.has(item.team)) return null;

  async function fetchBrief() {
    if (brief) return brief;
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get(`/api/content/${item.id}/design-brief`);
      setBrief(data);
      return data;
    } catch (e) {
      setErr(apiErr(e));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyAndOpen() {
    const b = await fetchBrief();
    if (!b) return;
    try {
      await navigator.clipboard.writeText(b.brief_markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      setErr('Clipboard copy failed — select + copy the brief manually below.');
    }
    window.open(CLAUDE_DESIGN_URL, '_blank', 'noopener,noreferrer');
  }

  async function handleFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const base64 = await fileToBase64(file);
      const { data } = await api.post(`/api/content/${item.id}/designs`, {
        mimeType: file.type,
        data: base64,
        filename: file.name,
      });
      onItemUpdated?.(data.item);
      if (fileInput.current) fileInput.current.value = '';
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(url) {
    if (!confirm('Remove this design?')) return;
    setErr(null);
    try {
      const { data } = await api.delete(`/api/content/${item.id}/designs`, {
        data: { url },
      });
      onItemUpdated?.(data);
    } catch (e) {
      setErr(apiErr(e));
    }
  }

  const designs = item.design_urls || [];

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-gray-500">
          Designs
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAndOpen}
            disabled={loading}
            className="text-xs text-gray-800 border border-gray-200 rounded-md px-3 py-1 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? 'Loading brief…' : copied ? 'Copied! → Claude Design' : 'Copy brief → Claude Design'}
          </button>
          <label className="text-xs font-medium text-white rounded-md px-3 py-1 cursor-pointer disabled:opacity-60" style={{ backgroundColor: '#ED1B1B' }}>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,application/pdf"
              onChange={handleFileChosen}
              disabled={uploading}
              className="hidden"
            />
            {uploading ? 'Uploading…' : 'Upload design'}
          </label>
        </div>
      </div>

      {err && (
        <div className="text-xs text-[#ED1B1B] border border-[#ED1B1B]/30 bg-[#ED1B1B]/5 rounded-md px-3 py-2 mb-2">
          {err}
        </div>
      )}

      {designs.length === 0 ? (
        <div className="text-[11px] text-gray-400">
          No designs yet. Copy the brief, paste into Claude Design, download the result, upload it here.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {designs.map((url) => (
            <DesignThumb key={url} url={url} onRemove={() => handleRemove(url)} />
          ))}
        </div>
      )}

      {brief && (
        <details className="mt-3">
          <summary className="text-[11px] text-gray-500 cursor-pointer hover:text-gray-800">
            Show full brief
          </summary>
          <pre className="mt-2 text-[11px] whitespace-pre-wrap font-mono bg-gray-50 border border-gray-200 rounded-md p-3 max-h-80 overflow-y-auto">
            {brief.brief_markdown}
          </pre>
        </details>
      )}
    </div>
  );
}

function DesignThumb({ url, onRemove }) {
  const isPdf = /\.pdf($|\?)/i.test(url);
  return (
    <div className="relative group border border-gray-200 rounded-md overflow-hidden">
      {isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center h-24 bg-gray-50 text-xs text-gray-600"
        >
          PDF
        </a>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt="design" className="w-full h-24 object-cover" />
        </a>
      )}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-white border border-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:bg-[#ED1B1B] hover:text-white"
        title="Remove design"
      >
        ×
      </button>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const s = String(r.result || '');
      const comma = s.indexOf(',');
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    r.readAsDataURL(file);
  });
}

function apiErr(e) {
  return e.response?.data?.error || e.response?.data?.detail || e.message;
}
