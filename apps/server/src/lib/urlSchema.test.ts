import { httpUrl, httpUrlFrom } from './urlSchema';

describe('httpUrl', () => {
  it.each([
    'javascript:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'ftp://example.com/file',
    'not a url',
  ])('rejects %j', (value) => {
    expect(httpUrl.safeParse(value).success).toBe(false);
  });

  it.each(['https://youtube.com/watch?v=x', 'http://example.com'])('accepts %j', (value) => {
    expect(httpUrl.safeParse(value).success).toBe(true);
  });
});

describe('httpUrlFrom (host allowlist)', () => {
  const schema = httpUrlFrom(['youtube.com', 'vimeo.com'], 'not allowed');

  it.each([
    'https://youtube.com/x',
    'https://www.youtube.com/x',
    'http://YOUTUBE.COM/x',
  ])('accepts an approved host: %j', (value) => {
    expect(schema.safeParse(value).success).toBe(true);
  });

  it.each([
    'https://evil-youtube.com/x',
    'https://youtube.com.evil.com/x',
    'https://youtube.com@evil.com/x',
    'https://evil.com/?u=youtube.com',
    'https://xn--youtub-fve.com/x',
    'javascript:alert(1)',
  ])('rejects a lookalike or bad scheme: %j', (value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});
