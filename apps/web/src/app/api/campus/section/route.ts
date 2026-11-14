/**
 * /api/campus/section
 * Manage student section details with strict role boundaries.
 * ONLY Campus Admin (CAMPUS_MANAGER, SUPER_ADMIN) can edit section details.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSectionSchema = z.object({
  section: z.string().trim().min(1, "Section name is required").max(50),
  userId: z.string().trim().optional(),
});

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      section: true,
      role: true,
      campusId: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isCampusAdmin = user.role === "CAMPUS_MANAGER" || user.role === "SUPER_ADMIN";

  return NextResponse.json({
    section: user.section ?? null,
    isCampusAdmin,
  });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch authenticated user to verify role
  const currentUser = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, campusId: true },
  });

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Security check: Only campus admin can edit section details
  const isCampusAdmin = currentUser.role === "CAMPUS_MANAGER" || currentUser.role === "SUPER_ADMIN";
  if (!isCampusAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Only campus admins can edit section details." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid section data" },
      { status: 422 },
    );
  }

  const targetUserId = parsed.data.userId || currentUser.id;

  const updatedUser = await db.userIdentity.update({
    where: { id: targetUserId },
    data: { section: parsed.data.section },
    select: { id: true, displayName: true, section: true },
  });

  return NextResponse.json({
    success: true,
    section: updatedUser.section,
    message: `Section successfully updated to "${updatedUser.section}".`,
  });
}
