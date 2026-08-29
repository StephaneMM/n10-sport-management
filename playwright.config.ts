import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// Pull DATABASE_URL from the server's env so we can derive a throwaway sibling.
loadEnv({ path: 'apps/server/.env' });

const SERVER_PORT = 4100;
const WEB_PORT = 8100;

/** A disposable database next to the dev one (…/n10_sport_management_e2e). */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  (process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/n10').replace(
    /\/([^/?]+)(\?|$)/,
    '/$1_e2e$2',
  );

export const E2E_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: String(SERVER_PORT),
  DATABASE_URL: E2E_DATABASE_URL,
  JWT_SECRET: 'e2e-jwt-secret-0000000000000000000000000000',
  ADMIN_EMAIL: 'e2e-admin@n10.test',
  ADMIN_PASSWORD: 'E2e_Admin_Pass1!',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'pnpm --filter server exec ts-node-dev --transpile-only --respawn src/index.ts',
      port: SERVER_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
      env: E2E_ENV,
    },
    {
      command: `pnpm --filter web exec vite --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_PROXY_TARGET: `http://localhost:${SERVER_PORT}` },
    },
  ],
});
