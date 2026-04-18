// Idempotent seed runner for brand_memory + offer_stack.
//
//   cd server && node db/seed/run-seed.js
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (repo root).
// Schema migration (001_schema.sql) must already be applied via the Supabase
// SQL editor before running this.

import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../../.env') });

const { supabaseAdmin } = await import('../../services/supabase.service.js');
import { brandMemorySeed } from './brand-memory.js';
import { offerStackSeed } from './offer-stack.js';

async function seedBrandMemory() {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('brand_memory')
    .select('id')
    .limit(1);
  if (fetchErr) throw fetchErr;

  if (existing && existing.length > 0) {
    const { error } = await supabaseAdmin
      .from('brand_memory')
      .update({ ...brandMemorySeed, updated_at: new Date().toISOString() })
      .eq('id', existing[0].id);
    if (error) throw error;
    console.log('[seed] brand_memory updated');
  } else {
    const { error } = await supabaseAdmin
      .from('brand_memory')
      .insert(brandMemorySeed);
    if (error) throw error;
    console.log('[seed] brand_memory inserted');
  }
}

async function seedOfferStack() {
  for (const offer of offerStackSeed) {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('offer_stack')
      .select('id')
      .eq('offer_name', offer.offer_name)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (existing) {
      const { error } = await supabaseAdmin
        .from('offer_stack')
        .update(offer)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from('offer_stack').insert(offer);
      if (error) throw error;
    }
  }
  console.log(`[seed] offer_stack upserted (${offerStackSeed.length} offers)`);
}

async function main() {
  if (!supabaseAdmin) {
    console.error(
      '[seed] supabaseAdmin not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
    );
    process.exit(1);
  }
  await seedBrandMemory();
  await seedOfferStack();
  console.log('[seed] done');
}

main().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
