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
scoped to a single package — touches it; automated lockfile tooling (Dependabot
version updates) can't keep up, so bumps are done by hand (see #16).

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

## 16. No Dependabot version updates; manual bumps + security alerts

**Context.** A `.github/dependabot.yml` for routine version bumps produced a
51-update PR whose pnpm-workspace lockfile Dependabot could not regenerate
(`pnpm.overrides` + workspace). `--frozen-lockfile` then failed in CI and every
Vercel preview. A narrower config still hits the same lockfile bug — Dependabot
just can't reliably update this repo's lockfile.

**Decision.** No `dependabot.yml`. Instead:

- **Dependabot alerts + security updates** (GitHub repo settings) — PRs only for
  actual CVEs: rare, one dep at a time, where the lockfile step usually works.
  If one ever ships a stale lockfile, fix that single PR by hand.
- **Routine freshness is manual**, roughly monthly:

  ```bash
  pnpm outdated -r
  pnpm update -r
  git checkout -- '**/package.json'   # revert any bump to an override-pinned dep
  pnpm install                        # resync the lockfile
  pnpm install --frozen-lockfile      # the check CI and Vercel run — must be clean
  pnpm verify
  ```

  `pnpm update -r` will bump a dependency that is also in `pnpm.overrides`
  (`@types/react` / `@types/react-dom`, pinned to 18 so Prisma's React-19 types
  don't leak into the web build), leaving the manifest and lockfile disagreeing.
  Only `--frozen-lockfile` catches that, so it is a required step.

**Consequences.** No recurring broken PRs or failed preview builds. The cost is
a ~10-minute manual pass every month or so; the volume is single digits of
minor bumps per week, none urgent.

---

## 17. New-lead email via Resend, best effort

**Context.** New applications only showed up when someone opened the admin
dashboard; the team wants to know as soon as a lead comes in.

**Decision.** After a lead is saved, `notifyNewLead` emails
`n10.sportsmanagement@gmail.com` through Resend's HTTP API (a plain `fetch`, no
SDK), plain text, with `reply_to` set to the applicant. The sender is
`notifications@n10-sportsmanagement.com`; the domain is verified in Resend
(DNS at IONOS) and the address has no mailbox. The send is **awaited** —
Vercel may freeze the function once the response is sent — capped at 5 s, and
never throws: a failure is logged and the applicant still gets their `201`.
A **no-op when `RESEND_API_KEY` is unset**; the key (Sending access, this
domain only) is set in Production only. Sender and recipient have code
defaults; `ADMIN_APP_URL` differs per environment, so it lives only in env.

**Alternatives.** Gmail SMTP with an app password (new dependency, slow SMTP
handshake from serverless, Google may block it); Zapier/Make (third party
holds lead data, paid); a queue with retries (overkill for one email per
submission).

**Consequences.** Adds the send time to each submission. No retry: a lead
whose email fails is still in the dashboard, so nothing is lost. Previews and
local dev never email the real inbox. Marketing email, if it comes, should use
its own verified subdomain (e.g. `news.`) to keep this domain's reputation
clean.

---

## 18. Dual-module format for shared lead validation values

**Context.** `@n10/lead-validation` is consumed by the Vite web app and the
CommonJS server. Vite requires statically discoverable ES-module named exports,
while the current `ts-node-dev` server loads workspace packages through
CommonJS.

**Decision.** Publish the small shared package with both formats: `index.mjs`
for `import` consumers and `index.cjs` for `require` consumers. The package
`exports` map selects the correct entry point, while `index.d.ts` remains the
shared TypeScript contract.

**Consequences.** The browser build can resolve named exports reliably and the
server does not need to switch module systems. The two entry points must expose
the same values; changes to the shared contract should update both files and
be covered by the web/server build checks.

---

## 19. Sentry for error & performance monitoring + Gemini CLI for autonomous auto-fix

**Context.** Vercel's free tier keeps runtime function logs for only 1 hour. A
production crash occurring outside active development hours had no durable
stack trace or breadcrumbs. When incidents occurred, manual investigation,
patching, and PR creation slowed recovery.

**Decision.**
1. Instrument `apps/server` with `@sentry/node` (imported first in `src/instrument.ts`,
   integrated via `Sentry.setupExpressErrorHandler(app)` in `src/server.ts`, and
   caught in `src/middlewares/errorHandler.ts`).
2. Instrument `apps/web` with `@sentry/react` (browser tracing + session replay in
   `src/instrument.ts`, with `<Sentry.ErrorBoundary>` wrapping the root component).
3. Connect Sentry to GitHub via Sentry's GitHub Integration with Code Mappings
   for `apps/server/` and `apps/web/`.
4. Deploy an issue-driven autonomous triage agent using Google's official
   `google-github-actions/run-gemini-cli@v1` on GitHub Actions (`.github/workflows/gemini-autofix.yml`).
   The agent is governed by `.github/prompts/autofix-prompt.md`, which mandates a
   non-invasive, minimal quick-fix first (to avoid regressions or chain reactions)
   and a strict 3-part PR report (Incident Analysis, Immediate Defensive Fix, and
   Ranked Permanent Architectural Solutions).
5. Add an in-code crash reporter (`apps/server/src/lib/autofix/createIssue.ts`) that
   forwards unhandled 500 crashes to GitHub Issues labeled `auto-fix` with the route
   pattern, error name/code, stack frames, Sentry event id, and deduplication (capped
   at 20 open issues), then locks the issue.
6. Fully automated up to the PR, human at merge. Because the agent starts without
   anyone reviewing the issue, safety comes from limiting what it can see and do
   rather than from a manual trigger:
   - Issues contain no visitor-controlled text (no URL, no error message: those stay
     in Sentry), and locking keeps outsiders from adding comments. `@gemini` comments
     are only accepted from OWNER/MEMBER/COLLABORATOR.
   - `run-gemini-cli` runs Gemini with `--yolo`, so the agent gets file tools only
     (`tools.core`): no shell, no web access, no GitHub token.
   - The workflow, not the agent, verifies (same commands as CI), branches, commits,
     pushes and opens the PR. Up to 3 attempts, each given the previous failure output.
     Edits outside `apps/*/src` and `packages/lead-validation` (configs, `package.json`,
     `.github/`, git hooks/config) fail the run.
   - The `main` ruleset (PR + `verify` check) keeps a human merge between the agent
     and production. CI is started with `workflow_dispatch` because pushes made with
     `GITHUB_TOKEN` don't trigger workflows.

**Consequences.** 30-day crash retention and aggregation on Sentry's free tier.
Zero runtime overhead for the web bundle beyond standard telemetry. A production
crash becomes a verified, ready-to-review PR without manual steps; the only human
action is reviewing the 3-part report and merging. Runs that fail 3 times end with an
issue comment instead of a PR, so an open auto-fix PR always passed CI's checks.

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
