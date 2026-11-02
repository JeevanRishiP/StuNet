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
    return NextResponse.json({ events: [] });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await db.campusCalendar.findMany({
    where: {
      campusId: identity.campusId,
      isPublic: true,
      eventDate: { gte: today },
    },
    select: {
      id: true,
      title: true,
      description: true,
      eventDate: true,
      endDate: true,
      eventType: true,
    },
    orderBy: { eventDate: "asc" },
    take: 30,
  });

  return NextResponse.json({ events });
}
