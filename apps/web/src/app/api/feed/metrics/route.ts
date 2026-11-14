/**
 * GET /api/feed/metrics — Online ranking telemetry and A/B rollout metrics (Section 7).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFeedPerformanceMetrics } from "@/lib/feed-metrics";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const _session = await auth();
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(60, parseInt(url.searchParams.get("days") ?? "7", 10) || 7));

  try {
    const metrics = await getFeedPerformanceMetrics(days);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[FeedMetricsAPI] Failed to compute metrics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to compute feed performance metrics" },
      { status: 500 },
    );
  }
}
