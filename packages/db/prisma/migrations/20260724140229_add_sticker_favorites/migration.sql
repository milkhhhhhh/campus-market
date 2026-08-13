-- DropIndex
DROP INDEX "Message_conversationId_idx";

-- CreateTable
CREATE TABLE "StickerFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "stickerId" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StickerFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StickerFavorite_userId_createdAt_idx" ON "StickerFavorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StickerFavorite_userId_key_key" ON "StickerFavorite"("userId", "key");
