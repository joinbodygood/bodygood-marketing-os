// Create Dr. Linda's CEO account + profile row.
// Idempotent: if the user already exists, it just ensures the profile row is correct.
//
//   cd server && node db/seed/create-ceo-user.js <password>
//
// If <password> is omitted, a 20-char random password is generated and printed ONCE.

import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../../.env') });

const { supabaseAdmin } = await import('../../services/supabase.service.js');

const EMAIL = 'linda@bodygoodstudio.com';
const NAME = 'Dr. Linda Moleon';
const ROLE = 'ceo';

function randomPassword() {
  return crypto.randomBytes(15).toString('base64').replace(/[+/=]/g, '').slice(0, 20);
}

async function findUserByEmail(email) {
  // listUsers does not take a filter; page through until found.
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  if (!supabaseAdmin) {
    console.error('[ceo] supabaseAdmin not configured');
    process.exit(1);
  }

  const givenPassword = process.argv[2];
  const password = givenPassword || randomPassword();
  const passwordWasGenerated = !givenPassword;

  let user = await findUserByEmail(EMAIL);

  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: { name: NAME },
    });
    if (error) throw error;
    user = data.user;
    console.log(`[ceo] created auth user: ${user.id}`);
  } else {
    console.log(`[ceo] auth user already exists: ${user.id}`);
    if (givenPassword) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password,
      });
      if (error) throw error;
      console.log('[ceo] password updated');
    }
  }

  // Upsert profile
  const { data: existingProfile, error: profileSelectErr } = await supabaseAdmin
    .from('profiles')
    .select('id, role, name')
    .eq('id', user.id)
    .maybeSingle();
  if (profileSelectErr) throw profileSelectErr;

  if (existingProfile) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ name: NAME, role: ROLE, team: null })
      .eq('id', user.id);
    if (error) throw error;
    console.log(`[ceo] profile updated (name=${NAME}, role=${ROLE})`);
  } else {
    const { error } = await supabaseAdmin.from('profiles').insert({
      id: user.id,
      name: NAME,
      role: ROLE,
    });
    if (error) throw error;
    console.log(`[ceo] profile inserted (name=${NAME}, role=${ROLE})`);
  }

  console.log('');
  console.log('==========================================');
  console.log('CEO LOGIN');
  console.log('  email:    ', EMAIL);
  if (passwordWasGenerated) {
    console.log('  password: ', password, '  (generated — copy NOW)');
  } else {
    console.log('  password:  (as provided on CLI)');
  }
  console.log('==========================================');
}

main().catch((err) => {
  console.error('[ceo] failed:', err.message);
  process.exit(1);
});
