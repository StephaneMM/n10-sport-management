# Architecture

How the system is put together today. For *why* each choice was made, see
[`DECISIONS.md`](./DECISIONS.md).

## Topology

```
                 ┌─────────────────────────────┐
  browser ─────▶ │ n10-sportsmanagement        │  Vercel static site (apps/web)
                 │  (React SPA)                │
                 └──────────────┬──────────────┘
                                │  /api/*  (vercel.json rewrite, server-side)
                                ▼
                 ┌─────────────────────────────┐
                 │ n10-sports-management-server│  Vercel serverless fn (apps/server)
                 │  (Express, one function)    │
                 └──────────────┬──────────────┘
                                │  pg (pooled)
                                ▼
                 ┌─────────────────────────────┐
                 │ Neon Postgres               │  branches: production / development / _e2e
                 └─────────────────────────────┘
```

The browser only ever talks to the web origin. `/api/*` requests are rewritten
**server-side** by Vercel to the API deployment, so there is no cross-origin
request from the browser's point of view.

## Web (`apps/web`)

- Vite SPA. `vercel.json` rewrites `/api/*` to the API and falls everything else
  through to `index.html` for client-side routing.
- **Routing:** public routes (`/`, `/apply`) and admin routes (`/admin/*`)
  behind a `ProtectedRoute` that checks for a token.
- **Data:** TanStack Query wraps a thin `apiClient` (`fetch` + bearer token from
  `localStorage`). A `401` clears the token and bounces to login.
- **Forms:** react-hook-form + a Zod schema shared in shape with the server's.
  The application form adapts to input (guardian fields appear only for a
  under-18 date of birth).
- **i18n:** i18next, four locales (en/fr/es/ar). UI strings are translated;
  option *values* (sports, genders, lead sources) are not — only their labels.

## API (`apps/server`)

Express 5 app exported from `src/server.ts`. Two entrypoints:

- `src/index.ts` — `app.listen()` for local dev.
- `api/index.ts` — `export default app` for Vercel; `vercel.json` uses an
  explicit `builds`/`routes` config so every request is routed into this one
  function.

**Request pipeline:** `helmet` → `cors` (locked to `CORS_ORIGINS`) →
`express.json({ limit: '16kb' })` → `/api` blanket rate limiter → feature
routers → terminal `errorHandler`.

### Feature folders

```
src/features/<feature>/
  <feature>.routes.ts   route table
  <feature>.schema.ts   Zod request schemas
  <handler>.ts          one file per handler
  <feature>.test.ts     supertest + mocked Prisma
```

Features: `auth` (register/login/me), `leads` (public create + admin
list/read/update), `profile` (prospect profile CRUD — built, not yet exposed in
the UI).

### Middleware (`src/middlewares`)

| Middleware | Role |
|---|---|
| `validateResource(schema)` | parses/coerces `req.body`, hands a `ZodError` to `next()` on failure |
| `requireUser` | verifies the JWT (HS256 + issuer), then **re-loads the user from the DB every request** — identity and role come from the database, never the token |
| `requireAdmin` | 403 unless `res.locals.user.role === 'ADMIN'` |
| `verifyTurnstile` | Cloudflare bot check on the public lead form; a no-op when `TURNSTILE_SECRET_KEY` is unset |
| `rateLimit` | `authLimiter` (15 / 15 min, skips successes), `publicLeadLimiter` (15 / hour), `apiLimiter` (300 / 15 min blanket) — all keyed on the real client IP |
| `errorHandler` | the only place that writes an error response: `HttpError` → its status, `ZodError` → 400, Prisma `P2025`/`P2002` → 404/409, carried 4xx honoured, everything else → logged 500 |

Handlers don't `try/catch` — they `throw` and Express 5 forwards the rejection
to `errorHandler`.

### Configuration (`src/config/env.ts`)

`process.env` is parsed once, at import, by a Zod schema. If anything required
is missing/weak/placeholder the process throws before it listens. Notable
rules: `JWT_SECRET` ≥ 32 chars and not a known placeholder; `CORS_ORIGINS`
required in production; `TRUST_PROXY` defaults to `1` on Vercel.

## Data model (`apps/server/prisma`)

Prisma 7 with the `@prisma/adapter-pg` driver adapter (a `pg` Pool, no query
engine binary). 15 migrations.

| Model | Notes |
|---|---|
| `User` | `email` (case-insensitive), bcrypt `password`, `role` enum (`ADMIN` / `SALES_REP` / `PROSPECT` / `COACH`) |
| `Lead` | a public application. Triage `status` enum, `source`, `consentToContact`, guardian contact (required for minors), `preferredLanguage`. Indexed on the admin filter columns. |
| `ProspectProfile` | 1:1 with `User`, `onDelete: Cascade`. Athletic + personal detail. **Not yet exposed** — there is no prospect portal. |
| `Document` | 1:N with `ProspectProfile`. File metadata. Also unexposed (see the R2 decision). |

`Lead` and `ProspectProfile` are separate models with overlapping shape — lead
capture and onboarded-prospect are different lifecycle stages, and there is no
conversion link yet.

## Auth

- **Login:** email + password → bcrypt verify (constant-time: an unknown email
  still runs a comparison against a decoy hash) → a 1-day HS256 JWT with issuer
  `n10`. A password hash made at a lower bcrypt cost is transparently re-hashed
  on successful login.
- **Token storage:** browser `localStorage`. This means any XSS is a full
  compromise — the mitigation is to keep XSS vectors at zero (all stored URLs
  are http(s)-only; React escapes text). A move to `httpOnly` cookies is
  future work.
- **Registration:** `POST /api/auth/register` is mounted only when
  `ENABLE_PUBLIC_REGISTRATION="true"`. It is off — there is no prospect portal,
  so the endpoint would only add attack surface.

## Environments

| | Database | Where its URL lives |
|---|---|---|
| Local dev | Neon `development` branch (direct URL) | `apps/server/.env` |
| E2E | `<db>_e2e`, derived from `DATABASE_URL` | Playwright config |
| Production | Neon `production` branch (pooled URL) | Vercel env vars only |

The production connection string never appears in a file or in git.

## CI

`.github/workflows/ci.yml` — one `verify` job on every PR to `main` and every
push to `main`: `pnpm install --frozen-lockfile` → typecheck → lint → test →
build, across both packages. `main` is protected (PR + green CI required, no
direct or force pushes).
