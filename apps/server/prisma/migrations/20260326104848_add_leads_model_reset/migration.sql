/*
  Warnings:

  - Added the required column `country` to the `ProspectProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `ProspectProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProspectProfile" ADD COLUMN     "country" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "positions" TEXT[],
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "verticalJumpCm" DOUBLE PRECISION,
    "league" TEXT,
    "currentClub" TEXT,
    "highlightLinks" TEXT[],
    "messageToUs" TEXT,
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
