-- CreateEnum
CREATE TYPE "MixType" AS ENUM ('DJ_MIX', 'DJ_SET', 'LIVE_SET', 'PODCAST');

-- CreateEnum
CREATE TYPE "TrackType" AS ENUM ('SINGLE', 'EP', 'ALBUM_TRACK', 'INSTRUMENTAL', 'REMIX', 'FREESTYLE', 'LIVE');

-- AlterTable
ALTER TABLE "albums" ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "trackCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "mixes" ADD COLUMN     "mixType" "MixType" NOT NULL DEFAULT 'DJ_MIX';

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "commentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lyrics" TEXT,
ADD COLUMN     "trackType" "TrackType" NOT NULL DEFAULT 'SINGLE';

-- CreateIndex
CREATE INDEX "albums_status_publishedAt_idx" ON "albums"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "mixes_mixType_idx" ON "mixes"("mixType");

-- CreateIndex
CREATE INDEX "tracks_genre_idx" ON "tracks"("genre");

-- CreateIndex
CREATE INDEX "tracks_status_publishedAt_idx" ON "tracks"("status", "publishedAt");
