import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;
  const companyId = params.id;

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const existingFollow = await db.companyFollow.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  let following = false;
  if (existingFollow) {
    await db.companyFollow.delete({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });
    following = false;
  } else {
    await db.companyFollow.create({
      data: {
        userId,
        companyId,
      },
    });
    following = true;
  }

  const followersCount = await db.companyFollow.count({
    where: { companyId },
  });

  return NextResponse.json({
    success: true,
    following,
    followersCount,
  });
}
