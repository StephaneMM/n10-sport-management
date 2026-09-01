import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/lib/password';

/**
 * Idempotent database seed.
 *
 * Provisions the initial ADMIN account from environment variables. This is the
 * ONLY supported way to bootstrap an administrator: the public /register
 * endpoint always creates a PROSPECT and never accepts a role from the client.
 *
 * Required env: DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
 * Run with:     pnpm --filter server run seed
 */

const connectionString = process.env.DATABASE_URL;
// Stored lowercased to match the case-insensitive handling in auth.schema.
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing — cannot seed.');
}
if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin account.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString })) });

async function seedAdmin(email: string, plainPassword: string): Promise<void> {
  const passwordHash = await hashPassword(plainPassword);

  const admin = await prisma.user.upsert({
    where: { email },
    // On re-seed, only guarantee the role — never silently reset the password
    // of an account that already exists.
    update: { role: Role.ADMIN },
    create: { email, password: passwordHash, role: Role.ADMIN },
  });

  console.log(`✅ Admin account ready: ${admin.email} (${admin.role})`);
}

seedAdmin(adminEmail, adminPassword)
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
