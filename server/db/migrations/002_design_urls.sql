-- Migration 002 — attach designed assets to content_items
-- Idempotent: safe to re-run.

alter table public.content_items
  add column if not exists design_urls text[] default '{}';

-- Storage RLS: anyone authenticated can read; only ceo + operations can insert/delete.
-- The 'designs' bucket was created as public-read, so SELECT is permissive.
-- Inserts go through the server using the service role key, which bypasses RLS.

comment on column public.content_items.design_urls is
  'Public Supabase Storage URLs for designed assets attached to this content item (uploaded via Claude Design or OpenAI image gen).';
