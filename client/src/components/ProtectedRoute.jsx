import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function ProtectedRoute({ children, allow }) {
  const { session, profile, sessionReady, profileLoading, error, signOut, reloadProfile } = useAuth();
  const location = useLocation();

  // Still bootstrapping — show loader, don't redirect yet.
  if (!sessionReady) {
    return <Centered>Loading…</Centered>;
  }

  // Not signed in — send to login, remember where they wanted to go.
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Signed in but profile still fetching — wait, don't loop back to login.
  if (profileLoading) {
    return <Centered>Loading your profile…</Centered>;
  }

  // Signed in but profile load failed — show a recovery screen, NOT a redirect.
  // (Redirecting here causes the infinite Login ↔ ProtectedRoute loop.)
  if (!profile) {
    return (
      <Centered>
        <div className="max-w-sm text-center space-y-3">
          <div className="text-sm font-medium">We couldn't load your account.</div>
          <div className="text-xs text-gray-500">
            {error || 'Profile is missing or the server is unreachable.'}
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={reloadProfile}
              className="text-xs text-white rounded-md px-3 py-1.5"
              style={{ backgroundColor: '#ED1B1B' }}
            >
              Retry
            </button>
            <button
              onClick={signOut}
              className="text-xs text-gray-700 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </Centered>
    );
  }

  if (allow && !allow.includes(profile.role)) {
    return <Centered>You don't have access to this page.</Centered>;
  }

  return children;
}

function Centered({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600 p-6">
      {children}
    </div>
  );
}
