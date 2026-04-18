-- Body Good Marketing OS — Phase 1 schema
-- Idempotent: safe to re-run.

-- =====================================================================
-- profiles (extends auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  name text not null,
  role text check (role in ('ceo', 'operations', 'team_member')) not null default 'team_member',
  team text check (team in ('email','sms','socials','ads','seo','research','creatives','video','landing_pages')),
  created_at timestamptz default now()
);

-- =====================================================================
-- brand_memory (single row — always upsert)
-- =====================================================================
create table if not exists public.brand_memory (
  id uuid primary key default gen_random_uuid(),
  brand_name text default 'Body Good',
  founder text,
  founder_credential_signal text,
  mission text,
  anchor_line text,
  brand_voice text,
  primary_icp text,
  pain_points text[],
  core_transformation text,
  tone_rules text[],
  brand_keywords text[],
  content_pillars text[],
  visual_identity jsonb,
  competitive_position text,
  ad_compliance_rules text[],
  updated_at timestamptz default now()
);

-- =====================================================================
-- offer_stack
-- =====================================================================
create table if not exists public.offer_stack (
  id uuid primary key default gen_random_uuid(),
  offer_name text not null,
  price_monthly decimal,
  price_display text,
  promotion text,
  expiry_date date,
  target_audience text,
  key_benefit text,
  cta text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- =====================================================================
-- campaigns
-- =====================================================================
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text,
  target_audience text,
  core_message text,
  tone_guidance text,
  offer_details text,
  week_of date,
  status text check (status in ('draft','approved','active','complete')) default 'draft',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  performance_score integer check (performance_score between 1 and 10),
  ops_data jsonb,
  created_at timestamptz default now()
);

-- =====================================================================
-- content_items
-- =====================================================================
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  team text check (team in ('email','sms','socials','ads','seo','research','creatives','video','landing_pages')) not null,
  content_type text not null,
  title text,
  content text not null,
  status text check (status in ('pending_review','approved','rejected','regenerated')) default 'pending_review',
  submitted_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  qc_notes text,
  distributed_at timestamptz,
  performance_score integer check (performance_score between 1 and 10),
  performance_data jsonb,
  is_automated boolean default true,
  created_at timestamptz default now()
);

create index if not exists content_items_campaign_idx on public.content_items (campaign_id);
create index if not exists content_items_team_status_idx on public.content_items (team, status);

-- =====================================================================
-- brief_options
-- =====================================================================
create table if not exists public.brief_options (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  option_number integer check (option_number in (1,2,3)),
  campaign_name text,
  why_now text,
  target_audience text,
  core_message text,
  deliverables jsonb,
  risk text,
  data_sources jsonb,
  is_selected boolean default false,
  created_at timestamptz default now()
);

create index if not exists brief_options_week_idx on public.brief_options (week_of);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.brand_memory   enable row level security;
alter table public.offer_stack    enable row level security;
alter table public.campaigns      enable row level security;
alter table public.content_items  enable row level security;
alter table public.brief_options  enable row level security;

-- Read policies (authenticated users can read everything; writes are role-controlled in the API)
do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='Authenticated read') then
    create policy "Authenticated read" on public.profiles for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='brand_memory' and policyname='Authenticated read') then
    create policy "Authenticated read" on public.brand_memory for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='offer_stack' and policyname='Authenticated read') then
    create policy "Authenticated read" on public.offer_stack for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='campaigns' and policyname='Authenticated read') then
    create policy "Authenticated read" on public.campaigns for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='content_items' and policyname='Authenticated read') then
    create policy "Authenticated read" on public.content_items for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename='brief_options' and policyname='Authenticated read') then
    create policy "Authenticated read" on public.brief_options for select using (auth.role() = 'authenticated');
  end if;
end $$;
