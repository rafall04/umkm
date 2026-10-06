/*
  Warnings:

  - You are about to drop the `addresses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `site_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_userId_fkey";

-- DropForeignKey
ALTER TABLE "pages" DROP CONSTRAINT "pages_villageId_fkey";

-- DropTable
DROP TABLE "addresses";

-- DropTable
DROP TABLE "pages";

-- DropTable
DROP TABLE "site_settings";
