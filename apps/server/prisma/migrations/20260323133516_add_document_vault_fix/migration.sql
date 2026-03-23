/*
  Warnings:

  - The values [DOCTORAL_TRANSCRIPT,DOCTORAL_DIPLOMA] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('GOVERNMENT_ID', 'HS_TRANSCRIPT', 'HS_DIPLOMA', 'BACHELOR_TRANSCRIPT', 'BACHELOR_DIPLOMA', 'MASTER_TRANSCRIPT', 'MASTER_DIPLOMA', 'DOCTORATE_TRANSCRIPT', 'DOCTORATE_DIPLOMA', 'OTHER');
ALTER TABLE "Document" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "public"."DocumentType_old";
COMMIT;
