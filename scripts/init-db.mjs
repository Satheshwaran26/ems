// Creates the database (if missing) and the employees table.
// Run with:  pnpm db:init   (reads DATABASE_URL from .env)

import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const target = new URL(url);
const dbName = decodeURIComponent(target.pathname.slice(1));
if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
  console.error("The database name in DATABASE_URL may only contain letters, numbers and underscores.");
  process.exit(1);
}

async function run() {
  // 1. Connect to the default "postgres" database and create ours if needed.
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}".`);
  } else {
    console.log(`Database "${dbName}" already exists.`);
  }
  await admin.end();

  // 2. Create the table.
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  await client.end();
  console.log('Table "employees" is ready.');
}

run().catch((error) => {
  console.error(`Setup failed: ${error.message}`);
  process.exit(1);
});
