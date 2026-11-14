-- AlterTable
ALTER TABLE "feed_impressions" ADD COLUMN     "is_exploration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variant" TEXT NOT NULL DEFAULT 'CONTROL';

-- CreateIndex
CREATE INDEX "feed_impressions_variant_shown_at_idx" ON "feed_impressions"("variant", "shown_at");

