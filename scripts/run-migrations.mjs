// One-off helper to apply supabase/migrations/*.sql directly via a Postgres
// connection, for environments without the Supabase CLI linked. Reads the
// connection string from SUPABASE_DB_URL (never hardcode credentials here).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("Set SUPABASE_DB_URL before running this script.");
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  for (const file of files) {
    console.log(`Applying ${file}...`);
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await client.query(sql);
    console.log(`  OK`);
  }
  await client.end();
  console.log("All migrations applied.");
}

main().catch(async (err) => {
  console.error(err.message);
  await client.end();
  process.exit(1);
});
