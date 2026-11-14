-- CreateTable
CREATE TABLE "feed_impressions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "rank_position" INTEGER NOT NULL,
    "session_id" TEXT NOT NULL,
    "shown_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_engagement_stats" (
    "author_user_id" TEXT NOT NULL,
    "avg_likes_per_post_30d" DECIMAL(10,4),
    "avg_comments_per_post_30d" DECIMAL(10,4),
    "post_count_30d" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "author_engagement_stats_pkey" PRIMARY KEY ("author_user_id")
);

-- CreateTable
CREATE TABLE "user_author_affinity" (
    "viewer_user_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "affinity_score" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_author_affinity_pkey" PRIMARY KEY ("viewer_user_id","author_user_id")
);

-- CreateTable
CREATE TABLE "feed_model_versions" (
    "id" TEXT NOT NULL,
    "trained_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model_type" TEXT NOT NULL DEFAULT 'LOGISTIC_REGRESSION',
    "coefficients_json" JSONB NOT NULL,
    "training_example_count" INTEGER NOT NULL,
    "validation_auc" DECIMAL(6,4),
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "feed_model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feed_impressions_training_idx" ON "feed_impressions"("shown_at", "user_id", "post_id");

-- CreateIndex
CREATE INDEX "feed_impressions_session_id_idx" ON "feed_impressions"("session_id");

-- CreateIndex
CREATE INDEX "feed_impressions_user_id_shown_at_idx" ON "feed_impressions"("user_id", "shown_at");

-- CreateIndex
CREATE INDEX "feed_impressions_post_id_shown_at_idx" ON "feed_impressions"("post_id", "shown_at");

-- CreateIndex
CREATE INDEX "user_author_affinity_author_user_id_idx" ON "user_author_affinity"("author_user_id");

-- CreateIndex
CREATE INDEX "user_author_affinity_viewer_user_id_idx" ON "user_author_affinity"("viewer_user_id");

-- CreateIndex
CREATE INDEX "feed_model_versions_is_active_idx" ON "feed_model_versions"("is_active");

-- AddForeignKey
ALTER TABLE "feed_impressions" ADD CONSTRAINT "feed_impressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_impressions" ADD CONSTRAINT "feed_impressions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_engagement_stats" ADD CONSTRAINT "author_engagement_stats_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_author_affinity" ADD CONSTRAINT "user_author_affinity_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_author_affinity" ADD CONSTRAINT "user_author_affinity_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

