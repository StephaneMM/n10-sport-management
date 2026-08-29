# Deployment — Neon + Vercel

Two Vercel projects (api + web) from this one repo, plus a Neon database.
The web project proxies `/api/*` to the api project, so the browser only ever
talks to one origin.

```
browser ──▶ n10-web.vercel.app ──/api/*──▶ n10-api.vercel.app ──▶ Neon
```

---

## 1. Database — Neon

1. Create a project at <https://neon.tech> (free tier).
2. Copy the **pooled** connection string (the one with `-pooler` in the host).
   It looks like:
   `postgresql://USER:PASS@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require`

## 2. Migrate + seed (once, from your machine)

```bash
export DATABASE_URL="<neon pooled url>"

pnpm --filter server exec prisma migrate deploy

ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="<a strong password>" \
  pnpm --filter server run seed
```

Re-run `prisma migrate deploy` whenever a migration is added.

## 3. API project — Vercel

New Project → import this repo → **Root Directory: `apps/server`**.

`apps/server/vercel.json` already routes every request to the Express function.
Set environment variables (Production):

| Var | Value |
|---|---|
| `DATABASE_URL` | the Neon **pooled** url |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `CORS_ORIGINS` | your web URL, e.g. `https://n10-web.vercel.app` (add it after step 4) |

Deploy. Note the URL, e.g. `https://n10-api.vercel.app`. Check
`https://n10-api.vercel.app/health` returns `{"status":"ok",...}`.

## 4. Web project — Vercel

Edit `apps/web/vercel.json` → replace `REPLACE-WITH-API-DEPLOYMENT.vercel.app`
with the api URL from step 3, commit, push.

New Project → import this repo → **Root Directory: `apps/web`** (Vercel detects
Vite). No env vars needed. Deploy.

Then go back to the api project and set `CORS_ORIGINS` to the web URL, redeploy.

## 5. Smoke test

- open the web URL → landing page
- `/apply` → submit the form → "Thank you"
- `/admin/login` → the seeded admin → the submission is in the table

---

## Notes & gotchas

- **Neon cold start**: after ~5 min idle Neon suspends compute; the first query
  then takes ~300–500 ms. Do **not** add a keep-alive cron — Neon free has a
  ~190 compute-hour/month budget and keeping it awake burns through it.
- **Serverless**: `apps/server/src/lib/prisma.ts` uses `pool max: 1` in
  production and caches the client on `global` for warm-invocation reuse.
- **`prisma migrate deploy`** has no automatic hook here — run it manually
  (step 2) on every schema change, or wire a GitHub Action later.
- **File uploads** are not deployed (`feat/r2-document-storage` is parked until
  an R2 account exists).
