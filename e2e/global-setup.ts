import { execSync } from 'node:child_process';
import { Client } from 'pg';
import { E2E_DATABASE_URL, E2E_ENV } from '../playwright.config';

/**
 * Runs once before the suite:
 *  1. create the disposable e2e database if it doesn't exist
 *  2. apply migrations + seed an admin against it
 *  3. truncate mutable tables so every run starts from a known state
 */
export default async function globalSetup(): Promise<void> {
  const dbUrl = new URL(E2E_DATABASE_URL);
  const dbName = dbUrl.pathname.replace(/^\//, '');

  const maintenanceUrl = new URL(E2E_DATABASE_URL);
  maintenanceUrl.pathname = '/postgres';

  const admin = new Client({ connectionString: maintenanceUrl.toString() });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!rowCount) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[e2e] created database ${dbName}`);
  }
  await admin.end();

  const env = { ...process.env, ...E2E_ENV };
  execSync('pnpm --filter server exec prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('pnpm --filter server run seed', { env, stdio: 'inherit' });

  const db = new Client({ connectionString: E2E_DATABASE_URL });
  await db.connect();
  await db.query('TRUNCATE TABLE "Lead" CASCADE');
  await db.end();
}
