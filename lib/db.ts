// SERVER ONLY. One shared PostgreSQL connection pool.
// The connection string comes from DATABASE_URL in the .env file, which is
// read on the server only and never sent to the browser.

import { Pool } from "pg";

// Keep the pool on globalThis so hot reloads in `next dev` don't open a new one each time.
const globalForDb = globalThis as unknown as { __pgPool?: Pool };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  globalForDb.__pgPool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return globalForDb.__pgPool;
}
