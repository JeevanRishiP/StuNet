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
        personalEmail: true,
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
      personalEmail: privateDetails?.personalEmail ?? null,
      whatsappNumber: privateDetails?.whatsappNumber ?? null,
      phone: privateDetails?.whatsappNumber ?? null,
    },
  });
}

const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  bio: z.string().max(500).optional().nullable(),
  headline: z.string().max(120).optional().nullable(),
  joiningYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  contactVisibility: z.nativeEnum(ContactVisibility).optional(),
  whatsappNumber: z.string().max(25).optional().nullable(),
  personalEmail: z.string().email().max(254).optional().nullable().or(z.literal("")),
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

  const { whatsappNumber, personalEmail, ...identityData } = parsed.data;

  const [updatedUser, updatedPrivate] = await db.$transaction(async (tx) => {
    const updated = await tx.userIdentity.update({
      where: { id: session.user.id },
      data: identityData,
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

    let privateDetails = null;
    if (whatsappNumber !== undefined || personalEmail !== undefined) {
      const privateUpdate: { whatsappNumber?: string | null; personalEmail?: string | null } = {};
      if (whatsappNumber !== undefined) {
        privateUpdate.whatsappNumber =
          whatsappNumber && whatsappNumber.trim() ? whatsappNumber.trim() : null;
      }
      if (personalEmail !== undefined) {
        privateUpdate.personalEmail =
          personalEmail && personalEmail.trim() ? personalEmail.trim() : null;
      }

      privateDetails = await tx.userPrivateDetails.upsert({
        where: { userId: session.user.id },
        update: privateUpdate,
        create: {
          userId: session.user.id,
          email: session.user.email ?? `${session.user.id}@niat.edu.in`,
          whatsappNumber: privateUpdate.whatsappNumber ?? null,
          personalEmail: privateUpdate.personalEmail ?? null,
        },
        select: {
          whatsappNumber: true,
          personalEmail: true,
        },
      });
    }

    return [updated, privateDetails];
  });

  return NextResponse.json({
    ...updatedUser,
    whatsappNumber: updatedPrivate?.whatsappNumber ?? undefined,
    personalEmail: updatedPrivate?.personalEmail ?? undefined,
  });
}
