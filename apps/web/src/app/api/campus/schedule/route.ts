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
    return NextResponse.json({ cia: [], ia: [] });
  }

  const [cia, ia] = await Promise.all([
    db.campusCiaSchedule.findMany({
      where: {
        campusId: identity.campusId,
      },
      select: {
        id: true,
        subject: true,
        component: true,
        scheduledAt: true,
        venue: true,
        notes: true,
      },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    }),
    db.campusIaExam.findMany({
      where: {
        campusId: identity.campusId,
      },
      select: {
        id: true,
        subject: true,
        examType: true,
        scheduledAt: true,
        durationMins: true,
        venue: true,
        syllabusUrl: true,
        notes: true,
      },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({ cia, ia });
}
