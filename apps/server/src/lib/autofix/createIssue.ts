import type { Request } from 'express';

/**
 * Helper to report backend crashes to GitHub as Issues labeled 'auto-fix'.
 * This triggers the Gemini CLI Autonomous Fix workflow.
 *
 * The agent starts without a human in the loop, so the issue carries only text
 * no visitor can influence: error name/code, route pattern, stack frames and the
 * Sentry event id. The URL and error message stay in Sentry. The issue is locked
 * so outsiders can't add comments the agent might read.
 */

const AUTOFIX_LABEL = 'auto-fix';
// Stop opening new issues once this many are open (spam / Gemini quota brake).
const MAX_OPEN_AUTOFIX_ISSUES = 20;

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

  const title = `[Auto-Fix] [server] ${errorName}${errorCode ? ` (${errorCode})` : ''} in ${route}`;

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
*Created automatically by the Express \`errorHandler\` for autonomous resolution by \`@gemini-cli\`.*
`;

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'N10-AutoFix-Reporter',
    };

    // 1. Check for existing open issue with the same title to prevent spamming
    const searchUrl = `https://api.github.com/repos/${repo}/issues?state=open&labels=${AUTOFIX_LABEL}&per_page=100`;
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

      if (existingIssues.length >= MAX_OPEN_AUTOFIX_ISSUES) {
        console.warn(`[autofix] ${existingIssues.length} open auto-fix issues; not opening another.`);
        return;
      }
    }

    // 2. Create new GitHub Issue labeled 'auto-fix'
    const createRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title,
        body: issueBody,
        labels: [AUTOFIX_LABEL, 'bug'],
      }),
    });

    if (createRes.ok) {
      const created = (await createRes.json()) as { number: number; html_url: string };
      console.info(`[autofix] Successfully created auto-fix issue #${created.number}: ${created.html_url}`);

      // 3. Lock it: collaborators (and this token) can still comment, outsiders can't.
      await fetch(`https://api.github.com/repos/${repo}/issues/${created.number}/lock`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ lock_reason: 'resolved' }),
      });
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
 * can't be varied with ids or query strings, and no visitor-chosen path reaches the
 * agent. Crashes before routing (global middleware) are located by the stack frames.
 */
function routePattern(req?: Request): string {
  if (!req) return 'unknown-route';
  if (!req.route?.path) return `${req.method} (before routing)`;
  return `${req.method} ${req.baseUrl}${String(req.route.path)}`;
}
