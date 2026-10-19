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
| `RESEND_API_KEY` | turns on the new-lead email (see below) — **Production only** |
| `ADMIN_APP_URL` | `https://www.n10-sportsmanagement.com` — the email links to the lead there |
| `SENTRY_DSN` | Sentry DSN for backend runtime crash & performance monitoring |
| `AUTOFIX_GITHUB_TOKEN` | (Optional) GitHub token with `issues:write` to auto-create issues on unhandled 500 crashes |

**New-lead email.** Each submission is emailed to `n10.sportsmanagement@gmail.com`
from `notifications@n10-sportsmanagement.com`, with Reply going to the applicant.
`n10-sportsmanagement.com` is verified in Resend (DNS at IONOS: DKIM on
`resend._domainkey`, MX + SPF on `send`, DMARC on `_dmarc`). In Resend, create a
key named `n10-api-production` with **Sending access** restricted to that domain,
and set it as `RESEND_API_KEY`. Keep it out of Preview so branch tests don't
email the real inbox; without the key no email is sent. Override the defaults
with `LEAD_NOTIFICATION_TO` or `LEAD_NOTIFICATION_FROM` if needed. A failed
email is logged (`Lead notification` in the Vercel logs) and never blocks the
submission.

Deploy. Note the URL, e.g. `https://n10-api.vercel.app`. Check
`https://n10-api.vercel.app/health` returns `{"status":"ok",...}`.

## 4. Web project — Vercel

Edit `apps/web/vercel.json` → replace `REPLACE-WITH-API-DEPLOYMENT.vercel.app`
with the api URL from step 3, commit, push.

New Project → import this repo → **Root Directory: `apps/web`** (Vercel detects
Vite). Set environment variables (Production):

| Var | Value |
|---|---|
| `VITE_SENTRY_DSN` | Sentry DSN for React web runtime error & session replay monitoring |

Deploy.

Then go back to the api project and set `CORS_ORIGINS` to the web URL, redeploy.

## 5. Smoke test

- open the web URL → landing page
- `/apply` → submit the form → "Thank you" → the email arrives in the N10 inbox
- `/admin/login` → the seeded admin → the submission is in the table

## 6. Error Monitoring & Autonomous Auto-Fix

- **Sentry Integration:** Both `apps/server` and `apps/web` are instrumented with Sentry (`@sentry/node` and `@sentry/react`). Sentry captures exceptions, breadcrumbs, and performance traces with 30-day retention.
- **Autonomous Auto-Fix Agent:** Powered by `google-github-actions/run-gemini-cli@v1` and `.github/workflows/gemini-autofix.yml`. Whenever a GitHub Issue is labeled `auto-fix` (or receives a comment with `@gemini-cli fix this issue`), Gemini runs in a GitHub-hosted runner, reads `.github/prompts/autofix-prompt.md`, applies a safe minimal patch, runs typechecks, and opens a Pull Request formatted with a structured 3-part incident report.


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
