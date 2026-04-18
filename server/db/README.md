# Database — Supabase

## One-time setup

1. Create a Supabase project at https://supabase.com
2. Copy the project URL + anon key + service role key into the repo root `.env`:
   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...

   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Open the Supabase dashboard → **SQL Editor** → paste the contents of `migrations/001_schema.sql` → Run. (The SQL is idempotent — safe to re-run.)
4. Seed the brand memory + offer stack:
   ```bash
   cd server
   npm run seed
   ```

## Files

- `migrations/001_schema.sql` — all 6 tables + indexes + RLS read policies
- `seed/brand-memory.js` — pre-seeded brand identity (single row)
- `seed/offer-stack.js` — 9 active offers
- `seed/run-seed.js` — idempotent upsert runner

## Next steps (after Phase 1)

- `migrations/002_*.sql` — additional policies for role-based writes
- Supabase CLI migration tooling (swap out manual SQL editor)
