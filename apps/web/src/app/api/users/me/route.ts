/**
 * GET /api/users/me
 * Retrieve current authenticated user profile, campus details, and academic info.
 *
 * PATCH /api/users/me
 * Update own profile (displayName, bio, headline, contactVisibility).
 * Requires authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { ContactVisibility } from "@prisma/client";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, privateDetails] = await Promise.all([
    db.userIdentity.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        headline: true,
        bio: true,
        role: true,
        section: true,
        verificationStatus: true,
        joiningYear: true,
        contactVisibility: true,
        campusId: true,
        campus: {
          select: {
            id: true,
            name: true,
            slug: true,
            universityName: true,
            city: true,
            state: true,
            address: true,
            facilities: true,
          },
        },
        studentAcademicDetails: {
          select: {
            usn: true,
            currentCourseYear: true,
            joinedYear: true,
            graduationYear: true,
          },
        },
        clubMemberships: {
          where: { isActive: true },
          select: {
            id: true,
            role: true,
            club: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    db.userPrivateDetails.findUnique({
      where: { userId: session.user.id },
      select: {
        email: true,
        whatsappNumber: true,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      email: privateDetails?.email ?? session.user.email ?? null,
      phone: privateDetails?.whatsappNumber ?? null,
    },
  });
}

const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  bio: z.string().max(500).optional(),
  headline: z.string().max(120).optional(),
  joiningYear: z.coerce.number().int().min(1950).max(2100).optional(),
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
      joiningYear: true,
      contactVisibility: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json(updated);
}
