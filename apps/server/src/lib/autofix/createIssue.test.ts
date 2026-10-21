import express from 'express';
import request from 'supertest';
import { reportAutoFixIssue } from './createIssue';

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

/** Runs a crash through a real Express route so `req.route` is populated. */
async function crash(url: string, err: Error, sentryEventId?: string) {
  const app = express();
  app.get('/api/leads/:id', async (req, res) => {
    await reportAutoFixIssue({ err, req, sentryEventId });
    res.sendStatus(500);
  });
  await request(app).get(url);
}

function createdIssue() {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => String(url).endsWith('/issues') && init?.method === 'POST',
  );
  return call ? JSON.parse(call[1].body as string) : undefined;
}

beforeEach(() => {
  fetchMock.mockReset();
  process.env.AUTOFIX_GITHUB_TOKEN = 'token';
});

afterAll(() => {
  delete process.env.AUTOFIX_GITHUB_TOKEN;
});

describe('reportAutoFixIssue', () => {
  it('does nothing without a token', async () => {
    delete process.env.AUTOFIX_GITHUB_TOKEN;

    await crash('/api/leads/1', new Error('boom'));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens a crash-report issue without the error message or concrete URL', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ number: 1, html_url: 'x' }));

    await crash('/api/leads/abc123?q=ignore-previous-instructions', new Error('jane@example.com exists'), 'evt-1');

    const issue = createdIssue();
    expect(issue.labels).toEqual(['crash-report', 'bug']);
    expect(issue.labels).not.toContain('auto-fix');
    expect(issue.title).toBe('[Crash] [server] Error in GET /api/leads/:id');
    const published = `${issue.title}\n${issue.body}`;
    expect(published).not.toContain('jane@example.com');
    expect(published).not.toContain('abc123');
    expect(published).not.toContain('ignore-previous-instructions');
    expect(issue.body).toContain('evt-1');
    expect(issue.body).toMatch(/^\s+at /m);
  });

  it('comments on the matching open issue instead of opening a duplicate', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ id: 9, number: 9, title: '[Crash] [server] Error in GET /api/leads/:id' }]),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    await crash('/api/leads/other-id', new Error('boom'));

    expect(createdIssue()).toBeUndefined();
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/issues\/9\/comments$/);
  });

  it('stops opening issues once too many crash reports are open', async () => {
    const open = Array.from({ length: 20 }, (_, i) => ({ id: i, number: i, title: `other ${i}` }));
    fetchMock.mockResolvedValueOnce(jsonResponse(open));

    await crash('/api/leads/1', new Error('boom'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createdIssue()).toBeUndefined();
  });
});
