# End-to-end tests

Playwright drives a real browser through the full MVP loop
(public form → admin review).

## Running

```bash
pnpm test:e2e          # headless
pnpm test:e2e:ui       # Playwright UI mode
```

## What it needs

- A local PostgreSQL reachable via the `DATABASE_URL` in `apps/server/.env`
  (or set `E2E_DATABASE_URL`).
- Ports **4100** (api) and **8100** (web) free — the harness runs its own
  servers there, isolated from `pnpm dev` on 4000/8080.

## How it works

`e2e/global-setup.ts` runs once before the suite:

1. creates a disposable database (`<your-db>_e2e`) if missing,
2. applies migrations and seeds an admin,
3. truncates `Lead` so each run starts clean.

`playwright.config.ts` then boots the api and web servers against that database
with a throwaway `JWT_SECRET` and admin credentials.
