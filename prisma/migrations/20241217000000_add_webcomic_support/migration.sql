-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add new columns to Manga table for webcomic support
ALTER TABLE "Manga" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "Manga" ADD COLUMN IF NOT EXISTS "providerSeriesId" TEXT;
ALTER TABLE "Manga" ADD COLUMN IF NOT EXISTS "contentType" TEXT NOT NULL DEFAULT 'MANGA';
ALTER TABLE "Manga" ADD COLUMN IF NOT EXISTS "coverImage" TEXT;

-- Rename mangaDexUpdatedAt to sourceUpdatedAt (more generic)
ALTER TABLE "Manga" RENAME COLUMN "mangaDexUpdatedAt" TO "sourceUpdatedAt";

-- Make sourceUpdatedAt nullable for Consumet content
ALTER TABLE "Manga" ALTER COLUMN "sourceUpdatedAt" DROP NOT NULL;

-- Create ContentType enum
DO $$ BEGIN
    CREATE TYPE "ContentType" AS ENUM ('MANGA', 'MANHWA', 'MANHUA', 'WEBTOON');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Convert contentType column to enum
ALTER TABLE "Manga" ALTER COLUMN "contentType" TYPE "ContentType" USING "contentType"::"ContentType";

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS "Manga_contentType_idx" ON "Manga"("contentType");
CREATE INDEX IF NOT EXISTS "Manga_provider_idx" ON "Manga"("provider");

-- Add unique constraint for Consumet sources
ALTER TABLE "Manga" ADD CONSTRAINT "unique_source_provider_id" 
    UNIQUE ("source", "provider", "providerSeriesId");

-- Create GIN trigram index on title for fuzzy search
CREATE INDEX IF NOT EXISTS "Manga_title_trgm_idx" ON "Manga" USING GIN ("title" gin_trgm_ops);

-- Create GIN trigram index on altTitles array elements
CREATE INDEX IF NOT EXISTS "Manga_altTitles_idx" ON "Manga" USING GIN ("altTitles");

-- Create WebcomicSyncMetadata table
CREATE TABLE IF NOT EXISTS "WebcomicSyncMetadata" (
    "id" TEXT NOT NULL DEFAULT 'webcomic-singleton',
    "lastFullSync" TIMESTAMP(3),
    "lastProvider" TEXT,
    "lastQuery" TEXT,
    "totalIndexed" INTEGER NOT NULL DEFAULT 0,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'IDLE',
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebcomicSyncMetadata_pkey" PRIMARY KEY ("id")
);

-- Update index from mangaDexUpdatedAt to sourceUpdatedAt
DROP INDEX IF EXISTS "Manga_mangaDexUpdatedAt_idx";
CREATE INDEX IF NOT EXISTS "Manga_sourceUpdatedAt_idx" ON "Manga"("sourceUpdatedAt");

