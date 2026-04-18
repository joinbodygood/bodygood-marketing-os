import { supabaseAnon, supabaseAdmin } from '../services/supabase.service.js';

// Verify Supabase JWT from Authorization header, attach user + profile to req.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'missing_token' });
    if (!supabaseAnon || !supabaseAdmin) {
      return res.status(500).json({ error: 'supabase_not_configured' });
    }

    const { data: userData, error: userErr } = await supabaseAnon.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, name, role, team')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileErr) {
      return res.status(500).json({ error: 'profile_lookup_failed', detail: profileErr.message });
    }
    if (!profile) {
      return res.status(403).json({ error: 'no_profile' });
    }

    req.user = userData.user;
    req.profile = profile;
    next();
  } catch (err) {
    next(err);
  }
}
