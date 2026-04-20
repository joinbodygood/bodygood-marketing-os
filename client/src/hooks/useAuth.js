import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { api } from '../lib/api.js';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const { data } = await api.get('/api/auth/me');
      setProfile(data.profile);
      setError(null);
    } catch (err) {
      setProfile(null);
      setError(err.response?.data?.error || err.message);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!supabase) {
      setSessionReady(true);
      setError('supabase_not_configured');
      return;
    }

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(data.session);
        if (data.session) {
          await loadProfile();
        }
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      if (nextSession) {
        await loadProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('supabase_not_configured');
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) throw signInErr;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setError(null);
  }, []);

  // Composite flags for callers
  const loading = !sessionReady || (!!session && profileLoading && !profile);

  return {
    session,
    profile,
    loading,
    sessionReady,
    profileLoading,
    error,
    signIn,
    signOut,
    reloadProfile: loadProfile,
  };
}
