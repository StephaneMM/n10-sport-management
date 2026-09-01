import { parseEnv } from './env';

const STRONG_SECRET = 'x'.repeat(32);

const validSource = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: STRONG_SECRET,
} as NodeJS.ProcessEnv;

describe('parseEnv', () => {
  it('accepts a valid environment and applies defaults', () => {
    const env = parseEnv(validSource);

    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
    expect(env.JWT_SECRET).toBe(STRONG_SECRET);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.TRUST_PROXY).toBe(0);
  });

  it('parses CORS_ORIGINS into a trimmed list, falling back to dev ports', () => {
    expect(parseEnv(validSource).CORS_ORIGINS).toContain('http://localhost:8080');
    expect(parseEnv({ ...validSource, CORS_ORIGINS: '  ' }).CORS_ORIGINS).toContain(
      'http://localhost:8080',
    );
    expect(
      parseEnv({ ...validSource, CORS_ORIGINS: 'https://a.com, https://b.com' }).CORS_ORIGINS,
    ).toEqual(['https://a.com', 'https://b.com']);
  });

  it('coerces PORT and TRUST_PROXY to numbers', () => {
    const env = parseEnv({ ...validSource, PORT: '8080', TRUST_PROXY: '1' });
    expect(env.PORT).toBe(8080);
    expect(env.TRUST_PROXY).toBe(1);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => parseEnv({ JWT_SECRET: STRONG_SECRET } as NodeJS.ProcessEnv)).toThrow(
      /DATABASE_URL/,
    );
  });

  it('throws when JWT_SECRET is missing', () => {
    expect(() =>
      parseEnv({ DATABASE_URL: validSource.DATABASE_URL } as NodeJS.ProcessEnv),
    ).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is too short', () => {
    expect(() => parseEnv({ ...validSource, JWT_SECRET: 'short' })).toThrow(
      /at least 32 characters/,
    );
  });

  it.each([
    'super-secret-local-dev-key',
    'super_secret_key_change_in_production',
    'changeme',
    'secret',
  ])('rejects the known placeholder JWT_SECRET %p', (placeholder) => {
    expect(() => parseEnv({ ...validSource, JWT_SECRET: placeholder })).toThrow(
      /placeholder/,
    );
  });

  it('reports every problem at once', () => {
    expect(() => parseEnv({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET/);
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() => parseEnv({ ...validSource, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('requires CORS_ORIGINS in production', () => {
    expect(() => parseEnv({ ...validSource, NODE_ENV: 'production' })).toThrow(/CORS_ORIGINS/);
    expect(
      parseEnv({ ...validSource, NODE_ENV: 'production', CORS_ORIGINS: 'https://n10.app' })
        .CORS_ORIGINS,
    ).toEqual(['https://n10.app']);
  });
});
