import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function Login() {
  const { session, profile, signIn, sessionReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const location = useLocation();

  // Only redirect away if BOTH session AND profile resolved. Otherwise
  // ProtectedRoute's own handling covers the loading / error states —
  // avoids the Login ↔ ProtectedRoute infinite loop.
  if (sessionReady && session && profile) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (error) {
      setErr(error.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm border border-gray-200 rounded-lg p-8">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">
            Body Good Marketing OS
          </div>
          <h1 className="text-xl font-medium">
            Body <span style={{ color: '#ED1B1B' }}>Good</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {err && (
            <div className="text-xs text-[#ED1B1B] border border-[#ED1B1B]/30 bg-[#ED1B1B]/5 rounded-md px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md text-sm font-medium py-2 text-white disabled:opacity-60"
            style={{ backgroundColor: '#ED1B1B' }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
