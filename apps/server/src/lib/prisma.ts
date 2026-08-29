import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';

// Connection string — validated centrally in config/env. In production point
// this at the Neon *pooled* endpoint.
const connectionString = env.DATABASE_URL;

// One small pool per process. On serverless the function instance is reused
// across warm invocations, so keep it to a single connection and let the Neon
// pooler fan out.
const pool = new Pool({
  connectionString,
  max: env.NODE_ENV === 'production' ? 1 : 10,
});

const adapter = new PrismaPg(pool);

// Cache the client on `global` so warm serverless invocations (and dev HMR)
// reuse it instead of opening a new connection every request.
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
globalForPrisma.prisma = prisma;

// Instead of Prisma doing everything under the hood (which was slower and harder to deploy to modern edge servers), 
// we are now manually creating a blazing-fast native PostgreSQL Pool and injecting it directly into Prisma using the { adapter } option.
// This approach is not only faster but also more compatible with modern deployment platforms, allowing us to deploy our server to places like Vercel and Cloudflare Workers without any issues.