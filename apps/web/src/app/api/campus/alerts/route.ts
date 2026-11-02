import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: { campusId: true },
  });

  if (!identity?.campusId) {
    return NextResponse.json({ alerts: [] });
  }

  const now = new Date();

  const alerts = await db.campusLiveAlert.findMany({
    where: {
      campusId: identity.campusId,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      title: true,
      body: true,
      severity: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ alerts });
}
