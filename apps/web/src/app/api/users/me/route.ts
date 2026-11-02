/**
 * PATCH /api/users/me
 * Update own profile (displayName, bio, headline, contactVisibility).
 * Requires authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ContactVisibility } from "@prisma/client";

const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  bio: z.string().max(500).optional(),
  headline: z.string().max(120).optional(),
  contactVisibility: z.nativeEnum(ContactVisibility).optional(),
});

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const updated = await db.userIdentity.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: {
      id: true,
      displayName: true,
      username: true,
      bio: true,
      headline: true,
      contactVisibility: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json(updated);
}
