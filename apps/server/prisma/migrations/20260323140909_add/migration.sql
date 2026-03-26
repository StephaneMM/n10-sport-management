-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COACH';

-- AlterTable
ALTER TABLE "ProspectProfile" ADD COLUMN     "currentClub" TEXT,
ADD COLUMN     "league" TEXT;
