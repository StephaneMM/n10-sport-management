-- AlterTable
-- Existing rows default to false: we never recorded their consent. Every new
-- submission must send true (createLeadSchema).
ALTER TABLE "Lead" ADD COLUMN     "consentToContact" BOOLEAN NOT NULL DEFAULT false;
