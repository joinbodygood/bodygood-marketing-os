# Body Good Marketing OS

AI-powered marketing agency operating system for **Body Good** — a GLP-1 telehealth weight loss practice founded by Dr. Linda Moleon.

Weekly automated content generation across 9 marketing teams, a Sunday campaign brief with 3 data-backed options, a QC review queue, and a feedback loop from Windsor.ai back into the brief.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node 20 + Express |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Ad Analytics | Windsor.ai REST API |
| Competitor Intel | Apify (`apify/facebook-ads-scraper`) |
| Scheduling | node-cron |
| Deploy target | Replit (single-service, autoscale) |

---

## Repo layout

```
bodygood-marketing-os/
├── client/                    # React + Vite frontend
│   └── src/
│       ├── pages/             # Login, Home, OpsManager, QCCenter, TeamTools, Analytics, ContentLibrary, Settings
│       ├── components/        # Sidebar, Topbar, Layout, ProtectedRoute
│       ├── hooks/             # useAuth
│       └── lib/               # supabase client, axios API client
├── server/                    # Express backend
│   ├── index.js               # Entrypoint — serves /api/* and (in prod) the built client
│   ├── routes/                # auth, settings, dashboard, ops, campaigns, content, generate, analytics
│   ├── services/              # claude, supabase, ops, generate, windsor, apify, cron
│   ├── middleware/            # auth (JWT), role (RBAC)
│   ├── prompts/               # 9 team prompts + brand-memory + ops-manager
│   └── db/                    # migrations, seed scripts (brand memory, offer stack, CEO user)
├── .replit                    # Replit config
├── .env.example               # Environment variable template
└── package.json               # Root: concurrent dev, prod start, build
```

---

## Local development

```bash
# 1. Clone + install (postinstall handles client/ and server/ workspaces)
git clone https://github.com/joinbodygood/bodygood-marketing-os.git
cd bodygood-marketing-os
npm install

# 2. Copy environment template
cp .env.example .env
#    Fill in Supabase + Anthropic + Windsor.ai + Apify keys

# 3. Apply database migration (one time — paste into Supabase SQL editor)
#    See server/db/migrations/001_schema.sql

# 4. Seed brand memory + offer stack (one time)
npm run seed

# 5. Create the CEO user (one time — prints password to console)
npm run seed:ceo

# 6. Start dev (client on :5173, server on :3001)
npm run dev
```

Open **http://localhost:5173** and log in as `linda@bodygoodstudio.com` with the password printed by `seed:ceo`.

---

## Replit deployment

This repo is configured for a **single-service Replit deploy** — one process serves both the API and the built client.

### One-time setup

1. In Replit, **Import from GitHub** → select `joinbodygood/bodygood-marketing-os`.
2. Replit reads `.replit` and installs Node 20 automatically. `npm install` runs `postinstall`, which installs the client + server workspaces. (~2 min first time.)
3. Open the **Secrets** panel (🔒 icon in left sidebar). Add:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_ANON_KEY` | `eyJ...` (anon) |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service_role, SECRET) |
   | `VITE_SUPABASE_URL` | same as `SUPABASE_URL` |
   | `VITE_SUPABASE_ANON_KEY` | same as `SUPABASE_ANON_KEY` |
   | `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
   | `WINDSOR_AI_API_KEY` | your Windsor.ai API key |
   | `APIFY_API_TOKEN` | `apify_api_...` |

   (Stripe + HeyGen Phase 2; the app runs fine without them.)

4. Apply the schema (one time):
   Open `server/db/migrations/001_schema.sql`, copy contents, paste into Supabase **SQL Editor**, Run.
5. Seed (one time, in Replit shell):
   ```bash
   npm run seed
   npm run seed:ceo   # prints the CEO password — copy it to 1Password
   ```

### Run it

- **Workspace run button:** `npm run build && npm run start` (builds client, then starts Express in production mode). Replit exposes the port as `https://<repl-name>.<user>.repl.co`.
- **Deploy tab:** click **Deploy** → autoscale target. Deployment runs `npm run build` then `npm run start` with `NODE_ENV=production`.

### What production mode does

- Binds `0.0.0.0:${PORT}` (Replit routes external `:80` → internal `:3001`).
- Disables CORS (same-origin — client + API on one domain).
- Serves `client/dist/` statically with 1h cache.
- Falls back unknown paths to `index.html` for React Router (but `/api/*` always hits the API and returns 404 cleanly on miss).
- Initializes the 5 cron jobs (Sunday 6 PM + 7 PM ET, Monday 8 AM, Wednesday 9 AM, Friday 6 PM).

---

## Operational scripts

```bash
npm run dev          # Local: concurrent Vite + Express with hot reload
npm run build        # Build client to client/dist/
npm run start        # Start server — serves API + built client (requires prior build in prod)
npm run seed         # Upsert brand memory + 9 offers into Supabase (idempotent)
npm run seed:ceo     # Create/update Dr. Linda's CEO user (idempotent; pass password as arg to set explicitly)
```

---

## Roles

| Action | CEO | Operations | Team Member |
|---|---|---|---|
| View all pages | ✅ | ✅ | limited |
| Approve Sunday brief | ✅ | ❌ | ❌ |
| QC approve / reject / regenerate | ✅ | ✅ | ❌ |
| Export campaign ZIP | ✅ | ✅ | ❌ |
| Generate on-demand content | any team | any team | own team only |
| Edit brand memory + offer stack | ✅ | ✅ | ❌ |
| Manage integrations (env) | ✅ | ❌ | ❌ |

To add a team member, create them in **Supabase dashboard → Authentication → Users**, then insert a matching row in `public.profiles` with the correct `role` and `team`.

---

## Cron schedule (America/New_York)

| When | Job |
|---|---|
| Sunday 6 PM | Pull Windsor.ai + Apify snapshots |
| Sunday 7 PM | Generate 3 Sunday brief options via Claude |
| Monday 8 AM | QC queue reminder (logs pending count) |
| Wednesday 9 AM | Competitor scrape via Apify |
| Friday 6 PM | Collect weekly performance data |

---

## Out of scope for Phase 1

Per the original spec:
- No Slack integration (Jehanna shares folder links manually)
- No HeyGen / Higgsfield / Seedance video generation
- Stripe & HeyGen APIs are stubbed
- No men's health products
- No PHI in `content_items` — marketing copy only

---

## License

Private — all rights reserved, Body Good Studio.
