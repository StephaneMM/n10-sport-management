-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('GOVERNMENT_ID', 'HS_TRANSCRIPT', 'HS_DIPLOMA', 'BACHELOR_TRANSCRIPT', 'BACHELOR_DIPLOMA', 'MASTER_TRANSCRIPT', 'MASTER_DIPLOMA', 'DOCTORAL_TRANSCRIPT', 'DOCTORAL_DIPLOMA', 'OTHER');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "prospectProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_prospectProfileId_fkey" FOREIGN KEY ("prospectProfileId") REFERENCES "ProspectProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
