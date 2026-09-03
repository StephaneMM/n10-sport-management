# Decision log

Architectural and product decisions, newest-relevant first within topics.
Each entry: the situation, what was decided, and what it costs us.

Format is lightweight ADR. A decision here is not immutable — supersede it with
a new entry rather than editing the old one.

---

## 1. Monorepo with pnpm workspaces

**Context.** Web and API are developed together by one person and share types,
lint config, and release cadence.

**Decision.** Single repo, `apps/web` + `apps/server` + `packages/types`, pnpm
workspaces.

**Consequences.** One `pnpm install`, one CI run, atomic cross-cutting PRs. The
shared `pnpm-lock.yaml` at the root means every dependency change — even one
scoped to a single package — touches it; tooling that regenerates lockfiles
(Dependabot) must be configured carefully (see #16).

---

## 2. Neon + Vercel, free tier, API as serverless functions

**Context.** MVP, no budget, one maintainer. Needs Postgres, a static host, and
somewhere to run an Express API.

**Decision.** Neon for Postgres, Vercel for both the web app (static) and the
API (serverless functions). Two Vercel projects from the one repo; the web
project proxies `/api/*` to the API project via a `vercel.json` rewrite.

**Consequences.** $0. Cold starts (~300–500 ms) on the API and Neon's
scale-to-zero wake. No always-on process, so no in-memory cron/queue — the
rate limiter's memory store resets on cold start (acceptable at this scale).
The browser only sees one origin, so CORS is effectively bypassed for real
traffic (the allowlist still matters for direct/other callers).

---

## 3. Prisma driver adapter instead of the query-engine binary

**Context.** Prisma normally ships a native query-engine binary. Native binaries
and serverless cold starts are a bad combination.

**Decision.** `@prisma/adapter-pg` over a `pg` Pool. Pure JS, no engine binary.

**Consequences.** Smaller function, faster cold start, no binary-target
headaches. `prisma generate` still runs in `postinstall`. Migrations need a
**direct** (non-pooled) Neon URL — the pooled endpoint is PgBouncer in
transaction mode and breaks migration advisory locks.

---

## 4. Explicit `builds`/`routes` for the Vercel API

**Context.** Vercel's "Express" framework preset and its zero-config function
detection both mis-handled the monorepo: the preset wanted a default export
from `src/server.ts`; zero-config fell through to "static site, where is
`public/`?".

**Decision.** `apps/server/vercel.json` uses an explicit
`builds: [{ src: "api/index.ts", use: "@vercel/node" }]` + `routes` config, and
the project's Framework Preset is "Other". `api/index.ts` is a 3-line
`export default app`.

**Consequences.** Deterministic — Vercel compiles exactly one file and routes
everything to it, independent of dashboard settings. `builds` disables the
`functions` key, so `maxDuration` falls back to the platform default (10 s,
which is what we wanted anyway).

---

## 5. JWT in `localStorage`, re-validated against the DB every request

**Context.** SPA + serverless API, no session store.

**Decision.** Short-lived (1 day) HS256 JWT with issuer `n10`, kept in browser
`localStorage`. `requireUser` verifies the signature **and then loads the user
from the database on every request** — identity, existence, and role come from
the row, never from the token claims.

**Consequences.** A deleted or demoted account loses access within one request,
not one day. No revocation list is needed for that case. But `localStorage` is
readable by any script on the origin, so **any XSS is a full account
compromise** — this is why every stored URL is restricted to http(s) and why
we don't render user content as HTML. A move to `httpOnly` cookies (with CSRF
protection) is the real fix and is deferred.

---

## 6. Public registration is feature-flagged off

**Context.** `POST /api/auth/register` creates `PROSPECT` accounts. There is no
prospect portal, so those accounts can't do anything for now.

**Decision.** The route is mounted only when `ENABLE_PUBLIC_REGISTRATION="true"`.
It is off. The handler, schema, and tests remain.

**Consequences.** No unused, unauthenticated, bcrypt-per-call endpoint exposed;
no email-enumeration oracle (`409` vs `201`). Flip the flag — and add Turnstile
— when the prospect portal ships.

---

## 7. `Lead` and `ProspectProfile` are separate models

**Context.** A public application (a "lead") and an onboarded athlete (a
"prospect profile") carry much of the same data.

**Decision.** Keep them as distinct models with overlapping fields. No foreign
key between them yet.

**Consequences.** Lead triage and prospect management evolve independently, and
the public form isn't coupled to the full profile schema. The cost: when a lead
becomes a prospect, the link is lost — a `Lead.convertedUserId` (or similar) is
outstanding work, needed before the prospect portal.

---

## 8. `Lead.dateOfBirth` is mandatory

**Context.** N10 places athletes into NCAA/NAIA programs, where age drives the
eligibility clock and recruiting class.

**Decision.** Every public submission must provide a date of birth (an ISO date
on the API; a `DD/MM/YYYY` auto-formatting input on the form). The DB column is
`NOT NULL`; a migration deleted the pre-field rows.

**Consequences.** An admin can always assess a recruit's age. Guardian contact
fields become conditionally required (under-18). `source`, `consentToContact`,
and `preferredLanguage` were added in the same effort; `preferredLanguage` is
captured silently from the i18n locale.

---

## 9. i18n covers UI strings, not option values

**Context.** Four locales (en/fr/es/ar). Dropdown options include sports,
genders, lead sources.

**Decision.** Translate labels and prose. Do **not** translate the option
values themselves — they render in English everywhere, matching how the
existing sport/gender selects already worked.

**Consequences.** Enum values stay stable and comparable across locales; less
translation surface. A francophone applicant sees "Comment avez-vous entendu
parler de nous ?" with options still labelled "Instagram", "A friend or
family", etc.

---

## 10. Cloudflare Turnstile, optional via env

**Context.** The public lead form is unauthenticated; per-IP rate limiting
doesn't stop distributed spam.

**Decision.** A `verifyTurnstile` middleware verifies the token with
Cloudflare. It is a **no-op when `TURNSTILE_SECRET_KEY` is unset** and fails
closed (503) if Cloudflare is unreachable. The widget renders only when
`VITE_TURNSTILE_SITE_KEY` is set.

**Consequences.** Local dev and E2E run with no Cloudflare account. Production
turns it on by setting the two keys. No hard dependency on a third party for
the app to function.

---

## 11. Dev / prod database separation via Neon branches

**Context.** One Neon database was serving local dev, tests, and production —
one stray `migrate reset` from disaster.

**Decision.** `production` branch (Vercel, pooled URL), `development` branch
(local `.env`, direct URL), and a derived `_e2e` database for Playwright. The
production URL lives only in Vercel's env settings.

**Consequences.** Safe to experiment locally. Migrations are developed against
`development`, then applied to `production` by hand
(`prisma migrate deploy` with the direct URL) **after the PR merges** —
automating this in the pipeline is a known gap.

---

## 12. R2 document storage kept "in the fridge"

**Context.** A `feat/r2-document-storage` branch implements Cloudflare R2 file
uploads (memoryStorage + S3 client, `Document` model with `fileKey`).

**Decision.** Not merged. No R2 account, and file upload isn't part of the MVP.
The branch stays on the remote, unmerged.

**Consequences.** `ProspectProfile` and `Document` are orphaned models for now.
Unfreeze the branch when the prospect portal and an R2 account exist.

---

## 13. Security hardening pass

**Context.** A full audit before opening the repo publicly.

**Decision.** A 14-commit `chore/security-hardening` branch. Highlights:

- `TRUST_PROXY` defaults to `1` on Vercel — it was `0`, so behind Vercel's proxy
  every client shared one rate-limit bucket (brute-force protection was
  effectively off).
- All user-supplied URLs restricted to `http(s)` — `z.string().url()` accepts
  `javascript:` / `data:`, which rendered as `<a href>` in the admin UI was a
  stored-XSS → admin-token-theft path.
- Patched `path-to-regexp` / `body-parser` via `pnpm.overrides`.
- Input bounds on every field + a 16 KB JSON body limit + query-param length
  caps.
- Constant-time login; `requireAdmin` middleware; JWT algorithm + issuer pinned;
  bcrypt cost 10 → 12 with transparent rehash-on-login; production CORS
  fail-fast; a blanket `/api` rate limiter.

**Consequences.** Tokens issued before the deploy are invalidated (one
re-login). Production needs `TRUST_PROXY=1` and `CORS_ORIGINS` set or the server
won't boot.

---

## 14. bcrypt cost is lowered under `NODE_ENV=test`

**Context.** The constant-time decoy plus cost 12 made the "20 failed logins"
rate-limit test run 20 cost-12 hashes — fine locally, past jest's 5 s per-test
timeout on CI's 2-vCPU runners.

**Decision.** `BCRYPT_COST = process.env.NODE_ENV === 'test' ? 6 : 12`. The
tests assert behaviour (round-trip, rehash detection, timing), not the work
factor. The production decoy stays a precomputed cost-12 constant.

**Consequences.** Server suite ~6 s → ~2 s. Standard practice (Django, Rails do
the same). Production is unchanged.

---

## 15. Trunk-based flow, protected `main`

**Context.** Solo developer, but wants CI discipline and a clean history.

**Decision.** `main` is the only long-lived branch and is always deployable.
Every change: short-lived branch → PR → green `CI / verify` → squash-merge.
`main` is protected (PR required, status check required, no direct pushes, no
force pushes). `main` auto-deploys to production.

**Consequences.** No "develop" branch to maintain or drift. 0 required
approvers (a solo dev can't approve their own PR) — the PR is the CI gate and a
self-review diff, not a second pair of eyes.

---

## 16. Dependabot: per-directory, conservative

**Context.** A grouped "all production deps across both packages" config
produced a 51-update PR whose pnpm-workspace lockfile Dependabot could not
regenerate — `--frozen-lockfile` then failed in CI and every Vercel preview.

**Decision.** One `npm` entry per `package.json` (root, `apps/server`,
`apps/web`), monthly, minor+patch grouped, majors as individual PRs. Security
updates (the CVE-triggered kind) are left to the separate GitHub repo setting.

**Consequences.** Smaller PRs that Dependabot can lockfile correctly. Fewer,
slower routine bumps; CVEs still surface promptly via the security setting.

---

## Known gaps

Tracked here so they aren't forgotten:

- **Migrations are manual** — no gated pipeline step; easy to forget after a
  merge (has bitten us once).
- **`Lead` → `User` conversion link** — needed before the prospect portal.
- **Prospect portal** — `ProspectProfile` / `Document` endpoints exist but are
  unexposed.
- **`.prettierrc` is misnamed** (`prettierrc`), so formatting isn't enforced.
- **`httpOnly` cookie auth** — replaces the `localStorage` token (decision #5).
- **Shared Zod schemas** — `packages/types` is an empty placeholder; the web and
  server lead schemas are kept in sync by hand.
