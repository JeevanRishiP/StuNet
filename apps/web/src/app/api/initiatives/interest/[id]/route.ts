import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { z } from "zod";

const UpdateStatusSchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "ACCEPTED", "DECLINED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;
  const requestId = params.id;

  const request = await db.initiativeInterestRequest.findUnique({
    where: { id: requestId },
    include: {
      company: {
        include: {
          roles: { where: { userId } },
        },
      },
      project: {
        include: {
          members: { where: { userId } },
        },
      },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  const isCompanyLeader =
    request.company?.roles.some((r) => r.ownerType === "FOUNDER" || r.ownerType === "CO_FOUNDER") ??
    false;
  const isProjectLeader =
    request.project?.ownerUserId === userId ||
    (request.project?.members.some((m) => m.role === "MAINTAINER") ?? false);

  if (!isCompanyLeader && !isProjectLeader && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized to update this request." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid status" },
      { status: 422 },
    );
  }

  const updated = await db.initiativeInterestRequest.update({
    where: { id: requestId },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ success: true, request: updated });
}
