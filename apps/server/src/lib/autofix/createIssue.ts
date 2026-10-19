import type { Request } from 'express';

/**
 * Helper to report backend crashes to GitHub as Issues labeled 'auto-fix'.
 * This triggers the Gemini CLI Autonomous Fix workflow.
 */

interface ReportCrashParams {
  err: unknown;
  req?: Request;
}

export async function reportAutoFixIssue({ err, req }: ReportCrashParams): Promise<void> {
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
  const errorMessage = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack ?? 'No stack trace available' : String(err);
  const route = req ? `${req.method} ${req.originalUrl || req.path}` : 'unknown-route';

  const title = `[Auto-Fix] [server] ${errorName}: ${errorMessage.slice(0, 80)} in ${route}`;

  const issueBody = `### 🚨 Backend Crash Caught by Express Error Handler & Sentry

- **App**: \`apps/server\`
- **Endpoint**: \`${route}\`
- **Error**: \`${errorName}: ${errorMessage}\`
- **Timestamp**: \`${new Date().toISOString()}\`

\`\`\`stacktrace
${stack}
\`\`\`

---
*Created automatically by Express 5 \`errorHandler\` for autonomous resolution by \`@gemini-cli\`.*
`;

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'N10-AutoFix-Reporter',
    };

    // 1. Check for existing open issue with the same title to prevent spamming
    const searchUrl = `https://api.github.com/repos/${repo}/issues?state=open&labels=auto-fix&per_page=30`;
    const checkRes = await fetch(searchUrl, { headers });

    if (checkRes.ok) {
      const existingIssues = (await checkRes.json()) as Array<{ id: number; number: number; title: string }>;
      const matching = existingIssues.find((issue) => issue.title === title);

      if (matching) {
        await fetch(`https://api.github.com/repos/${repo}/issues/${matching.number}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: `⚠️ **Crash Re-occurred** at \`${new Date().toISOString()}\`:\n\`\`\`\n${errorMessage}\n\`\`\``,
          }),
        });
        console.info(`[autofix] Appended incident to existing open issue #${matching.number}`);
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
        labels: ['auto-fix', 'bug'],
      }),
    });

    if (createRes.ok) {
      const created = (await createRes.json()) as { number: number; html_url: string };
      console.info(`[autofix] Successfully created auto-fix issue #${created.number}: ${created.html_url}`);
    } else {
      const errText = await createRes.text();
      console.warn(`[autofix] GitHub API error (${createRes.status}): ${errText}`);
    }
  } catch (apiErr) {
    console.error('[autofix] Unexpected error while calling GitHub API:', apiErr);
  }
}

