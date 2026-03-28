-- CreateIndex
CREATE UNIQUE INDEX "NudgeLog_emailAccountId_threadId_nudgeType_key" ON "NudgeLog"("emailAccountId", "threadId", "nudgeType");
