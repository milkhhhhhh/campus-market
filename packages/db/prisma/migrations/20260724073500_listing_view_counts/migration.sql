-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RentalItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dailyPrice" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL,
    "minDays" INTEGER NOT NULL DEFAULT 1,
    "maxDays" INTEGER,
    "rentalStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "images" TEXT NOT NULL DEFAULT '[]',
    "categoryId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RentalItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RentalItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RentalItem" ("categoryId", "createdAt", "dailyPrice", "deposit", "description", "id", "images", "maxDays", "minDays", "ownerId", "rentalStatus", "title", "updatedAt")
SELECT "categoryId", "createdAt", "dailyPrice", "deposit", "description", "id", "images", "maxDays", "minDays", "ownerId", "rentalStatus", "title", "updatedAt" FROM "RentalItem";
DROP TABLE "RentalItem";
ALTER TABLE "new_RentalItem" RENAME TO "RentalItem";
CREATE INDEX "RentalItem_ownerId_idx" ON "RentalItem"("ownerId");
CREATE INDEX "RentalItem_categoryId_idx" ON "RentalItem"("categoryId");
CREATE INDEX "RentalItem_rentalStatus_idx" ON "RentalItem"("rentalStatus");
CREATE INDEX "RentalItem_categoryId_rentalStatus_createdAt_idx" ON "RentalItem"("categoryId", "rentalStatus", "createdAt");
CREATE INDEX "RentalItem_rentalStatus_viewCount_idx" ON "RentalItem"("rentalStatus", "viewCount");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Product_status_viewCount_idx" ON "Product"("status", "viewCount");
