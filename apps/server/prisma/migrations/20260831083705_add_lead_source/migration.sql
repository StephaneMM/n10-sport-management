-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'GOOGLE_SEARCH', 'REFERRAL', 'COACH', 'AGENT', 'EVENT', 'OTHER');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "source" "LeadSource";
