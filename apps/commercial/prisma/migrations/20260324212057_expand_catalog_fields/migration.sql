/*
  Warnings:

  - You are about to drop the column `description` on the `CommercialItem` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `CommercialItem` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommercialItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL DEFAULT 'Geral',
    "type" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'UN',
    "baseCost" REAL NOT NULL DEFAULT 0,
    "referencePrice" REAL NOT NULL DEFAULT 0,
    "commercialDescription" TEXT NOT NULL DEFAULT '',
    "operationalDescription" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "sku" TEXT,
    "ean" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommercialItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CommercialItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CommercialItem" ("active", "category", "code", "createdAt", "createdById", "id", "name", "type", "updatedAt", "updatedById") SELECT "active", "category", "code", "createdAt", "createdById", "id", "name", "type", "updatedAt", "updatedById" FROM "CommercialItem";
DROP TABLE "CommercialItem";
ALTER TABLE "new_CommercialItem" RENAME TO "CommercialItem";
CREATE UNIQUE INDEX "CommercialItem_code_key" ON "CommercialItem"("code");
CREATE UNIQUE INDEX "CommercialItem_sku_key" ON "CommercialItem"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
