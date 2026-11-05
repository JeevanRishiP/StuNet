/**
 * GET /api/dev/stats — system-wide stats for the Dev Dashboard home.
 */
import { NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  try {
    const [
      totalUsers,
      studentCount,
      clubManagerCount,
      campusManagerCount,
      superAdminCount,
      pendingVerification,
      bannedUsers,
      totalCampuses,
      totalClubs,
      activeClubs,
      totalPosts,
      totalAchievements,
      pendingAchievements,
      totalReports,
      openReports,
      totalListings,
      activeListings,
      totalNotifications,
      unreadNotifications,
      activeAlerts,
      totalConnections,
      pendingConnections,
    ] = await Promise.all([
      devDb.userIdentity.count(),
      devDb.userIdentity.count({ where: { role: "STUDENT" } }),
      devDb.userIdentity.count({ where: { role: "CLUB_MANAGER" } }),
      devDb.userIdentity.count({ where: { role: "CAMPUS_MANAGER" } }),
      devDb.userIdentity.count({ where: { role: "SUPER_ADMIN" } }),
      devDb.userIdentity.count({ where: { verificationStatus: "PENDING" } }),
      devDb.userIdentity.count({ where: { isBanned: true } }),
      devDb.campus.count(),
      devDb.club.count(),
      devDb.club.count({ where: { isActive: true } }),
      devDb.post.count(),
      devDb.achievement.count(),
      devDb.achievement.count({ where: { verificationStatus: "PENDING" } }),
      devDb.report.count(),
      devDb.report.count({ where: { status: "OPEN" } }),
      devDb.campusMarketListing.count(),
      devDb.campusMarketListing.count({ where: { status: "ACTIVE" } }),
      devDb.notification.count(),
      devDb.notification.count({ where: { isRead: false } }),
      devDb.campusLiveAlert.count({ where: { isActive: true } }),
      devDb.connection.count(),
      devDb.connection.count({ where: { status: "PENDING" } }),
    ]);

    // Recent audit logs
    const recentAudit = await devDb.adminAuditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { displayName: true, username: true } } },
    });

    return NextResponse.json({
      users: {
        total: totalUsers,
        student: studentCount,
        clubManager: clubManagerCount,
        campusManager: campusManagerCount,
        superAdmin: superAdminCount,
        pendingVerification,
        banned: bannedUsers,
      },
      campuses: { total: totalCampuses },
      clubs: { total: totalClubs, active: activeClubs },
      posts: { total: totalPosts },
      achievements: { total: totalAchievements, pending: pendingAchievements },
      reports: { total: totalReports, open: openReports },
      marketplace: { total: totalListings, active: activeListings },
      notifications: { total: totalNotifications, unread: unreadNotifications },
      alerts: { active: activeAlerts },
      connections: { total: totalConnections, pending: pendingConnections },
      recentAudit,
    });
  } catch (err) {
    console.error("[DEV/stats]", err);
    return NextResponse.json({ error: "DB error", detail: String(err) }, { status: 500 });
  }
}
