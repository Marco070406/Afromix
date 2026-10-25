-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "artist_profiles" ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "spotify" TEXT,
ADD COLUMN     "tiktok" TEXT,
ADD COLUMN     "twitter" TEXT,
ADD COLUMN     "verificationNote" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "youtube" TEXT;

-- CreateIndex
CREATE INDEX "artist_profiles_verificationStatus_idx" ON "artist_profiles"("verificationStatus");

-- CreateIndex
CREATE INDEX "artist_profiles_country_idx" ON "artist_profiles"("country");
