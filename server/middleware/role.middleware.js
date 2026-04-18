// Per CLAUDE.md §6 — role-based access control.
// requireAuth must run first so req.profile is populated.

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.profile?.role;
    if (!role) return res.status(401).json({ error: 'no_profile' });
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'forbidden', role });
    }
    next();
  };
}

// Team members may only generate for their own team.
// CEO + operations may generate for any team.
export function requireTeamScope(req, res, next) {
  const role = req.profile?.role;
  const userTeam = req.profile?.team;
  const targetTeam = req.params.team || req.body?.team;

  if (role === 'ceo' || role === 'operations') return next();
  if (role === 'team_member' && userTeam && targetTeam && userTeam === targetTeam) {
    return next();
  }
  return res.status(403).json({ error: 'team_scope_violation', role, userTeam, targetTeam });
}
