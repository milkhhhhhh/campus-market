-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_adminUsername_key" ON "User"("adminUsername");
