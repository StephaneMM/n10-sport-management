// Runs once per test file, before any module is imported.
//
// Provide deterministic values for the environment variables that application
// modules read at import time, so the suite does not depend on a real .env or a
// live database. The pg Pool created in lib/prisma is lazy and never connects
// unless a query runs, so a placeholder URL is safe for tests that mock Prisma
// or never touch the database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/n10_test';
