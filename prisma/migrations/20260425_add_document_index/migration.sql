CREATE TABLE "DocumentIndex" (
    "id" TEXT NOT NULL,
    "sourceDataset" TEXT NOT NULL DEFAULT 'docs/hgi-document-audit/output/inventory.json',
    "originalRelativePath" TEXT NOT NULL,
    "originalAbsolutePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "normalizedFilename" TEXT,
    "extension" TEXT,
    "sizeBytes" INTEGER,
    "modifiedTime" TIMESTAMP(3),
    "rootFolder" TEXT,
    "category" TEXT,
    "reviewFlag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentIndex_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentIndex_originalRelativePath_key" ON "DocumentIndex"("originalRelativePath");
CREATE INDEX "DocumentIndex_rootFolder_idx" ON "DocumentIndex"("rootFolder");
CREATE INDEX "DocumentIndex_category_idx" ON "DocumentIndex"("category");
CREATE INDEX "DocumentIndex_reviewFlag_idx" ON "DocumentIndex"("reviewFlag");
CREATE INDEX "DocumentIndex_fileName_idx" ON "DocumentIndex"("fileName");
