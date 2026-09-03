# N10 Sport Management

A platform that guides international student-athletes through the US collegiate
recruitment process — from first assessment to securing an offer.

**Current scope (MVP):** a public marketing site → a public application form
(lead capture) → an admin dashboard to review and triage those leads.

| | |
|---|---|
| Web | https://n10-sportsmanagement.vercel.app |
| API | https://n10-sports-management-server.vercel.app |
| Deploy guide | [`DEPLOY.md`](./DEPLOY.md) |
| Architecture | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| Decision log | [`docs/DECISIONS.md`](./docs/DECISIONS.md) |

---

## Stack

**Monorepo** — pnpm workspaces (`apps/web`, `apps/server`, `packages/types`).

| Area | Tech |
|---|---|
| Web | Vite 5 · React 18 · TypeScript · Tailwind · shadcn/ui · TanStack Query · react-router · react-hook-form + Zod · i18next (en/fr/es/ar) |
| API | Node 25 · Express 5 · Prisma 7 (`@prisma/adapter-pg` driver adapter) · PostgreSQL · Zod · JWT (bcrypt + jsonwebtoken) |
| Data | Neon Postgres |
| Hosting | Vercel — web as a static site, API as serverless functions |
| Tests | Jest + supertest (API) · Vitest + Testing Library (web) · Playwright (E2E) |
| CI | GitHub Actions — typecheck, lint, test, build on every PR |

---

## Local setup

**Prerequisites:** Node `25` (see `.nvmrc`), pnpm `10.30.3` (via `corepack enable`),
and a PostgreSQL database — a free [Neon](https://neon.tech) branch is easiest.

```bash
pnpm install

# 1. Server env
cp apps/server/.env.example apps/server/.env
#    then edit apps/server/.env:
#      DATABASE_URL  – your Neon *development* branch, direct (non-pooled) URL
#      JWT_SECRET    – node -e 'console.log(require("crypto").randomBytes(48).toString("base64"))'
#      ADMIN_EMAIL / ADMIN_PASSWORD – for the seed below

# 2. Schema + first admin
pnpm --filter server exec prisma migrate deploy
pnpm --filter server run seed

# 3. Run both apps
pnpm dev            # web on :8080, api on :4000
```

Web-only / API-only: `pnpm web` · `pnpm server`.

### Environment variables

The server validates its environment at boot and refuses to start if anything
is missing, too weak, or still a placeholder. See
[`apps/server/.env.example`](./apps/server/.env.example) and
[`apps/web/.env.example`](./apps/web/.env.example) for the full list.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | web + api in watch mode |
| `pnpm verify` | typecheck → lint → test → build across both packages (what CI runs) |
| `pnpm test:e2e` | Playwright end-to-end suite (boots its own web + api against an isolated `_e2e` database) |
| `pnpm --filter server exec prisma migrate dev` | create a migration from a `schema.prisma` change |
| `pnpm --filter server exec prisma studio` | browse the database |

---

## Testing

- **Unit / integration:** `pnpm -r run test`. The API suite mocks Prisma and
  never touches a database.
- **E2E:** `pnpm test:e2e`. Derives an isolated `<db>_e2e` database from your
  `DATABASE_URL`, migrates + seeds it, then drives the real UI.

---

## Workflow

`main` is protected: every change goes through a branch → PR → green CI →
squash-merge. `main` auto-deploys to production (web + API Vercel projects).

Database migrations are **not** automated — after a migration merges, run
`prisma migrate deploy` against the production Neon branch (see `DECISIONS.md`).

---

## Repository layout

```
apps/
  web/            Vite React app (public site + admin dashboard)
  server/
    src/          Express app, feature-folders (auth, leads, profile)
    prisma/       schema.prisma, migrations, seed
    api/index.ts  Vercel serverless entrypoint (imports src/server)
packages/
  types/          placeholder for schemas shared between web and server
e2e/              Playwright specs + harness
docs/             architecture and decision records
```
