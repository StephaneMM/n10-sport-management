import type { Request } from 'express';

/**
 * Helper to report backend crashes to GitHub as Issues labeled 'crash-report'.
 *
 * The repo is public and the request URL / error message are attacker-influenced,
 * so issues carry only a curated shape (error name, route pattern, stack frames)
 * and are never labeled 'auto-fix' here. A maintainer reviews the issue and adds
 * 'auto-fix' to hand it to the Gemini workflow. Full details live in Sentry.
 */

const CRASH_LABEL = 'crash-report';
// Stop opening new issues once this many crash reports are open (spam/cost brake).
const MAX_OPEN_CRASH_ISSUES = 20;

interface ReportCrashParams {
  err: unknown;
  req?: Request;
  sentryEventId?: string;
}

export async function reportAutoFixIssue({ err, req, sentryEventId }: ReportCrashParams): Promise<void> {
  const token = process.env.AUTOFIX_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  const repo =
    process.env.AUTOFIX_GITHUB_REPO || process.env.GITHUB_REPOSITORY || 'StephaneMM/n10-sport-management';

  if (!token) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[autofix] AUTOFIX_GITHUB_TOKEN not configured; skipping automatic issue creation.');
    }
    return;
  }

  const errorName = err instanceof Error ? err.name : 'UnhandledServerError';
  // Prisma and Node errors expose a stable code (e.g. P2003, ECONNREFUSED) that is safe to publish.
  const errorCode =
    typeof err === 'object' && err !== null && typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : undefined;
  const route = routePattern(req);
  // Keep only "at ..." frames: the first line(s) of a stack repeat the message, which may carry request data.
  const frames =
    err instanceof Error && err.stack
      ? err.stack
          .split('\n')
          .filter((line) => /^\s+at /.test(line))
          .slice(0, 15)
          .join('\n')
      : '';

  const title = `[Crash] [server] ${errorName}${errorCode ? ` (${errorCode})` : ''} in ${route}`;

  const issueBody = `### 🚨 Backend Crash Caught by Express Error Handler

- **App**: \`apps/server\`
- **Route**: \`${route}\`
- **Error**: \`${errorName}\`${errorCode ? `\n- **Code**: \`${errorCode}\`` : ''}
- **Sentry event**: \`${sentryEventId ?? 'n/a'}\`
- **Timestamp**: \`${new Date().toISOString()}\`

\`\`\`stacktrace
${frames || 'No stack frames available'}
\`\`\`

The error message is omitted on purpose (it can contain request data); see the Sentry event.

---
*Created automatically by the Express \`errorHandler\`. A maintainer adds the \`auto-fix\` label to hand it to \`@gemini-cli\`.*
`;

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'N10-AutoFix-Reporter',
    };

    // 1. Check for existing open issue with the same title to prevent spamming
    const searchUrl = `https://api.github.com/repos/${repo}/issues?state=open&labels=${CRASH_LABEL}&per_page=100`;
    const checkRes = await fetch(searchUrl, { headers });

    if (checkRes.ok) {
      const existingIssues = (await checkRes.json()) as Array<{ id: number; number: number; title: string }>;
      const matching = existingIssues.find((issue) => issue.title === title);

      if (matching) {
        await fetch(`https://api.github.com/repos/${repo}/issues/${matching.number}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: `⚠️ **Crash Re-occurred** at \`${new Date().toISOString()}\` (Sentry event \`${sentryEventId ?? 'n/a'}\`)`,
          }),
        });
        console.info(`[autofix] Appended incident to existing open issue #${matching.number}`);
        return;
      }

      if (existingIssues.length >= MAX_OPEN_CRASH_ISSUES) {
        console.warn(`[autofix] ${existingIssues.length} open crash reports; not opening another.`);
        return;
      }
    }

    // 2. Create new GitHub Issue labeled 'crash-report' (not 'auto-fix': a human triggers the agent)
    const createRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title,
        body: issueBody,
        labels: [CRASH_LABEL, 'bug'],
      }),
    });

    if (createRes.ok) {
      const created = (await createRes.json()) as { number: number; html_url: string };
      console.info(`[autofix] Successfully created crash-report issue #${created.number}: ${created.html_url}`);
    } else {
      const errText = await createRes.text();
      console.warn(`[autofix] GitHub API error (${createRes.status}): ${errText}`);
    }
  } catch (apiErr) {
    console.error('[autofix] Unexpected error while calling GitHub API:', apiErr);
  }
}

/**
 * "POST /api/leads/:id" rather than the concrete URL, so the title (the dedup key)
 * can't be varied with ids or query strings.
 */
function routePattern(req?: Request): string {
  if (!req) return 'unknown-route';
  const path = req.route?.path ? `${req.baseUrl}${String(req.route.path)}` : req.path;
  return `${req.method} ${path.slice(0, 100)}`;
}
