import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { z } from "zod";

const CreateInterestSchema = z.object({
  companyId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  interestType: z
    .enum(["CO_FOUNDER", "TEAM_MEMBER", "INTERN", "COLLABORATE", "OTHER"])
    .default("TEAM_MEMBER"),
  message: z.string().max(2000).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateInterestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid data" },
      { status: 422 },
    );
  }

  const { companyId, projectId, interestType, message, email } = parsed.data;

  if (!companyId && !projectId) {
    return NextResponse.json(
      { error: "Must specify a company or project to send interest to." },
      { status: 400 },
    );
  }

  // Prevent duplicate pending requests from same user
  const existing = await db.initiativeInterestRequest.findFirst({
    where: {
      userId,
      companyId: companyId || undefined,
      projectId: projectId || undefined,
      status: "PENDING",
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending interest request with this initiative." },
      { status: 409 },
    );
  }

  const request = await db.initiativeInterestRequest.create({
    data: {
      userId,
      companyId: companyId || null,
      projectId: projectId || null,
      interestType,
      message: message || null,
      email: email || null,
      status: "PENDING",
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({ success: true, request }, { status: 201 });
}
