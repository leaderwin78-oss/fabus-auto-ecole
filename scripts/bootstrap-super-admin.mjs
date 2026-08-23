// Creates the platform's SUPER_ADMIN account from environment variables if
// it doesn't already exist (section 2 of the product brief). Safe to run
// repeatedly — it's a no-op once that exact email already has an account.
// The initial password is never hardcoded; it must be supplied via
// SUPER_ADMIN_INITIAL_PASSWORD, and the account is forced to change it on
// first login (must_change_password).
//
// Usage: npm run bootstrap-admin   (reads .env.local via `node --env-file`)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPER_ADMIN_EMAIL;
const password = process.env.SUPER_ADMIN_INITIAL_PASSWORD;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!email || !password) {
  console.error("Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_INITIAL_PASSWORD in .env.local — see .env.example.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("SUPER_ADMIN_INITIAL_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message?.toLowerCase().includes("already been registered") || error.status === 422) {
      console.log(`An account already exists for ${email} — nothing to do.`);
      return;
    }
    throw new Error(`Failed to create super_admin auth user: ${error.message}`);
  }
  if (!created.user) throw new Error("createUser returned no user.");

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    organization_id: null,
    role: "super_admin",
    full_name: "Super Admin",
    must_change_password: true,
  });
  if (profileError) throw new Error(`Failed to create super_admin profile: ${profileError.message}`);

  console.log(`super_admin created: ${email}`);
  console.log("They will be prompted to change their password on first login.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
