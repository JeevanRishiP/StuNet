/**
 * /api/users/me/profile-links
 * Public Profile Links management (Plan Delta v3 Section 4).
 * Feeds Linktree-style public profile & external sync workers.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfilePlatform } from "@prisma/client";
import { z } from "zod";

const UpdateProfileLinksSchema = z.object({
  links: z.array(
    z.object({
      platform: z.nativeEnum(ProfilePlatform),
      url: z.string().url().max(2000),
    }),
  ),
});

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await db.profileLink.findMany({
    where: { userId },
  });

  return NextResponse.json({ items: links });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateProfileLinksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid links format" },
      { status: 422 },
    );
  }

  const { links } = parsed.data;

  // Replace user's links in a transaction
  await db.$transaction(async (tx) => {
    await tx.profileLink.deleteMany({ where: { userId } });
    if (links.length > 0) {
      await tx.profileLink.createMany({
        data: links.map((l) => ({
          userId,
          platform: l.platform,
          url: l.url,
        })),
      });
    }
  });

  const updated = await db.profileLink.findMany({ where: { userId } });
  return NextResponse.json({ items: updated });
}
