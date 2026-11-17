-- CreateEnum
CREATE TYPE "anomaly_status" AS ENUM ('FLAGGED', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "engagement_anomaly_flags" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "concentration_ratio" DOUBLE PRECISION NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "flagged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "anomaly_status" NOT NULL DEFAULT 'FLAGGED',

    CONSTRAINT "engagement_anomaly_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "engagement_anomaly_flags_status_flagged_at_idx" ON "engagement_anomaly_flags"("status", "flagged_at" DESC);

-- CreateIndex
CREATE INDEX "engagement_anomaly_flags_user_id_idx" ON "engagement_anomaly_flags"("user_id");

-- AddForeignKey
ALTER TABLE "engagement_anomaly_flags" ADD CONSTRAINT "engagement_anomaly_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permissions for runtime roles
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "engagement_anomaly_flags" TO "app_service_role";
GRANT SELECT, UPDATE ON TABLE "engagement_anomaly_flags" TO "admin_service_role";
