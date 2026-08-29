import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';

// 1. Connection string — validated centrally in config/env
const connectionString = env.DATABASE_URL;

// 2. Create a standard PostgreSQL connection pool
const pool = new Pool({ connectionString });

// 3. Wrap the pool in Prisma's official adapter
const adapter = new PrismaPg(pool);

// 4. Pass the adapter into the Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Instead of Prisma doing everything under the hood (which was slower and harder to deploy to modern edge servers), 
// we are now manually creating a blazing-fast native PostgreSQL Pool and injecting it directly into Prisma using the { adapter } option.
// This approach is not only faster but also more compatible with modern deployment platforms, allowing us to deploy our server to places like Vercel and Cloudflare Workers without any issues.