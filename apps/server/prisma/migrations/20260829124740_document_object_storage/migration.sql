/*
  Warnings:

  - You are about to drop the column `url` on the `Document` table. All the data in the column will be lost.
  - Added the required column `fileKey` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "url",
ADD COLUMN     "fileKey" TEXT NOT NULL,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL;
