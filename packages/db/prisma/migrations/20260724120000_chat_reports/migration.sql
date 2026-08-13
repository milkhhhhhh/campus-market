-- Rename report status REJECTED to DISMISSED
UPDATE "Report" SET "status" = 'DISMISSED' WHERE "status" = 'REJECTED';

-- CreateIndex
CREATE INDEX "Message_conversationId_read_senderId_idx" ON "Message"("conversationId", "read", "senderId");
