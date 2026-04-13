-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'USED');

-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uploads_file_name_key" ON "uploads"("file_name");

-- CreateIndex
CREATE INDEX "uploads_uploaded_by_id_idx" ON "uploads"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "uploads_status_idx" ON "uploads"("status");

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
