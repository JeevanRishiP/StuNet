/**
 * Groups API — List and Create Groups
 * GET  /api/groups — returns groups with membership, ownership, and request status
 * POST /api/groups — creates a new group with an auto-generated 4-digit ID
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const CreateGroupSchema = z.object({
  name: z.string().min(2).max(200),
  purpose: z.string().min(5).max(1000),
  whatsappLink: z.string().url(),
  visibility: z.enum(["PUBLIC", "REQUEST_REQUIRED"]),
  hideMembers: z.boolean().default(false),
});

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;

  const dbGroups = await db.group.findMany({
    where: { isActive: true },
    include: {
      owner: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          headline: true,
        },
      },
      members: {
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              headline: true,
            },
          },
        },
      },
      joinRequests: {
        where: { status: "PENDING" },
        select: {
          id: true,
          userId: true,
          purpose: true,
          createdAt: true,
          user: {
            select: {
              displayName: true,
              username: true,
              headline: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Format groups for client
  const groups = dbGroups.map((g) => {
    const isOwner = Boolean(userId && g.ownerId === userId);
    const isMember = Boolean(userId && g.members.some((m) => m.user.id === userId));

    return {
      id: g.id,
      code: g.shortCode || "4000",
      name: g.name,
      purpose: g.description || "",
      adminId: g.ownerId,
      adminName: isOwner ? "You" : g.owner.displayName,
      adminAvatar: g.owner.avatarUrl || undefined,
      whatsappLink: g.externalLinkUrl || "https://chat.whatsapp.com/sample",
      visibility: (g.type === "OPEN" ? "PUBLIC" : "REQUEST_REQUIRED") as
        "PUBLIC" | "REQUEST_REQUIRED",
      hideMembersFromNonMembers: g.hideMembers,
      memberCount: g.memberCount,
      members: g.members.map((m) => ({
        id: m.user.id,
        name: isOwner && m.user.id === userId ? "You" : m.user.displayName,
        username: m.user.username,
        avatarUrl: m.user.avatarUrl || undefined,
        role: m.role === "MODERATOR" ? ("ADMIN" as const) : ("MEMBER" as const),
        joinedAt: m.joinedAt.toISOString(),
      })),
      isOwner,
      isMember,
      pendingRequests: isOwner
        ? g.joinRequests.map((r) => ({
            id: r.id,
            userId: r.userId,
            userName: r.user.displayName,
            userHeadline: r.user.headline || undefined,
            userAvatar: r.user.avatarUrl || undefined,
            purpose: r.purpose || undefined,
            requestedAt: r.createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          }))
        : [],
    };
  });

  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const parsed = CreateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { name, purpose, whatsappLink, visibility, hideMembers } = parsed.data;

  // Auto-generate a unique 4-digit number as Group ID (1000 - 9999)
  let fourDigitCode = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = Math.floor(1000 + Math.random() * 9000).toString();
    const existing = await db.group.findUnique({ where: { shortCode: candidate } });
    if (!existing) {
      fourDigitCode = candidate;
      break;
    }
  }

  if (!fourDigitCode) {
    fourDigitCode = Math.floor(1000 + Math.random() * 9000).toString();
  }

  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${baseSlug}-${fourDigitCode}`;

  const createdGroup = await db.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name: name.trim(),
        slug,
        shortCode: fourDigitCode,
        description: purpose.trim(),
        externalLinkUrl: whatsappLink.trim(),
        type: visibility === "PUBLIC" ? "OPEN" : "CLOSED",
        hideMembers: hideMembers ?? false,
        memberCount: 1,
        ownerId: userId,
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Automatically create GroupMember record for the creator
    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: "MODERATOR",
      },
    });

    return group;
  });

  return NextResponse.json(
    {
      group: {
        id: createdGroup.id,
        code: fourDigitCode,
        name: createdGroup.name,
        purpose: createdGroup.description || "",
        adminId: createdGroup.ownerId,
        adminName: "You",
        adminAvatar: createdGroup.owner.avatarUrl || undefined,
        whatsappLink: createdGroup.externalLinkUrl || whatsappLink,
        visibility,
        hideMembersFromNonMembers: createdGroup.hideMembers,
        memberCount: 1,
        members: [{ id: userId, name: "You", role: "ADMIN" as const }],
        isOwner: true,
        isMember: true,
        pendingRequests: [],
      },
    },
    { status: 201 },
  );
}
