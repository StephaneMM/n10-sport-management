-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'FR', 'ES', 'AR');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "preferredLanguage" "Locale";
