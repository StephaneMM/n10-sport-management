-- Leads created before dateOfBirth existed have no birth date and predate real
-- usage. Remove them, then make the column mandatory so it matches the API
-- contract (createLeadSchema requires dateOfBirth on every submission).
DELETE FROM "Lead" WHERE "dateOfBirth" IS NULL;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "dateOfBirth" SET NOT NULL;
