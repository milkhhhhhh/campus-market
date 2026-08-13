-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "listingType" TEXT,
    "listingId" TEXT,
    "contextKey" TEXT NOT NULL DEFAULT 'DIRECT',
    "lastMessage" TEXT,
    "lastMessageAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Conversation_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Conversation" ("createdAt", "id", "lastMessage", "lastMessageAt", "listingId", "listingType", "userAId", "userBId")
SELECT "createdAt", "id", "lastMessage", "lastMessageAt", "listingId", "listingType", "userAId", "userBId" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
CREATE INDEX "Conversation_userAId_idx" ON "Conversation"("userAId");
CREATE INDEX "Conversation_userBId_idx" ON "Conversation"("userBId");
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");
CREATE UNIQUE INDEX "Conversation_userAId_userBId_contextKey_key" ON "Conversation"("userAId", "userBId", "contextKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Category_parentId_name_key" ON "Category"("parentId", "name");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Order_buyerId_status_createdAt_idx" ON "Order"("buyerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_sellerId_status_createdAt_idx" ON "Order"("sellerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Product_categoryId_status_createdAt_idx" ON "Product"("categoryId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RentalItem_categoryId_rentalStatus_createdAt_idx" ON "RentalItem"("categoryId", "rentalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "RentalOrder_renterId_status_createdAt_idx" ON "RentalOrder"("renterId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RentalOrder_ownerId_status_createdAt_idx" ON "RentalOrder"("ownerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Report_handlerId_idx" ON "Report"("handlerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_school_studentId_key" ON "User"("school", "studentId");
